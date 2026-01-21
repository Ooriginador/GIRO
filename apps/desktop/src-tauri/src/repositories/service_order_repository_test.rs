//! Testes para ServiceOrderRepository

use crate::models::CreateServiceOrder;
use crate::repositories::service_order_repository::ServiceOrderRepository;
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

    // Seed minimal data for FKs
    sqlx::query(
        "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) \
         VALUES ('emp-001', 'Test Employee', '8899', 'OPERATOR', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO vehicle_brands (id, name, is_active, created_at, updated_at) \
         VALUES ('vb-001', 'Honda', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO vehicle_models (id, brand_id, name, is_active, created_at, updated_at) \
         VALUES ('vm-001', 'vb-001', 'CG 160', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO vehicle_years (id, model_id, year, year_label, is_active, created_at, updated_at) \
         VALUES ('vy-001', 'vm-001', 2020, '2020', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO customers (id, name, is_active, created_at, updated_at) \
         VALUES ('cus-001', 'John Doe', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO categories (id, name, is_active, created_at, updated_at) \
         VALUES ('cat-001', 'Test Category', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO customer_vehicles (id, customer_id, vehicle_year_id, plate, is_active, created_at, updated_at) \
         VALUES ('cv-001', 'cus-001', 'vy-001', 'ABC-1234', 1, datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

#[tokio::test]
async fn test_create_service_order_increments_number() {
    let pool = setup_test_db().await;
    let repo = ServiceOrderRepository::new(pool.clone());

    let input = CreateServiceOrder {
        customer_id: "cus-001".to_string(),
        customer_vehicle_id: "cv-001".to_string(),
        vehicle_year_id: "vy-001".to_string(),
        employee_id: "emp-001".to_string(),
        vehicle_km: Some(10_000),
        symptoms: Some("Engine noise".to_string()),
        scheduled_date: Some("2026-01-09T10:00:00Z".to_string()),
        notes: None,
        internal_notes: None,
        status: None,
    };

    let os1 = repo.create(input.clone()).await.unwrap();
    let os2 = repo.create(input).await.unwrap();

    assert_eq!(os1.order_number, 1);
    assert_eq!(os2.order_number, 2);
    assert_eq!(os1.status, "OPEN");
    assert_eq!(os1.total, 0.0);
    assert_eq!(os1.labor_cost, 0.0);
    assert_eq!(os1.parts_cost, 0.0);
    assert_eq!(os1.discount, 0.0);
    assert_eq!(os1.warranty_days, 30);
    assert_eq!(os1.is_paid, false);
    assert_eq!(os1.symptoms.as_deref(), Some("Engine noise"));
}

#[tokio::test]
async fn test_add_item_to_quote_allows_insufficient_stock() {
    let pool = setup_test_db().await;
    let repo = ServiceOrderRepository::new(pool.clone());
    
    // 1. Create a product with 0 stock
    let product_id = "prod-001".to_string();
    sqlx::query(
        "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at) \
         VALUES (?, 'barcode-001', 'int-001', 'Test Part', 'Desc', 'UN', 0, 100.0, 50.0, 0.0, 5.0, 1, 'cat-001', datetime('now'), datetime('now'))",
    )
    .bind(&product_id)
    .execute(&pool)
    .await
    .unwrap();

    // 2. Create a Quote
    let input = CreateServiceOrder {
        customer_id: "cus-001".to_string(),
        customer_vehicle_id: "cv-001".to_string(),
        vehicle_year_id: "vy-001".to_string(),
        employee_id: "emp-001".to_string(),
        vehicle_km: Some(10_000),
        symptoms: None,
        scheduled_date: None,
        notes: None,
        internal_notes: None,
        status: Some("QUOTE".to_string()),
    };
    let order = repo.create(input).await.unwrap();

    // 3. Try to add item to Quote (should work even with 0 stock)
    let add_item_input = crate::models::AddServiceOrderItem {
        order_id: order.id.clone(),
        product_id: Some(product_id.clone()),
        item_type: "PART".to_string(),
        description: "Test Part".to_string(),
        quantity: 2.0,
        unit_price: 100.0,
        discount: None,
        notes: None,
        employee_id: Some("emp-001".to_string()),
    };
    
    let result = repo.add_item(add_item_input.clone()).await;
    assert!(result.is_ok(), "Should allow adding parts to QUOTE without stock: {:?}", result.err());

    // 4. Try to add same item to an OPEN order (should fail)
    let open_order = repo.create(CreateServiceOrder {
        customer_id: "cus-001".to_string(),
        customer_vehicle_id: "cv-001".to_string(),
        vehicle_year_id: "vy-001".to_string(),
        employee_id: "emp-001".to_string(),
        vehicle_km: Some(10_000),
        symptoms: None,
        scheduled_date: None,
        notes: None,
        internal_notes: None,
        status: Some("OPEN".to_string()),
    }).await.unwrap();
    
    let add_item_open_input = crate::models::AddServiceOrderItem {
        order_id: open_order.id,
        ..add_item_input
    };
    let result_open = repo.add_item(add_item_open_input).await;
    assert!(result_open.is_err(), "Should NOT allow adding parts to OPEN order without stock");
}

#[tokio::test]
async fn test_quote_to_open_consumes_stock() {
    let pool = setup_test_db().await;
    let repo = ServiceOrderRepository::new(pool.clone());
    
    // 1. Create a product with 10 stock
    let product_id = "prod-002".to_string();
    sqlx::query(
        "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at) \
         VALUES (?, 'barcode-002', 'int-002', 'Test Part 2', 'Desc', 'UN', 0, 100.0, 50.0, 10.0, 5.0, 1, 'cat-001', datetime('now'), datetime('now'))",
    )
    .bind(&product_id)
    .execute(&pool)
    .await
    .unwrap();
    
    // Also create a lot for FIFO consumption
    sqlx::query(
        "INSERT INTO product_lots (id, product_id, purchase_date, current_quantity, initial_quantity, cost_price, status, created_at, updated_at) \
         VALUES ('lot-001', ?, datetime('now'), 10.0, 10.0, 50.0, 'AVAILABLE', datetime('now'), datetime('now'))"
    )
    .bind(&product_id)
    .execute(&pool)
    .await
    .unwrap();

    // 2. Create Quote and add item
    let order = repo.create(CreateServiceOrder {
        customer_id: "cus-001".to_string(),
        customer_vehicle_id: "cv-001".to_string(),
        vehicle_year_id: "vy-001".to_string(),
        employee_id: "emp-001".to_string(),
        vehicle_km: Some(10_000),
        symptoms: None,
        scheduled_date: None,
        notes: None,
        internal_notes: None,
        status: Some("QUOTE".to_string()),
    }).await.unwrap();

    repo.add_item(crate::models::AddServiceOrderItem {
        order_id: order.id.clone(),
        product_id: Some(product_id.clone()),
        item_type: "PART".to_string(),
        description: "Test Part 2".to_string(),
        quantity: 3.0,
        unit_price: 100.0,
        discount: None,
        notes: None,
        employee_id: Some("emp-001".to_string()),
    }).await.unwrap();

    // Verify stock is still 10 (Quote doesn't consume)
    let p_before: f64 = sqlx::query_scalar("SELECT current_stock FROM products WHERE id = ?")
        .bind(&product_id)
        .fetch_one(&pool).await.unwrap();
    assert_eq!(p_before, 10.0);

    // 3. Approve Quote (Change status to OPEN)
    repo.update(&order.id, crate::models::UpdateServiceOrder {
        status: Some("OPEN".to_string()),
        ..Default::default()
    }).await.unwrap();

    // 4. Verify stock is now 7
    let p_after: f64 = sqlx::query_scalar("SELECT current_stock FROM products WHERE id = ?")
        .bind(&product_id)
        .fetch_one(&pool).await.unwrap();
    assert_eq!(p_after, 7.0);
    
    // Verify lot is now 7
    let lot_after: f64 = sqlx::query_scalar("SELECT current_quantity FROM product_lots WHERE id = 'lot-001'")
        .fetch_one(&pool).await.unwrap();
    assert_eq!(lot_after, 7.0);
}
