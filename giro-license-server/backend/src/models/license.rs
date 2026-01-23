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
    Lifetime, // Vitalícia: 2 anos suporte + 5 anos validação, depois offline
}

impl Default for PlanType {
    fn default() -> Self {
        Self::Monthly
    }
}

impl PlanType {
    /// Get the number of days for this plan (validation period)
    /// For Lifetime: 5 years of server validation, then can go fully offline
    pub fn days(&self) -> i64 {
        match self {
            PlanType::Monthly => 30,
            PlanType::Semiannual => 180,
            PlanType::Annual => 365,
            PlanType::Lifetime => 1825, // 5 years (5 * 365)
        }
    }

    /// Get the support period in days
    /// For Lifetime: 2 years of updates and support
    pub fn support_days(&self) -> i64 {
        match self {
            PlanType::Monthly => 30,
            PlanType::Semiannual => 180,
            PlanType::Annual => 365,
            PlanType::Lifetime => 730, // 2 years (2 * 365)
        }
    }

    /// Check if this is a lifetime license
    pub fn is_lifetime(&self) -> bool {
        matches!(self, PlanType::Lifetime)
    }

    /// Get the price in cents (BRL)
    pub fn price_cents(&self) -> i64 {
        match self {
            PlanType::Monthly => 9990,     // R$ 99,90
            PlanType::Semiannual => 59940, // R$ 599,40 (14% off)
            PlanType::Annual => 99900,     // R$ 999,00 (17% off)
            PlanType::Lifetime => 249900,  // R$ 2.499,00
        }
    }

    /// Get display name in Portuguese
    pub fn display_name(&self) -> &'static str {
        match self {
            PlanType::Monthly => "Mensal",
            PlanType::Semiannual => "Semestral",
            PlanType::Annual => "Anual",
            PlanType::Lifetime => "Vitalício",
        }
    }
}

impl std::str::FromStr for PlanType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "monthly" | "mensal" => Ok(PlanType::Monthly),
            "semiannual" | "semestral" => Ok(PlanType::Semiannual),
            "annual" | "anual" => Ok(PlanType::Annual),
            "lifetime" | "vitalicio" | "vitalício" => Ok(PlanType::Lifetime),
            _ => Err(format!("Invalid plan type: {}", s)),
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

    // DEPRECATED: Use license_hardware table for new logic
    pub hardware_id: Option<Uuid>,

    // Plan
    pub plan_type: PlanType,
    pub status: LicenseStatus,

    // Important dates
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_validated: Option<DateTime<Utc>>,

    // Lifetime license specific
    /// When 2-year support period ends (for lifetime licenses)
    pub support_expires_at: Option<DateTime<Utc>>,
    /// Whether license can work fully offline (after 5-year validation period)
    pub can_offline: Option<bool>,
    /// When the license transitioned to offline mode
    pub offline_activated_at: Option<DateTime<Utc>>,

    // Counters
    pub validation_count: i64,
    // Add max_hardware count (defaults to 1, but extensible)
    #[sqlx(default)]
    pub max_hardware: i32,

    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Loaded Relations (skipped from SQL)
    #[sqlx(default)]
    pub hardware: Vec<LicenseHardware>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LicenseHardware {
    pub id: Uuid,
    pub license_id: Uuid,
    pub hardware_id: String,
    pub machine_name: Option<String>,
    pub os_version: Option<String>,
    pub cpu_info: Option<String>,
    pub activations_count: i32,
    pub last_activated_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl License {
    /// Check if the license is currently valid
    pub fn is_valid(&self) -> bool {
        if self.status != LicenseStatus::Active {
            return false;
        }

        // Lifetime licenses with offline mode enabled are always valid
        if self.plan_type.is_lifetime() && self.can_offline.unwrap_or(false) {
            return true;
        }

        if let Some(expires_at) = self.expires_at {
            if expires_at < Utc::now() {
                return false;
            }
        }

        true
    }

    /// Check if license can be activated for a specific hardware info
    /// Returns true if:
    /// 1. Hardware ID is already linked (re-activation)
    /// 2. New Hardware ID AND total linked hardware < max_hardware
    pub fn can_activate(&self, hardware_id: &str, current_count: usize) -> bool {
        // Assume 'self.hardware' is populated
        if self.hardware.iter().any(|h| h.hardware_id == hardware_id) {
            return true;
        }

        // New hardware
        if current_count < (self.max_hardware as usize) {
            return true;
        }

        false
    }

    /// Check if license needs renewal soon (within 7 days)
    pub fn needs_renewal_soon(&self) -> bool {
        // Lifetime licenses don't need renewal
        if self.plan_type.is_lifetime() {
            return false;
        }

        if let Some(expires_at) = self.expires_at {
            let days_until = (expires_at - Utc::now()).num_days();
            return days_until <= 7 && days_until > 0;
        }
        false
    }

    /// Check if this is a lifetime license
    pub fn is_lifetime(&self) -> bool {
        self.plan_type.is_lifetime()
    }

    /// Check if support period is still active (for lifetime licenses)
    pub fn has_support(&self) -> bool {
        if !self.plan_type.is_lifetime() {
            return self.is_valid(); // Regular licenses have support while valid
        }

        if let Some(support_expires) = self.support_expires_at {
            return support_expires > Utc::now();
        }

        // If no support_expires_at set, use activated_at + 2 years
        if let Some(activated) = self.activated_at {
            let support_end = activated + chrono::Duration::days(730);
            return support_end > Utc::now();
        }

        false
    }

    /// Check if validation period expired (5 years for lifetime)
    /// After this, license can go fully offline
    pub fn can_go_offline(&self) -> bool {
        if !self.plan_type.is_lifetime() {
            return false; // Only lifetime licenses can go offline
        }

        if let Some(expires_at) = self.expires_at {
            // If past 5-year validation period, can go offline
            return expires_at <= Utc::now();
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
    pub support_expires_at: Option<DateTime<Utc>>,
    pub can_offline: Option<bool>,
    pub created_at: DateTime<Utc>,
    #[sqlx(default)]
    pub max_hardware: i32,
    #[sqlx(default)]
    pub active_hardware_count: Option<i64>, // Field for aggregate queries
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
            support_expires_at: license.support_expires_at,
            can_offline: license.can_offline,
            created_at: license.created_at,
            max_hardware: license.max_hardware,
            active_hardware_count: Some(license.hardware.len() as i64),
        }
    }
}
