//! Repositório de Vendas

use crate::error::AppResult;
use crate::models::{
    CreateSale, CreateSaleItem, DailySalesSummary, MonthlySalesSummary, PaymentMethodSummary, Sale,
    SaleItem, SaleWithDetails,
};
use crate::repositories::new_id;
use crate::repositories::SettingsRepository;
use sqlx::Row;
use sqlx::SqlitePool;

pub struct SaleRepository<'a> {
    pool: &'a SqlitePool,
    event_service: Option<&'a crate::services::mobile_events::MobileEventService>,
}

impl<'a> SaleRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self {
            pool,
            event_service: None,
        }
    }

    pub fn with_events(
        pool: &'a SqlitePool,
        event_service: &'a crate::services::mobile_events::MobileEventService,
    ) -> Self {
        Self {
            pool,
            event_service: Some(event_service),
        }
    }

    const SALE_COLS: &'static str = "id, daily_number, subtotal, discount_type, discount_value, discount_reason, total, payment_method, amount_paid, change, status, canceled_at, canceled_by_id, cancel_reason, customer_id, employee_id, cash_session_id, created_at, updated_at";
    const ITEM_COLS: &'static str = "id, sale_id, product_id, quantity, unit_price, discount, total, product_name, product_barcode, product_unit, lot_id, created_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Sale>> {
        let query = format!("SELECT {} FROM sales WHERE id = ?", Self::SALE_COLS);
        let result = sqlx::query_as::<_, Sale>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_items_by_sale(&self, sale_id: &str) -> AppResult<Vec<SaleItem>> {
        let query = format!(
            "SELECT {} FROM sale_items WHERE sale_id = ?",
            Self::ITEM_COLS
        );
        let result = sqlx::query_as::<_, SaleItem>(&query)
            .bind(sale_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_with_details(&self, id: &str) -> AppResult<Option<SaleWithDetails>> {
        let sale = self.find_by_id(id).await?;
        match sale {
            Some(s) => {
                let items = self.find_items_by_sale(&s.id).await?;
                let payments = self.find_payments_by_sale(&s.id).await?;
                let emp_name: Option<(String,)> =
                    sqlx::query_as("SELECT name FROM employees WHERE id = ?")
                        .bind(&s.employee_id)
                        .fetch_optional(self.pool)
                        .await?;
                Ok(Some(SaleWithDetails {
                    sale: s,
                    employee_name: emp_name.map(|e| e.0),
                    items_count: items.len() as i32,
                    items,
                    payments,
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_session(&self, session_id: &str) -> AppResult<Vec<Sale>> {
        let query = format!(
            "SELECT {} FROM sales WHERE cash_session_id = ? ORDER BY created_at DESC",
            Self::SALE_COLS
        );
        let result = sqlx::query_as::<_, Sale>(&query)
            .bind(session_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_today(&self) -> AppResult<Vec<Sale>> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let query = format!(
            "SELECT {} FROM sales WHERE date(created_at) = ? ORDER BY created_at DESC",
            Self::SALE_COLS
        );
        let result = sqlx::query_as::<_, Sale>(&query)
            .bind(&today)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all(
        &self,
        filters: crate::models::SaleFilters,
    ) -> AppResult<crate::models::PaginatedResult<Sale>> {
        // Build query with proper parameterized bindings to prevent SQL injection
        let mut where_clauses = Vec::new();
        let mut bind_values: Vec<String> = Vec::new();

        if let Some(date_from) = &filters.date_from {
            where_clauses.push("date(created_at) >= date(?)");
            bind_values.push(date_from.clone());
        }
        if let Some(date_to) = &filters.date_to {
            where_clauses.push("date(created_at) <= date(?)");
            bind_values.push(date_to.clone());
        }
        if let Some(employee_id) = &filters.employee_id {
            where_clauses.push("employee_id = ?");
            bind_values.push(employee_id.clone());
        }
        if let Some(session_id) = &filters.cash_session_id {
            where_clauses.push("cash_session_id = ?");
            bind_values.push(session_id.clone());
        }
        if let Some(payment_method) = &filters.payment_method {
            where_clauses.push("payment_method = ?");
            bind_values.push(payment_method.clone());
        }
        if let Some(status) = &filters.status {
            where_clauses.push("status = ?");
            bind_values.push(status.clone());
        }

        let where_sql = if where_clauses.is_empty() {
            "1=1".to_string()
        } else {
            where_clauses.join(" AND ")
        };

        let count_query = format!("SELECT COUNT(*) FROM sales WHERE {}", where_sql);
        let mut count_stmt = sqlx::query_as::<_, (i64,)>(&count_query);
        for val in &bind_values {
            count_stmt = count_stmt.bind(val);
        }
        let (total_count,) = count_stmt.fetch_one(self.pool).await?;

        // Pagination
        let page = filters.page.unwrap_or(1);
        let limit = filters.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        let data_query = format!(
            "SELECT {} FROM sales WHERE {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            Self::SALE_COLS,
            where_sql
        );

        let mut data_stmt = sqlx::query_as::<_, Sale>(&data_query);
        for val in &bind_values {
            data_stmt = data_stmt.bind(val);
        }
        data_stmt = data_stmt.bind(limit).bind(offset);

        let data = data_stmt.fetch_all(self.pool).await?;

        let total_pages = (total_count as f64 / limit as f64).ceil() as i32;

        Ok(crate::models::PaginatedResult {
            data,
            total: total_count,
            page,
            limit,
            total_pages,
        })
    }

    pub async fn get_next_daily_number(&self) -> AppResult<i32> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let result: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM sales WHERE date(created_at) = ?")
                .bind(&today)
                .fetch_one(self.pool)
                .await?;
        Ok((result.0 + 1) as i32)
    }

    pub async fn create(&self, data: CreateSale) -> AppResult<Sale> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let daily_number = self.get_next_daily_number_tx(&mut tx).await?;

        // Rate limiting: prevent duplicate sales within 2 seconds by same employee
        // This catches accidental double-clicks or double-submissions
        {
            let recent_sale: Option<(String,)> = sqlx::query_as(
                "SELECT id FROM sales 
                 WHERE employee_id = ? 
                 AND created_at > datetime('now', '-2 seconds')
                 LIMIT 1",
            )
            .bind(&data.employee_id)
            .fetch_optional(&mut *tx)
            .await?;

            if recent_sale.is_some() {
                return Err(crate::error::AppError::Validation(
                    "Venda duplicada detectada. Aguarde antes de registrar nova venda.".into(),
                ));
            }
        }

        // Read PDV setting: allow selling when stock is insufficient
        let settings_repo = SettingsRepository::new(self.pool);
        let allow_sale_zero = settings_repo.get_bool("pdv.allow_sale_zero_stock").await?;

        // Business validation: ensure sufficient stock for all items before mutating
        use std::collections::HashMap;
        let mut requested_per_product: HashMap<String, f64> = HashMap::new();
        for item in &data.items {
            let entry = requested_per_product
                .entry(item.product_id.clone())
                .or_insert(0.0);
            *entry += item.quantity;
        }

        if !allow_sale_zero {
            for (product_id, requested) in requested_per_product.iter() {
                let available: Option<(f64,)> =
                    sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
                        .bind(product_id)
                        .fetch_optional(&mut *tx)
                        .await?;
                let available_val = available.map(|t| t.0).unwrap_or(0.0);
                if available_val < *requested {
                    return Err(crate::error::AppError::InsufficientStock {
                        available: available_val,
                        requested: *requested,
                    });
                }
            }
        }

        // Calculate totals
        let subtotal: f64 = data.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let discount = data.discount_value.unwrap_or(0.0);

        // Validate discount limits
        if discount > 0.0 {
            // Get max discount percentage allowed from settings (default 100% = no limit)
            let max_discount_percent = settings_repo
                .get_number("pdv.max_discount_percent")
                .await?
                .unwrap_or(100.0);

            let discount_percent = (discount / subtotal) * 100.0;
            if discount_percent > max_discount_percent {
                return Err(crate::error::AppError::DiscountExceedsLimit {
                    max: max_discount_percent,
                });
            }

            // Validate discount doesn't exceed subtotal
            if discount > subtotal {
                return Err(crate::error::AppError::Validation(
                    "Desconto não pode ser maior que o subtotal".into(),
                ));
            }
        }

        let total = subtotal - discount;
        let change = data.amount_paid - total;

        // Primary method (first piece or 'OTHER')
        let primary_method = data
            .payments
            .first()
            .map(|p| format!("{:?}", p.method).to_uppercase())
            .unwrap_or_else(|| "OTHER".to_string());

        let discount_type = data
            .discount_type
            .map(|dt| format!("{:?}", dt).to_uppercase());

        sqlx::query(
            "INSERT INTO sales (id, daily_number, customer_id, subtotal, discount_type, discount_value, discount_reason, total, payment_method, amount_paid, change, status, employee_id, cash_session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(daily_number)
        .bind(&data.customer_id)
        .bind(subtotal)
        .bind(&discount_type)
        .bind(discount)
        .bind(&data.discount_reason)
        .bind(total)
        .bind(&primary_method)
        .bind(data.amount_paid)
        .bind(change)
        .bind(&data.employee_id)
        .bind(&data.cash_session_id)
        .bind(&now)
        .bind(&now)
        .execute(&mut *tx)
        .await?;

        // Insert payments
        for payment in &data.payments {
            let pay_id = new_id();
            let method_str = format!("{:?}", payment.method).to_uppercase();
            sqlx::query(
                "INSERT INTO sale_payments (id, sale_id, method, amount, created_at) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(pay_id)
            .bind(&id)
            .bind(method_str)
            .bind(payment.amount)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        // Insert items and update stock
        for item in &data.items {
            self.create_item_tx(&mut tx, &id, item, &data.employee_id, allow_sale_zero)
                .await?;
        }

        // Record commission if applicable
        self.record_commission_tx(&mut tx, &id, &data.employee_id, total, &now)
            .await?;

        tx.commit().await?;

        let mut sale =
            self.find_by_id(&id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Sale".into(),
                    id: id.clone(),
                })?;

        let payments = self.find_payments_by_sale(&id).await?;
        sale.payments = Some(payments);

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            let items = self.find_items_by_sale(&id).await.unwrap_or_default();
            for item in items {
                service.emit_stock_updated(&item.product_id, &item.product_name, 0.0, 0.0, "SALE");
            }
        }

        Ok(sale)
    }

    async fn get_next_daily_number_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> AppResult<i32> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let result: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM sales WHERE date(created_at) = ?")
                .bind(&today)
                .fetch_one(&mut **tx)
                .await?;
        Ok((result.0 + 1) as i32)
    }

    pub async fn record_commission_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        sale_id: &str,
        employee_id: &str,
        sale_total: f64,
        now: &str,
    ) -> AppResult<()> {
        let mechanic_row = sqlx::query("SELECT commission_rate FROM employees WHERE id = ?")
            .bind(employee_id)
            .fetch_optional(&mut **tx)
            .await?;

        if let Some(row) = mechanic_row {
            let rate_opt: Option<f64> = row.try_get("commission_rate").ok();

            if let Some(rate) = rate_opt {
                if rate > 0.0 {
                    let commission_amount = sale_total * (rate / 100.0);
                    let commission_id = new_id();

                    sqlx::query(
                        "INSERT INTO commissions (id, sale_id, employee_id, amount, rate_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)"
                    )
                    .bind(commission_id)
                    .bind(sale_id)
                    .bind(employee_id)
                    .bind(commission_amount)
                    .bind(rate)
                    .bind(now)
                    .execute(&mut **tx)
                    .await?;
                }
            }
        }
        Ok(())
    }

    async fn create_item_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        sale_id: &str,
        item: &CreateSaleItem,
        employee_id: &str,
        allow_sale_zero: bool,
    ) -> AppResult<()> {
        let item_id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let discount = item.discount.unwrap_or(0.0);
        let total = (item.quantity * item.unit_price) - discount;

        // Get product info and current stock
        let product: Option<(String, Option<String>, String, f64)> =
            sqlx::query_as("SELECT name, barcode, unit, current_stock FROM products WHERE id = ?")
                .bind(&item.product_id)
                .fetch_optional(&mut **tx)
                .await?;

        let (product_name, product_barcode, product_unit, current_stock) =
            product.ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Product".into(),
                id: item.product_id.clone(),
            })?;

        // Determine how much we can consume from product stock depending on setting
        let consume_from_stock = if allow_sale_zero {
            current_stock.min(item.quantity)
        } else {
            item.quantity
        };

        // Deduct stock from product (only what we can consume)
        let new_stock = current_stock - consume_from_stock;
        sqlx::query(
            "UPDATE products SET current_stock = ?, updated_at = (datetime('now')) WHERE id = ?",
        )
        .bind(new_stock)
        .bind(&item.product_id)
        .execute(&mut **tx)
        .await?;

        // Consume from lots (FIFO) up to the consumed amount
        let mut remaining_to_consume = consume_from_stock;
        let lots: Vec<(String, f64)> = sqlx::query_as(
            "SELECT id, current_quantity FROM product_lots WHERE product_id = ? AND current_quantity > 0 AND status = 'AVAILABLE' ORDER BY expiration_date ASC, purchase_date ASC"
        )
        .bind(&item.product_id)
        .fetch_all(&mut **tx)
        .await?;

        let mut linked_lot_id: Option<String> = None;

        for (lot_id, lot_qty) in lots {
            if remaining_to_consume <= 0.0 {
                break;
            }

            let consume = lot_qty.min(remaining_to_consume);
            sqlx::query("UPDATE product_lots SET current_quantity = current_quantity - ?, updated_at = (datetime('now')) WHERE id = ?")
                .bind(consume)
                .bind(&lot_id)
                .execute(&mut **tx)
                .await?;

            remaining_to_consume -= consume;
            if linked_lot_id.is_none() {
                linked_lot_id = Some(lot_id);
            }
        }

        // Record stock movement (SALE) for the actual consumed quantity
        let movement_id = new_id();
        sqlx::query(
            "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, 'SALE', ?, ?, ?, 'Venda', ?, 'SALE', ?, ?)"
        )
        .bind(&movement_id)
        .bind(&item.product_id)
        .bind(-consume_from_stock)
        .bind(current_stock)
        .bind(new_stock)
        .bind(sale_id)
        .bind(employee_id)
        .bind(&now)
        .execute(&mut **tx)
        .await?;

        // Insert sale item
        sqlx::query(
            "INSERT INTO sale_items (id, sale_id, product_id, lot_id, quantity, unit_price, discount, total, product_name, product_barcode, product_unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&item_id)
        .bind(sale_id)
        .bind(&item.product_id)
        .bind(linked_lot_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(discount)
        .bind(total)
        .bind(&product_name)
        .bind(&product_barcode)
        .bind(&product_unit)
        .bind(&now)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn cancel(&self, id: &str, canceled_by: &str, reason: &str) -> AppResult<Sale> {
        let mut tx = self.pool.begin().await?;
        let now = chrono::Utc::now().to_rfc3339();

        // Get sale items to revert stock
        let items = self.find_items_by_sale_tx(&mut tx, id).await?;

        for item in items {
            // Revert product stock
            sqlx::query("UPDATE products SET current_stock = current_stock + ?, updated_at = (datetime('now')) WHERE id = ?")
                .bind(item.quantity)
                .bind(&item.product_id)
                .execute(&mut *tx)
                .await?;

            // Revert lot stock if applicable
            if let Some(lot_id) = item.lot_id {
                sqlx::query("UPDATE product_lots SET current_quantity = current_quantity + ?, updated_at = (datetime('now')) WHERE id = ?")
                    .bind(item.quantity)
                    .bind(&lot_id)
                    .execute(&mut *tx)
                    .await?;
            }

            // Record stock movement (RETURN/CANCEL)
            let movement_id = new_id();
            let current: (f64,) = sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
                .bind(&item.product_id)
                .fetch_one(&mut *tx)
                .await?;

            sqlx::query(
                "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, 'RETURN', ?, ?, ?, ?, ?, 'CANCEL', ?, ?)"
            )
            .bind(&movement_id)
            .bind(&item.product_id)
            .bind(item.quantity)
            .bind(current.0 - item.quantity)
            .bind(current.0)
            .bind(format!("Cancelamento venda: {}", id))
            .bind(id)
            .bind(canceled_by)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        // Update sale status
        sqlx::query("UPDATE sales SET status = 'CANCELED', canceled_at = ?, canceled_by_id = ?, cancel_reason = ?, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(canceled_by)
            .bind(reason)
            .bind(&now)
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Delete associated commissions
        sqlx::query("DELETE FROM commissions WHERE sale_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let sale = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Sale".into(),
                id: id.into(),
            })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            // Emite evento de sincronização necessária para simplificar
            service.emit_sync_required("Venda cancelada");
        }

        Ok(sale)
    }

    pub async fn find_payments_by_sale(
        &self,
        sale_id: &str,
    ) -> AppResult<Vec<crate::models::SalePayment>> {
        let result = sqlx::query_as::<_, crate::models::SalePayment>(
            "SELECT id, sale_id, method, amount, created_at FROM sale_payments WHERE sale_id = ?",
        )
        .bind(sale_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    async fn find_items_by_sale_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        sale_id: &str,
    ) -> AppResult<Vec<SaleItem>> {
        let query = format!(
            "SELECT {} FROM sale_items WHERE sale_id = ?",
            Self::ITEM_COLS
        );
        let result = sqlx::query_as::<_, SaleItem>(&query)
            .bind(sale_id)
            .fetch_all(&mut **tx)
            .await?;
        Ok(result)
    }

    pub async fn get_daily_summary(&self, date: &str) -> AppResult<DailySalesSummary> {
        let sales = sqlx::query_as::<_, Sale>(&format!(
            "SELECT {} FROM sales WHERE date(created_at) = ? AND status = 'COMPLETED'",
            Self::SALE_COLS
        ))
        .bind(date)
        .fetch_all(self.pool)
        .await?;

        let total_sales = sales.len() as i64;
        let total_amount: f64 = sales.iter().map(|s| s.total).sum();
        let total_items: i64 = sales.len() as i64; // Simplified
        let average_ticket = if total_sales > 0 {
            total_amount / total_sales as f64
        } else {
            0.0
        };

        let payment_rows = sqlx::query(
            r#"
            SELECT method as payment_method, SUM(amount) as total, COUNT(*) as count
            FROM sale_payments 
            WHERE sale_id IN (SELECT id FROM sales WHERE date(created_at) = ? AND status = 'COMPLETED')
            GROUP BY method
            "#,
        )
        .bind(date)
        .fetch_all(self.pool)
        .await?;

        let by_payment_method: Vec<PaymentMethodSummary> = payment_rows
            .into_iter()
            .map(|row| PaymentMethodSummary {
                method: row.get("payment_method"),
                count: row.get("count"),
                amount: row.get("total"),
            })
            .collect();

        Ok(DailySalesSummary {
            date: date.to_string(),
            total_sales,
            total_amount,
            total_items,
            average_ticket,
            by_payment_method,
        })
    }

    pub async fn get_monthly_summary(&self, year_month: &str) -> AppResult<MonthlySalesSummary> {
        let row = sqlx::query(
            "SELECT COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_amount \
             FROM sales \
             WHERE strftime('%Y-%m', created_at) = ? AND status = 'COMPLETED'",
        )
        .bind(year_month)
        .fetch_one(self.pool)
        .await?;

        let total_sales: i64 = row.try_get("total_sales")?;
        let total_amount: f64 = row.try_get("total_amount")?;

        Ok(MonthlySalesSummary {
            year_month: year_month.to_string(),
            total_sales,
            total_amount,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{CreateSaleItem, CreateSalePayment, DiscountType, PaymentMethod};
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(5)
            .connect("sqlite::memory:")
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Seed basic data
        sqlx::query("INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) VALUES ('emp-001', 'Test Employee', '8899', 'OPERATOR', 1, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO categories (id, name, is_active, created_at, updated_at) VALUES ('cat-001', 'General', 1, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO products (id, barcode, internal_code, name, unit, sale_price, cost_price, current_stock, category_id, is_active, created_at, updated_at) VALUES ('prod-001', '123456', 'P001', 'Test Product', 'UNIT', 10.0, 5.0, 100.0, 'cat-001', 1, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at, created_at, updated_at) VALUES ('cs-001', 'emp-001', 100.0, 'OPEN', datetime('now'), datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_sale_cash() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 2.0,
                unit_price: 10.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 20.0,
            }],
            amount_paid: 25.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());

        let sale = result.unwrap();
        assert_eq!(sale.subtotal, 20.0);
        assert_eq!(sale.total, 20.0);
        assert_eq!(sale.change, 5.0);
    }

    #[tokio::test]
    async fn test_create_sale_insufficient_stock() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 200.0,
                unit_price: 10.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 2000.0,
            }],
            amount_paid: 2000.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let result = repo.create(input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_sale_with_discount() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 5.0,
                unit_price: 10.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 45.0,
            }],
            amount_paid: 45.0,
            discount_type: Some(DiscountType::Fixed),
            discount_value: Some(5.0),
            discount_reason: Some("Promo".to_string()),
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());

        let sale = result.unwrap();
        assert_eq!(sale.total, 45.0);
    }

    #[tokio::test]
    async fn test_find_sale_by_id() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 1.0,
                unit_price: 10.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Debit,
                amount: 10.0,
            }],
            amount_paid: 10.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let created = repo.create(input).await.unwrap();
        let found = repo.find_by_id(&created.id).await.unwrap();

        assert!(found.is_some());
        assert_eq!(found.unwrap().id, created.id);
    }

    #[tokio::test]
    async fn test_find_today_sales() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 1.0,
                unit_price: 10.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 10.0,
            }],
            amount_paid: 10.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        repo.create(input).await.unwrap();

        let today_sales = repo.find_today().await.unwrap();
        assert!(!today_sales.is_empty());
    }

    #[tokio::test]
    async fn test_cancel_sale() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 1.0,
                unit_price: 10.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 10.0,
            }],
            amount_paid: 10.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let created = repo.create(input).await.unwrap();
        let result = repo.cancel(&created.id, "emp-001", "Cancel").await;
        assert!(result.is_ok());

        let canceled = repo.find_by_id(&created.id).await.unwrap().unwrap();
        assert_eq!(canceled.status, "CANCELED");
    }

    #[tokio::test]
    async fn test_get_daily_summary() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        for _ in 0..3 {
            let input = CreateSale {
                customer_id: None,
                employee_id: "emp-001".to_string(),
                cash_session_id: "cs-001".to_string(),
                items: vec![CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 1.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                }],
                payments: vec![CreateSalePayment {
                    method: PaymentMethod::Cash,
                    amount: 10.0,
                }],
                amount_paid: 10.0,
                discount_type: None,
                discount_value: None,
                discount_reason: None,
            };
            repo.create(input).await.unwrap();
        }

        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let summary = repo.get_daily_summary(&today).await.unwrap();
        assert_eq!(summary.total_sales, 3);
    }

    #[tokio::test]
    async fn test_create_sale_generates_commission() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        sqlx::query("UPDATE employees SET commission_rate = 10.0 WHERE id = 'emp-001'")
            .execute(&pool)
            .await
            .unwrap();

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 1.0,
                unit_price: 100.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 100.0,
            }],
            amount_paid: 100.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let sale = repo.create(input).await.unwrap();

        let row = sqlx::query("SELECT amount FROM commissions WHERE sale_id = ?")
            .bind(&sale.id)
            .fetch_optional(&pool)
            .await
            .unwrap();
        assert!(row.is_some());
        let amount: f64 = row.unwrap().get("amount");
        assert_eq!(amount, 10.0);
    }

    #[tokio::test]
    async fn test_cancel_sale_reverses_commission() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        sqlx::query("UPDATE employees SET commission_rate = 10.0 WHERE id = 'emp-001'")
            .execute(&pool)
            .await
            .unwrap();

        let input = CreateSale {
            customer_id: None,
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![CreateSaleItem {
                product_id: "prod-001".to_string(),
                quantity: 1.0,
                unit_price: 100.0,
                discount: Some(0.0),
            }],
            payments: vec![CreateSalePayment {
                method: PaymentMethod::Cash,
                amount: 100.0,
            }],
            amount_paid: 100.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let sale = repo.create(input).await.unwrap();

        repo.cancel(&sale.id, "emp-001", "Testing reversal")
            .await
            .unwrap();

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM commissions WHERE sale_id = ?")
            .bind(&sale.id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count.0, 0);
    }
}
