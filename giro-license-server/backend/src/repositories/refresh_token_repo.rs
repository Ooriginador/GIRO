//! Refresh Token Repository
//!
//! Database operations for session management.

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::RefreshToken;

pub struct RefreshTokenRepository {
    pool: PgPool,
}

impl RefreshTokenRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create new refresh token
    pub async fn create(
        &self,
        admin_id: Uuid,
        token_hash: &str,
        expires_at: DateTime<Utc>,
        device_name: Option<&str>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> AppResult<RefreshToken> {
        let token = sqlx::query_as!(
            RefreshToken,
            r#"
            INSERT INTO refresh_tokens (
                admin_id, token_hash, expires_at, device_name, ip_address, user_agent
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING 
                id, admin_id, token_hash, expires_at as "expires_at!", device_name,
                ip_address, user_agent, is_revoked as "is_revoked!", created_at as "created_at!"
            "#,
            admin_id,
            token_hash,
            expires_at,
            device_name,
            ip_address,
            user_agent
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(token)
    }

    /// Find by token hash
    pub async fn find_by_hash(&self, token_hash: &str) -> AppResult<Option<RefreshToken>> {
        let token = sqlx::query_as!(
            RefreshToken,
            r#"
            SELECT 
                id, admin_id, token_hash, expires_at as "expires_at!", device_name,
                ip_address, user_agent, is_revoked as "is_revoked!", created_at as "created_at!"
            FROM refresh_tokens
            WHERE token_hash = $1
            AND is_revoked = FALSE
            AND expires_at > NOW()
            "#,
            token_hash
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(token)
    }

    /// Revoke token
    pub async fn revoke(&self, id: Uuid) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE refresh_tokens
            SET is_revoked = TRUE
            WHERE id = $1
            "#,
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Revoke by hash
    pub async fn revoke_by_hash(&self, token_hash: &str) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE refresh_tokens
            SET is_revoked = TRUE
            WHERE token_hash = $1
            "#,
            token_hash
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Revoke all tokens for admin
    pub async fn revoke_all_for_admin(&self, admin_id: Uuid) -> AppResult<u64> {
        let result = sqlx::query!(
            r#"
            UPDATE refresh_tokens
            SET is_revoked = TRUE
            WHERE admin_id = $1 AND is_revoked = FALSE
            "#,
            admin_id
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// List active sessions for admin
    pub async fn list_active_sessions(&self, admin_id: Uuid) -> AppResult<Vec<RefreshToken>> {
        let tokens = sqlx::query_as!(
            RefreshToken,
            r#"
            SELECT 
                id, admin_id, token_hash, expires_at as "expires_at!", device_name,
                ip_address, user_agent, is_revoked as "is_revoked!", created_at as "created_at!"
            FROM refresh_tokens
            WHERE admin_id = $1
            AND is_revoked = FALSE
            AND expires_at > NOW()
            ORDER BY created_at DESC
            "#,
            admin_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(tokens)
    }

    /// Cleanup expired tokens
    pub async fn cleanup_expired(&self) -> AppResult<u64> {
        let result = sqlx::query!(
            r#"
            DELETE FROM refresh_tokens
            WHERE expires_at < NOW() OR is_revoked = TRUE
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }
}
