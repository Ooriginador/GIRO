//! JWT Utilities
//!
//! JSON Web Token generation and validation.

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::{AppError, AppResult};

/// JWT claims for access tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    /// Subject (admin ID)
    pub sub: Uuid,
    /// Admin email
    pub email: String,
    /// Token type
    pub token_type: String,
    /// Issued at
    pub iat: i64,
    /// Expiration
    pub exp: i64,
}

impl AccessTokenClaims {
    pub fn new(admin_id: Uuid, email: &str, expires_in_seconds: i64) -> Self {
        let now = Utc::now();
        Self {
            sub: admin_id,
            email: email.to_string(),
            token_type: "access".to_string(),
            iat: now.timestamp(),
            exp: (now + Duration::seconds(expires_in_seconds)).timestamp(),
        }
    }
}

/// JWT claims for API keys (desktop validation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyClaims {
    /// License ID
    pub license_id: Uuid,
    /// Hardware fingerprint
    pub hardware_id: String,
    /// Issued at
    pub iat: i64,
    /// Expiration
    pub exp: i64,
}

/// Encode an access token
pub fn encode_access_token(claims: &AccessTokenClaims, secret: &str) -> AppResult<String> {
    encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to encode token: {}", e)))
}

/// Decode and validate an access token
pub fn decode_access_token(token: &str, secret: &str) -> AppResult<AccessTokenClaims> {
    let token_data: TokenData<AccessTokenClaims> = decode(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Unauthorized(format!("Invalid token: {}", e)))?;

    Ok(token_data.claims)
}

/// Generate a random refresh token
pub fn generate_refresh_token() -> String {
    use rand::Rng;
    let token: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(64)
        .map(char::from)
        .collect();
    token
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_access_token_roundtrip() {
        let secret = "test_secret_key_for_jwt_testing_purposes";
        let admin_id = Uuid::new_v4();
        let claims = AccessTokenClaims::new(admin_id, "test@example.com", 3600);

        let token = encode_access_token(&claims, secret).unwrap();
        let decoded = decode_access_token(&token, secret).unwrap();

        assert_eq!(decoded.sub, admin_id);
        assert_eq!(decoded.email, "test@example.com");
    }

    #[test]
    fn test_refresh_token_generation() {
        let token1 = generate_refresh_token();
        let token2 = generate_refresh_token();

        assert_eq!(token1.len(), 64);
        assert_ne!(token1, token2);
    }
}
