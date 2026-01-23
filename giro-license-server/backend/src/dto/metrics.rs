//! Metrics DTOs
//!
//! Request/Response objects for metrics sync and dashboard.

use serde::{Deserialize, Serialize};
use validator::Validate;
use chrono::{DateTime, NaiveDate, Utc};

use crate::models::{DashboardData, MetricsSummary};

// ============================================================================
// Sync Metrics (Desktop -> Server)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct SyncMetricsRequest {
    /// Date for these metrics
    pub date: NaiveDate,

    /// Total sales value
    #[validate(range(min = 0.0))]
    pub sales_total: f64,

    /// Number of sales
    #[validate(range(min = 0))]
    pub sales_count: i32,

    /// Average ticket value
    pub average_ticket: f64,

    /// Products sold count
    #[validate(range(min = 0))]
    pub products_sold: i32,

    /// Low stock alerts
    pub low_stock_count: Option<i32>,

    /// Expiring products alerts
    pub expiring_count: Option<i32>,

    /// Cash session opens
    pub cash_opens: Option<i32>,

    /// Cash session closes
    pub cash_closes: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncMetricsResponse {
    pub success: bool,
    pub message: String,
    pub synced_at: DateTime<Utc>,
}

// ============================================================================
// Dashboard Data
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct DashboardQuery {
    /// License ID (optional, for admin viewing specific license)
    pub license_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardResponse {
    pub data: DashboardData,
    pub last_sync: Option<DateTime<Utc>>,
}

// ============================================================================
// Metrics History
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct MetricsHistoryQuery {
    /// Start date
    pub start_date: Option<NaiveDate>,

    /// End date
    pub end_date: Option<NaiveDate>,

    /// Group by (day, week, month)
    pub group_by: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MetricsHistoryPoint {
    pub date: NaiveDate,
    pub sales_total: f64,
    pub sales_count: i32,
    pub average_ticket: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MetricsHistoryResponse {
    pub data: Vec<MetricsHistoryPoint>,
    pub summary: MetricsSummary,
}

// ============================================================================
// Alerts
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct AlertItem {
    pub alert_type: String,
    pub message: String,
    pub count: i32,
    pub severity: String, // "warning", "critical"
}

#[derive(Debug, Clone, Serialize)]
pub struct AlertsResponse {
    pub alerts: Vec<AlertItem>,
}
