//! Modelo de Auditoria
//!
//! Registra ações sensíveis do sistema para conformidade e rastreamento

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

/// Log de auditoria para rastreamento de ações sensíveis
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuditLog {
    pub id: String,
    pub action: String,
    pub employee_id: String,
    pub employee_name: String,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: String,
}

/// Tipos de ação auditável
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuditAction {
    // Autenticação
    LoginSuccess,
    LoginFailed,
    LogoutSuccess,
    AccountLocked,
    AccountUnlocked,

    // Gestão de Senha
    PasswordChanged,
    PasswordResetRequested,
    PasswordResetCompleted,
    PasswordPolicyViolation,

    // Funcionários
    EmployeeCreated,
    EmployeeUpdated,
    EmployeeDeactivated,
    EmployeeActivated,

    // Produtos
    ProductCreated,
    ProductUpdated,
    ProductDeleted,
    PriceChanged,

    // Vendas
    SaleCreated,
    SaleCancelled,

    // Caixa
    CashOpened,
    CashClosed,
    CashWithdrawal,
    CashDeposit,

    // Sistema
    SettingChanged,
    DatabaseBackup,
    DatabaseRestore,

    // Dados Sensíveis
    SensitiveDataAccessed,
    SensitiveDataExported,
}

impl std::fmt::Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::LoginSuccess => write!(f, "LOGIN_SUCCESS"),
            Self::LoginFailed => write!(f, "LOGIN_FAILED"),
            Self::LogoutSuccess => write!(f, "LOGOUT_SUCCESS"),
            Self::AccountLocked => write!(f, "ACCOUNT_LOCKED"),
            Self::AccountUnlocked => write!(f, "ACCOUNT_UNLOCKED"),

            Self::PasswordChanged => write!(f, "PASSWORD_CHANGED"),
            Self::PasswordResetRequested => write!(f, "PASSWORD_RESET_REQUESTED"),
            Self::PasswordResetCompleted => write!(f, "PASSWORD_RESET_COMPLETED"),
            Self::PasswordPolicyViolation => write!(f, "PASSWORD_POLICY_VIOLATION"),

            Self::EmployeeCreated => write!(f, "EMPLOYEE_CREATED"),
            Self::EmployeeUpdated => write!(f, "EMPLOYEE_UPDATED"),
            Self::EmployeeDeactivated => write!(f, "EMPLOYEE_DEACTIVATED"),
            Self::EmployeeActivated => write!(f, "EMPLOYEE_ACTIVATED"),

            Self::ProductCreated => write!(f, "PRODUCT_CREATED"),
            Self::ProductUpdated => write!(f, "PRODUCT_UPDATED"),
            Self::ProductDeleted => write!(f, "PRODUCT_DELETED"),
            Self::PriceChanged => write!(f, "PRICE_CHANGED"),

            Self::SaleCreated => write!(f, "SALE_CREATED"),
            Self::SaleCancelled => write!(f, "SALE_CANCELLED"),

            Self::CashOpened => write!(f, "CASH_OPENED"),
            Self::CashClosed => write!(f, "CASH_CLOSED"),
            Self::CashWithdrawal => write!(f, "CASH_WITHDRAWAL"),
            Self::CashDeposit => write!(f, "CASH_DEPOSIT"),

            Self::SettingChanged => write!(f, "SETTING_CHANGED"),
            Self::DatabaseBackup => write!(f, "DATABASE_BACKUP"),
            Self::DatabaseRestore => write!(f, "DATABASE_RESTORE"),

            Self::SensitiveDataAccessed => write!(f, "SENSITIVE_DATA_ACCESSED"),
            Self::SensitiveDataExported => write!(f, "SENSITIVE_DATA_EXPORTED"),
        }
    }
}

/// Dados para criar log de auditoria
#[derive(Debug, Clone)]
pub struct CreateAuditLog {
    pub action: AuditAction,
    pub employee_id: String,
    pub employee_name: String,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
}
