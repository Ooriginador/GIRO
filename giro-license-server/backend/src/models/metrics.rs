//! Metrics Model
//!
//! Aggregated metrics from GIRO Desktop installations.

use bigdecimal::BigDecimal;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Daily metrics from a GIRO installation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Metrics {
    pub id: Uuid,
    pub license_id: Uuid,

    /// Reference date for these metrics
    pub date: NaiveDate,

    // Sales data
    pub sales_total: BigDecimal,
    pub sales_count: i32,
    pub average_ticket: BigDecimal,

    // Products
    pub products_sold: i32,

    // Stock alerts
    pub low_stock_count: i32,
    pub expiring_count: i32,

    // Cash sessions
    pub cash_opens: i32,
    pub cash_closes: i32,

    pub synced_at: DateTime<Utc>,
}

/// Metrics summary for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSummary {
    pub total_sales: f64,
    pub total_transactions: i64,
    pub average_ticket: f64,
    pub period_days: i32,
}

/// Dashboard data aggregation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardData {
    pub today: MetricsSummary,
    pub week: MetricsSummary,
    pub month: MetricsSummary,
    pub alerts: DashboardAlerts,
}

/// Daily metric for chart display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyMetric {
    pub date: NaiveDate,
    pub sales_total: BigDecimal,
    pub sales_count: i64,
}

/// Alert counts for dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardAlerts {
    pub low_stock: i32,
    pub expiring_products: i32,
    pub licenses_expiring: i32,
}
