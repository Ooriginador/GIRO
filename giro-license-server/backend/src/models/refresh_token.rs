//! Refresh Token Model
//!
//! Session management via refresh tokens.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Refresh token entity for session management
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub admin_id: Uuid,

    /// SHA256 hash of the actual token
    #[serde(skip_serializing)]
    pub token_hash: String,

    pub expires_at: DateTime<Utc>,

    // Device tracking
    pub device_name: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,

    pub is_revoked: bool,
    pub created_at: DateTime<Utc>,
}

impl RefreshToken {
    /// Check if the token is valid (not expired and not revoked)
    pub fn is_valid(&self) -> bool {
        if self.is_revoked {
            return false;
        }

        self.expires_at > Utc::now()
    }
}

/// Active session info for the user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: Uuid,
    pub device_name: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
    pub is_current: bool,
}

impl From<RefreshToken> for SessionInfo {
    fn from(token: RefreshToken) -> Self {
        Self {
            id: token.id,
            device_name: token.device_name,
            ip_address: token.ip_address,
            created_at: token.created_at,
            is_current: false, // Set by caller
        }
    }
}
