//! Repositório de Estoque

use crate::error::AppResult;
use crate::models::{CreateStockMovement, ProductLot, StockMovementRow};
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

    pub async fn find_movement_by_id(&self, id: &str) -> AppResult<Option<StockMovementRow>> {
        let query = format!(
            "SELECT {} FROM stock_movements WHERE id = ?",
            Self::MOVEMENT_COLS
        );
        let result = sqlx::query_as::<_, StockMovementRow>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_movements_by_product(
        &self,
        product_id: &str,
        limit: i32,
    ) -> AppResult<Vec<StockMovementRow>> {
        let query = format!(
            "SELECT {} FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT ?",
            Self::MOVEMENT_COLS
        );
        let result = sqlx::query_as::<_, StockMovementRow>(&query)
            .bind(product_id)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_recent_movements(&self, limit: i32) -> AppResult<Vec<StockMovementRow>> {
        let query = format!(
            "SELECT {} FROM stock_movements ORDER BY created_at DESC LIMIT ?",
            Self::MOVEMENT_COLS
        );
        let result = sqlx::query_as::<_, StockMovementRow>(&query)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn create_movement(&self, data: CreateStockMovement) -> AppResult<StockMovementRow> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Get current stock
        let current: (f64,) = sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
            .bind(&data.product_id)
            .fetch_one(self.pool)
            .await?;

        let previous_stock = current.0;
        let new_stock = previous_stock + data.quantity;

        // Lot handling for ENTRY/INPUT
        let mut lot_id: Option<String> = None;
        if (data.movement_type == "ENTRY" || data.movement_type == "INPUT") && data.quantity > 0.0 {
            let nid = new_id();
            let cost = data.cost_price.unwrap_or(0.0);
            
            sqlx::query(
                "INSERT INTO product_lots (id, product_id, lot_number, expiration_date, manufacturing_date, initial_quantity, current_quantity, cost_price, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)"
            )
            .bind(&nid)
            .bind(&data.product_id)
            .bind(&data.lot_number)
            .bind(&data.expiration_date)
            .bind(&data.manufacturing_date)
            .bind(data.quantity)
            .bind(data.quantity)
            .bind(cost)
            .bind(&now)
            .bind(&now)
            .execute(self.pool)
            .await?;
            
            lot_id = Some(nid);

            // Update product cost price if provided
            if cost > 0.0 {
                sqlx::query("UPDATE products SET cost_price = ?, updated_at = ? WHERE id = ?")
                    .bind(cost)
                    .bind(&now)
                    .bind(&data.product_id)
                    .execute(self.pool)
                    .await?;
            }
        }

        // Create movement
        sqlx::query(
            "INSERT INTO stock_movements (id, product_id, lot_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.product_id)
        .bind(lot_id)
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

        self.find_movement_by_id(&id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "StockMovement".into(),
                id,
            })
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

    /// Busca movimentos por produto (compatível com mobile)
    pub async fn get_movements_by_product(
        &self,
        product_id: &str,
        limit: i32,
    ) -> AppResult<Vec<crate::models::StockMovementRow>> {
        let result = sqlx::query_as::<_, crate::models::StockMovementRow>(&format!(
            "SELECT {} FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT ?",
            Self::MOVEMENT_COLS
        ))
        .bind(product_id)
        .bind(limit)
        .fetch_all(self.pool)
        .await?;

        Ok(result)
    }

    /// Cria movimento e atualiza estoque em transação
    pub async fn create_movement_and_update_stock(
        &self,
        movement: &crate::models::StockMovement,
        new_stock: f64,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        // Criar movimento
        sqlx::query(
            "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&movement.id)
        .bind(&movement.product_id)
        .bind(movement.movement_type.to_string())
        .bind(movement.quantity)
        .bind(movement.previous_stock)
        .bind(movement.new_stock)
        .bind(&movement.reason)
        .bind(&movement.employee_id)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Atualizar estoque do produto
        sqlx::query("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?")
            .bind(new_stock)
            .bind(&now)
            .bind(&movement.product_id)
            .execute(self.pool)
            .await?;

        Ok(())
    }

    /// Dar baixa em lote por vencimento
    pub async fn write_off_lot(
        &self,
        lot_id: &str,
        product_id: &str,
        quantity: f64,
        employee_id: &str,
        reason: &str,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let movement_id = crate::repositories::new_id();

        // Buscar estoque atual
        let current: (f64,) = sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
            .bind(product_id)
            .fetch_one(self.pool)
            .await?;

        let previous_stock = current.0;
        let new_stock = (previous_stock - quantity).max(0.0);

        // Criar movimento de baixa
        sqlx::query(
            "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, 'EXPIRATION', ?, ?, ?, ?, ?, 'LOT', ?, ?)"
        )
        .bind(&movement_id)
        .bind(product_id)
        .bind(-quantity)
        .bind(previous_stock)
        .bind(new_stock)
        .bind(reason)
        .bind(lot_id)
        .bind(employee_id)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Atualizar estoque do produto
        sqlx::query("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?")
            .bind(new_stock)
            .bind(&now)
            .bind(product_id)
            .execute(self.pool)
            .await?;

        // Zerar quantidade do lote
        sqlx::query("UPDATE product_lots SET current_quantity = 0, status = 'EXPIRED', updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(lot_id)
            .execute(self.pool)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CreateStockMovement;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Create test category
        sqlx::query(
            "INSERT INTO categories (id, name, is_active, created_at, updated_at) 
             VALUES ('cat-001', 'Test Cat', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test employee
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-001', 'Test Employee', '8899', 'OPERATOR', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test product with initial stock
        sqlx::query(
            "INSERT INTO products (id, internal_code, barcode, name, category_id, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, created_at, updated_at) 
             VALUES ('prod-001', 'MRC-00001', '7890000000001', 'Test Product', 'cat-001', 'UNIT', 0, 10.0, 5.0, 100.0, 10.0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test supplier
        sqlx::query(
            "INSERT INTO suppliers (id, name, is_active, created_at, updated_at) 
             VALUES ('sup-001', 'Test Supplier', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_stock_movement_entry() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        let input = CreateStockMovement {
            product_id: "prod-001".to_string(),
            movement_type: "ENTRY".to_string(),
            quantity: 50.0,
            reason: Some("Compra de fornecedor".to_string()),
            reference_id: None,
            reference_type: Some("PURCHASE".to_string()),
            employee_id: Some("emp-001".to_string()),
        };

        let result = repo.create_movement(input).await;
        assert!(result.is_ok());

        let movement = result.unwrap();
        assert_eq!(movement.movement_type, "ENTRY");
        assert_eq!(movement.quantity, 50.0);
        assert_eq!(movement.previous_stock, 100.0);
        assert_eq!(movement.new_stock, 150.0);
    }

    #[tokio::test]
    async fn test_create_stock_movement_exit() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        let input = CreateStockMovement {
            product_id: "prod-001".to_string(),
            movement_type: "EXIT".to_string(),
            quantity: -30.0, // Negative for exit
            reason: Some("Venda".to_string()),
            reference_id: Some("sale-001".to_string()),
            reference_type: Some("SALE".to_string()),
            employee_id: Some("emp-001".to_string()),
        };

        let result = repo.create_movement(input).await;
        assert!(result.is_ok());

        let movement = result.unwrap();
        assert_eq!(movement.movement_type, "EXIT");
        assert_eq!(movement.previous_stock, 100.0);
        assert_eq!(movement.new_stock, 70.0); // 100 - 30
    }

    #[tokio::test]
    async fn test_find_movement_by_id() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        let input = CreateStockMovement {
            product_id: "prod-001".to_string(),
            movement_type: "ADJUSTMENT".to_string(),
            quantity: 10.0,
            reason: Some("Ajuste de inventário".to_string()),
            reference_id: None,
            reference_type: None,
            employee_id: Some("emp-001".to_string()),
        };

        let created = repo.create_movement(input).await.unwrap();
        let found = repo.find_movement_by_id(&created.id).await.unwrap();

        assert!(found.is_some());
        assert_eq!(found.unwrap().id, created.id);
    }

    #[tokio::test]
    async fn test_find_movements_by_product() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        // Create 3 movements
        for i in 0..3 {
            let input = CreateStockMovement {
                product_id: "prod-001".to_string(),
                movement_type: "ENTRY".to_string(),
                quantity: (i + 1) as f64 * 10.0,
                reason: Some(format!("Movimento {}", i + 1)),
                reference_id: None,
                reference_type: None,
                employee_id: None,
            };
            repo.create_movement(input).await.unwrap();
        }

        let movements = repo
            .find_movements_by_product("prod-001", 10)
            .await
            .unwrap();
        assert_eq!(movements.len(), 3);
    }

    #[tokio::test]
    async fn test_find_recent_movements() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        // Create 5 movements
        for i in 0..5 {
            let input = CreateStockMovement {
                product_id: "prod-001".to_string(),
                movement_type: "ENTRY".to_string(),
                quantity: 10.0,
                reason: Some(format!("Movimento {}", i + 1)),
                reference_id: None,
                reference_type: None,
                employee_id: None,
            };
            repo.create_movement(input).await.unwrap();
        }

        let recent = repo.find_recent_movements(3).await.unwrap();
        assert_eq!(recent.len(), 3);
    }

    #[tokio::test]
    async fn test_find_lots_by_product() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        // Create a lot
        sqlx::query(
            "INSERT INTO product_lots (id, product_id, supplier_id, lot_number, expiration_date, purchase_date, initial_quantity, current_quantity, cost_price, status, created_at, updated_at) 
             VALUES ('lot-001', 'prod-001', 'sup-001', 'LOTE001', date('now', '+30 days'), datetime('now'), 100.0, 80.0, 5.0, 'AVAILABLE', datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        let lots = repo.find_lots_by_product("prod-001").await.unwrap();
        assert_eq!(lots.len(), 1);
        assert_eq!(lots[0].lot_number, Some("LOTE001".to_string()));
    }

    #[tokio::test]
    async fn test_find_expiring_lots() {
        let pool = setup_test_db().await;
        let repo = StockRepository::new(&pool);

        // Create lot expiring in 5 days
        sqlx::query(
            "INSERT INTO product_lots (id, product_id, supplier_id, lot_number, expiration_date, purchase_date, initial_quantity, current_quantity, cost_price, status, created_at, updated_at) 
             VALUES ('lot-exp', 'prod-001', 'sup-001', 'LOTE-EXP', date('now', '+5 days'), datetime('now'), 50.0, 50.0, 5.0, 'AVAILABLE', datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        let expiring = repo.find_expiring_lots(7).await.unwrap();
        assert!(expiring.len() >= 1);
    }
}
