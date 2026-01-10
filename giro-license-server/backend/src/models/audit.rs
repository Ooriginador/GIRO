//! Audit log model - Security and action tracking

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

/// Audit action types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "audit_action", rename_all = "snake_case")]
pub enum AuditAction {
    // Auth
    Login,
    Logout,
    LoginFailed,
    PasswordReset,

    // Licenses
    LicenseCreated,
    LicenseActivated,
    LicenseValidated,
    LicenseValidationFailed,
    LicenseTransferred,
    LicenseSuspended,
    LicenseRevoked,

    // Hardware
    HardwareRegistered,
    HardwareConflict,
    HardwareCleared,

    // Payments
    PaymentCreated,
    PaymentCompleted,
    PaymentFailed,
}

/// Audit log entity
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub admin_id: Option<Uuid>,
    pub license_id: Option<Uuid>,
    pub action: AuditAction,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// DTO for creating audit log
#[derive(Debug)]
pub struct CreateAuditLog {
    pub admin_id: Option<Uuid>,
    pub license_id: Option<Uuid>,
    pub action: AuditAction,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: serde_json::Value,
}
