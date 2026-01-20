//! Repositório de Lotes de Produto

use crate::models::ProductLotWithProduct;
use sqlx::SqlitePool;

/// Repositório de lotes
pub struct ProductLotRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ProductLotRepository<'a> {
    /// Cria novo repositório
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Busca lote por ID
    pub async fn get_by_id(&self, id: &str) -> Result<Option<ProductLotWithProduct>, sqlx::Error> {
        let lot: Option<ProductLotWithProduct> = sqlx::query_as(
            r#"
            SELECT
                pl.id,
                pl.product_id,
                p.name as product_name,
                p.barcode,
                pl.lot_number,
                pl.expiration_date,
                NULL AS manufacturing_date,
                pl.current_quantity as quantity,
                pl.cost_price
            FROM product_lots pl
            INNER JOIN products p ON pl.product_id = p.id
            WHERE pl.id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(lot)
    }

    /// Lista lotes vencidos
    pub async fn list_expired(
        &self,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<ProductLotWithProduct>, sqlx::Error> {
        let lots: Vec<ProductLotWithProduct> = sqlx::query_as(
            r#"
            SELECT
                pl.id,
                pl.product_id,
                p.name as product_name,
                p.barcode,
                pl.lot_number,
                pl.expiration_date,
                NULL AS manufacturing_date,
                pl.current_quantity as quantity,
                pl.cost_price
            FROM product_lots pl
            INNER JOIN products p ON pl.product_id = p.id
            WHERE pl.expiration_date IS NOT NULL
              AND date(pl.expiration_date) < date('now')
              AND pl.current_quantity > 0
              AND pl.status = 'active'
            ORDER BY pl.expiration_date ASC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        Ok(lots)
    }

    /// Lista lotes que vencem em N dias
    pub async fn list_expiring_within(
        &self,
        days: i32,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<ProductLotWithProduct>, sqlx::Error> {
        let lots: Vec<ProductLotWithProduct> = sqlx::query_as(
            r#"
            SELECT
                pl.id,
                pl.product_id,
                p.name as product_name,
                p.barcode,
                pl.lot_number,
                pl.expiration_date,
                NULL AS manufacturing_date,
                pl.current_quantity as quantity,
                pl.cost_price
            FROM product_lots pl
            INNER JOIN products p ON pl.product_id = p.id
            WHERE pl.expiration_date IS NOT NULL
              AND date(pl.expiration_date) >= date('now')
              AND date(pl.expiration_date) <= date('now', '+' || ? || ' days')
              AND pl.current_quantity > 0
              AND pl.status = 'active'
            ORDER BY pl.expiration_date ASC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(days)
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        Ok(lots)
    }

    /// Lista lotes válidos (não vencem em 30+ dias)
    pub async fn list_valid(
        &self,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<ProductLotWithProduct>, sqlx::Error> {
        let lots: Vec<ProductLotWithProduct> = sqlx::query_as(
            r#"
            SELECT
                pl.id,
                pl.product_id,
                p.name as product_name,
                p.barcode,
                pl.lot_number,
                pl.expiration_date,
                pl.manufacturing_date,
                pl.current_quantity as quantity,
                pl.cost_price
            FROM product_lots pl
            INNER JOIN products p ON pl.product_id = p.id
            WHERE (pl.expiration_date IS NULL 
                   OR date(pl.expiration_date) > date('now', '+30 days'))
              AND pl.current_quantity > 0
              AND pl.status = 'active'
            ORDER BY pl.expiration_date ASC NULLS LAST
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        Ok(lots)
    }

    /// Aplica desconto ao lote
    pub async fn apply_discount(
        &self,
        lot_id: &str,
        discount_percent: f64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE product_lots SET
                discount_percent = ?,
                updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(discount_percent)
        .bind(lot_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Marca lote para transferência
    pub async fn mark_for_transfer(
        &self,
        lot_id: &str,
        notes: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE product_lots SET
                status = 'pending_transfer',
                notes = COALESCE(notes, '') || CASE WHEN ? IS NOT NULL THEN ' [Transfer: ' || ? || ']' ELSE '' END,
                updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(notes)
        .bind(notes)
        .bind(lot_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Marca lote como verificado
    pub async fn mark_verified(&self, lot_id: &str, verified_by: &str) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE product_lots SET
                last_verified_at = datetime('now'),
                last_verified_by = ?,
                updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(verified_by)
        .bind(lot_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Busca lotes de um produto ordenados por FIFO
    pub async fn get_product_lots_fifo(
        &self,
        product_id: &str,
    ) -> Result<Vec<ProductLotWithProduct>, sqlx::Error> {
        let lots: Vec<ProductLotWithProduct> = sqlx::query_as(
            r#"
            SELECT
                pl.id,
                pl.product_id,
                p.name as product_name,
                p.barcode,
                pl.lot_number,
                pl.expiration_date,
                pl.manufacturing_date,
                pl.current_quantity as quantity,
                pl.cost_price
            FROM product_lots pl
            INNER JOIN products p ON pl.product_id = p.id
            WHERE pl.product_id = ?
              AND pl.current_quantity > 0
              AND pl.status = 'active'
            ORDER BY 
                CASE WHEN pl.expiration_date IS NULL THEN 1 ELSE 0 END,
                pl.expiration_date ASC,
                pl.purchase_date ASC
            "#,
        )
        .bind(product_id)
        .fetch_all(self.pool)
        .await?;

        Ok(lots)
    }

    /// Baixa quantidade de um lote
    pub async fn consume_quantity(&self, lot_id: &str, quantity: f64) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE product_lots SET
                current_quantity = current_quantity - ?,
                updated_at = datetime('now')
            WHERE id = ? AND current_quantity >= ?
            "#,
        )
        .bind(quantity)
        .bind(lot_id)
        .bind(quantity)
        .execute(self.pool)
        .await?;

        Ok(())
    }
}
