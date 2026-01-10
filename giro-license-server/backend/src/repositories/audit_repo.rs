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
        let record = sqlx::query_as!(
            AuditLog,
            r#"
            INSERT INTO audit_logs (admin_id, license_id, action, ip_address, user_agent, details)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, admin_id, license_id, action as "action: AuditAction", 
                      ip_address, user_agent, details, created_at as "created_at!"
            "#,
            log.admin_id,
            log.license_id,
            log.action as AuditAction,
            log.ip_address,
            log.user_agent,
            log.details
        )
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
        sqlx::query!(
            r#"
            INSERT INTO audit_logs (admin_id, license_id, action, ip_address, details)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            admin_id,
            license_id,
            action as AuditAction,
            ip_address,
            details
        )
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
        let logs = sqlx::query_as!(
            AuditLog,
            r#"
            SELECT 
                id, admin_id, license_id,
                action as "action: AuditAction",
                ip_address,
                user_agent, details, created_at as "created_at!"
            FROM audit_logs
            WHERE admin_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            admin_id,
            limit as i64,
            offset as i64
        )
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
        let logs = sqlx::query_as!(
            AuditLog,
            r#"
            SELECT 
                id, admin_id, license_id,
                action as "action: AuditAction",
                ip_address,
                user_agent, details, created_at as "created_at!"
            FROM audit_logs
            WHERE license_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
            license_id,
            limit as i64
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }
}
