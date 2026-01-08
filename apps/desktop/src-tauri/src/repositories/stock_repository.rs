//! Repositório de Estoque

use crate::error::AppResult;
use crate::models::{CreateStockMovement, ProductLot, StockMovement};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct StockRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> StockRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const MOVEMENT_COLS: &'static str = "id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at";
    const LOT_COLS: &'static str = "id, product_id, supplier_id, lot_number, expiration_date, purchase_date, initial_quantity, current_quantity, cost_price, status, created_at, updated_at";

    pub async fn find_movement_by_id(&self, id: &str) -> AppResult<Option<StockMovement>> {
        let query = format!("SELECT {} FROM stock_movements WHERE id = ?", Self::MOVEMENT_COLS);
        let result = sqlx::query_as::<_, StockMovement>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_movements_by_product(&self, product_id: &str, limit: i32) -> AppResult<Vec<StockMovement>> {
        let query = format!("SELECT {} FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT ?", Self::MOVEMENT_COLS);
        let result = sqlx::query_as::<_, StockMovement>(&query)
            .bind(product_id)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_recent_movements(&self, limit: i32) -> AppResult<Vec<StockMovement>> {
        let query = format!("SELECT {} FROM stock_movements ORDER BY created_at DESC LIMIT ?", Self::MOVEMENT_COLS);
        let result = sqlx::query_as::<_, StockMovement>(&query)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn create_movement(&self, data: CreateStockMovement) -> AppResult<StockMovement> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Get current stock
        let current: (f64,) = sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
            .bind(&data.product_id)
            .fetch_one(self.pool)
            .await?;
        
        let previous_stock = current.0;
        let new_stock = previous_stock + data.quantity;

        // Create movement
        sqlx::query(
            "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.product_id)
        .bind(&data.movement_type)
        .bind(data.quantity)
        .bind(previous_stock)
        .bind(new_stock)
        .bind(&data.reason)
        .bind(&data.reference_id)
        .bind(&data.reference_type)
        .bind(&data.employee_id)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Update product stock
        sqlx::query("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?")
            .bind(new_stock)
            .bind(&now)
            .bind(&data.product_id)
            .execute(self.pool)
            .await?;

        self.find_movement_by_id(&id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "StockMovement".into(), id })
    }

    pub async fn find_lot_by_id(&self, id: &str) -> AppResult<Option<ProductLot>> {
        let query = format!("SELECT {} FROM product_lots WHERE id = ?", Self::LOT_COLS);
        let result = sqlx::query_as::<_, ProductLot>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_lots_by_product(&self, product_id: &str) -> AppResult<Vec<ProductLot>> {
        let query = format!("SELECT {} FROM product_lots WHERE product_id = ? AND status = 'AVAILABLE' ORDER BY expiration_date ASC", Self::LOT_COLS);
        let result = sqlx::query_as::<_, ProductLot>(&query)
            .bind(product_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_expiring_lots(&self, days: i32) -> AppResult<Vec<ProductLot>> {
        let query = format!("SELECT {} FROM product_lots WHERE status = 'AVAILABLE' AND expiration_date IS NOT NULL AND date(expiration_date) <= date('now', '+' || ? || ' days') ORDER BY expiration_date ASC", Self::LOT_COLS);
        let result = sqlx::query_as::<_, ProductLot>(&query)
            .bind(days)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_expired_lots(&self) -> AppResult<Vec<ProductLot>> {
        let query = format!("SELECT {} FROM product_lots WHERE status = 'AVAILABLE' AND expiration_date IS NOT NULL AND date(expiration_date) < date('now')", Self::LOT_COLS);
        let result = sqlx::query_as::<_, ProductLot>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }
}