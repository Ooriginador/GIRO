//! Repositório de Alertas

use crate::error::AppResult;
use crate::models::{Alert, CreateAlert};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct AlertRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> AlertRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const COLS: &'static str =
        "id, type, severity, title, message, is_read, is_dismissed, product_id, lot_id, created_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Alert>> {
        let query = format!("SELECT {} FROM alerts WHERE id = ?", Self::COLS);
        let result = sqlx::query_as::<_, Alert>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all(&self, limit: i32) -> AppResult<Vec<Alert>> {
        let query = format!(
            "SELECT {} FROM alerts ORDER BY created_at DESC LIMIT ?",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Alert>(&query)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_unread(&self) -> AppResult<Vec<Alert>> {
        let query = format!(
            "SELECT {} FROM alerts WHERE is_read = 0 ORDER BY severity DESC, created_at DESC",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Alert>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn count_unread(&self) -> AppResult<i64> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM alerts WHERE is_read = 0")
            .fetch_one(self.pool)
            .await?;
        Ok(result.0)
    }

    pub async fn find_by_severity(&self, severity: &str) -> AppResult<Vec<Alert>> {
        let query = format!(
            "SELECT {} FROM alerts WHERE severity = ? AND is_read = 0 ORDER BY created_at DESC",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Alert>(&query)
            .bind(severity)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn create(&self, data: CreateAlert) -> AppResult<Alert> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO alerts (id, type, severity, title, message, is_read, is_dismissed, product_id, lot_id, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.alert_type)
        .bind(&data.severity)
        .bind(&data.title)
        .bind(&data.message)
        .bind(&data.product_id)
        .bind(&data.lot_id)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Alert".into(),
                id,
            })
    }

    pub async fn mark_as_read(&self, id: &str) -> AppResult<()> {
        sqlx::query("UPDATE alerts SET is_read = 1 WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    pub async fn mark_all_as_read(&self) -> AppResult<()> {
        sqlx::query("UPDATE alerts SET is_read = 1 WHERE is_read = 0")
            .execute(self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM alerts WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_old(&self, days: i32) -> AppResult<i64> {
        let result = sqlx::query("DELETE FROM alerts WHERE is_read = 1 AND date(created_at) < date('now', '-' || ? || ' days')")
            .bind(days)
            .execute(self.pool)
            .await?;
        Ok(result.rows_affected() as i64)
    }
}
