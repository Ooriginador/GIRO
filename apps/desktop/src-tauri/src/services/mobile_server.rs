//! Servidor WebSocket para conexões mobile
//!
//! Gerencia conexões, autenticação e roteamento de mensagens.

use crate::services::mobile_handlers::{
    AuthHandler, CategoriesHandler, ExpirationHandler, InventoryHandler, ProductsHandler,
    StockHandler, SystemHandler,
};
use crate::services::mobile_protocol::{
    LegacyScannerMessage, LegacyScannerResponse, MobileAction, MobileErrorCode, MobileEvent,
    MobileRequest, MobileResponse,
};
use crate::services::mobile_session::SessionManager;

use futures_util::{SinkExt, StreamExt};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// Configuração do servidor mobile
#[derive(Debug, Clone)]
pub struct MobileServerConfig {
    /// Porta do servidor
    pub port: u16,
    /// Host para bind
    pub host: String,
    /// Timeout de conexão em segundos
    pub connection_timeout_secs: u64,
    /// Máximo de conexões simultâneas
    pub max_connections: usize,
}

impl Default for MobileServerConfig {
    fn default() -> Self {
        Self {
            port: 3847,
            host: "0.0.0.0".to_string(),
            connection_timeout_secs: 300,
            max_connections: 10,
        }
    }
}

/// Estado de uma conexão mobile
#[derive(Debug, Clone)]
pub struct MobileConnection {
    /// ID da conexão
    pub id: String,
    /// Endereço do cliente
    pub addr: SocketAddr,
    /// ID do employee autenticado
    pub employee_id: Option<String>,
    /// Role do employee
    pub employee_role: Option<String>,
    /// Token de sessão
    pub token: Option<String>,
    /// Timestamp da conexão
    pub connected_at: chrono::DateTime<chrono::Utc>,
    /// Último ping
    pub last_ping: chrono::DateTime<chrono::Utc>,
}

/// Servidor WebSocket Mobile
pub struct MobileServer {
    config: MobileServerConfig,
    pool: SqlitePool,
    session_manager: Arc<SessionManager>,
    connections: Arc<RwLock<HashMap<String, MobileConnection>>>,
    event_tx: broadcast::Sender<MobileEvent>,
    shutdown_tx: RwLock<Option<mpsc::Sender<()>>>,
    system_handler: Arc<SystemHandler>,
}

impl MobileServer {
    /// Cria novo servidor
    pub fn new(
        pool: SqlitePool,
        config: MobileServerConfig,
        pdv_name: String,
        store_name: String,
        store_document: Option<String>,
    ) -> Self {
        let (event_tx, _) = broadcast::channel(100);

        Self {
            config,
            pool: pool.clone(),
            session_manager: SessionManager::new(
                std::env::var("JWT_SECRET").unwrap_or_else(|_| "giro-secret-key".to_string()),
            ),
            connections: Arc::new(RwLock::new(HashMap::new())),
            event_tx,
            shutdown_tx: RwLock::new(None),
            system_handler: Arc::new(SystemHandler::new(pdv_name, store_name, store_document)),
        }
    }

    /// Inicia o servidor
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let addr = format!("{}:{}", self.config.host, self.config.port);
        let listener = TcpListener::bind(&addr).await?;

        tracing::info!("🔌 Servidor Mobile WebSocket iniciado em {}", addr);

        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        *self.shutdown_tx.write().await = Some(shutdown_tx);

        loop {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((stream, addr)) => {
                            // Verificar limite de conexões
                            let conn_count = self.connections.read().await.len();
                            if conn_count >= self.config.max_connections {
                                tracing::warn!("Limite de conexões atingido: {}", conn_count);
                                continue;
                            }

                            self.handle_connection(stream, addr).await;
                        }
                        Err(e) => {
                            tracing::error!("Erro ao aceitar conexão: {}", e);
                        }
                    }
                }
                _ = shutdown_rx.recv() => {
                    tracing::info!("Servidor Mobile WebSocket encerrando...");
                    break;
                }
            }
        }

        Ok(())
    }

    /// Encerra o servidor
    pub async fn stop(&self) {
        if let Some(tx) = self.shutdown_tx.read().await.as_ref() {
            let _ = tx.send(()).await;
        }

        // Invalidar todas as sessões
        for (id, conn) in self.connections.read().await.iter() {
            if let Some(token) = &conn.token {
                self.session_manager.invalidate_session(token).await;
            }
            tracing::info!("Conexão encerrada: {}", id);
        }
    }

    /// Processa nova conexão
    async fn handle_connection(&self, stream: TcpStream, addr: SocketAddr) {
        let pool = self.pool.clone();
        let session_manager = self.session_manager.clone();
        let connections = self.connections.clone();
        let mut event_rx = self.event_tx.subscribe();
        let system_handler = self.system_handler.clone();
        let timeout = self.config.connection_timeout_secs;

        tokio::spawn(async move {
            let ws_stream = match tokio_tungstenite::accept_async(stream).await {
                Ok(ws) => ws,
                Err(e) => {
                    tracing::error!("Erro no handshake WebSocket: {}", e);
                    return;
                }
            };

            let connection_id = uuid::Uuid::new_v4().to_string();
            tracing::info!("📱 Nova conexão mobile: {} de {}", connection_id, addr);

            // Registrar conexão
            let connection = MobileConnection {
                id: connection_id.clone(),
                addr,
                employee_id: None,
                employee_role: None,
                token: None,
                connected_at: chrono::Utc::now(),
                last_ping: chrono::Utc::now(),
            };

            connections
                .write()
                .await
                .insert(connection_id.clone(), connection);

            let (mut ws_sender, mut ws_receiver) = ws_stream.split();

            // Criar handlers
            let auth_handler = AuthHandler::new(pool.clone(), session_manager.clone());
            let products_handler = ProductsHandler::new(pool.clone());
            let stock_handler = StockHandler::new(pool.clone());
            let inventory_handler = InventoryHandler::new(pool.clone());
            let expiration_handler = ExpirationHandler::new(pool.clone());
            let categories_handler = CategoriesHandler::new(pool.clone());

            loop {
                tokio::select! {
                    // Mensagem do cliente
                    msg = ws_receiver.next() => {
                        match msg {
                            Some(Ok(Message::Text(text))) => {
                                // Atualizar last_ping
                                if let Some(conn) = connections.write().await.get_mut(&connection_id) {
                                    conn.last_ping = chrono::Utc::now();
                                }

                                // Tentar detectar se é mensagem legacy do scanner
                                if let Ok(legacy_msg) = serde_json::from_str::<LegacyScannerMessage>(&text) {
                                    // Processar mensagem legacy do scanner
                                    let response = handle_legacy_scanner_message(
                                        legacy_msg,
                                        &connection_id,
                                        &pool,
                                    ).await;

                                    let response_json = serde_json::to_string(&response).unwrap();
                                    if let Err(e) = ws_sender.send(Message::Text(response_json)).await {
                                        tracing::error!("Erro ao enviar resposta legacy: {}", e);
                                        break;
                                    }
                                    continue;
                                }

                                // Parsear request moderna
                                let request: MobileRequest = match serde_json::from_str(&text) {
                                    Ok(req) => req,
                                    Err(e) => {
                                        let error = MobileResponse::error(
                                            0,
                                            MobileErrorCode::InvalidFormat,
                                            format!("JSON inválido: {}", e),
                                        );
                                        let _ = ws_sender
                                            .send(Message::Text(serde_json::to_string(&error).unwrap()))
                                            .await;
                                        continue;
                                    }
                                };

                                // Processar ação
                                let response = process_request(
                                    &request,
                                    &connections,
                                    &connection_id,
                                    &auth_handler,
                                    &products_handler,
                                    &stock_handler,
                                    &inventory_handler,
                                    &expiration_handler,
                                    &categories_handler,
                                    &system_handler,
                                ).await;

                                // Enviar resposta
                                let response_json = serde_json::to_string(&response).unwrap();
                                if let Err(e) = ws_sender.send(Message::Text(response_json)).await {
                                    tracing::error!("Erro ao enviar resposta: {}", e);
                                    break;
                                }
                            }
                            Some(Ok(Message::Close(_))) => {
                                tracing::info!("Conexão fechada pelo cliente: {}", connection_id);
                                break;
                            }
                            Some(Ok(Message::Ping(data))) => {
                                let _ = ws_sender.send(Message::Pong(data)).await;
                            }
                            Some(Err(e)) => {
                                tracing::error!("Erro na conexão {}: {}", connection_id, e);
                                break;
                            }
                            None => break,
                            _ => {}
                        }
                    }
                    // Eventos broadcast
                    event = event_rx.recv() => {
                        if let Ok(event) = event {
                            let event_json = serde_json::to_string(&event).unwrap();
                            if let Err(e) = ws_sender.send(Message::Text(event_json)).await {
                                tracing::error!("Erro ao enviar evento: {}", e);
                                break;
                            }
                        }
                    }
                    // Timeout
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(timeout)) => {
                        let conn = connections.read().await.get(&connection_id).cloned();
                        if let Some(conn) = conn {
                            let elapsed = chrono::Utc::now() - conn.last_ping;
                            if elapsed.num_seconds() > timeout as i64 {
                                tracing::info!("Timeout na conexão: {}", connection_id);
                                break;
                            }
                        }
                    }
                }
            }

            // Remover conexão
            if let Some(conn) = connections.write().await.remove(&connection_id) {
                if let Some(token) = conn.token {
                    session_manager.invalidate_session(&token).await;
                }
                tracing::info!("📴 Conexão removida: {}", connection_id);
            }
        });
    }

    /// Envia evento para todos os clientes conectados
    pub fn broadcast_event(&self, event: MobileEvent) {
        let _ = self.event_tx.send(event);
    }

    /// Retorna número de conexões ativas
    pub async fn connection_count(&self) -> usize {
        self.connections.read().await.len()
    }

    /// Lista conexões ativas
    pub async fn list_connections(&self) -> Vec<MobileConnection> {
        self.connections.read().await.values().cloned().collect()
    }

    /// Desconecta um dispositivo específico
    pub async fn disconnect(&self, connection_id: &str) {
        let mut conns = self.connections.write().await;
        if let Some(conn) = conns.remove(connection_id) {
            if let Some(token) = &conn.token {
                self.session_manager.invalidate_session(token).await;
            }
            tracing::info!("Dispositivo desconectado manualmente: {}", connection_id);
        }
    }
}

/// Processa uma requisição
#[allow(clippy::too_many_arguments)]
async fn process_request(
    request: &MobileRequest,
    connections: &Arc<RwLock<HashMap<String, MobileConnection>>>,
    connection_id: &str,
    auth_handler: &AuthHandler,
    products_handler: &ProductsHandler,
    stock_handler: &StockHandler,
    inventory_handler: &InventoryHandler,
    expiration_handler: &ExpirationHandler,
    categories_handler: &CategoriesHandler,
    system_handler: &SystemHandler,
) -> MobileResponse {
    let id = request.id;
    let action_str = &request.action;

    // Parsear ação
    let action = match MobileAction::from_str(action_str) {
        Some(a) => a,
        None => {
            return MobileResponse::error(
                id,
                MobileErrorCode::InvalidAction,
                format!("Ação desconhecida: {}", action_str),
            );
        }
    };

    // Ações que não precisam de autenticação
    if matches!(
        action,
        MobileAction::AuthLogin | MobileAction::SystemPing | MobileAction::SystemInfo
    ) {
        return match action {
            MobileAction::AuthLogin => {
                let payload = match serde_json::from_value(request.payload.clone()) {
                    Ok(p) => p,
                    Err(e) => {
                        return MobileResponse::error(
                            id,
                            MobileErrorCode::ValidationError,
                            format!("Payload inválido: {}", e),
                        );
                    }
                };

                let response = auth_handler.login(id, payload).await;

                // Se login bem-sucedido, atualizar conexão
                if response.success {
                    if let Some(data) = &response.data {
                        let mut conns = connections.write().await;
                        if let Some(conn) = conns.get_mut(connection_id) {
                            conn.employee_id = data
                                .get("employeeId")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
                            conn.employee_role = data
                                .get("role")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
                            conn.token = data
                                .get("token")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());
                        }
                    }
                }

                response
            }
            MobileAction::SystemPing => system_handler.ping(id),
            MobileAction::SystemInfo => system_handler.info(id),
            _ => unreachable!(),
        };
    }

    // Verificar autenticação
    let conn = connections.read().await.get(connection_id).cloned();
    let (employee_id, employee_role) = match conn {
        Some(c) if c.employee_id.is_some() => (
            c.employee_id.unwrap(),
            c.employee_role.unwrap_or_else(|| "VIEWER".to_string()),
        ),
        _ => {
            return MobileResponse::error(
                id,
                MobileErrorCode::AuthRequired,
                "Autenticação necessária",
            );
        }
    };

    // Processar ação autenticada
    match action {
        MobileAction::AuthLogout => {
            let response = auth_handler.logout(id, &employee_id).await;

            // Limpar dados da conexão
            let mut conns = connections.write().await;
            if let Some(conn) = conns.get_mut(connection_id) {
                conn.employee_id = None;
                conn.employee_role = None;
                conn.token = None;
            }

            response
        }
        MobileAction::AuthValidate => {
            let token = request.token.as_deref().unwrap_or("");
            auth_handler.validate(id, token).await
        }

        // Produtos
        MobileAction::ProductGet => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(e) => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        format!("Payload inválido: {}", e),
                    );
                }
            };
            products_handler.get(id, payload).await
        }
        MobileAction::ProductSearch => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(e) => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        format!("Payload inválido: {}", e),
                    );
                }
            };
            products_handler.search(id, payload).await
        }
        MobileAction::ProductCreate => {
            products_handler
                .create(id, request.payload.clone(), &employee_role)
                .await
        }
        MobileAction::ProductUpdate => {
            products_handler
                .update(id, request.payload.clone(), &employee_role)
                .await
        }

        // Estoque
        MobileAction::StockAdjust => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(e) => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        format!("Payload inválido: {}", e),
                    );
                }
            };
            stock_handler
                .adjust(id, payload, &employee_id, &employee_role)
                .await
        }
        MobileAction::StockList => {
            let filter = request
                .payload
                .get("filter")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let limit = request
                .payload
                .get("limit")
                .and_then(|v| v.as_i64())
                .unwrap_or(50) as i32;
            let offset = request
                .payload
                .get("offset")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32;
            stock_handler.list(id, filter, limit, offset).await
        }
        MobileAction::StockHistory => {
            let product_id = match request.payload.get("productId").and_then(|v| v.as_str()) {
                Some(id) => id,
                None => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        "productId é obrigatório",
                    );
                }
            };
            let limit = request
                .payload
                .get("limit")
                .and_then(|v| v.as_i64())
                .unwrap_or(20) as i32;
            stock_handler.history(id, product_id, limit).await
        }

        // Inventário
        MobileAction::InventoryStart => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(e) => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        format!("Payload inválido: {}", e),
                    );
                }
            };
            inventory_handler
                .start(id, payload, &employee_id, &employee_role)
                .await
        }
        MobileAction::InventoryCount => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(e) => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        format!("Payload inválido: {}", e),
                    );
                }
            };
            inventory_handler
                .count(id, payload, &employee_id, &employee_role)
                .await
        }
        MobileAction::InventoryFinish => {
            let inventory_id = match request.payload.get("inventoryId").and_then(|v| v.as_str()) {
                Some(id) => id,
                None => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        "inventoryId é obrigatório",
                    );
                }
            };
            let apply = request
                .payload
                .get("applyAdjustments")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            inventory_handler
                .finish(id, inventory_id, apply, &employee_id, &employee_role)
                .await
        }
        MobileAction::InventoryCancel => {
            let inventory_id = match request.payload.get("inventoryId").and_then(|v| v.as_str()) {
                Some(id) => id,
                None => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        "inventoryId é obrigatório",
                    );
                }
            };
            let reason = request
                .payload
                .get("reason")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            inventory_handler
                .cancel(id, inventory_id, reason, &employee_role)
                .await
        }
        MobileAction::InventoryStatus => inventory_handler.status(id).await,

        // Validades
        MobileAction::ExpirationList => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(_) => crate::services::mobile_protocol::ExpirationListPayload {
                    days_ahead: 30,
                    days: None,
                    limit: None,
                    offset: None,
                    filter: None,
                },
            };
            expiration_handler.list(id, payload).await
        }
        MobileAction::ExpirationAction => {
            let payload = match serde_json::from_value(request.payload.clone()) {
                Ok(p) => p,
                Err(e) => {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::ValidationError,
                        format!("Payload inválido: {}", e),
                    );
                }
            };
            expiration_handler
                .action(id, payload, &employee_id, &employee_role)
                .await
        }

        // Categorias
        MobileAction::CategoryList => categories_handler.list(id).await,

        // Ações não implementadas
        _ => MobileResponse::error(
            id,
            MobileErrorCode::InvalidAction,
            format!("Ação não implementada: {:?}", action),
        ),
    }
}

// ════════════════════════════════════════════════════════════════════════════
// COMPATIBILIDADE COM SCANNER LEGACY
// ════════════════════════════════════════════════════════════════════════════

/// Processa mensagens do scanner mobile (formato antigo)
async fn handle_legacy_scanner_message(
    msg: LegacyScannerMessage,
    connection_id: &str,
    pool: &SqlitePool,
) -> LegacyScannerResponse {
    match msg {
        LegacyScannerMessage::Barcode {
            code,
            format: _,
            timestamp: _,
        } => {
            // Buscar nome do produto
            let product_name = lookup_product_name(pool, &code).await;

            tracing::info!(
                "📦 Scanner legacy - código: {} (produto: {:?})",
                code,
                product_name
            );

            LegacyScannerResponse::Ack { code, product_name }
        }
        LegacyScannerMessage::Ping => LegacyScannerResponse::Pong,
        LegacyScannerMessage::Register {
            device_id,
            device_name,
        } => {
            tracing::info!(
                "📱 Scanner legacy registrado: {} (name: {:?})",
                device_id,
                device_name
            );
            LegacyScannerResponse::Connected {
                session_id: connection_id.to_string(),
            }
        }
        LegacyScannerMessage::Disconnect => {
            tracing::info!("👋 Scanner legacy desconectado");
            LegacyScannerResponse::Connected {
                session_id: connection_id.to_string(),
            }
        }
    }
}

/// Busca nome do produto pelo código de barras
async fn lookup_product_name(pool: &SqlitePool, barcode: &str) -> Option<String> {
    let result = sqlx::query_scalar::<_, String>(
        "SELECT name FROM products WHERE barcode = ? AND is_active = 1 LIMIT 1",
    )
    .bind(barcode)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    // Se não encontrou por barcode, tenta por internal_code
    if result.is_none() {
        return sqlx::query_scalar::<_, String>(
            "SELECT name FROM products WHERE internal_code = ? AND is_active = 1 LIMIT 1",
        )
        .bind(barcode)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = MobileServerConfig::default();
        assert_eq!(config.port, 3847);
        assert_eq!(config.host, "0.0.0.0");
    }
}
