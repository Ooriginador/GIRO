//! Repositório de Vendas em Espera
//!
//! Permite pausar e retomar vendas do PDV.
//! Também gerencia pedidos de atendentes aguardando finalização no caixa.

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
            r#"SELECT id, customer_id, discount_value, discount_reason, subtotal, total, 
               employee_id, employee_name, employee_role, status, notes, created_at 
               FROM held_sales WHERE employee_id = ? ORDER BY created_at DESC"#,
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

    /// Busca pedidos por status (para tela do caixa)
    pub async fn find_all_by_status(&self, status: &str) -> AppResult<Vec<HeldSale>> {
        let sales = sqlx::query_as::<_, HeldSale>(
            r#"SELECT id, customer_id, discount_value, discount_reason, subtotal, total,
               employee_id, employee_name, employee_role, status, notes, created_at
               FROM held_sales WHERE status = ? ORDER BY created_at ASC"#,
        )
        .bind(status)
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

    /// Busca todos os pedidos WAITING (para o caixa)
    pub async fn find_waiting_orders(&self) -> AppResult<Vec<HeldSale>> {
        self.find_all_by_status("WAITING").await
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

    pub async fn create(
        &self,
        employee_id: &str,
        employee_name: Option<&str>,
        employee_role: Option<&str>,
        data: CreateHeldSale,
    ) -> AppResult<HeldSale> {
        let mut tx = self.pool.begin().await?;
        let id = data.id.unwrap_or_else(new_id);
        let now = chrono::Utc::now().to_rfc3339();

        let subtotal: f64 = data.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let total = subtotal - data.discount_value;

        // Status inicial: WAITING se for de atendente, senão sem status específico
        let status = if employee_role == Some("ATTENDANT") {
            "WAITING"
        } else {
            "WAITING"
        };

        sqlx::query(
            r#"INSERT INTO held_sales (id, customer_id, discount_value, discount_reason, 
               subtotal, total, employee_id, employee_name, employee_role, status, notes, 
               created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(&id)
        .bind(&data.customer_id)
        .bind(data.discount_value)
        .bind(&data.discount_reason)
        .bind(subtotal)
        .bind(total)
        .bind(employee_id)
        .bind(employee_name)
        .bind(employee_role)
        .bind(status)
        .bind::<Option<&str>>(None) // notes
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
            r#"SELECT id, customer_id, discount_value, discount_reason, subtotal, total, 
               employee_id, employee_name, employee_role, status, notes, created_at 
               FROM held_sales WHERE id = ?"#,
        )
        .bind(&id)
        .fetch_one(self.pool)
        .await?;

        sale.items = self.find_items_by_sale(&id).await?;
        Ok(sale)
    }

    /// Atualiza o status de um pedido
    pub async fn update_status(&self, id: &str, status: &str) -> AppResult<()> {
        sqlx::query("UPDATE held_sales SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(chrono::Utc::now().to_rfc3339())
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM held_sales WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }
}
