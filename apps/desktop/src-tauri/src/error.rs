//! Tipos de Erro Unificados

use serde::Serialize;
use thiserror::Error;

/// Erro principal da aplicação
#[derive(Error, Debug)]
pub enum AppError {
    // ═══════════════════════════════════════════════════════════════════════
    // Erros de Banco de Dados
    // ═══════════════════════════════════════════════════════════════════════
    #[error("Erro de banco de dados: {0}")]
    Database(String),

    #[error("Registro não encontrado: {entity} com id {id}")]
    NotFound { entity: String, id: String },

    #[error("Registro duplicado: {0}")]
    Duplicate(String),

    #[error("Violação de constraint: {0}")]
    Constraint(String),

    // ═══════════════════════════════════════════════════════════════════════
    // Erros de Validação
    // ═══════════════════════════════════════════════════════════════════════
    #[error("Validação falhou: {0}")]
    Validation(String),

    #[error("Campo obrigatório: {0}")]
    RequiredField(String),

    #[error("Valor inválido para {field}: {message}")]
    InvalidValue { field: String, message: String },

    // ═══════════════════════════════════════════════════════════════════════
    // Erros de Negócio
    // ═══════════════════════════════════════════════════════════════════════
    #[error("Estoque insuficiente: disponível {available}, solicitado {requested}")]
    InsufficientStock { available: f64, requested: f64 },

    #[error("Caixa não aberto")]
    CashSessionNotOpen,

    #[error("Caixa já aberto")]
    CashSessionAlreadyOpen,

    #[error("Venda não pode ser cancelada: {0}")]
    SaleCannotBeCanceled(String),

    #[error("Operação não autorizada: {0}")]
    Unauthorized(String),

    #[error("PIN ou senha inválidos")]
    InvalidCredentials,

    #[error("Produto vencido não pode ser vendido")]
    ExpiredProduct,

    #[error("Desconto excede limite permitido: máximo {max}%")]
    DiscountExceedsLimit { max: f64 },

    #[error("Permissão negada")]
    PermissionDenied,

    // ═══════════════════════════════════════════════════════════════════════
    // Erros de Hardware
    // ═══════════════════════════════════════════════════════════════════════
    #[error("Erro de hardware: {0}")]
    Hardware(String),

    // ═══════════════════════════════════════════════════════════════════════
    // Erros de Sistema
    // ═══════════════════════════════════════════════════════════════════════
    #[error("Erro de IO: {0}")]
    Io(#[from] std::io::Error),

    #[error("Erro de serialização: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Erro interno: {0}")]
    Internal(String),

    #[error("Erro de sistema: {0}")]
    System(String),

    #[error("Erro de banco de dados SQL: {0}")]
    Sql(#[from] sqlx::Error),
}

/// Resultado padrão da aplicação
pub type AppResult<T> = Result<T, AppError>;

// Conversão de HardwareError para AppError
impl From<crate::hardware::HardwareError> for AppError {
    fn from(err: crate::hardware::HardwareError) -> Self {
        AppError::Hardware(err.to_string())
    }
}

// Implementação para serialização do erro no Tauri
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        use serde::ser::SerializeStruct;

        let mut state = serializer.serialize_struct("AppError", 3)?;

        // Código do erro
        let code = match self {
            Self::Database(_) => "DATABASE_ERROR",
            Self::NotFound { .. } => "NOT_FOUND",
            Self::Duplicate(_) => "DUPLICATE",
            Self::Constraint(_) => "CONSTRAINT_VIOLATION",
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::RequiredField(_) => "REQUIRED_FIELD",
            Self::InvalidValue { .. } => "INVALID_VALUE",
            Self::InsufficientStock { .. } => "INSUFFICIENT_STOCK",
            Self::CashSessionNotOpen => "CASH_SESSION_NOT_OPEN",
            Self::CashSessionAlreadyOpen => "CASH_SESSION_ALREADY_OPEN",
            Self::SaleCannotBeCanceled(_) => "SALE_CANNOT_BE_CANCELED",
            Self::Unauthorized(_) => "UNAUTHORIZED",
            Self::InvalidCredentials => "INVALID_CREDENTIALS",
            Self::ExpiredProduct => "EXPIRED_PRODUCT",
            Self::DiscountExceedsLimit { .. } => "DISCOUNT_EXCEEDS_LIMIT",
            Self::Hardware(_) => "HARDWARE_ERROR",
            Self::Io(_) => "IO_ERROR",
            Self::Serialization(_) => "SERIALIZATION_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
            Self::PermissionDenied => "PERMISSION_DENIED",
            Self::System(_) => "SYSTEM_ERROR",
            Self::Sql(_) => "SQL_ERROR",
        };

        state.serialize_field("code", code)?;
        state.serialize_field("message", &self.to_string())?;

        // Dados adicionais
        let details: Option<serde_json::Value> = match self {
            Self::NotFound { entity, id } => Some(serde_json::json!({
                "entity": entity,
                "id": id
            })),
            Self::InvalidValue { field, message } => Some(serde_json::json!({
                "field": field,
                "message": message
            })),
            Self::InsufficientStock {
                available,
                requested,
            } => Some(serde_json::json!({
                "available": available,
                "requested": requested
            })),
            Self::DiscountExceedsLimit { max } => Some(serde_json::json!({
                "max": max
            })),
            _ => None,
        };

        state.serialize_field("details", &details)?;
        state.end()
    }
}
