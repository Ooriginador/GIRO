//! Testes unitários para ProductRepository

#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::CreateProduct;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Create test category
        sqlx::query(
            "INSERT INTO categories (id, name, is_active, created_at, updated_at) 
             VALUES ('cat-test-001', 'Test Category', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_product() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input = CreateProduct {
            name: "Test Product".to_string(),
            barcode: Some("7890000000001".to_string()),
            internal_code: None, // Will be generated
            category_id: "cat-test-001".to_string(),
            sale_price: 25.99,
            cost_price: Some(18.00),
            min_stock: Some(10.0),
            current_stock: Some(0.0),
            description: Some("Test description".to_string()),
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };

        let result = repo.create(input).await;

        assert!(result.is_ok());
        let product = result.unwrap();
        assert_eq!(product.name, "Test Product");
        assert_eq!(product.barcode, Some("7890000000001".to_string()));
        assert_eq!(product.sale_price, 25.99);
        // Internal code format is MRC-XXXXX
        // Internal code format is MRC-XXXXX
        assert!(product.internal_code.starts_with("MRC-"));
        assert_eq!(product.unit, "UNIT");
    }

    #[tokio::test]
    async fn test_create_product_duplicate_barcode() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input1 = CreateProduct {
            name: "Product 1".to_string(),
            barcode: Some("7890000000002".to_string()),
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 10.0,
            cost_price: Some(5.0),
            min_stock: Some(5.0),
            current_stock: Some(0.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        repo.create(input1).await.unwrap();

        // Try to create with same barcode
        let input2 = CreateProduct {
            name: "Product 2".to_string(),
            barcode: Some("7890000000002".to_string()),
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 15.0,
            cost_price: Some(8.0),
            min_stock: Some(5.0),
            current_stock: Some(0.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };

        let result = repo.create(input2).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_find_by_barcode() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input = CreateProduct {
            name: "Barcode Product".to_string(),
            barcode: Some("7890000000003".to_string()),
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 20.0,
            cost_price: Some(10.0),
            min_stock: Some(5.0),
            current_stock: Some(0.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        repo.create(input).await.unwrap();

        let result = repo.find_by_barcode("7890000000003").await;

        assert!(result.is_ok());
        let product = result.unwrap();
        assert!(product.is_some());
        assert_eq!(product.unwrap().name, "Barcode Product");
    }

    #[tokio::test]
    async fn test_find_by_internal_code() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input = CreateProduct {
            name: "Internal Code Product".to_string(),
            barcode: None,
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 30.0,
            cost_price: Some(15.0),
            min_stock: Some(5.0),
            current_stock: Some(0.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        let created = repo.create(input).await.unwrap();

        let result = repo.find_by_internal_code(&created.internal_code).await;

        assert!(result.is_ok());
        let product = result.unwrap();
        assert!(product.is_some());
        assert_eq!(product.unwrap().id, created.id);
    }

    #[tokio::test]
    async fn test_search_products() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        // Create multiple products
        for i in 1..=3 {
            let input = CreateProduct {
                name: format!("Arroz Tipo {}", i),
                barcode: Some(format!("78900000000{}", i)),
                internal_code: None,
                category_id: "cat-test-001".to_string(),
                sale_price: 20.0 + i as f64,
                cost_price: Some(10.0),
                min_stock: Some(5.0),
                current_stock: Some(0.0),
                description: None,
                unit: Some(crate::models::ProductUnit::Unit),
                is_weighted: Some(false),
                max_stock: None,
            };
            repo.create(input).await.unwrap();
        }

        let result = repo.search("arroz", 10).await;

        assert!(result.is_ok());
        let products = result.unwrap();
        assert_eq!(products.len(), 3);
    }

    #[tokio::test]
    async fn test_update_product() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input = CreateProduct {
            name: "Original Name".to_string(),
            barcode: Some("7890000000010".to_string()),
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 50.0,
            cost_price: Some(25.0),
            min_stock: Some(10.0),
            current_stock: Some(0.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        let product = repo.create(input).await.unwrap();

        let update = crate::models::UpdateProduct {
            name: Some("Updated Name".to_string()),
            sale_price: Some(55.0),
            ..Default::default()
        };

        let result = repo.update(&product.id, update).await;

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.sale_price, 55.0);
    }

    #[tokio::test]
    async fn test_update_product_creates_stock_movement() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input = CreateProduct {
            name: "Stock Update Product".to_string(),
            barcode: None,
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 10.0,
            cost_price: Some(5.0),
            min_stock: Some(5.0),
            current_stock: Some(10.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        let product = repo.create(input).await.unwrap();

        // Update stock via update() method
        let update = crate::models::UpdateProduct {
            current_stock: Some(15.0), // +5
            reason: Some("Manual Correction".to_string()),
            ..Default::default()
        };

        let result = repo.update(&product.id, update).await;
        assert!(result.is_ok());

        // Verify movement was created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM stock_movements WHERE product_id = ? AND type = 'ADJUSTMENT'",
        )
        .bind(&product.id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 1, "Should create 1 stock movement");

        // Verify new stock
        let updated = result.unwrap();
        assert_eq!(updated.current_stock, 15.0);
    }

    #[tokio::test]
    async fn test_delete_product() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        let input = CreateProduct {
            name: "To Delete".to_string(),
            barcode: None,
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 10.0,
            cost_price: Some(5.0),
            min_stock: Some(5.0),
            current_stock: Some(0.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        let product = repo.create(input).await.unwrap();

        let result = repo.soft_delete(&product.id).await;
        assert!(result.is_ok());

        // Verify it's deactivated
        let found = repo.find_by_id(&product.id).await.unwrap();
        assert!(found.is_some());
        assert!(!found.unwrap().is_active);
    }

    #[tokio::test]
    async fn test_get_low_stock_products() {
        let pool = setup_test_db().await;
        let repo = ProductRepository::new(&pool);

        // Create product with low stock
        let input = CreateProduct {
            name: "Low Stock Product".to_string(),
            barcode: None,
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 10.0,
            cost_price: Some(5.0),
            min_stock: Some(20.0),
            // find_low_stock filtra current_stock > 0; para estoque zerado use find_out_of_stock.
            current_stock: Some(1.0),
            description: None,
            unit: Some(crate::models::ProductUnit::Unit),
            is_weighted: Some(false),
            max_stock: None,
        };
        let product = repo.create(input).await.unwrap();

        // Product created with current_stock=0, min_stock=20 → should appear in low stock
        // But need to verify if find_low_stock actually filters by current_stock <= min_stock
        let result = repo.find_low_stock().await;

        assert!(result.is_ok());
        let products = result.unwrap();
        assert!(products.iter().any(|p| p.id == product.id));
        // If find_low_stock is implemented correctly, should have at least 1 product
        // For now, let's verify the product was created with correct stock values
        let found = repo.find_by_id(&product.id).await.unwrap().unwrap();
        assert_eq!(found.current_stock, 1.0);
        assert_eq!(found.min_stock, 20.0);
    }
    #[tokio::test]
    async fn test_find_with_category_filter() {
        let pool = setup_test_db().await;
        // Create another category
        sqlx::query(
            "INSERT INTO categories (id, name, is_active, created_at, updated_at) 
             VALUES ('cat-filter-002', 'Filter Category', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        let repo = ProductRepository::new(&pool);

        // Product in cat 1
        let p1 = CreateProduct {
            name: "P1".to_string(),
            barcode: None,
            internal_code: None,
            category_id: "cat-test-001".to_string(),
            sale_price: 10.0,
            cost_price: None,
            min_stock: None,
            current_stock: None,
            description: None,
            unit: None,
            is_weighted: None,
            max_stock: None,
        };
        repo.create(p1).await.unwrap();

        // Product in cat 2
        let p2 = CreateProduct {
            name: "P2".to_string(),
            barcode: None,
            internal_code: None,
            category_id: "cat-filter-002".to_string(),
            sale_price: 10.0,
            cost_price: None,
            min_stock: None,
            current_stock: None,
            description: None,
            unit: None,
            is_weighted: None,
            max_stock: None,
        };
        repo.create(p2).await.unwrap();

        // Filter by category 2
        let filters = crate::models::ProductFilters {
            category_id: Some("cat-filter-002".to_string()),
            ..Default::default()
        };

        let result = repo.find_with_filters(&filters).await;
        assert!(result.is_ok());
        let products = result.unwrap();
        assert_eq!(products.len(), 1);
        assert_eq!(products[0].name, "P2");
    }
}
