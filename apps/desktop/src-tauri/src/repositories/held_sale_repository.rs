//! Repositório de Vendas em Espera
//!
//! Permite pausar e retomar vendas do PDV.

use crate::error::AppResult;
use crate::models::{CreateHeldSale, HeldSale, HeldSaleItem};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct HeldSaleRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> HeldSaleRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn find_all_by_employee(&self, employee_id: &str) -> AppResult<Vec<HeldSale>> {
        let sales = sqlx::query_as::<_, HeldSale>(
            r#"SELECT id, customer_id, discount_value, discount_reason, subtotal, total, employee_id, created_at FROM held_sales WHERE employee_id = ? ORDER BY created_at DESC"#
        )
        .bind(employee_id)
        .fetch_all(self.pool)
        .await?;

        let mut detailed_sales = Vec::new();
        for mut sale in sales {
            let items = self.find_items_by_sale(&sale.id).await?;
            sale.items = items;
            detailed_sales.push(sale);
        }

        Ok(detailed_sales)
    }

    async fn find_items_by_sale(&self, sale_id: &str) -> AppResult<Vec<HeldSaleItem>> {
        let items = sqlx::query_as::<_, HeldSaleItem>(
            r#"SELECT id, held_sale_id, product_id, product_name, barcode, quantity, unit_price, discount, unit, is_weighted FROM held_sale_items WHERE held_sale_id = ?"#
        )
        .bind(sale_id)
        .fetch_all(self.pool)
        .await?;
        Ok(items)
    }

    pub async fn create(&self, employee_id: &str, data: CreateHeldSale) -> AppResult<HeldSale> {
        let mut tx = self.pool.begin().await?;
        let id = data.id.unwrap_or_else(new_id);
        let now = chrono::Utc::now().to_rfc3339();

        let subtotal: f64 = data.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let total = subtotal - data.discount_value;

        sqlx::query(
            "INSERT INTO held_sales (id, customer_id, discount_value, discount_reason, subtotal, total, employee_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.customer_id)
        .bind(data.discount_value)
        .bind(&data.discount_reason)
        .bind(subtotal)
        .bind(total)
        .bind(employee_id)
        .bind(&now)
        .bind(&now)
        .execute(&mut *tx)
        .await?;

        for item in data.items {
            let item_id = new_id();
            sqlx::query(
                "INSERT INTO held_sale_items (id, held_sale_id, product_id, product_name, barcode, quantity, unit_price, discount, unit, is_weighted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(item_id)
            .bind(&id)
            .bind(&item.product_id)
            .bind(&item.product_name)
            .bind(&item.barcode)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(item.discount)
            .bind(&item.unit)
            .bind(item.is_weighted)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        // Re-fetch to return
        let mut sale = sqlx::query_as::<_, HeldSale>(
            r#"SELECT id, customer_id, discount_value, discount_reason, subtotal, total, employee_id, created_at FROM held_sales WHERE id = ?"#
        )
        .bind(&id)
        .fetch_one(self.pool)
        .await?;

        sale.items = self.find_items_by_sale(&id).await?;
        Ok(sale)
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM held_sales WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }
}
