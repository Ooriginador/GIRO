//! Cliente de rede para modo Satélite (PC-to-PC Sync)
//!
//! Gerencia conexão com o Master, sincronização e envio de vendas remotas.

use crate::services::mobile_protocol::{
    MobileEvent, MobileRequest, MobileResponse, SaleRemoteCreatePayload,
    SyncFullPayload,
};
use crate::models::{Product, Customer, Setting};
use crate::repositories::{ProductRepository, CustomerRepository, SettingsRepository};
use futures_util::{SinkExt, StreamExt};
use mdns_sd::{ServiceDaemon, ServiceEvent};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Duration;
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
#[derive(Debug, Clone, PartialEq)]
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
    event_tx: broadcast::Sender<ClientEvent>,
}

#[derive(Debug)]
enum ClientCommand {
    SendSale(serde_json::Value),
    SyncFull,
    Disconnect,
}

#[derive(Debug, Clone)]
pub enum ClientEvent {
    StateChanged(ConnectionState),
    MasterFound(String, u16),
    SyncCompleted,
    StockUpdated,
    Error(String),
}

impl NetworkClient {
    pub fn new(pool: SqlitePool, terminal_name: String) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(100);
        
        Arc::new(Self {
            pool,
            _config: NetworkClientConfig { terminal_name },
            state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
            tx: RwLock::new(None),
            event_tx,
        })
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

    /// Obtém estado atual
    pub async fn get_state(&self) -> ConnectionState {
        self.state.read().await.clone()
    }

    async fn run_loop(&self) {
        loop {
            // 1. Busca mDNS
            self.set_state(ConnectionState::Searching).await;
            let target = self.discover_master().await;
            
            if let Some((ip, port)) = target {
                 let addr = format!("{}:{}", ip, port);
                 self.set_state(ConnectionState::Connecting(addr.clone())).await;
                 
                 // 2. Tenta conectar
                 match self.connect_and_handle(&addr).await {
                     Ok(_) => {
                         tracing::info!("Conexão com Master encerrada limpa");
                     },
                     Err(e) => {
                         tracing::error!("Erro na conexão com Master: {}", e);
                         self.broadcast(ClientEvent::Error(e.to_string()));
                     }
                 }
            }

            // Wait before retry
            sleep(Duration::from_secs(5)).await;
        }
    }

    async fn discover_master(&self) -> Option<(String, u16)> {
        let mdns = ServiceDaemon::new().ok()?;
        let receiver = mdns.browse("_giro._tcp.local.").ok()?;
        
        // Timeout de 10s para achar
        let timeout = sleep(Duration::from_secs(10));
        tokio::pin!(timeout);

        loop {
            tokio::select! {
                event = receiver.recv_async() => {
                     match event {
                         Ok(ServiceEvent::ServiceResolved(info)) => {
                             if let Some(ip) = info.get_addresses().iter().next() {
                                  let ip_str = ip.to_string();
                                  let port = info.get_port();
                                  self.broadcast(ClientEvent::MasterFound(ip_str.clone(), port));
                                  return Some((ip_str, port));
                             }
                         },
                         _ => {}
                     }
                }
                _ = &mut timeout => {
                    break;
                }
            }
        }
        None
    }

    async fn connect_and_handle(&self, addr: &str) -> anyhow::Result<()> {
        let url = format!("ws://{}/ws", addr);
        let (ws_stream, _) = connect_async(&url).await?;
        
        self.set_state(ConnectionState::Connected(addr.to_string())).await;
        tracing::info!("Conectado ao Master: {}", addr);

        let (mut write, mut read) = ws_stream.split();
        let (tx, mut rx) = mpsc::channel::<ClientCommand>(10);
        
        {
            let mut tx_lock = self.tx.write().await;
            *tx_lock = Some(tx.clone());
        }

        // Enviar Sync Full inicial
        self.send_sync_full(&tx).await;

        loop {
            tokio::select! {
                // Comandos locais (enviar venda, etc)
                cmd = rx.recv() => {
                    match cmd {
                        Some(ClientCommand::SendSale(sale)) => {
                            let req = MobileRequest {
                                id: chrono::Utc::now().timestamp_millis() as u64,
                                action: "sale.remote_create".into(),
                                payload: serde_json::to_value(SaleRemoteCreatePayload { sale }).unwrap(),
                                token: None,
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
                                token: None,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            let msg = serde_json::to_string(&req)?;
                            write.send(Message::Text(msg)).await?;
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

    async fn send_sync_full(&self, tx: &mpsc::Sender<ClientCommand>) {
        // Envia comando interno para usar o writer do loop
        let _ = tx.send(ClientCommand::SyncFull).await;
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
             },
             "stock.updated" => {
                 self.broadcast(ClientEvent::StockUpdated);
             },
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
                    if obj.contains_key("products") || obj.contains_key("customers") || obj.contains_key("settings") {
                        tracing::info!("Recebendo dados de sincronização...");
                        
                        // Produtos
                        if let Some(products_val) = obj.get("products") {
                            if let Ok(products) = serde_json::from_value::<Vec<Product>>(products_val.clone()) {
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
                            if let Ok(customers) = serde_json::from_value::<Vec<Customer>>(customers_val.clone()) {
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
                            if let Ok(settings) = serde_json::from_value::<Vec<Setting>>(settings_val.clone()) {
                                let repo = SettingsRepository::new(&self.pool);
                                let total = settings.len();
                                let mut count = 0;
                                for s in settings {
                                    if let Err(e) = repo.upsert_from_sync(s).await {
                                        tracing::error!("Erro ao sincronizar configuração: {:?}", e);
                                    } else {
                                        count += 1;
                                    }
                                }
                                tracing::info!("Sincronizados {}/{} configurações", count, total);
                            }
                        }

                        self.broadcast(ClientEvent::SyncCompleted);
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
        let _ = self.event_tx.send(event);
    }
}
