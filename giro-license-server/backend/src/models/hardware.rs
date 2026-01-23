//! Hardware Model
//!
//! Represents a physical machine where GIRO Desktop is installed.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Hardware fingerprint entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Hardware {
    pub id: Uuid,
    /// SHA256 hash of hardware components
    pub fingerprint: String,

    // Machine info
    pub machine_name: Option<String>,
    pub os_version: Option<String>,
    pub cpu_info: Option<String>,

    // Tracking
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub is_active: bool,

    // Network
    pub ip_address: Option<String>,

    pub created_at: DateTime<Utc>,
}

/// Hardware info for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub id: Uuid,
    pub fingerprint: String,
    pub machine_name: Option<String>,
    pub os_version: Option<String>,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub is_active: bool,
}

impl From<Hardware> for HardwareInfo {
    fn from(hw: Hardware) -> Self {
        Self {
            fingerprint: hw.fingerprint,
            id: hw.id,
            machine_name: hw.machine_name,
            os_version: hw.os_version,
            first_seen: hw.first_seen,
            last_seen: hw.last_seen,
            is_active: hw.is_active,
        }
    }
}

/// Hardware info with license key for dashboard display
/// Matches the format expected by the frontend
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HardwareInfoWithLicense {
    pub id: Uuid,
    pub license_key: String,
    pub hardware_id: String,
    pub device_name: Option<String>,
    pub activated_at: DateTime<Utc>,
    pub last_heartbeat: Option<DateTime<Utc>>,
    pub is_active: bool,
}
