//! Admin Model
//!
//! Represents a GIRO administrator/owner account.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// User role enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Customer,
}

impl Default for UserRole {
    fn default() -> Self {
        Self::Customer
    }
}

/// Admin entity - represents a GIRO account owner
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Admin {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: String,
    pub role: UserRole, // New role field
    pub phone: Option<String>,
    pub company_name: Option<String>,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_address_city: Option<String>,
    pub company_address_state: Option<String>,

    // Verification
    pub is_verified: Option<bool>,
    pub verified_at: Option<DateTime<Utc>>,

    // 2FA
    #[serde(skip_serializing)]
    pub totp_secret: Option<String>,
    pub totp_enabled: Option<bool>,

    // Status
    pub is_active: Option<bool>,

    // Timestamps
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// Admin summary for responses (without sensitive data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminSummary {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: UserRole,
    pub company_name: Option<String>,
    pub is_verified: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
}

impl From<Admin> for AdminSummary {
    fn from(admin: Admin) -> Self {
        Self {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            company_name: admin.company_name,
            is_verified: admin.is_verified,
            created_at: admin.created_at,
        }
    }
}
