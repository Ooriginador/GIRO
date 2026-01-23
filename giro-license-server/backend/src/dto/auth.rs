//! Auth DTOs
//!
//! Request/Response objects for authentication endpoints.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::AdminSummary;

// ============================================================================
// Register
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email(message = "Email inválido"))]
    pub email: String,

    #[validate(length(min = 8, message = "Senha deve ter no mínimo 8 caracteres"))]
    pub password: String,

    #[validate(length(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres"))]
    pub name: String,

    #[validate(length(max = 20))]
    pub phone: Option<String>,

    #[validate(length(max = 100))]
    pub company_name: Option<String>,

    /// Optional license key to link to account during registration
    #[validate(length(max = 50))]
    pub license_key: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RegisterResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub company_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub message: String,
}

// ============================================================================
// Login
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub admin: AdminSummary,
}

impl LoginResponse {
    pub fn new(
        access_token: String,
        refresh_token: String,
        expires_in: i64,
        admin: AdminSummary,
    ) -> Self {
        Self {
            access_token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in,
            admin,
        }
    }
}

// ============================================================================
// Refresh Token
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RefreshTokenResponse {
    pub access_token: String,
    pub expires_in: i64,
}

// ============================================================================
// Password Reset
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ForgotPasswordRequest {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ForgotPasswordResponse {
    pub message: String,
}

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ResetPasswordRequest {
    pub token: String,

    #[validate(length(min = 8))]
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResetPasswordResponse {
    pub message: String,
}

// ============================================================================
// Profile
// ============================================================================

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateProfileRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: Option<String>,

    #[validate(length(max = 20))]
    pub phone: Option<String>,

    #[validate(length(max = 100))]
    pub company_name: Option<String>,

    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    pub current_password: String,

    #[validate(length(min = 8))]
    pub new_password: String,
}
