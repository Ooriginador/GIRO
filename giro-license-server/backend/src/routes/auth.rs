//! Auth Routes
//!
//! Authentication endpoints.

use axum::{
    extract::{ConnectInfo, State},
    http::StatusCode,
    response::Json,
    routing::{get, patch, post},
    Router,
};
use std::net::SocketAddr;
use validator::Validate;

use crate::dto::auth::{
    ChangePasswordRequest, ForgotPasswordRequest, ForgotPasswordResponse, LoginRequest,
    LoginResponse, RefreshTokenRequest, RefreshTokenResponse, RegisterRequest, RegisterResponse,
    ResetPasswordRequest, ResetPasswordResponse, UpdateProfileRequest,
};
use crate::errors::{AppError, AppResult};
use crate::middleware::auth::AuthAdmin;
use crate::AppState;

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh_token))
        .route("/logout", post(logout))
        .route("/me", get(get_me))
        .route("/profile", patch(update_profile))
        .route("/forgot-password", post(forgot_password))
        .route("/reset-password", post(reset_password))
        .route("/change-password", post(change_password))
}

/// POST /auth/register
async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<RegisterResponse>)> {
    // Validate input
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let auth_service = state.auth_service();

    let response = auth_service
        .register(
            &payload.email,
            &payload.password,
            &payload.name,
            payload.phone.as_deref(),
            payload.company_name.as_deref(),
            payload.license_key.as_deref(),
        )
        .await?;

    Ok((StatusCode::CREATED, Json(response)))
}

/// POST /auth/login
async fn login(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let auth_service = state.auth_service();
    let ip_address = Some(addr.ip());

    let response = auth_service
        .login(&payload.email, &payload.password, ip_address, None)
        .await?;

    Ok(Json(response))
}

/// POST /auth/refresh
async fn refresh_token(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> AppResult<Json<RefreshTokenResponse>> {
    let auth_service = state.auth_service();

    let (access_token, expires_in) = auth_service.refresh_token(&payload.refresh_token).await?;

    Ok(Json(RefreshTokenResponse {
        access_token,
        expires_in,
    }))
}

/// POST /auth/logout
async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> AppResult<StatusCode> {
    let auth_service = state.auth_service();
    auth_service.logout(&payload.refresh_token).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// GET /auth/me - Get current admin info
async fn get_me(
    State(state): State<AppState>,
    auth: AuthAdmin,
) -> AppResult<Json<crate::models::AdminSummary>> {
    let auth_service = state.auth_service();
    
    let admin = auth_service
        .get_admin(auth.admin_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Admin não encontrado".to_string()))?;

    Ok(Json(crate::models::AdminSummary::from(admin)))
}

/// POST /auth/forgot-password - Request password reset
async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> AppResult<Json<ForgotPasswordResponse>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let auth_service = state.auth_service();
    let email_service = state.email_service();
    let reset_url = state.password_reset_url();

    // Generate token and get admin name if email exists
    if let Some((reset_token, admin_name)) = auth_service.generate_reset_token(&payload.email).await? {
        // Send email (async, don't wait or fail if email fails)
        let email = payload.email.clone();
        tokio::spawn(async move {
            if let Err(e) = email_service
                .send_password_reset(&email, &admin_name, &reset_token, &reset_url)
                .await
            {
                tracing::error!("Failed to send password reset email: {}", e);
            }
        });
    }

    // Always return success to prevent email enumeration
    Ok(Json(ForgotPasswordResponse {
        message: "Se o email existir, você receberá instruções para resetar sua senha".to_string(),
    }))
}

/// POST /auth/reset-password - Reset password with token
async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> AppResult<Json<ResetPasswordResponse>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let auth_service = state.auth_service();
    auth_service.reset_password(&payload.token, &payload.new_password).await?;

    Ok(Json(ResetPasswordResponse {
        message: "Senha alterada com sucesso. Faça login com sua nova senha.".to_string(),
    }))
}

/// POST /auth/change-password - Change password (authenticated)
async fn change_password(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Json(payload): Json<ChangePasswordRequest>,
) -> AppResult<Json<ResetPasswordResponse>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let auth_service = state.auth_service();
    auth_service
        .change_password(auth.admin_id, &payload.current_password, &payload.new_password)
        .await?;

    Ok(Json(ResetPasswordResponse {
        message: "Senha alterada com sucesso".to_string(),
    }))
}

/// PATCH /auth/profile - Update profile (authenticated)
async fn update_profile(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Json(payload): Json<UpdateProfileRequest>,
) -> AppResult<Json<crate::models::AdminSummary>> {
    payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let auth_service = state.auth_service();
    let admin = auth_service
        .update_profile(
            auth.admin_id,
            payload.name,
            payload.phone,
            payload.company_name,
            payload.company_cnpj,
            payload.company_address,
            payload.company_city,
            payload.company_state,
        )
        .await?;

    Ok(Json(crate::models::AdminSummary::from(admin)))
}
