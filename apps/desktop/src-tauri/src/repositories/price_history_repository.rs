//! Repositório de Histórico de Preços

use crate::error::AppResult;
use crate::models::{CreatePriceHistory, PriceHistory, PriceHistoryWithProduct};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct PriceHistoryRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> PriceHistoryRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const COLS: &'static str =
        "id, product_id, old_price, new_price, reason, employee_id, created_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<PriceHistory>> {
        let query = format!("SELECT {} FROM price_history WHERE id = ?", Self::COLS);
        let result = sqlx::query_as::<_, PriceHistory>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    /// Retorna histórico de preços de um produto (últimas alterações)
    pub async fn find_by_product(&self, product_id: &str) -> AppResult<Vec<PriceHistory>> {
        let query = format!(
            "SELECT {} FROM price_history WHERE product_id = ? ORDER BY created_at DESC LIMIT 100",
            Self::COLS
        );
        let result = sqlx::query_as::<_, PriceHistory>(&query)
            .bind(product_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    /// Retorna histórico de preços recente com nomes de produto e funcionário
    pub async fn find_recent(&self, limit: i32) -> AppResult<Vec<PriceHistoryWithProduct>> {
        let query = r#"
            SELECT 
                ph.id, 
                ph.product_id, 
                ph.old_price, 
                ph.new_price, 
                ph.reason, 
                ph.employee_id, 
                ph.created_at,
                p.name as product_name,
                e.name as employee_name
            FROM price_history ph
            LEFT JOIN products p ON ph.product_id = p.id
            LEFT JOIN employees e ON ph.employee_id = e.id
            ORDER BY ph.created_at DESC 
            LIMIT ?
        "#;
        let result = sqlx::query_as::<_, PriceHistoryWithProduct>(query)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn create(&self, data: CreatePriceHistory) -> AppResult<PriceHistory> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO price_history (id, product_id, old_price, new_price, reason, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.product_id)
        .bind(data.old_price)
        .bind(data.new_price)
        .bind(&data.reason)
        .bind(&data.employee_id)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "PriceHistory".into(),
                id,
            })
    }

    /// Registra alteração de preço se houve mudança
    pub async fn record_if_changed(
        &self,
        product_id: &str,
        old_price: f64,
        new_price: f64,
        reason: Option<String>,
        employee_id: Option<String>,
    ) -> AppResult<Option<PriceHistory>> {
        // Só registra se o preço realmente mudou
        if (old_price - new_price).abs() < 0.01 {
            return Ok(None);
        }

        let history = self
            .create(CreatePriceHistory {
                product_id: product_id.to_string(),
                old_price,
                new_price,
                reason,
                employee_id,
            })
            .await?;

        Ok(Some(history))
    }
}
