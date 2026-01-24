//! Protocolo de comunicação Mobile ↔ Desktop
//!
//! Define estruturas de mensagens WebSocket compatíveis com o GIRO Mobile.
//! Também suporta mensagens legadas do scanner mobile.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ════════════════════════════════════════════════════════════════════════════
// REQUEST (Mobile → Desktop)
// ════════════════════════════════════════════════════════════════════════════

/// Requisição recebida do Mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileRequest {
    /// ID único para correlacionar resposta
    pub id: u64,
    /// Ação a executar (namespace.action)
    pub action: String,
    /// Dados da requisição
    pub payload: serde_json::Value,
    /// Token JWT de autenticação (opcional para auth.login)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    /// Timestamp do cliente em milissegundos
    pub timestamp: i64,
}

// ════════════════════════════════════════════════════════════════════════════
// MENSAGENS LEGADAS DO SCANNER (Compatibilidade Retroativa)
// ════════════════════════════════════════════════════════════════════════════

/// Mensagem recebida do scanner mobile (formato antigo)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum LegacyScannerMessage {
    /// Código de barras escaneado
    Barcode {
        code: String,
        format: Option<String>,
        timestamp: i64,
    },
    /// Ping para manter conexão
    Ping,
    /// Registro do dispositivo
    Register {
        device_id: String,
        device_name: Option<String>,
    },
    /// Desconexão
    Disconnect,
}

/// Resposta para scanner mobile (formato antigo)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum LegacyScannerResponse {
    /// Confirmação de conexão
    Connected { session_id: String },
    /// Confirmação de scan recebido
    Ack {
        code: String,
        product_name: Option<String>,
    },
    /// Pong em resposta ao ping
    Pong,
    /// Erro
    Error { message: String },
}

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE (Desktop → Mobile)
// ════════════════════════════════════════════════════════════════════════════

/// Resposta enviada para o Mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileResponse {
    /// ID da requisição original
    pub id: u64,
    /// Se a operação foi bem sucedida
    pub success: bool,
    /// Dados da resposta (se sucesso)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    /// Erro (se falha)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<MobileError>,
    /// Timestamp do servidor em milissegundos
    pub timestamp: i64,
}

impl MobileResponse {
    /// Cria resposta de sucesso
    pub fn success<T: Serialize>(id: u64, data: T) -> Self {
        Self {
            id,
            success: true,
            data: Some(serde_json::to_value(data).unwrap_or_default()),
            error: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// Cria resposta de erro
    pub fn error(id: u64, code: MobileErrorCode, message: impl Into<String>) -> Self {
        Self {
            id,
            success: false,
            data: None,
            error: Some(MobileError {
                code,
                message: message.into(),
                details: None,
            }),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// Cria resposta de erro com detalhes
    pub fn error_with_details(
        id: u64,
        code: MobileErrorCode,
        message: impl Into<String>,
        details: HashMap<String, serde_json::Value>,
    ) -> Self {
        Self {
            id,
            success: false,
            data: None,
            error: Some(MobileError {
                code,
                message: message.into(),
                details: Some(details),
            }),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT (Desktop → Mobile - Push)
// ════════════════════════════════════════════════════════════════════════════

/// Tipo de evento push
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MobileEventType {
    StockUpdated,
    StockLow,
    StockZero,
    ExpirationWarning,
    ExpirationExpired,
    LotExpired,
    InventoryStarted,
    InventoryUpdated,
    InventoryCompleted,
    InventoryFinished,
    ProductUpdated,
    SaleCompleted,
    SessionClosed,
    SessionExpired,
    SyncRequired,
}

impl std::fmt::Display for MobileEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::StockUpdated => write!(f, "stock.updated"),
            Self::StockLow => write!(f, "stock.low"),
            Self::StockZero => write!(f, "stock.zero"),
            Self::ExpirationWarning => write!(f, "expiration.warning"),
            Self::ExpirationExpired => write!(f, "expiration.expired"),
            Self::LotExpired => write!(f, "lot.expired"),
            Self::InventoryStarted => write!(f, "inventory.started"),
            Self::InventoryUpdated => write!(f, "inventory.updated"),
            Self::InventoryCompleted => write!(f, "inventory.completed"),
            Self::InventoryFinished => write!(f, "inventory.finished"),
            Self::ProductUpdated => write!(f, "product.updated"),
            Self::SaleCompleted => write!(f, "sale.completed"),
            Self::SessionClosed => write!(f, "session.closed"),
            Self::SessionExpired => write!(f, "session.expired"),
            Self::SyncRequired => write!(f, "sync.required"),
        }
    }
}

/// Evento push enviado para o Mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileEvent {
    /// ID único do evento
    pub id: String,
    /// Nome do evento
    pub event: String,
    /// Dados do evento
    pub data: serde_json::Value,
    /// Timestamp em milissegundos
    pub timestamp: i64,
}

impl MobileEvent {
    /// Cria novo evento
    pub fn new<T: Serialize>(event: impl Into<String>, data: T) -> Self {
        Self {
            id: format!("evt_{}", uuid::Uuid::new_v4()),
            event: event.into(),
            data: serde_json::to_value(data).unwrap_or_default(),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// Cria novo evento com tipo tipado
    pub fn from_type<T: Serialize>(event_type: MobileEventType, data: T) -> Self {
        Self::new(event_type.to_string(), data)
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ERROR
// ════════════════════════════════════════════════════════════════════════════

/// Erro retornado nas respostas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileError {
    /// Código do erro
    pub code: MobileErrorCode,
    /// Mensagem legível
    pub message: String,
    /// Detalhes adicionais
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<HashMap<String, serde_json::Value>>,
}

/// Códigos de erro padronizados
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MobileErrorCode {
    // Auth
    AuthRequired,
    AuthInvalid,
    AuthExpired,
    // Data
    NotFound,
    ValidationError,
    DuplicateEntry,
    InvalidFormat,
    InvalidAction,
    InvalidState,
    // Business
    InsufficientStock,
    InventoryInProgress,
    PermissionDenied,
    // System
    InternalError,
    Timeout,
    ConnectionLost,
    UnknownAction,
}

impl std::fmt::Display for MobileErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AuthRequired => write!(f, "AUTH_REQUIRED"),
            Self::AuthInvalid => write!(f, "AUTH_INVALID"),
            Self::AuthExpired => write!(f, "AUTH_EXPIRED"),
            Self::NotFound => write!(f, "NOT_FOUND"),
            Self::ValidationError => write!(f, "VALIDATION_ERROR"),
            Self::DuplicateEntry => write!(f, "DUPLICATE_ENTRY"),
            Self::InvalidFormat => write!(f, "INVALID_FORMAT"),
            Self::InvalidAction => write!(f, "INVALID_ACTION"),
            Self::InvalidState => write!(f, "INVALID_STATE"),
            Self::InsufficientStock => write!(f, "INSUFFICIENT_STOCK"),
            Self::InventoryInProgress => write!(f, "INVENTORY_IN_PROGRESS"),
            Self::PermissionDenied => write!(f, "PERMISSION_DENIED"),
            Self::InternalError => write!(f, "INTERNAL_ERROR"),
            Self::Timeout => write!(f, "TIMEOUT"),
            Self::ConnectionLost => write!(f, "CONNECTION_LOST"),
            Self::UnknownAction => write!(f, "UNKNOWN_ACTION"),
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIONS - Tipos de ação suportados
// ════════════════════════════════════════════════════════════════════════════

/// Ações suportadas pelo servidor
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MobileAction {
    // Auth
    AuthLogin,
    AuthLogout,
    AuthValidate,
    AuthSystem,
    // Products
    ProductGet,
    ProductSearch,
    ProductCreate,
    ProductUpdate,
    // Stock
    StockAdjust,
    StockList,
    StockHistory,
    // Inventory
    InventoryStart,
    InventoryCount,
    InventoryFinish,
    InventoryCancel,
    InventoryStatus,
    // Expiration
    ExpirationList,
    ExpirationAction,
    // Categories
    CategoryList,
    // System
    SystemPing,
    SystemInfo,
    // Sync (PC-to-PC)
    SyncFull,
    SyncDelta,
    SaleRemoteCreate,
}

impl MobileAction {
    /// Parseia string de ação
    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "auth.login" => Some(Self::AuthLogin),
            "auth.logout" => Some(Self::AuthLogout),
            "auth.validate" => Some(Self::AuthValidate),
            "auth.system" => Some(Self::AuthSystem),
            "product.get" => Some(Self::ProductGet),
            "product.search" => Some(Self::ProductSearch),
            "product.create" => Some(Self::ProductCreate),
            "product.update" => Some(Self::ProductUpdate),
            "stock.adjust" => Some(Self::StockAdjust),
            "stock.list" => Some(Self::StockList),
            "stock.history" => Some(Self::StockHistory),
            "inventory.start" => Some(Self::InventoryStart),
            "inventory.count" => Some(Self::InventoryCount),
            "inventory.finish" => Some(Self::InventoryFinish),
            "inventory.cancel" => Some(Self::InventoryCancel),
            "inventory.status" => Some(Self::InventoryStatus),
            "expiration.list" => Some(Self::ExpirationList),
            "expiration.action" => Some(Self::ExpirationAction),
            "category.list" => Some(Self::CategoryList),
            "system.ping" => Some(Self::SystemPing),
            "system.info" => Some(Self::SystemInfo),
            "sync.full" => Some(Self::SyncFull),
            "sync.delta" => Some(Self::SyncDelta),
            "sale.remote_create" => Some(Self::SaleRemoteCreate),
            _ => None,
        }
    }

    /// Verifica se ação requer autenticação
    pub fn requires_auth(&self) -> bool {
        !matches!(
            self,
            Self::AuthLogin | Self::AuthSystem | Self::SystemPing | Self::SystemInfo
        )
    }
}

// ════════════════════════════════════════════════════════════════════════════
// PAYLOADS - Estruturas de dados para cada action
// ════════════════════════════════════════════════════════════════════════════

/// Payload de login
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthLoginPayload {
    pub pin: String,
    pub device_id: String,
    pub device_name: String,
}

/// Payload de login de sistema (PC-to-PC)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSystemPayload {
    pub secret: String,
    pub terminal_id: String,
    pub terminal_name: String,
}

/// Resposta de login
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthLoginResponse {
    pub token: String,
    pub expires_at: String,
    pub employee: EmployeeInfo,
}

/// Informações do funcionário (seguro)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeInfo {
    pub id: String,
    pub name: String,
    pub role: String,
}

/// Payload de busca de produto
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductGetPayload {
    pub barcode: String,
}

/// Payload de busca de produtos
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSearchPayload {
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<String>,
}

fn default_limit() -> i32 {
    20
}

/// Payload de ajuste de estoque
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockAdjustPayload {
    pub product_id: String,
    #[serde(rename = "type")]
    pub movement_type: String,
    pub quantity: f64,
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lot_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allow_negative: Option<bool>,
}

/// Resposta de ajuste de estoque
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockAdjustResponse {
    pub previous_stock: f64,
    pub new_stock: f64,
    pub movement_id: String,
}

/// Payload de início de inventário
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryStartPayload {
    pub scope: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
}

/// Payload de contagem de inventário
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryCountPayload {
    pub inventory_id: String,
    pub product_id: String,
    pub counted_quantity: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lot_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Payload de finalização de inventário
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryFinishPayload {
    pub inventory_id: String,
    pub apply_adjustments: bool,
}

/// Payload de lista de validades
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpirationListPayload {
    #[serde(default = "default_days_ahead")]
    pub days_ahead: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<String>,
}

fn default_days_ahead() -> i32 {
    30
}

/// Payload de ação em lote
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpirationActionPayload {
    pub lot_id: String,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub discount_percent: Option<f64>,
}

/// Payload de Sincronização Completa
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFullPayload {
    /// Tabelas solicitadas (products, customers, settings, etc)
    pub tables: Vec<String>,
}

/// Payload de Sincronização Delta
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDeltaPayload {
    /// Timestamp da última sincronização
    pub last_sync: i64,
}

/// Payload de Venda Remota (Satellite -> Master)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleRemoteCreatePayload {
    pub sale: serde_json::Value, // Full Sale object
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT DATA - Dados para eventos push
// ════════════════════════════════════════════════════════════════════════════

/// Dados do evento stock.updated
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockUpdatedEventData {
    pub product_id: String,
    pub product_name: String,
    pub previous_stock: f64,
    pub new_stock: f64,
    #[serde(rename = "type")]
    pub movement_type: String,
}

/// Dados do evento stock.low
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockLowEventData {
    pub product_id: String,
    pub product_name: String,
    pub current_stock: f64,
    pub min_stock: f64,
}

/// Dados do evento expiration.alert
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpirationAlertEventData {
    pub product_id: String,
    pub product_name: String,
    pub lot_id: String,
    pub expiration_date: String,
    pub days_until_expiration: i32,
    pub urgency: String,
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mobile_action_parsing() {
        assert_eq!(
            MobileAction::from_str("auth.login"),
            Some(MobileAction::AuthLogin)
        );
        assert_eq!(
            MobileAction::from_str("product.get"),
            Some(MobileAction::ProductGet)
        );
        assert_eq!(MobileAction::from_str("invalid"), None);
    }

    #[test]
    fn test_requires_auth() {
        assert!(!MobileAction::AuthLogin.requires_auth());
        assert!(!MobileAction::SystemPing.requires_auth());
        assert!(MobileAction::ProductGet.requires_auth());
        assert!(MobileAction::StockAdjust.requires_auth());
    }

    #[test]
    fn test_mobile_response_success() {
        let response = MobileResponse::success(1, serde_json::json!({"name": "Test"}));
        assert!(response.success);
        assert!(response.error.is_none());
        assert!(response.data.is_some());
    }

    #[test]
    fn test_mobile_response_error() {
        let response =
            MobileResponse::error(1, MobileErrorCode::NotFound, "Produto não encontrado");
        assert!(!response.success);
        assert!(response.error.is_some());
        assert!(response.data.is_none());
    }

    #[test]
    fn test_mobile_event_new() {
        let event = MobileEvent::new(
            "stock.updated",
            StockUpdatedEventData {
                product_id: "1".into(),
                product_name: "Test".into(),
                previous_stock: 10.0,
                new_stock: 5.0,
                movement_type: "OUT".into(),
            },
        );
        assert!(event.id.starts_with("evt_"));
        assert_eq!(event.event, "stock.updated");
    }
}
