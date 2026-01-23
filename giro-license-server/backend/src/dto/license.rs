//! License DTOs
//!
//! Request/Response objects for license management.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::{HardwareInfo, LicenseStatus, LicenseSummary, PlanType};

// ============================================================================
// Create License
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateLicenseRequest {
    pub plan_type: PlanType,

    #[validate(range(min = 1, max = 10))]
    pub quantity: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateLicenseResponse {
    pub licenses: Vec<LicenseSummary>,
    pub message: String,
}

// ============================================================================
// List Licenses
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct ListLicensesQuery {
    pub status: Option<LicenseStatus>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

impl Default for ListLicensesQuery {
    fn default() -> Self {
        Self {
            status: None,
            page: Some(1),
            limit: Some(20),
        }
    }
}

// ============================================================================
// License Details
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct LicenseDetailsResponse {
    pub id: Uuid,
    pub license_key: String,
    pub plan_type: PlanType,
    pub status: LicenseStatus,
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_validated: Option<DateTime<Utc>>,
    pub validation_count: i64,
    // Returned hardware list instead of single hardware
    pub hardware: Vec<HardwareInfo>,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// Activate License (Desktop -> Server)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ActivateLicenseRequest {
    /// Hardware fingerprint (SHA256 of hardware components)
    #[validate(length(equal = 64))]
    pub hardware_id: String,

    /// Machine name
    pub machine_name: Option<String>,

    /// OS version
    pub os_version: Option<String>,

    /// CPU info
    pub cpu_info: Option<String>,

    /// Optional admin data for registration during activation
    pub admin_data: Option<AdminRegistrationData>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct AdminRegistrationData {
    #[validate(length(min = 3))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 10))]
    pub phone: String,
    #[validate(length(min = 4, max = 6))]
    pub pin: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivateLicenseResponse {
    pub status: LicenseStatus,
    pub expires_at: Option<DateTime<Utc>>,
    pub license_key: String,
    pub plan_type: PlanType,
    pub company_name: String,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
    pub max_users: i32,
    pub features: Vec<String>,
    pub support_expires_at: Option<DateTime<Utc>>,
    pub is_lifetime: bool,
    pub can_offline: bool,
    pub message: String,

    /// User details returned if created/synced
    pub admin_user: Option<AdminUserSyncData>,

    /// Indicates if the admin profile is already completed
    pub has_admin: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminUserSyncData {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub password_hash: String,
}

// ============================================================================
// Validate License (Desktop -> Server, periodic check)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ValidateLicenseRequest {
    /// License key
    pub license_key: String,

    /// Hardware fingerprint
    #[validate(length(equal = 64))]
    pub hardware_id: String,

    /// Client timestamp for drift detection
    pub client_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidateLicenseResponse {
    pub valid: bool,
    pub status: LicenseStatus,
    pub expires_at: Option<DateTime<Utc>>,
    pub days_remaining: Option<i64>,
    pub license_key: String,
    pub plan_type: PlanType,
    pub company_name: String,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
    pub max_users: i32,
    pub features: Vec<String>,
    pub support_expires_at: Option<DateTime<Utc>>,
    pub is_lifetime: bool,
    pub can_offline: bool,
    pub message: String,

    /// User details returned if created/synced
    pub admin_user: Option<AdminUserSyncData>,

    /// Indicates if the admin profile is already completed
    pub has_admin: bool,
}

// ============================================================================
// Restore License (Desktop -> Server, auto-recovery)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct RestoreLicenseRequest {
    /// Hardware fingerprint
    #[validate(length(equal = 64))]
    pub hardware_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RestoreLicenseResponse {
    pub found: bool,
    pub license_key: Option<String>,
    pub plan_type: Option<PlanType>,
    pub message: String,
}

// ============================================================================
// Transfer License (Admin operation)
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct TransferLicenseRequest {
    /// Clear current hardware binding
    pub clear_hardware: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TransferLicenseResponse {
    pub status: LicenseStatus,
    pub message: String,
}

// ============================================================================
// License Statistics
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct LicenseStats {
    pub total: i64,
    pub active: i64,
    pub pending: i64,
    pub expired: i64,
    pub suspended: i64,
}

// ============================================================================
// Update Admin Data (Desktop -> Server)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateLicenseAdminRequest {
    #[validate(length(min = 3))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 10))]
    pub phone: String,
    pub company_name: Option<String>,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
    #[validate(length(min = 4, max = 6))]
    pub pin: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateLicenseAdminResponse {
    pub success: bool,
    pub message: String,
}

// ============================================================================
// Claim License (Admin operation)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ClaimLicenseRequest {
    #[validate(length(min = 16, max = 20))]
    pub license_key: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClaimLicenseResponse {
    pub success: bool,
    pub license: LicenseSummary,
    pub message: String,
}
