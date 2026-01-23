//! API Key Repository

use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::ApiKey;

/// Repository for API Key operations
pub struct ApiKeyRepository {
    pool: PgPool,
}

impl ApiKeyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new API key
    pub async fn create(
        &self,
        admin_id: Uuid,
        name: &str,
        key_hash: &str,
        key_prefix: &str,
        expires_in_days: Option<i64>,
    ) -> AppResult<ApiKey> {
        let id = Uuid::now_v7();
        let expires_at = expires_in_days.map(|days| Utc::now() + Duration::days(days));

        let key = sqlx::query_as::<_, ApiKey>(
            r#"
            INSERT INTO api_keys (id, admin_id, name, key_hash, key_prefix, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, admin_id, name, key_hash, key_prefix, last_used_at, expires_at, created_at, revoked_at
            "#,
        )
        .bind(id)
        .bind(admin_id)
        .bind(name)
        .bind(key_hash)
        .bind(key_prefix)
        .bind(expires_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(key)
    }

    /// List all API keys for an admin
    pub async fn list_by_admin(&self, admin_id: Uuid) -> AppResult<Vec<ApiKey>> {
        let keys = sqlx::query_as::<_, ApiKey>(
            r#"
            SELECT id, admin_id, name, key_hash, key_prefix, last_used_at, expires_at, created_at, revoked_at
            FROM api_keys
            WHERE admin_id = $1 AND revoked_at IS NULL
            ORDER BY created_at DESC
            "#,
        )
        .bind(admin_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(keys)
    }

    /// Get API key by ID
    pub async fn find_by_id(&self, id: Uuid, admin_id: Uuid) -> AppResult<Option<ApiKey>> {
        let key = sqlx::query_as::<_, ApiKey>(
            r#"
            SELECT id, admin_id, name, key_hash, key_prefix, last_used_at, expires_at, created_at, revoked_at
            FROM api_keys
            WHERE id = $1 AND admin_id = $2
            "#,
        )
        .bind(id)
        .bind(admin_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(key)
    }

    /// Find API key by prefix (for validation)
    pub async fn find_by_prefix(&self, prefix: &str) -> AppResult<Option<ApiKey>> {
        let key = sqlx::query_as::<_, ApiKey>(
            r#"
            SELECT id, admin_id, name, key_hash, key_prefix, last_used_at, expires_at, created_at, revoked_at
            FROM api_keys
            WHERE key_prefix = $1 AND revoked_at IS NULL
            "#,
        )
        .bind(prefix)
        .fetch_optional(&self.pool)
        .await?;

        Ok(key)
    }

    /// Revoke an API key
    pub async fn revoke(&self, id: Uuid, admin_id: Uuid) -> AppResult<bool> {
        let result = sqlx::query(
            r#"
            UPDATE api_keys
            SET revoked_at = NOW()
            WHERE id = $1 AND admin_id = $2 AND revoked_at IS NULL
            "#,
        )
        .bind(id)
        .bind(admin_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Update last used timestamp
    pub async fn update_last_used(&self, id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE api_keys
            SET last_used_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
