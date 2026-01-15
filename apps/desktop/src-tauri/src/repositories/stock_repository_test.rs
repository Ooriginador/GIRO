//! Testes para StockRepository

use crate::models::CreateStockMovement;
use crate::repositories::stock_repository::StockRepository;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .unwrap();

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
         VALUES ('emp-001', 'Test Employee', '8899', 'OPERATOR', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create test product with initial stock
    sqlx::query(
        "INSERT INTO products (id, internal_code, barcode, name, category_id, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, created_at, updated_at) 
         VALUES ('prod-001', 'MRC-00001', '7890000000001', 'Test Product', 'cat-001', 'UNIT', 0, 10.0, 5.0, 100.0, 10.0, 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create another product for varied testing
    sqlx::query(
        "INSERT INTO products (id, internal_code, barcode, name, category_id, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, created_at, updated_at) 
         VALUES ('prod-002', 'MRC-00002', '7890000000002', 'Test Product 2', 'cat-001', 'KILOGRAM', 1, 20.0, 12.0, 50.0, 5.0, 1, datetime('now'), datetime('now'))",
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
        reason: Some("Entrada de mercadoria".to_string()),
        reference_id: None,
        reference_type: None,
        employee_id: Some("emp-001".to_string()),
    };

    let result = repo.create_movement(input).await;
    assert!(result.is_ok());

    let movement = result.unwrap();
    assert_eq!(movement.product_id, "prod-001");
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
        quantity: -30.0, // Exit is negative
        reason: Some("Venda".to_string()),
        reference_id: Some("sale-001".to_string()),
        reference_type: Some("SALE".to_string()),
        employee_id: Some("emp-001".to_string()),
    };

    let result = repo.create_movement(input).await;
    assert!(result.is_ok());

    let movement = result.unwrap();
    assert_eq!(movement.new_stock, 70.0); // 100 - 30
}

#[tokio::test]
async fn test_find_movement_by_id() {
    let pool = setup_test_db().await;
    let repo = StockRepository::new(&pool);

    // Create a movement first
    let input = CreateStockMovement {
        product_id: "prod-001".to_string(),
        movement_type: "ENTRY".to_string(),
        quantity: 10.0,
        reason: Some("Test".to_string()),
        reference_id: None,
        reference_type: None,
        employee_id: None,
    };

    let created = repo.create_movement(input).await.unwrap();
    let found = repo.find_movement_by_id(&created.id).await.unwrap();

    assert!(found.is_some());
    assert_eq!(found.unwrap().id, created.id);
}

#[tokio::test]
async fn test_find_movement_by_id_not_found() {
    let pool = setup_test_db().await;
    let repo = StockRepository::new(&pool);

    let found = repo.find_movement_by_id("non-existent-id").await.unwrap();
    assert!(found.is_none());
}

#[tokio::test]
async fn test_find_movements_by_product() {
    let pool = setup_test_db().await;
    let repo = StockRepository::new(&pool);

    // Create multiple movements for prod-001
    for i in 1..=3 {
        let input = CreateStockMovement {
            product_id: "prod-001".to_string(),
            movement_type: "ENTRY".to_string(),
            quantity: i as f64 * 10.0,
            reason: Some(format!("Entry {}", i)),
            reference_id: None,
            reference_type: None,
            employee_id: None,
        };
        repo.create_movement(input).await.unwrap();
    }

    // Create one for prod-002
    let input = CreateStockMovement {
        product_id: "prod-002".to_string(),
        movement_type: "ENTRY".to_string(),
        quantity: 5.0,
        reason: Some("Different product".to_string()),
        reference_id: None,
        reference_type: None,
        employee_id: None,
    };
    repo.create_movement(input).await.unwrap();

    // Query for prod-001 only
    let movements = repo
        .find_movements_by_product("prod-001", 10)
        .await
        .unwrap();
    assert_eq!(movements.len(), 3);

    // All should be for prod-001
    for movement in &movements {
        assert_eq!(movement.product_id, "prod-001");
    }
}

#[tokio::test]
async fn test_find_recent_movements() {
    let pool = setup_test_db().await;
    let repo = StockRepository::new(&pool);

    // Create 5 movements
    for i in 1..=5 {
        let input = CreateStockMovement {
            product_id: "prod-001".to_string(),
            movement_type: "ENTRY".to_string(),
            quantity: i as f64,
            reason: Some(format!("Movement {}", i)),
            reference_id: None,
            reference_type: None,
            employee_id: None,
        };
        repo.create_movement(input).await.unwrap();
    }

    // Get recent 3
    let movements = repo.find_recent_movements(3).await.unwrap();
    assert_eq!(movements.len(), 3);

    // Should be in descending order by created_at
    // Most recent first (quantity 5, 4, 3)
}

#[tokio::test]
async fn test_stock_update_after_movement() {
    let pool = setup_test_db().await;
    let repo = StockRepository::new(&pool);

    // Check initial stock
    let initial: (f64,) = sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
        .bind("prod-001")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(initial.0, 100.0);

    // Create entry movement
    let input = CreateStockMovement {
        product_id: "prod-001".to_string(),
        movement_type: "ENTRY".to_string(),
        quantity: 25.0,
        reason: None,
        reference_id: None,
        reference_type: None,
        employee_id: None,
    };
    repo.create_movement(input).await.unwrap();

    // Check updated stock
    let updated: (f64,) = sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
        .bind("prod-001")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(updated.0, 125.0);
}
