//! Audit Log Model
//!
//! Security audit trail for important actions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

/// Audit action enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "audit_action", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
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

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,

    // References
    pub admin_id: Option<Uuid>,
    pub license_id: Option<Uuid>,

    // Action
    pub action: AuditAction,

    // Context
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,

    // Details
    pub details: serde_json::Value,

    pub created_at: DateTime<Utc>,
}

/// Create a new audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAuditLog {
    pub admin_id: Option<Uuid>,
    pub license_id: Option<Uuid>,
    pub action: AuditAction,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: serde_json::Value,
}

impl NewAuditLog {
    pub fn new(action: AuditAction) -> Self {
        Self {
            admin_id: None,
            license_id: None,
            action,
            ip_address: None,
            user_agent: None,
            details: serde_json::json!({}),
        }
    }

    pub fn with_admin(mut self, admin_id: Uuid) -> Self {
        self.admin_id = Some(admin_id);
        self
    }

    pub fn with_license(mut self, license_id: Uuid) -> Self {
        self.license_id = Some(license_id);
        self
    }

    pub fn with_ip(mut self, ip: impl ToString) -> Self {
        self.ip_address = Some(ip.to_string());
        self
    }

    pub fn with_user_agent(mut self, ua: String) -> Self {
        self.user_agent = Some(ua);
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = details;
        self
    }
}
