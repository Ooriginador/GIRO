//! License Routes
//!
//! License management endpoints.

use axum::{
    extract::{ConnectInfo, Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use validator::Validate;

use crate::dto::license::{
    ActivateLicenseRequest, ActivateLicenseResponse, CreateLicenseRequest, CreateLicenseResponse,
    LicenseDetailsResponse, LicenseStats, ListLicensesQuery,
    TransferLicenseResponse, ValidateLicenseRequest, ValidateLicenseResponse,
};
use crate::dto::pagination::{PaginatedResponse, PaginationMeta};
use crate::errors::{AppError, AppResult};
use crate::middleware::auth::AuthAdmin;
use crate::models::LicenseSummary;
use crate::AppState;

pub fn license_routes() -> Router<AppState> {
    Router::new()
        // Admin endpoints (JWT auth)
        .route("/", get(list_licenses).post(create_license))
        .route("/:key", get(get_license).delete(revoke_license))
        .route("/:key/transfer", post(transfer_license))
        .route("/stats", get(get_stats))
        // Desktop endpoints (API key auth)
        .route("/:key/activate", post(activate_license))
        .route("/:key/validate", post(validate_license))
}

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/// POST /licenses - Create new license(s)
async fn create_license(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Json(payload): Json<CreateLicenseRequest>,
) -> AppResult<(StatusCode, Json<CreateLicenseResponse>)> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let license_service = state.license_service();
    let quantity = payload.quantity.unwrap_or(1);

    let licenses = license_service
        .create_licenses(auth.admin_id, payload.plan_type, quantity)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateLicenseResponse {
            licenses,
            message: format!("{} licença(s) criada(s) com sucesso", quantity),
        }),
    ))
}

/// GET /licenses - List licenses
async fn list_licenses(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Query(query): Query<ListLicensesQuery>,
) -> AppResult<Json<PaginatedResponse<LicenseSummary>>> {
    let license_service = state.license_service();
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).min(100);

    let (licenses, total) = license_service
        .list_licenses(auth.admin_id, query.status, page, limit)
        .await?;

    Ok(Json(PaginatedResponse {
        data: licenses,
        pagination: PaginationMeta::new(page, limit, total),
    }))
}

/// GET /licenses/:key - Get license details
async fn get_license(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(key): Path<String>,
) -> AppResult<Json<LicenseDetailsResponse>> {
    let license_service = state.license_service();
    let details = license_service.get_license_details(&key, auth.admin_id).await?;
    Ok(Json(details))
}

/// DELETE /licenses/:key - Revoke license
async fn revoke_license(
    State(state): State<AppState>,
    auth: AuthAdmin,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(key): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    let license_service = state.license_service();
    license_service.revoke(&key, auth.admin_id, Some(addr.ip())).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Licença revogada"
    })))
}

/// POST /licenses/:key/transfer - Transfer license to new hardware
async fn transfer_license(
    State(state): State<AppState>,
    auth: AuthAdmin,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(key): Path<String>,
) -> AppResult<Json<TransferLicenseResponse>> {
    let license_service = state.license_service();
    let response = license_service.transfer(&key, auth.admin_id, Some(addr.ip())).await?;
    Ok(Json(response))
}

/// GET /licenses/stats - Get license statistics
async fn get_stats(
    State(state): State<AppState>,
    auth: AuthAdmin,
) -> AppResult<Json<LicenseStats>> {
    let license_service = state.license_service();
    let stats = license_service.get_stats(auth.admin_id).await?;

    Ok(Json(LicenseStats {
        total: stats.total,
        active: stats.active,
        pending: stats.pending,
        expired: stats.expired,
        suspended: stats.suspended,
    }))
}

// ============================================================================
// DESKTOP ENDPOINTS (API Key auth)
// ============================================================================

/// POST /licenses/:key/activate - Activate license with hardware binding
async fn activate_license(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(key): Path<String>,
    Json(payload): Json<ActivateLicenseRequest>,
) -> AppResult<Json<ActivateLicenseResponse>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let license_service = state.license_service();

    let response = license_service
        .activate(
            &key,
            &payload.hardware_id,
            payload.machine_name.as_deref(),
            payload.os_version.as_deref(),
            payload.cpu_info.as_deref(),
            Some(addr.ip()),
        )
        .await?;

    Ok(Json(response))
}

/// POST /licenses/:key/validate - Validate license (periodic check)
async fn validate_license(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(key): Path<String>,
    Json(payload): Json<ValidateLicenseRequest>,
) -> AppResult<Json<ValidateLicenseResponse>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let license_service = state.license_service();

    let response = license_service
        .validate(&key, &payload.hardware_id, payload.client_time, Some(addr.ip()))
        .await?;

    Ok(Json(response))
}
