//! License DTOs
//!
//! Request/Response objects for license management.

use serde::{Deserialize, Serialize};
use validator::Validate;
use uuid::Uuid;
use chrono::{DateTime, Utc};

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
    pub hardware: Option<HardwareInfo>,
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
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivateLicenseResponse {
    pub status: LicenseStatus,
    pub expires_at: DateTime<Utc>,
    pub message: String,
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
