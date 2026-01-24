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

    pub async fn count_unread(&self) -> AppResult<i32> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM alerts WHERE is_read = 0")
            .fetch_one(self.pool)
            .await?;
        Ok(result.0 as i32)
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

    pub async fn check_os_warranties(&self) -> AppResult<i32> {
        use sqlx::Row;

        // Buscar OS que expiram em breve (próximos 7 dias) e ainda não têm alerta
        let query = r#"
            SELECT 
                so.id, 
                so.order_number, 
                so.warranty_until,
                c.name as customer_name
            FROM service_orders so
            JOIN customers c ON c.id = so.customer_id
            WHERE so.status = 'DELIVERED' 
              AND so.is_paid = 1
              AND so.warranty_until IS NOT NULL
              AND date(so.warranty_until) >= date('now')
              AND date(so.warranty_until) <= date('now', '+7 days')
              AND NOT EXISTS (
                  SELECT 1 FROM alerts a 
                  WHERE a.type = 'WARRANTY_EXPIRATION' 
                    AND a.message LIKE '%' || so.id || '%'
              )
        "#;

        let rows = sqlx::query(query).fetch_all(self.pool).await?;

        let mut created = 0;
        for row in rows {
            let id: String = row.get("id");
            let number: i32 = row.get("order_number");
            let until: String = row.get("warranty_until");
            let customer: String = row.get("customer_name");

            self.create(CreateAlert {
                alert_type: "WARRANTY_EXPIRATION".to_string(),
                severity: "INFO".to_string(),
                title: format!("Garantia Expirando: OS #{}", number),
                message: format!(
                    "A garantia da OS #{} (Cliente: {}) expira em {}. ID OS: {}",
                    number, customer, until, id
                ),
                product_id: None,
                lot_id: None,
            })
            .await?;
            created += 1;
        }

        Ok(created)
    }
}
