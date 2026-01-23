//! Hardware Routes
//!
//! Hardware management endpoints.

use axum::{
    extract::{ConnectInfo, Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::middleware::auth::AuthAdmin;
use crate::models::HardwareInfo;
use crate::AppState;

pub fn hardware_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_hardware))
        .route("/{id}", get(get_hardware).delete(clear_hardware))
        .route("/{id}/deactivate", post(deactivate_hardware))
}

/// GET /hardware - List hardware for admin
async fn list_hardware(
    State(state): State<AppState>,
    auth: AuthAdmin,
) -> AppResult<Json<serde_json::Value>> {
    let hardware_service = state.hardware_service();
    let hardware = hardware_service.list_for_admin(auth.admin_id).await?;
    Ok(Json(serde_json::json!({
        "devices": hardware
    })))
}

/// GET /hardware/:id - Get hardware details
async fn get_hardware(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<Json<HardwareInfo>> {
    let hardware_service = state.hardware_service();
    let hardware = hardware_service.get_by_id(id, auth.admin_id).await?;
    Ok(Json(hardware))
}

/// DELETE /hardware/:id - Clear hardware binding
async fn clear_hardware(
    State(state): State<AppState>,
    auth: AuthAdmin,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let hardware_service = state.hardware_service();
    hardware_service.clear(id, auth.admin_id, Some(addr.ip())).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Hardware desvinculado"
    })))
}

/// POST /hardware/:id/deactivate - Deactivate a hardware device
async fn deactivate_hardware(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let hardware_service = state.hardware_service();
    hardware_service.deactivate(id, auth.admin_id).await?;

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "Dispositivo desativado com sucesso"
        })),
    ))
}
