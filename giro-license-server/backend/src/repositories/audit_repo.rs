//! Audit Repository
//!
//! Database operations for audit logs.

use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::{AuditAction, AuditLog, NewAuditLog};

pub struct AuditRepository {
    pool: PgPool,
}

impl AuditRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Log an action using NewAuditLog struct
    pub async fn create(&self, log: NewAuditLog) -> AppResult<AuditLog> {
        let record = sqlx::query_as::<_, AuditLog>(
            r#"
            INSERT INTO audit_logs (admin_id, license_id, action, ip_address, user_agent, details)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, admin_id, license_id, action, 
                      ip_address, user_agent, details, created_at
            "#,
        )
        .bind(log.admin_id)
        .bind(log.license_id)
        .bind(log.action)
        .bind(log.ip_address)
        .bind(log.user_agent)
        .bind(log.details)
        .fetch_one(&self.pool)
        .await?;

        Ok(record)
    }

    /// Log an action (simple version)
    pub async fn log(
        &self,
        action: AuditAction,
        admin_id: Option<Uuid>,
        license_id: Option<Uuid>,
        ip_address: Option<String>,
        details: serde_json::Value,
    ) -> AppResult<()> {
        sqlx::query(
            r#"
            INSERT INTO audit_logs (admin_id, license_id, action, ip_address, details)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(admin_id)
        .bind(license_id)
        .bind(action)
        .bind(ip_address)
        .bind(details)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// List audit logs for admin
    pub async fn list_by_admin(
        &self,
        admin_id: Uuid,
        limit: i32,
        offset: i32,
    ) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT 
                id, admin_id, license_id,
                action,
                ip_address,
                user_agent, details, created_at
            FROM audit_logs
            WHERE admin_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(admin_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }

    /// List audit logs for license
    pub async fn list_by_license(
        &self,
        license_id: Uuid,
        limit: i32,
    ) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT 
                id, admin_id, license_id,
                action,
                ip_address,
                user_agent, details, created_at
            FROM audit_logs
            WHERE license_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(license_id)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }
}
