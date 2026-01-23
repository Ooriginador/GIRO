use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Json};
use axum::routing::{post, put};
use axum::Router;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::AppResult;
use crate::middleware::auth::AuthAdmin;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub company_name: Option<String>,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct ProfileResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub phone: Option<String>,
    pub company_name: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub fn profile_routes() -> Router<AppState> {
    Router::new()
        .route("/", put(update_profile))
        .route("/password", post(change_password))
}

pub async fn update_profile(
    State(state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Json(payload): Json<UpdateProfileRequest>,
) -> AppResult<impl IntoResponse> {
    let service = state.auth_service();
    
    let updated = service
        .update_profile(
            admin_id,
            payload.name,
            payload.phone,
            payload.company_name,
            payload.company_cnpj,
            payload.company_address,
            payload.company_city,
            payload.company_state,
        )
        .await?;

    Ok(Json(ProfileResponse {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        company_name: updated.company_name,
        created_at: updated.created_at.unwrap_or_else(chrono::Utc::now),
    }))
}

pub async fn change_password(
    State(state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Json(payload): Json<ChangePasswordRequest>,
) -> AppResult<impl IntoResponse> {
    let service = state.auth_service();
    
    service
        .change_password(admin_id, &payload.current_password, &payload.new_password)
        .await?;

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({ "message": "Password changed successfully" })),
    ))
}
