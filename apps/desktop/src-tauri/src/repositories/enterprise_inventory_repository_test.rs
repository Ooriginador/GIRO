//! Testes unitários para EnterpriseInventoryRepository

#[cfg(test)]
mod tests {
    use super::super::enterprise_inventory_repository::EnterpriseInventoryRepository;
    use crate::models::enterprise::CreateEnterpriseInventoryCount;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_inventory_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Category
        sqlx::query(
            "INSERT INTO categories (id, name, is_active, created_at, updated_at) 
             VALUES ('cat-inv', 'Inv Cat', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Location
        sqlx::query(
            "INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at) 
             VALUES ('loc-1', 'LOC-INV', 'Inventory Test Loc', 'WAREHOUSE', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Product
        sqlx::query(
            "INSERT INTO products (id, name, description, unit, cost_price, sale_price, internal_code, is_active, category_id, current_stock, min_stock, is_weighted, created_at, updated_at) 
             VALUES ('prod-1', 'Test Product', 'Desc', 'UN', 10.0, 20.0, 'P-INV-1', 1, 'cat-inv', 100.0, 10.0, 0, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Balance
        sqlx::query(
            "INSERT INTO stock_balances (id, location_id, product_id, quantity, reserved_qty, created_at, updated_at) 
             VALUES ('bal-1', 'loc-1', 'prod-1', 100.0, 0, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Employee
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES 
             ('user-1', 'Test User', '1234', 'ADMIN', 1, datetime('now'), datetime('now')),
             ('user-2', 'User 2', '5678', 'CASHIER', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_full_inventory_snapshot() {
        let pool = setup_test_db().await;
        let repo = EnterpriseInventoryRepository::new(&pool);

        let data = CreateEnterpriseInventoryCount {
            location_id: "loc-1".to_string(),
            count_type: "FULL".to_string(),
            notes: Some("Initial Count".to_string()),
        };

        let count = repo.create(data, "user-1").await.unwrap();

        assert_eq!(count.total_items, 1);

        let items = repo.get_items(&count.id).await.unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].item.system_qty, 100.0);
        assert_eq!(items[0].product_name, "Test Product");
    }

    #[tokio::test]
    async fn test_count_item_flow() {
        let pool = setup_test_db().await;
        let repo = EnterpriseInventoryRepository::new(&pool);

        let data = CreateEnterpriseInventoryCount {
            location_id: "loc-1".to_string(),
            count_type: "FULL".to_string(),
            notes: None,
        };

        let count = repo.create(data, "user-1").await.unwrap();
        let items = repo.get_items(&count.id).await.unwrap();
        let item_id = &items[0].item.id;

        // Register Count
        let counted_item = repo
            .count_item(item_id, 98.0, "user-2", Some("Missing 2".to_string()))
            .await
            .unwrap();

        // Discrepancy should be -2
        assert_eq!(counted_item.counted_qty, Some(98.0));
        assert_eq!(counted_item.difference, Some(-2.0));

        // Complete Inventory
        let completed = repo.complete(&count.id, "user-1", true).await.unwrap();
        assert_eq!(completed.status, "COMPLETED");
        assert_eq!(completed.items_counted, 1);
    }
}
