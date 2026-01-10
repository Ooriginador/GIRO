//! Metrics Routes
//!
//! Metrics sync and dashboard endpoints.

use axum::{
    extract::{Path, Query, State},
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;

use crate::dto::metrics::SyncMetricsRequest;
use crate::errors::AppResult;
use crate::middleware::auth::AuthAdmin;
use crate::models::{DashboardData, Metrics};
use crate::AppState;

pub fn metrics_routes() -> Router<AppState> {
    Router::new()
        .route("/sync", post(sync_metrics))
        .route("/time", get(get_server_time))
        .route("/dashboard", get(get_dashboard))
        .route("/analytics", get(get_analytics))
        .route("/license/:key", get(get_license_metrics))
}

/// POST /metrics/sync - Sync metrics from desktop
async fn sync_metrics(
    State(state): State<AppState>,
    Json(payload): Json<SyncMetricsPayload>,
) -> AppResult<Json<serde_json::Value>> {
    let metrics_service = state.metrics_service();

    metrics_service
        .sync(&payload.license_key, &payload.hardware_id, payload.metrics)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "synced_at": Utc::now()
    })))
}

#[derive(Debug, Deserialize)]
struct SyncMetricsPayload {
    license_key: String,
    hardware_id: String,
    metrics: SyncMetricsRequest,
}

/// GET /metrics/time - Get server time (for sync)
async fn get_server_time() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "server_time": Utc::now(),
        "timezone": "UTC"
    }))
}

/// GET /metrics/dashboard - Get dashboard data
async fn get_dashboard(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Query(query): Query<DashboardQuery>,
) -> AppResult<Json<DashboardData>> {
    let metrics_service = state.metrics_service();
    let days = query.days.unwrap_or(7).min(90);

    let data = metrics_service.get_dashboard(auth.admin_id, days).await?;

    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
struct DashboardQuery {
    days: Option<i32>,
}

/// GET /metrics/license/:key - Get metrics for a specific license
async fn get_license_metrics(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(key): Path<String>,
    Query(query): Query<DateRangeQuery>,
) -> AppResult<Json<Vec<Metrics>>> {
    let metrics_service = state.metrics_service();

    let end_date = query.end_date.unwrap_or_else(|| Utc::now().date_naive());
    let start_date = query
        .start_date
        .unwrap_or_else(|| end_date - chrono::Duration::days(7));

    let metrics = metrics_service
        .get_license_metrics(&key, auth.admin_id, start_date, end_date)
        .await?;

    Ok(Json(metrics))
}

#[derive(Debug, Deserialize)]
struct DateRangeQuery {
    start_date: Option<NaiveDate>,
    end_date: Option<NaiveDate>,
}

/// GET /metrics/analytics - Get analytics data for charts
async fn get_analytics(
    State(state): State<AppState>,
    _auth: AuthAdmin,
    Query(query): Query<AnalyticsQuery>,
) -> AppResult<Json<AnalyticsResponse>> {
    let pool = &state.db;
    let days = query.period.unwrap_or(30).min(90) as i64;
    let end_date = Utc::now().date_naive();
    let start_date = end_date - chrono::Duration::days(days);
    let start_datetime = start_date.and_hms_opt(0, 0, 0).unwrap().and_utc();

    // Query licenses by day
    let license_stats: Vec<LicenseChartPoint> = sqlx::query_as!(
        LicenseChartPoint,
        r#"
        SELECT 
            DATE(created_at) as "date!: NaiveDate",
            COUNT(*) FILTER (WHERE status = 'active') as "active!: i64",
            COUNT(*) FILTER (WHERE status = 'expired' OR expires_at < NOW()) as "expired!: i64"
        FROM licenses
        WHERE created_at >= $1
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
        "#,
        start_datetime
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Query hardware activations by day (using hardware table)
    let device_stats: Vec<DeviceChartPoint> = sqlx::query_as!(
        DeviceChartPoint,
        r#"
        SELECT 
            DATE(first_seen) as "date!: NaiveDate",
            COUNT(*) as "count!: i64"
        FROM hardware
        WHERE first_seen >= $1
        GROUP BY DATE(first_seen)
        ORDER BY DATE(first_seen)
        "#,
        start_datetime
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Generate revenue chart (mock for now - would need Stripe integration)
    let revenue_chart: Vec<RevenueChartPoint> = (0..days)
        .map(|i| {
            let date = start_date + chrono::Duration::days(i);
            RevenueChartPoint {
                date,
                value: 0.0, // Placeholder until Stripe integration
            }
        })
        .collect();

    Ok(Json(AnalyticsResponse {
        revenue_chart,
        licenses_chart: license_stats,
        devices_chart: device_stats,
    }))
}

#[derive(Debug, Deserialize)]
struct AnalyticsQuery {
    period: Option<i32>,
}

#[derive(Debug, serde::Serialize)]
struct AnalyticsResponse {
    revenue_chart: Vec<RevenueChartPoint>,
    licenses_chart: Vec<LicenseChartPoint>,
    devices_chart: Vec<DeviceChartPoint>,
}

#[derive(Debug, serde::Serialize)]
struct RevenueChartPoint {
    date: NaiveDate,
    value: f64,
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
struct LicenseChartPoint {
    date: NaiveDate,
    active: i64,
    expired: i64,
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
struct DeviceChartPoint {
    date: NaiveDate,
    count: i64,
}
