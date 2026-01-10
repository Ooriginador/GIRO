//! Database Models
//!
//! Entities that map directly to database tables.

pub mod admin;
pub mod api_key;
pub mod audit_log;
pub mod hardware;
pub mod license;
pub mod metrics;
pub mod payment;
pub mod refresh_token;

// Re-exports
pub use admin::{Admin, AdminSummary};
pub use api_key::{ApiKey, ApiKeySummary, CreateApiKeyResponse};
pub use audit_log::{AuditAction, AuditLog, NewAuditLog};
pub use hardware::{Hardware, HardwareInfo};
pub use license::{License, LicenseStatus, LicenseSummary, PlanType};
pub use metrics::{DashboardAlerts, DashboardData, Metrics, MetricsSummary};
pub use refresh_token::RefreshToken;
