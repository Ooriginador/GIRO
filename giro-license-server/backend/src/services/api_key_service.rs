//! API Key Service

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use rand::Rng;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{ApiKeySummary, CreateApiKeyResponse};
use crate::repositories::ApiKeyRepository;

/// Service for API key management
pub struct ApiKeyService {
    repo: ApiKeyRepository,
}

impl ApiKeyService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            repo: ApiKeyRepository::new(pool),
        }
    }

    /// Generate a new API key
    fn generate_api_key() -> (String, String) {
        let mut rng = rand::thread_rng();
        let key_bytes: [u8; 32] = rng.gen();
        let key = base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            key_bytes,
        );
        
        // Prefix for identification: giro_sk_live_
        let full_key = format!("giro_sk_live_{}", key);
        let prefix = format!("giro_sk_live_{}...{}", &key[..4], &key[key.len()-4..]);
        
        (full_key, prefix)
    }

    /// Hash an API key
    fn hash_api_key(key: &str) -> AppResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let hash = argon2
            .hash_password(key.as_bytes(), &salt)
            .map_err(|_| AppError::Internal("Failed to hash API key".to_string()))?
            .to_string();
        
        Ok(hash)
    }

    /// Create a new API key
    pub async fn create(
        &self,
        admin_id: Uuid,
        name: &str,
        expires_in_days: Option<i64>,
    ) -> AppResult<CreateApiKeyResponse> {
        // Generate key
        let (full_key, prefix) = Self::generate_api_key();
        
        // Hash for storage
        let key_hash = Self::hash_api_key(&full_key)?;
        
        // Save to database
        let api_key = self.repo
            .create(admin_id, name, &key_hash, &prefix, expires_in_days)
            .await?;
        
        Ok(CreateApiKeyResponse {
            id: api_key.id,
            name: api_key.name,
            key: full_key, // Only returned once!
            key_prefix: api_key.key_prefix,
            expires_at: api_key.expires_at,
            created_at: api_key.created_at.unwrap_or_else(chrono::Utc::now),
        })
    }

    /// List all API keys for an admin
    pub async fn list(&self, admin_id: Uuid) -> AppResult<Vec<ApiKeySummary>> {
        let keys = self.repo.list_by_admin(admin_id).await?;
        Ok(keys.into_iter().map(ApiKeySummary::from).collect())
    }

    /// Revoke an API key
    pub async fn revoke(&self, admin_id: Uuid, key_id: Uuid) -> AppResult<()> {
        let revoked = self.repo.revoke(key_id, admin_id).await?;
        
        if !revoked {
            return Err(AppError::NotFound("API key not found".to_string()));
        }
        
        Ok(())
    }

    /// Validate an API key and return admin_id if valid
    pub async fn validate(&self, key: &str) -> AppResult<Uuid> {
        // Extract prefix from key
        if !key.starts_with("giro_sk_live_") {
            return Err(AppError::Unauthorized("Invalid API key format".to_string()));
        }
        
        // Find key by prefix pattern
        let key_part = &key[13..]; // Remove "giro_sk_live_"
        let prefix = format!("giro_sk_live_{}...{}", &key_part[..4], &key_part[key_part.len()-4..]);
        
        let api_key = self.repo
            .find_by_prefix(&prefix)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Invalid API key".to_string()))?;
        
        // Check if expired
        if let Some(expires_at) = api_key.expires_at {
            if expires_at < chrono::Utc::now() {
                return Err(AppError::Unauthorized("API key expired".to_string()));
            }
        }
        
        // Verify hash
        let argon2 = Argon2::default();
        let parsed_hash = argon2::PasswordHash::new(&api_key.key_hash)
            .map_err(|_| AppError::Internal("Invalid key hash".to_string()))?;
        
        argon2::PasswordVerifier::verify_password(&argon2, key.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized("Invalid API key".to_string()))?;
        
        // Update last used
        self.repo.update_last_used(api_key.id).await?;
        
        Ok(api_key.admin_id)
    }
}
