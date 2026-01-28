//! Cliente de rede para modo Satélite (PC-to-PC Sync)
//!
//! Gerencia conexão com o Master, sincronização e envio de vendas remotas.

use crate::models::{Customer, Product, Setting};
use crate::repositories::{CustomerRepository, ProductRepository, SettingsRepository};
use crate::services::mobile_protocol::{
    AuthSystemPayload, MobileEvent, MobileRequest, MobileResponse, SaleRemoteCreatePayload,
    SyncDeltaPayload, SyncFullPayload, SyncPushPayload,
};
use futures_util::{SinkExt, StreamExt};
use mdns_sd::{ServiceDaemon, ServiceEvent};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio::time::sleep;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

/// Configuração do Cliente de Rede
#[derive(Debug, Clone)]
pub struct NetworkClientConfig {
    /// Nome deste terminal
    pub terminal_name: String,
}

/// Estado da conexão
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "address")]
pub enum ConnectionState {
    Disconnected,
    Searching,
    Connecting(String),
    Connected(String),
}

/// Cliente de Rede
pub struct NetworkClient {
    pool: SqlitePool,
    _config: NetworkClientConfig,
    state: Arc<RwLock<ConnectionState>>,
    tx: RwLock<Option<mpsc::Sender<ClientCommand>>>,
    token: RwLock<Option<String>>,
    event_tx: broadcast::Sender<ClientEvent>,
    last_sync: RwLock<i64>,
    app_handle: AppHandle,
}

#[derive(Debug)]
enum ClientCommand {
    SendSale(serde_json::Value),
    PushUpdate(String, serde_json::Value),
    SyncFull,
    SyncDelta,
    ForceSyncNow,
    SendPing,
    Disconnect,
}

/// Intervalo de sync automático em segundos (5 minutos)
const AUTO_SYNC_INTERVAL_SECS: u64 = 300;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "payload")]
pub enum ClientEvent {
    StateChanged(ConnectionState),
    MasterFound(String, u16),
    SyncCompleted,
    StockUpdated,
    Error(String),
    /// Tentando reconectar (número da tentativa)
    Reconnecting(u32),
}

impl NetworkClient {
    pub fn new(pool: SqlitePool, terminal_name: String, app_handle: AppHandle) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(100);

        let client = Arc::new(Self {
            pool,
            _config: NetworkClientConfig { terminal_name },
            state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
            tx: RwLock::new(None),
            token: RwLock::new(None),
            event_tx,
            last_sync: RwLock::new(0),
            app_handle,
        });

        // Load last sync from DB asynchronously
        let me = client.clone();
        tokio::spawn(async move {
            let settings_repo = SettingsRepository::new(&me.pool);
            if let Ok(Some(val)) = settings_repo.get_number("network.last_sync").await {
                let mut sync_lock = me.last_sync.write().await;
                *sync_lock = val as i64;
                tracing::info!("Último sincronismo carregado do banco: {}", val);
            }
        });

        client
    }

    /// Inicia o cliente (busca mDNS e conecta)
    pub fn start(self: &Arc<Self>) {
        let me = self.clone();
        tokio::spawn(async move {
            {
                let mut state = me.state.write().await;
                if *state != ConnectionState::Disconnected {
                    return;
                }
                *state = ConnectionState::Searching;
            }
            me.run_loop().await;
        });
    }

    /// Para o cliente
    pub async fn stop(&self) {
        if let Some(tx) = self.tx.read().await.as_ref() {
            let _ = tx.send(ClientCommand::Disconnect).await;
        }
        self.set_state(ConnectionState::Disconnected).await;
    }

    /// Envia uma venda para o Master (Remote Create)
    pub async fn send_sale(&self, sale: serde_json::Value) -> Result<(), String> {
        if let Some(tx) = self.tx.read().await.as_ref() {
            tx.send(ClientCommand::SendSale(sale))
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Cliente desconectado".to_string())
        }
    }

    /// Envia atualização de entidade para o Master (Sync Push)
    pub async fn push_update(&self, entity: &str, data: serde_json::Value) -> Result<(), String> {
        if let Some(tx) = self.tx.read().await.as_ref() {
            tx.send(ClientCommand::PushUpdate(entity.to_string(), data))
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Cliente desconectado".to_string())
        }
    }

    /// Força sincronização imediata
    pub async fn force_sync(&self) -> Result<(), String> {
        if let Some(tx) = self.tx.read().await.as_ref() {
            tx.send(ClientCommand::ForceSyncNow)
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Cliente desconectado".to_string())
        }
    }

    /// Obtém estado atual
    pub async fn get_state(&self) -> ConnectionState {
        self.state.read().await.clone()
    }

    async fn run_loop(&self) {
        let mut reconnect_attempt: u32 = 0;
        const MAX_BACKOFF_SECS: u64 = 60;
        const BASE_BACKOFF_SECS: u64 = 5;

        loop {
            // 1. Tentar IP estático primeiro (se configurado)
            let static_target = self.get_static_master().await;

            // 2. Se não tem IP estático, buscar via mDNS
            let target = if static_target.is_some() {
                static_target
            } else {
                self.set_state(ConnectionState::Searching).await;
                self.discover_master().await
            };

            if let Some((ip, port)) = target {
                let addr = format!("{}:{}", ip, port);
                self.set_state(ConnectionState::Connecting(addr.clone()))
                    .await;

                // 3. Tenta conectar
                match self.connect_and_handle(&addr).await {
                    Ok(_) => {
                        tracing::info!("Conexão com Master encerrada limpa");
                        reconnect_attempt = 0; // Reset no sucesso
                    }
                    Err(e) => {
                        tracing::error!("Erro na conexão com Master: {}", e);
                        self.broadcast(ClientEvent::Error(e.to_string()));
                    }
                }
            }

            // Backoff exponencial: 5s, 10s, 20s, 40s, 60s (max)
            reconnect_attempt = reconnect_attempt.saturating_add(1);
            let backoff_secs = std::cmp::min(
                BASE_BACKOFF_SECS * 2u64.saturating_pow(reconnect_attempt.saturating_sub(1)),
                MAX_BACKOFF_SECS,
            );

            tracing::info!(
                "🔄 Reconexão tentativa #{} em {} segundos...",
                reconnect_attempt,
                backoff_secs
            );
            self.broadcast(ClientEvent::Reconnecting(reconnect_attempt));

            sleep(Duration::from_secs(backoff_secs)).await;
        }
    }

    /// Obtém IP estático do Master se configurado (fallback para redes sem mDNS)
    async fn get_static_master(&self) -> Option<(String, u16)> {
        let settings_repo = SettingsRepository::new(&self.pool);

        let ip = settings_repo
            .get_value("network.master_ip")
            .await
            .ok()
            .flatten()?;

        let port = settings_repo
            .get_number("network.master_port")
            .await
            .ok()
            .flatten()
            .unwrap_or(3847.0) as u16;

        if ip.is_empty() {
            return None;
        }

        tracing::info!("📍 Usando IP estático do Master: {}:{}", ip, port);
        Some((ip, port))
    }

    async fn discover_master(&self) -> Option<(String, u16)> {
        tracing::info!("🔍 Iniciando descoberta automática do Master via mDNS...");

        let mdns = match ServiceDaemon::new() {
            Ok(d) => d,
            Err(e) => {
                // mDNS pode falhar no Windows por firewall
                tracing::warn!(
                    "⚠️ Falha ao iniciar mDNS: {}. Verifique o Firewall do Windows ou configure IP estático.", 
                    e
                );
                self.broadcast(ClientEvent::Error(
                    "Descoberta automática falhou. Configure o IP do Master manualmente."
                        .to_string(),
                ));
                return None;
            }
        };

        let receiver = match mdns.browse("_giro._tcp.local.") {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!("⚠️ Falha ao buscar serviços mDNS: {}", e);
                return None;
            }
        };

        // Timeout de 15s para achar (aumentado para redes Windows lentas)
        let timeout = sleep(Duration::from_secs(15));
        tokio::pin!(timeout);

        loop {
            tokio::select! {
                event = receiver.recv_async() => {
                     if let Ok(ServiceEvent::ServiceResolved(info)) = event {
                         if let Some(ip) = info.get_addresses().iter().next() {
                              let ip_str = ip.to_string();
                              let port = info.get_port();
                              tracing::info!("✅ Master encontrado: {}:{}", ip_str, port);
                              self.broadcast(ClientEvent::MasterFound(ip_str.clone(), port));
                              return Some((ip_str, port));
                         }
                     }
                }
                _ = &mut timeout => {
                    tracing::warn!("⏰ Timeout na descoberta automática. Configure o IP do Master manualmente.");
                    self.broadcast(ClientEvent::Error(
                        "Master não encontrado. Verifique se o Master está online ou configure o IP manualmente.".to_string()
                    ));
                    break;
                }
            }
        }
        None
    }

    async fn connect_and_handle(&self, addr: &str) -> anyhow::Result<()> {
        let url = format!("ws://{}/ws", addr);
        tracing::info!("🔌 Conectando ao Master: {}", url);

        let (ws_stream, _) = match connect_async(&url).await {
            Ok(stream) => stream,
            Err(e) => {
                let error_msg = format!("Falha ao conectar: {}", e);
                tracing::error!("❌ {}", error_msg);

                // Mensagem mais amigável para Windows
                let user_msg = if cfg!(windows) {
                    format!(
                        "Não foi possível conectar ao Master ({}). Verifique: 1) O Master está online? 2) A porta {} está liberada no Firewall?", 
                        addr,
                        addr.split(':').last().unwrap_or("3847")
                    )
                } else {
                    format!("Não foi possível conectar ao Master ({})", addr)
                };

                return Err(anyhow::anyhow!(user_msg));
            }
        };

        self.set_state(ConnectionState::Connected(addr.to_string()))
            .await;
        tracing::info!("Conectado ao Master: {}", addr);

        let (mut write, mut read) = ws_stream.split();
        let (tx, mut rx) = mpsc::channel::<ClientCommand>(10);

        {
            let mut tx_lock = self.tx.write().await;
            *tx_lock = Some(tx.clone());
        }

        // 1. Autenticar com o Master
        let settings_repo = SettingsRepository::new(&self.pool);
        let secret = match settings_repo.get_value("network.secret").await {
            Ok(Some(s)) => s,
            _ => {
                #[cfg(debug_assertions)]
                {
                    tracing::warn!(
                        "network.secret não configurado, usando fallback de desenvolvimento"
                    );
                    "giro-dev-secret".to_string()
                }
                #[cfg(not(debug_assertions))]
                {
                    return Err(
                        anyhow::anyhow!("Rede não configurada: network.secret ausente").into(),
                    );
                }
            }
        };

        // Obter HW ID ou usar o terminal_name como ID único por enquanto
        let terminal_id = self._config.terminal_name.clone();

        let auth_req = MobileRequest {
            id: 1, // ID fixo para o primeiro passo
            action: "auth.system".into(),
            payload: serde_json::to_value(AuthSystemPayload {
                secret,
                terminal_id,
                terminal_name: self._config.terminal_name.clone(),
            })
            .unwrap(),
            token: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        };

        let auth_msg = serde_json::to_string(&auth_req)?;
        write.send(Message::Text(auth_msg)).await?;

        // 2. Aguardar resposta de autenticação
        if let Some(Ok(Message::Text(resp_text))) = read.next().await {
            if let Ok(resp) = serde_json::from_str::<MobileResponse>(&resp_text) {
                if resp.success {
                    if let Some(data) = resp.data {
                        if let Some(token) = data.get("token").and_then(|v| v.as_str()) {
                            let mut token_lock = self.token.write().await;
                            *token_lock = Some(token.to_string());
                            tracing::info!("Autenticado com sucesso no Master");
                        }
                    }
                } else {
                    tracing::error!("Falha na autenticação com Master: {:?}", resp.error);
                    return Err(anyhow::anyhow!("Falha na autenticação"));
                }
            }
        }

        // 3. Iniciar sincronização
        let last_sync_val = *self.last_sync.read().await;
        if last_sync_val > 0 {
            let _ = tx.send(ClientCommand::SyncDelta).await;
        } else {
            let _ = tx.send(ClientCommand::SyncFull).await;
        }

        // 4. Iniciar Heartbeat e Sync Automático Periódico
        let auto_sync_tx = tx.clone();
        let heartbeat_tx = tx.clone();

        // Heartbeat com detecção de timeout
        tokio::spawn(async move {
            let mut heartbeat_counter = 0u64;
            const HEARTBEAT_INTERVAL: u64 = 15; // segundos entre pings

            loop {
                sleep(Duration::from_secs(HEARTBEAT_INTERVAL)).await;
                heartbeat_counter += HEARTBEAT_INTERVAL;

                // Sync automático a cada AUTO_SYNC_INTERVAL_SECS (5 min)
                if heartbeat_counter >= AUTO_SYNC_INTERVAL_SECS {
                    heartbeat_counter = 0;
                    tracing::info!("🔄 Sync automático periódico iniciado");
                    if auto_sync_tx.send(ClientCommand::SyncDelta).await.is_err() {
                        tracing::warn!(
                            "Falha ao enviar comando de sync automático - conexão perdida"
                        );
                        break;
                    }
                }

                // Enviar ping real via channel
                if heartbeat_tx.send(ClientCommand::SendPing).await.is_err() {
                    tracing::warn!("💔 Conexão perdida - não foi possível enviar heartbeat");
                    break;
                }
            }
        });

        loop {
            tokio::select! {
                // Comandos locais (enviar venda, etc)
                cmd = rx.recv() => {
                    let current_token = self.token.read().await.clone();
                    match cmd {
                        Some(ClientCommand::SendSale(sale)) => {
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: "sale.remote_create".into(),
                                payload: serde_json::to_value(SaleRemoteCreatePayload { sale }).unwrap(),
                                token: current_token,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            write.send(Message::Text(msg)).await?;
                        },
                        Some(ClientCommand::PushUpdate(entity, data)) => {
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: "sync.push".into(),
                                payload: serde_json::to_value(SyncPushPayload { entity, data }).unwrap(),
                                token: current_token,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            write.send(Message::Text(msg)).await?;
                        },
                        Some(ClientCommand::SyncFull) => {
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: "sync.full".into(),
                                payload: serde_json::to_value(SyncFullPayload {
                                    tables: vec!["products".into(), "customers".into(), "settings".into()]
                                }).unwrap(),
                                token: current_token,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            write.send(Message::Text(msg)).await?;
                        },
                        Some(ClientCommand::SyncDelta) => {
                            let last_sync_val = *self.last_sync.read().await;
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: "sync.delta".into(),
                                payload: serde_json::to_value(SyncDeltaPayload {
                                    last_sync: last_sync_val,
                                    tables: None,
                                }).unwrap(),
                                token: current_token,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            write.send(Message::Text(msg)).await?;
                        },
                        Some(ClientCommand::ForceSyncNow) => {
                            tracing::info!("🔄 Força sincronização solicitada pelo usuário");
                            let last_sync_val = *self.last_sync.read().await;
                            let action = if last_sync_val > 0 { "sync.delta" } else { "sync.full" };
                            let payload = if last_sync_val > 0 {
                                serde_json::to_value(SyncDeltaPayload {
                                    last_sync: last_sync_val,
                                    tables: None,
                                }).unwrap()
                            } else {
                                serde_json::to_value(SyncFullPayload {
                                    tables: vec!["products".into(), "customers".into(), "settings".into(), "categories".into(), "suppliers".into()]
                                }).unwrap()
                            };
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: action.into(),
                                payload,
                                token: current_token,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            write.send(Message::Text(msg)).await?;
                        },
                        Some(ClientCommand::SendPing) => {
                            // Enviar ping real via WebSocket
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: "system.ping".into(),
                                payload: serde_json::Value::Null,
                                token: current_token,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            if let Err(e) = write.send(Message::Text(msg)).await {
                                tracing::error!("💔 Falha ao enviar heartbeat: {}", e);
                                break; // Conexão perdida
                            }
                        },
                        Some(ClientCommand::Disconnect) => break,
                        None => break,
                    }
                }
                // Mensagens do Master
                msg = read.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            // Pode ser Response ou Event
                            if let Ok(event) = serde_json::from_str::<MobileEvent>(&text) {
                                self.handle_event(event).await;
                            } else if let Ok(resp) = serde_json::from_str::<MobileResponse>(&text) {
                                self.handle_response(resp).await;
                            }
                        },
                        Some(Ok(Message::Close(_))) => break,
                        Some(Err(e)) => return Err(e.into()),
                        None => break,
                        _ => {}
                    }
                }
            }
        }

        Ok(())
    }

    async fn handle_event(&self, event: MobileEvent) {
        match event.event.as_str() {
            "product.updated" => {
                if let Ok(product) = serde_json::from_value::<Product>(event.data) {
                    let repo = ProductRepository::new(&self.pool);
                    if let Err(e) = repo.upsert_from_sync(product).await {
                        tracing::error!("Erro ao atualizar produto via evento: {:?}", e);
                    } else {
                        tracing::info!("Produto atualizado via evento de rede");
                        self.broadcast(ClientEvent::StockUpdated); // Notificar UI
                    }
                }
            }
            "stock.updated" => {
                self.broadcast(ClientEvent::StockUpdated);
            }
            "customer.updated" => {
                if let Ok(customer) = serde_json::from_value::<Customer>(event.data) {
                    let repo = CustomerRepository::new(&self.pool);
                    if let Err(e) = repo.upsert_from_sync(customer).await {
                        tracing::error!("Erro ao atualizar cliente via evento: {:?}", e);
                    }
                }
            }
            _ => {}
        }
    }

    async fn handle_response(&self, resp: MobileResponse) {
        if resp.success {
            if let Some(payload) = resp.data {
                if let Some(obj) = payload.as_object() {
                    // Processar sincronização completa
                    if obj.contains_key("products")
                        || obj.contains_key("customers")
                        || obj.contains_key("settings")
                    {
                        tracing::info!("Recebendo dados de sincronização...");

                        // Produtos
                        if let Some(products_val) = obj.get("products") {
                            if let Ok(products) =
                                serde_json::from_value::<Vec<Product>>(products_val.clone())
                            {
                                let repo = ProductRepository::new(&self.pool);
                                let total = products.len();
                                let mut count = 0;
                                for p in products {
                                    if let Err(e) = repo.upsert_from_sync(p).await {
                                        tracing::error!("Erro ao sincronizar produto: {:?}", e);
                                    } else {
                                        count += 1;
                                    }
                                }
                                tracing::info!("Sincronizados {}/{} produtos", count, total);
                            }
                        }

                        // Clientes
                        if let Some(customers_val) = obj.get("customers") {
                            if let Ok(customers) =
                                serde_json::from_value::<Vec<Customer>>(customers_val.clone())
                            {
                                let repo = CustomerRepository::new(&self.pool);
                                let total = customers.len();
                                let mut count = 0;
                                for c in customers {
                                    if let Err(e) = repo.upsert_from_sync(c).await {
                                        tracing::error!("Erro ao sincronizar cliente: {:?}", e);
                                    } else {
                                        count += 1;
                                    }
                                }
                                tracing::info!("Sincronizados {}/{} clientes", count, total);
                            }
                        }

                        // Configurações
                        if let Some(settings_val) = obj.get("settings") {
                            if let Ok(settings) =
                                serde_json::from_value::<Vec<Setting>>(settings_val.clone())
                            {
                                let repo = SettingsRepository::new(&self.pool);
                                let total = settings.len();
                                let mut count = 0;
                                for s in settings {
                                    if let Err(e) = repo.upsert_from_sync(s).await {
                                        tracing::error!(
                                            "Erro ao sincronizar configuração: {:?}",
                                            e
                                        );
                                    } else {
                                        count += 1;
                                    }
                                }
                                tracing::info!("Sincronizados {}/{} configurações", count, total);
                            }
                        }

                        self.broadcast(ClientEvent::SyncCompleted);

                        // Atualizar timestamp do último sync
                        let now = chrono::Utc::now().timestamp();
                        *self.last_sync.write().await = now;

                        // Persistir no banco
                        let settings_repo = SettingsRepository::new(&self.pool);
                        let _ = settings_repo
                            .set(crate::models::SetSetting {
                                key: "network.last_sync".to_string(),
                                value: now.to_string(),
                                value_type: Some("NUMBER".to_string()),
                                group_name: Some("network".to_string()),
                                description: Some("Último sincronismo com Master".to_string()),
                            })
                            .await;
                    }
                }
            }
        } else {
            tracing::warn!("Erro na resposta do Master: {:?}", resp.error);
        }
    }

    async fn set_state(&self, new_state: ConnectionState) {
        let mut state = self.state.write().await;
        *state = new_state.clone();
        self.broadcast(ClientEvent::StateChanged(new_state));
    }

    fn broadcast(&self, event: ClientEvent) {
        let _ = self.event_tx.send(event.clone());

        // Emitir também via Tauri para o Frontend
        let event_name = match &event {
            ClientEvent::StateChanged(_) => "network:state-changed",
            ClientEvent::MasterFound(_, _) => "network:master-found",
            ClientEvent::SyncCompleted => "network:sync-completed",
            ClientEvent::StockUpdated => "network:stock-updated",
            ClientEvent::Error(_) => "network:error",
            ClientEvent::Reconnecting(_) => "network:reconnecting",
        };

        let _ = self.app_handle.emit(event_name, event);
    }
}
