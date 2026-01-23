//! API Key Authentication Middleware
//!
//! Extractor for validating API keys from GIRO Desktop clients.

use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

/// API Key header name
pub const API_KEY_HEADER: &str = "X-API-Key";

/// License Key header name
pub const LICENSE_KEY_HEADER: &str = "X-License-Key";

/// Hardware ID header name
pub const HARDWARE_ID_HEADER: &str = "X-Hardware-ID";

/// Authenticated Desktop client extractor
///
/// Validates the API key (license key) and hardware ID from headers.
///
/// Use this in route handlers to require Desktop authentication:
/// ```rust
/// async fn sync_metrics(api_key: ApiKeyAuth) -> impl IntoResponse {
///     format!("License: {}", api_key.license_key)
/// }
/// ```
#[derive(Debug, Clone)]
pub struct ApiKeyAuth {
    /// The validated license ID
    pub license_id: Uuid,
    /// The license key used
    pub license_key: String,
    /// The hardware ID of the client
    pub hardware_id: String,
}

/// API Key authentication error types
#[derive(Debug)]
pub enum ApiKeyError {
    MissingLicenseKey,
    MissingHardwareId,
    InvalidLicenseKey,
    InactiveLicense,
    HardwareMismatch,
    DatabaseError,
}

impl IntoResponse for ApiKeyError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            ApiKeyError::MissingLicenseKey => (
                StatusCode::UNAUTHORIZED,
                "MISSING_LICENSE_KEY",
                "License key header is required",
            ),
            ApiKeyError::MissingHardwareId => (
                StatusCode::UNAUTHORIZED,
                "MISSING_HARDWARE_ID",
                "Hardware ID header is required",
            ),
            ApiKeyError::InvalidLicenseKey => (
                StatusCode::UNAUTHORIZED,
                "INVALID_LICENSE_KEY",
                "The provided license key is invalid",
            ),
            ApiKeyError::InactiveLicense => (
                StatusCode::FORBIDDEN,
                "INACTIVE_LICENSE",
                "The license is not active",
            ),
            ApiKeyError::HardwareMismatch => (
                StatusCode::FORBIDDEN,
                "HARDWARE_MISMATCH",
                "Hardware ID does not match the registered hardware",
            ),
            ApiKeyError::DatabaseError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "Internal server error",
            ),
        };

        let body = Json(json!({
            "success": false,
            "error": {
                "code": code,
                "message": message
            }
        }));

        (status, body).into_response()
    }
}

/// Application state that contains database pool
#[derive(Clone)]
pub struct ApiKeyState {
    pub db: PgPool,
}

impl FromRef<crate::AppState> for ApiKeyState {
    fn from_ref(state: &crate::AppState) -> Self {
        Self {
            db: state.db.clone(),
        }
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for ApiKeyAuth
where
    S: Send + Sync,
    ApiKeyState: FromRef<S>,
{
    type Rejection = ApiKeyError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let api_state = ApiKeyState::from_ref(state);

        // Get license key from headers (try both X-API-Key and X-License-Key)
        let license_key = parts
            .headers
            .get(API_KEY_HEADER)
            .or_else(|| parts.headers.get(LICENSE_KEY_HEADER))
            .ok_or(ApiKeyError::MissingLicenseKey)?
            .to_str()
            .map_err(|_| ApiKeyError::InvalidLicenseKey)?
            .to_string();

        // Get hardware ID from headers
        let hardware_id = parts
            .headers
            .get(HARDWARE_ID_HEADER)
            .ok_or(ApiKeyError::MissingHardwareId)?
            .to_str()
            .map_err(|_| ApiKeyError::MissingHardwareId)?
            .to_string();

        // Validate license key against database
        let license = sqlx::query!(
            r#"
            SELECT id, license_key, status
            FROM licenses
            WHERE license_key = $1
            "#,
            license_key
        )
        .fetch_optional(&api_state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error validating API key: {:?}", e);
            ApiKeyError::DatabaseError
        })?
        .ok_or(ApiKeyError::InvalidLicenseKey)?;

        // Check if license is active
        if license.status != "active" {
            return Err(ApiKeyError::InactiveLicense);
        }

        // Validate hardware ID is registered for this license
        let hardware = sqlx::query!(
            r#"
            SELECT id
            FROM hardware
            WHERE license_id = $1 AND hardware_id = $2 AND is_active = true
            "#,
            license.id,
            hardware_id
        )
        .fetch_optional(&api_state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error validating hardware: {:?}", e);
            ApiKeyError::DatabaseError
        })?;

        if hardware.is_none() {
            return Err(ApiKeyError::HardwareMismatch);
        }

        Ok(ApiKeyAuth {
            license_id: license.id,
            license_key,
            hardware_id,
        })
    }
}

impl ApiKeyAuth {
    /// Get the license ID
    pub fn license_id(&self) -> Uuid {
        self.license_id
    }

    /// Get the license key
    pub fn license_key(&self) -> &str {
        &self.license_key
    }

    /// Get the hardware ID
    pub fn hardware_id(&self) -> &str {
        &self.hardware_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_responses() {
        // Test that errors produce correct status codes
        let error = ApiKeyError::MissingLicenseKey;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let error = ApiKeyError::InactiveLicense;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);

        let error = ApiKeyError::DatabaseError;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
