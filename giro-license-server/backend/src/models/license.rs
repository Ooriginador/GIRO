//! License Model
//!
//! Represents a GIRO license with its activation status.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

/// License status enum matching PostgreSQL enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "license_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum LicenseStatus {
    Pending,
    Active,
    Expired,
    Suspended,
    Revoked,
}

impl Default for LicenseStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// Plan type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "plan_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PlanType {
    Monthly,
    Semiannual,
    Annual,
}

impl Default for PlanType {
    fn default() -> Self {
        Self::Monthly
    }
}

impl PlanType {
    /// Get the number of days for this plan
    pub fn days(&self) -> i64 {
        match self {
            PlanType::Monthly => 30,
            PlanType::Semiannual => 180,
            PlanType::Annual => 365,
        }
    }

    /// Get the price in cents (BRL)
    pub fn price_cents(&self) -> i64 {
        match self {
            PlanType::Monthly => 9990,     // R$ 99,90
            PlanType::Semiannual => 59940, // R$ 599,40 (14% off)
            PlanType::Annual => 99900,     // R$ 999,00 (17% off)
        }
    }
}

/// License entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct License {
    pub id: Uuid,
    /// Format: GIRO-XXXX-XXXX-XXXX-XXXX
    pub license_key: String,

    // Relationships
    pub admin_id: Uuid,
    pub hardware_id: Option<Uuid>,

    // Plan
    pub plan_type: PlanType,
    pub status: LicenseStatus,

    // Important dates
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_validated: Option<DateTime<Utc>>,

    // Counters
    pub validation_count: i64,

    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl License {
    /// Check if the license is currently valid
    pub fn is_valid(&self) -> bool {
        if self.status != LicenseStatus::Active {
            return false;
        }

        if let Some(expires_at) = self.expires_at {
            if expires_at < Utc::now() {
                return false;
            }
        }

        true
    }

    /// Check if the license can be activated
    pub fn can_activate(&self) -> bool {
        self.status == LicenseStatus::Pending && self.hardware_id.is_none()
    }

    /// Check if license needs renewal soon (within 7 days)
    pub fn needs_renewal_soon(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            let days_until = (expires_at - Utc::now()).num_days();
            return days_until <= 7 && days_until > 0;
        }
        false
    }
}

/// License summary for list responses
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LicenseSummary {
    pub id: Uuid,
    pub license_key: String,
    pub plan_type: PlanType,
    pub status: LicenseStatus,
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_validated: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl From<License> for LicenseSummary {
    fn from(license: License) -> Self {
        Self {
            id: license.id,
            license_key: license.license_key,
            plan_type: license.plan_type,
            status: license.status,
            activated_at: license.activated_at,
            expires_at: license.expires_at,
            last_validated: license.last_validated,
            created_at: license.created_at,
        }
    }
}
