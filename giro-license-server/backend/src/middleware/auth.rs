//! Auth Middleware
//!
//! JWT authentication extractor for protected routes.

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
    RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use uuid::Uuid;

use crate::errors::AppError;
use crate::utils::jwt::decode_access_token;
use crate::AppState;

/// Authenticated admin extractor
#[derive(Debug, Clone)]
pub struct AuthAdmin {
    pub admin_id: Uuid,
    pub email: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthAdmin {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Extract Authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AppError::Unauthorized("Token não fornecido".to_string()))?;

        // Decode token
        let claims = decode_access_token(bearer.token(), &state.settings.jwt.secret)
            .map_err(|e| {
                tracing::error!("JWT Validation Failed. Token: '{}'. Error: {:?}", bearer.token(), e);
                AppError::Unauthorized(format!("Token inválido: {}", e))
            })?;

        // Check if token is in blacklist (Redis)
        let is_blacklisted = check_token_blacklist(&state, bearer.token())
            .await
            .unwrap_or(false);

        if is_blacklisted {
            return Err(AppError::Unauthorized("Token revogado".to_string()));
        }

        Ok(AuthAdmin {
            admin_id: claims.sub,
            email: claims.email,
        })
    }
}

/// API Key authentication (for desktop clients)
#[derive(Debug, Clone)]
pub struct AuthApiKey {
    pub api_key: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthApiKey {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Check X-API-Key header
        let api_key = parts
            .headers
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        if let Some(key) = api_key {
            // Validate API key format
            if key.starts_with("giro_") {
                return Ok(AuthApiKey { api_key: key });
            }
        }

        // Fallback: check Authorization Bearer
        if let Ok(TypedHeader(Authorization(bearer))) =
            parts.extract::<TypedHeader<Authorization<Bearer>>>().await
        {
            let token = bearer.token().to_string();
            if token.starts_with("giro_") {
                return Ok(AuthApiKey { api_key: token });
            }
        }

        Err(AppError::Unauthorized("API Key inválida".to_string()))
    }
}

/// Check if token is blacklisted in Redis
async fn check_token_blacklist(state: &AppState, token: &str) -> Result<bool, AppError> {
    use redis::AsyncCommands;

    let mut conn = state.redis.clone();
    let key = format!("token:blacklist:{}", token);

    let exists: bool = conn
        .exists(&key)
        .await
        .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;

    Ok(exists)
}

/// Add token to blacklist
pub async fn blacklist_token(state: &AppState, token: &str, ttl_secs: u64) -> Result<(), AppError> {
    use redis::AsyncCommands;

    let mut conn = state.redis.clone();
    let key = format!("token:blacklist:{}", token);

    conn.set_ex::<_, _, ()>(&key, "1", ttl_secs)
        .await
        .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;

    Ok(())
}
