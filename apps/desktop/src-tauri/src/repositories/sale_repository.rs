//! Repositório de Vendas

use crate::error::AppResult;
use crate::models::{CreateSale, CreateSaleItem, DailySalesSummary, MonthlySalesSummary, PaymentMethodSummary, Sale, SaleItem, SaleWithDetails};
use crate::repositories::new_id;
use sqlx::Row;
use sqlx::SqlitePool;

pub struct SaleRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SaleRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const SALE_COLS: &'static str = "id, daily_number, subtotal, discount_type, discount_value, discount_reason, total, payment_method, amount_paid, change, status, canceled_at, canceled_by_id, cancel_reason, employee_id, cash_session_id, created_at, updated_at";
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
        let query = format!("SELECT {} FROM sale_items WHERE sale_id = ?", Self::ITEM_COLS);
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
                let emp_name: Option<(String,)> = sqlx::query_as("SELECT name FROM employees WHERE id = ?")
                    .bind(&s.employee_id)
                    .fetch_optional(self.pool)
                    .await?;
                Ok(Some(SaleWithDetails {
                    sale: s,
                    employee_name: emp_name.map(|e| e.0),
                    items_count: items.len() as i32,
                    items,
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_session(&self, session_id: &str) -> AppResult<Vec<Sale>> {
        let query = format!("SELECT {} FROM sales WHERE cash_session_id = ? ORDER BY created_at DESC", Self::SALE_COLS);
        let result = sqlx::query_as::<_, Sale>(&query)
            .bind(session_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_today(&self) -> AppResult<Vec<Sale>> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let query = format!("SELECT {} FROM sales WHERE date(created_at) = ? ORDER BY created_at DESC", Self::SALE_COLS);
        let result = sqlx::query_as::<_, Sale>(&query)
            .bind(&today)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn get_next_daily_number(&self) -> AppResult<i32> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sales WHERE date(created_at) = ?")
            .bind(&today)
            .fetch_one(self.pool)
            .await?;
        Ok((result.0 + 1) as i32)
    }

    pub async fn create(&self, data: CreateSale) -> AppResult<Sale> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let daily_number = self.get_next_daily_number().await?;

        // Calculate totals
        let subtotal: f64 = data.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let discount = data.discount_value.unwrap_or(0.0);
        let total = subtotal - discount;
        let change = data.amount_paid - total;
        let payment_method = format!("{:?}", data.payment_method).to_uppercase();
        let discount_type = data.discount_type.map(|dt| format!("{:?}", dt).to_uppercase());

        sqlx::query(
            "INSERT INTO sales (id, daily_number, subtotal, discount_type, discount_value, discount_reason, total, payment_method, amount_paid, change, status, employee_id, cash_session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(daily_number)
        .bind(subtotal)
        .bind(&discount_type)
        .bind(discount)
        .bind(&data.discount_reason)
        .bind(total)
        .bind(&payment_method)
        .bind(data.amount_paid)
        .bind(change)
        .bind(&data.employee_id)
        .bind(&data.cash_session_id)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Insert items
        for item in &data.items {
            self.create_item(&id, item).await?;
        }

        self.find_by_id(&id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Sale".into(), id })
    }

    async fn create_item(&self, sale_id: &str, item: &CreateSaleItem) -> AppResult<SaleItem> {
        let item_id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let discount = item.discount.unwrap_or(0.0);
        let total = (item.quantity * item.unit_price) - discount;

        // Get product info
        let product: Option<(String, Option<String>, String)> = sqlx::query_as("SELECT name, barcode, unit FROM products WHERE id = ?")
            .bind(&item.product_id)
            .fetch_optional(self.pool)
            .await?;
        
        let (product_name, product_barcode, product_unit) = product.unwrap_or(("Unknown".into(), None, "UNIT".into()));

        sqlx::query(
            "INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount, total, product_name, product_barcode, product_unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&item_id)
        .bind(sale_id)
        .bind(&item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(discount)
        .bind(total)
        .bind(&product_name)
        .bind(&product_barcode)
        .bind(&product_unit)
        .bind(&now)
        .execute(self.pool)
        .await?;

        let query = format!("SELECT {} FROM sale_items WHERE id = ?", Self::ITEM_COLS);
        let result = sqlx::query_as::<_, SaleItem>(&query)
            .bind(&item_id)
            .fetch_one(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn cancel(&self, id: &str, canceled_by: &str, reason: &str) -> AppResult<Sale> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE sales SET status = 'CANCELED', canceled_at = ?, canceled_by_id = ?, cancel_reason = ?, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(canceled_by)
            .bind(reason)
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Sale".into(), id: id.into() })
    }

    pub async fn get_daily_summary(&self, date: &str) -> AppResult<DailySalesSummary> {
        let sales = sqlx::query_as::<_, Sale>(&format!("SELECT {} FROM sales WHERE date(created_at) = ? AND status = 'COMPLETED'", Self::SALE_COLS))
            .bind(date)
            .fetch_all(self.pool)
            .await?;

        let total_sales = sales.len() as i64;
        let total_amount: f64 = sales.iter().map(|s| s.total).sum();
        let total_items: i64 = sales.iter().map(|_s| {
            // Would need to count items per sale
            1i64
        }).sum();
        let average_ticket = if total_sales > 0 { total_amount / total_sales as f64 } else { 0.0 };

        // Group by payment method
        let mut by_method: std::collections::HashMap<String, (i64, f64)> = std::collections::HashMap::new();
        for sale in &sales {
            let entry = by_method.entry(sale.payment_method.clone()).or_insert((0, 0.0));
            entry.0 += 1;
            entry.1 += sale.total;
        }

        let by_payment_method: Vec<PaymentMethodSummary> = by_method.into_iter().map(|(method, (count, amount))| {
            PaymentMethodSummary { method, count, amount }
        }).collect();

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
        // created_at é RFC3339, e o SQLite consegue fazer strftime sobre esse formato
        let row = sqlx::query(
            "SELECT COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_amount \n             FROM sales \n             WHERE strftime('%Y-%m', created_at) = ? AND status = 'COMPLETED'",
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
    use crate::models::{CreateSaleItem, DiscountType, PaymentMethod};
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();
        
        // Create test category
        sqlx::query(
            "INSERT INTO categories (id, name, is_active, created_at, updated_at) 
             VALUES ('cat-001', 'Test Cat', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test employee
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-001', 'Test Employee', '1234', 'OPERATOR', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test product
        sqlx::query(
            "INSERT INTO products (id, internal_code, barcode, name, category_id, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, created_at, updated_at) 
             VALUES ('prod-001', 'MRC-00001', '7890000000001', 'Test Product', 'cat-001', 'UNIT', 0, 10.0, 5.0, 100.0, 10.0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test cash session
        sqlx::query(
            "INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at, created_at, updated_at) 
             VALUES ('cs-001', 'emp-001', 100.0, 'OPEN', datetime('now'), datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        pool
    }

    #[tokio::test]
    async fn test_create_sale_cash() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![
                CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 2.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                    
                },
            ],
            payment_method: PaymentMethod::Cash,
            amount_paid: 25.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let result = repo.create(input).await;
        if let Err(ref e) = result {
            eprintln!("❌ TEST ERROR: {:?}", e);
        }
        assert!(result.is_ok());

        let sale = result.unwrap();
        assert_eq!(sale.subtotal, 20.0); // 2 * 10.0
        assert_eq!(sale.total, 20.0);
        assert_eq!(sale.change, 5.0); // 25.0 - 20.0
    }

    #[tokio::test]
    async fn test_create_sale_with_discount() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![
                CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 5.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                    
                },
            ],
            payment_method: PaymentMethod::Cash,
            amount_paid: 45.0,
            discount_type: Some(DiscountType::Fixed),
            discount_value: Some(5.0),
            discount_reason: Some("Desconto promocional".to_string()),
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());

        let sale = result.unwrap();
        assert_eq!(sale.subtotal, 50.0); // 5 * 10.0
        assert_eq!(sale.discount_value, 5.0);
        assert_eq!(sale.total, 45.0); // 50.0 - 5.0
        assert_eq!(sale.change, 0.0);
    }

    #[tokio::test]
    async fn test_find_sale_by_id() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![
                CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 1.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                    
                },
            ],
            payment_method: PaymentMethod::Debit,
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

        // Create sale
        let input = CreateSale {
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![
                CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 1.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                    
                },
            ],
            payment_method: PaymentMethod::Cash,
            amount_paid: 10.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        repo.create(input).await.unwrap();

        let today_sales = repo.find_today().await.unwrap();
        assert!(today_sales.len() >= 1);
    }

    #[tokio::test]
    async fn test_cancel_sale() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let input = CreateSale {
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![
                CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 1.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                    
                },
            ],
            payment_method: PaymentMethod::Cash,
            amount_paid: 10.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };

        let created = repo.create(input).await.unwrap();
        let result = repo.cancel(&created.id, "emp-001", "Teste cancelamento").await;

        assert!(result.is_ok());

        let canceled = repo.find_by_id(&created.id).await.unwrap().unwrap();
        assert_eq!(canceled.status, "CANCELED");
    }

    #[tokio::test]
    async fn test_get_daily_summary() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        // Create multiple sales
        for _ in 0..3 {
            let input = CreateSale {
                employee_id: "emp-001".to_string(),
                cash_session_id: "cs-001".to_string(),
                items: vec![
                    CreateSaleItem {
                        product_id: "prod-001".to_string(),
                        quantity: 1.0,
                        unit_price: 10.0,
                        discount: Some(0.0),
                        
                    },
                ],
                payment_method: PaymentMethod::Cash,
                amount_paid: 10.0,
                discount_type: None,
                discount_value: None,
                discount_reason: None,
            };
            repo.create(input).await.unwrap();
        }

        // Use today's date since sales are created with current timestamp
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let summary = repo.get_daily_summary(&today).await.unwrap();
        assert_eq!(summary.total_sales, 3);
        assert_eq!(summary.total_amount, 30.0);
    }

    #[tokio::test]
    async fn test_get_next_daily_number() {
        let pool = setup_test_db().await;
        let repo = SaleRepository::new(&pool);

        let first_number = repo.get_next_daily_number().await.unwrap();
        assert_eq!(first_number, 1);

        // Create a sale
        let input = CreateSale {
            employee_id: "emp-001".to_string(),
            cash_session_id: "cs-001".to_string(),
            items: vec![
                CreateSaleItem {
                    product_id: "prod-001".to_string(),
                    quantity: 1.0,
                    unit_price: 10.0,
                    discount: Some(0.0),
                    
                },
            ],
            payment_method: PaymentMethod::Cash,
            amount_paid: 10.0,
            discount_type: None,
            discount_value: None,
            discount_reason: None,
        };
        repo.create(input).await.unwrap();

        let second_number = repo.get_next_daily_number().await.unwrap();
        assert_eq!(second_number, 2);
    }
}