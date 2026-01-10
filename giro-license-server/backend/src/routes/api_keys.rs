//! API Key Routes

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use axum::extract::Path;
use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::middleware::auth::AuthAdmin;
use crate::services::ApiKeyService;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    #[serde(default)]
    pub expires_in_days: Option<i64>,
}

pub fn api_key_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_api_keys))
        .route("/", post(create_api_key))
        .route("/{id}", delete(revoke_api_key))
}

/// List all API keys for the authenticated admin
pub async fn list_api_keys(
    State(state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<impl IntoResponse> {
    let service = ApiKeyService::new(state.db.clone());
    let keys = service.list(admin_id).await?;
    
    Ok(Json(serde_json::json!({
        "api_keys": keys
    })))
}

/// Create a new API key
pub async fn create_api_key(
    State(state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Json(payload): Json<CreateApiKeyRequest>,
) -> AppResult<impl IntoResponse> {
    let service = ApiKeyService::new(state.db.clone());
    let response = service
        .create(admin_id, &payload.name, payload.expires_in_days)
        .await?;
    
    Ok((StatusCode::CREATED, Json(response)))
}

/// Revoke an API key
pub async fn revoke_api_key(
    State(state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let service = ApiKeyService::new(state.db.clone());
    service.revoke(admin_id, id).await?;
    
    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "API key revoked successfully"
        })),
    ))
}
