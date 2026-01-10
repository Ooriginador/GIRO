use axum::{
    body::Body,
    extract::State,
    http::{header::CONTENT_TYPE, Response},
    response::Json,
    routing::get,
    Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use std::time::SystemTime;

use crate::{errors::AppResult, AppState};

pub fn health_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(health_check))
        .route("/metrics", get(prometheus_metrics))
}

async fn health_check(State(state): State<AppState>) -> AppResult<Json<Value>> {
    // Check database connection
    let db_status = check_database(&state.db).await;
    
    // Check Redis connection
    let redis_status = check_redis(&state).await;
    
    let overall_status = if db_status == "connected" && redis_status == "connected" {
        "healthy"
    } else {
        "degraded"
    };
    
    // Calculate uptime (simplified - would need app start time in state)
    let uptime = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    Ok(Json(json!({
        "status": overall_status,
        "version": env!("CARGO_PKG_VERSION"),
        "database": db_status,
        "redis": redis_status,
        "uptime_seconds": uptime,
        "timestamp": chrono::Utc::now(),
    })))
}

async fn check_database(pool: &PgPool) -> &'static str {
    match sqlx::query("SELECT 1").execute(pool).await {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    }
}

async fn check_redis(state: &AppState) -> &'static str {
    use redis::AsyncCommands;
    
    let mut conn = state.redis.clone();
    
    // Usar SET/GET para testar conexão (ping não disponível no ConnectionManager)
    match conn.set::<_, _, ()>("health_check", "ok").await {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    }
}

/// Prometheus-style metrics endpoint
pub async fn prometheus_metrics(State(state): State<AppState>) -> Response<Body> {
    let db_ok = check_database(&state.db).await == "connected";
    let redis_ok = check_redis(&state).await == "connected";
    
    // Get counts from database
    let (licenses_count, admins_count, hardware_count) = get_counts(&state.db).await;
    
    let uptime = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let metrics = format!(
        r#"# HELP giro_up Whether the service is up (1 = up, 0 = down)
# TYPE giro_up gauge
giro_up 1

# HELP giro_database_connected Database connection status
# TYPE giro_database_connected gauge
giro_database_connected {}

# HELP giro_redis_connected Redis connection status
# TYPE giro_redis_connected gauge
giro_redis_connected {}

# HELP giro_uptime_seconds Service uptime in seconds
# TYPE giro_uptime_seconds counter
giro_uptime_seconds {}

# HELP giro_licenses_total Total number of licenses
# TYPE giro_licenses_total gauge
giro_licenses_total {}

# HELP giro_admins_total Total number of admin accounts
# TYPE giro_admins_total gauge
giro_admins_total {}

# HELP giro_hardware_total Total number of registered hardware devices
# TYPE giro_hardware_total gauge
giro_hardware_total {}

# HELP giro_info Build information
# TYPE giro_info gauge
giro_info{{version="{}"}} 1
"#,
        if db_ok { 1 } else { 0 },
        if redis_ok { 1 } else { 0 },
        uptime,
        licenses_count,
        admins_count,
        hardware_count,
        env!("CARGO_PKG_VERSION"),
    );
    
    Response::builder()
        .header(CONTENT_TYPE, "text/plain; version=0.0.4; charset=utf-8")
        .body(Body::from(metrics))
        .unwrap()
}

async fn get_counts(pool: &PgPool) -> (i64, i64, i64) {
    let licenses: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM licenses")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));
    
    let admins: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM admins")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));
    
    let hardware: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hardware")
        .fetch_one(pool)
        .await
        .unwrap_or((0,));
    
    (licenses.0, admins.0, hardware.0)
}
