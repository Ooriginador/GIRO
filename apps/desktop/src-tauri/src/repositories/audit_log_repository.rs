//! Repositório de Auditoria
//!
//! Gerencia logs de auditoria para rastreamento de ações sensíveis

use crate::error::{AppError, AppResult};
use crate::models::{AuditLog, CreateAuditLog};
use sqlx::SqlitePool;
use uuid::Uuid;

/// Repositório para gerenciar logs de auditoria
pub struct AuditLogRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> AuditLogRepository<'a> {
    /// Cria novo repositório
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Cria novo log de auditoria
    pub async fn create(&self, data: CreateAuditLog) -> AppResult<AuditLog> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let action = data.action.to_string();

        sqlx::query(
            r#"
            INSERT INTO audit_logs (
                id, action, employee_id, employee_name,
                target_type, target_id, details, ip_address, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&action)
        .bind(&data.employee_id)
        .bind(&data.employee_name)
        .bind(&data.target_type)
        .bind(&data.target_id)
        .bind(&data.details)
        .bind(&data.ip_address)
        .bind(&now)
        .execute(self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to create audit log: {}", e)))?;

        Ok(AuditLog {
            id,
            action,
            employee_id: data.employee_id,
            employee_name: data.employee_name,
            target_type: data.target_type,
            target_id: data.target_id,
            details: data.details,
            ip_address: data.ip_address,
            created_at: now,
        })
    }

    /// Busca logs por funcionário
    pub async fn find_by_employee(&self, employee_id: &str) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT id, action, employee_id, employee_name,
                   target_type, target_id, details, ip_address, created_at
            FROM audit_logs
            WHERE employee_id = ?
            ORDER BY created_at DESC
            LIMIT 100
            "#,
        )
        .bind(employee_id)
        .fetch_all(self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch audit logs: {}", e)))?;

        Ok(logs)
    }

    /// Busca logs por ação
    pub async fn find_by_action(&self, action: &str) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
        SELECT id, action, employee_id, employee_name,
               target_type, target_id, details, ip_address, created_at
        FROM audit_logs
        WHERE action = ?
        ORDER BY created_at DESC
        LIMIT 100
        "#,
        )
        .bind(action)
        .fetch_all(self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch audit logs: {}", e)))?;

        Ok(logs)
    }

    /// Busca logs recentes (últimas 24h)
    pub async fn find_recent(&self, limit: i32) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT id, action, employee_id, employee_name,
                   target_type, target_id, details, ip_address, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT ?
            "#,
        )
        .bind(limit)
        .fetch_all(self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch recent logs: {}", e)))?;

        Ok(logs)
    }

    /// Busca logs por período
    pub async fn find_by_date_range(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
        SELECT id, action, employee_id, employee_name,
               target_type, target_id, details, ip_address, created_at
        FROM audit_logs
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
        "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch logs by date: {}", e)))?;

        Ok(logs)
    }

    /// Busca logs de segurança (login, logout, bloqueios)
    pub async fn find_security_events(&self) -> AppResult<Vec<AuditLog>> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT id, action, employee_id, employee_name,
                   target_type, target_id, details, ip_address, created_at
            FROM audit_logs
            WHERE action IN (
                'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT_SUCCESS',
                'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
                'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED'
            )
            ORDER BY created_at DESC
            LIMIT 500
            "#,
        )
        .fetch_all(self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch security events: {}", e)))?;

        Ok(logs)
    }

    /// Limpa logs antigos (retenção de 90 dias por padrão)
    pub async fn cleanup_old_logs(&self, days: i32) -> AppResult<u64> {
        let cutoff_date = (chrono::Utc::now() - chrono::Duration::days(days as i64)).to_rfc3339();

        let result = sqlx::query("DELETE FROM audit_logs WHERE created_at < ?")
            .bind(&cutoff_date)
            .execute(self.pool)
            .await
            .map_err(|e| AppError::Database(format!("Failed to cleanup logs: {}", e)))?;

        Ok(result.rows_affected())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AuditAction;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_audit_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_audit_log() {
        let pool = setup_test_db().await;
        let repo = AuditLogRepository::new(&pool);

        let data = CreateAuditLog {
            action: AuditAction::LoginSuccess,
            employee_id: "emp-001".to_string(),
            employee_name: "Test User".to_string(),
            target_type: None,
            target_id: None,
            details: Some("Login from desktop".to_string()),
            ip_address: Some("127.0.0.1".to_string()),
        };

        let result = repo.create(data).await;

        assert!(result.is_ok());
        let log = result.unwrap();
        assert_eq!(log.action, "LOGIN_SUCCESS");
        assert_eq!(log.employee_name, "Test User");
    }

    #[tokio::test]
    async fn test_find_by_employee() {
        let pool = setup_test_db().await;
        let repo = AuditLogRepository::new(&pool);

        // Create multiple logs
        for i in 1..=3 {
            let data = CreateAuditLog {
                action: AuditAction::LoginSuccess,
                employee_id: "emp-001".to_string(),
                employee_name: format!("User {}", i),
                target_type: None,
                target_id: None,
                details: None,
                ip_address: None,
            };
            repo.create(data).await.unwrap();
        }

        let result = repo.find_by_employee("emp-001").await;

        assert!(result.is_ok());
        let logs = result.unwrap();
        assert_eq!(logs.len(), 3);
    }

    #[tokio::test]
    async fn test_find_security_events() {
        let pool = setup_test_db().await;
        let repo = AuditLogRepository::new(&pool);

        // Create security event
        let data = CreateAuditLog {
            action: AuditAction::AccountLocked,
            employee_id: "emp-002".to_string(),
            employee_name: "Locked User".to_string(),
            target_type: None,
            target_id: None,
            details: Some("Too many failed attempts".to_string()),
            ip_address: None,
        };
        repo.create(data).await.unwrap();

        // Create non-security event
        let data2 = CreateAuditLog {
            action: AuditAction::ProductCreated,
            employee_id: "emp-002".to_string(),
            employee_name: "User".to_string(),
            target_type: None,
            target_id: None,
            details: None,
            ip_address: None,
        };
        repo.create(data2).await.unwrap();

        let result = repo.find_security_events().await;

        assert!(result.is_ok());
        let logs = result.unwrap();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].action, "ACCOUNT_LOCKED");
    }
}
