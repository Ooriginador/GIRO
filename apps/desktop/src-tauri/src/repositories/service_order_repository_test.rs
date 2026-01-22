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

    sqlx::query(
        "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at) \
         VALUES ('SERVICE', 'SERVICE', 'SERVICE', 'Service Dummy', 'Special product for labor', 'SERV', 0, 0.0, 0.0, 0.0, 0.0, 1, 'cat-001', datetime('now'), datetime('now'))",
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
    assert!(!os1.is_paid);
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
    assert!(
        result.is_ok(),
        "Should allow adding parts to QUOTE without stock: {:?}",
        result.err()
    );

    // 4. Try to add same item to an OPEN order (should fail)
    let open_order = repo
        .create(CreateServiceOrder {
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
        })
        .await
        .unwrap();

    let add_item_open_input = crate::models::AddServiceOrderItem {
        order_id: open_order.id,
        ..add_item_input
    };
    let result_open = repo.add_item(add_item_open_input).await;
    assert!(
        result_open.is_err(),
        "Should NOT allow adding parts to OPEN order without stock"
    );
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
    let order = repo
        .create(CreateServiceOrder {
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
        })
        .await
        .unwrap();

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
    })
    .await
    .unwrap();

    // Verify stock is still 10 (Quote doesn't consume)
    let p_before: f64 = sqlx::query_scalar("SELECT current_stock FROM products WHERE id = ?")
        .bind(&product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(p_before, 10.0);

    // 3. Approve Quote (Change status to OPEN)
    repo.update(
        &order.id,
        crate::models::UpdateServiceOrder {
            status: Some("OPEN".to_string()),
            ..Default::default()
        },
    )
    .await
    .unwrap();

    // 4. Verify stock is now 7
    let p_after: f64 = sqlx::query_scalar("SELECT current_stock FROM products WHERE id = ?")
        .bind(&product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(p_after, 7.0);

    // Verify lot is now 7
    let lot_after: f64 =
        sqlx::query_scalar("SELECT current_quantity FROM product_lots WHERE id = 'lot-001'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(lot_after, 7.0);
}

#[tokio::test]
async fn test_finish_order_generates_commission() {
    let pool = setup_test_db().await;
    let repo = ServiceOrderRepository::new(pool.clone());

    // 1. Create Employee with Commission Rate (10%)
    let emp_id = "emp-comm-01".to_string();
    sqlx::query(
        "INSERT INTO employees (id, name, pin, role, is_active, commission_rate, created_at, updated_at) \
         VALUES (?, 'Comm Employee', '9999', 'MECHANIC', 1, 10.0, datetime('now'), datetime('now'))",
    )
    .bind(&emp_id)
    .execute(&pool)
    .await
    .unwrap();

    // 2. Create Cash Session for the cashier
    let cashier_id = "emp-001"; // From setup
    let session_id = "sess-001";
    sqlx::query(
        "INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at) \
         VALUES (?, ?, 100.0, 'OPEN', datetime('now'))",
    )
    .bind(session_id)
    .bind(cashier_id)
    .execute(&pool)
    .await
    .unwrap();

    // 3. Create Service Order for the Mechanic
    let order_input = crate::models::CreateServiceOrder {
        customer_id: "cus-001".to_string(),
        customer_vehicle_id: "cv-001".to_string(),
        vehicle_year_id: "vy-001".to_string(),
        employee_id: emp_id.clone(), // Mechanic gets the commission
        vehicle_km: Some(1000),
        symptoms: None,
        scheduled_date: None,
        notes: None,
        internal_notes: None,
        status: Some("OPEN".to_string()),
    };
    let order = repo.create(order_input).await.unwrap();

    // 4. Add items ($200 labor + $50 product with lot)
    // Add Labor
    repo.add_item(crate::models::AddServiceOrderItem {
        order_id: order.id.clone(),
        product_id: None,
        item_type: "SERVICE".to_string(),
        description: "Labor".to_string(),
        quantity: 1.0,
        unit_price: 200.0,
        discount: None,
        notes: None,
        employee_id: Some(emp_id.clone()),
    })
    .await
    .unwrap();

    // Add Product
    sqlx::query(
        "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at) \
         VALUES ('prod-finish-01', 'bar-finish-01', 'int-finish-01', 'Finish Prod', 'Desc', 'UNIT', 0, 100.0, 50.0, 100.0, 5.0, 1, 'cat-001', datetime('now'), datetime('now'))",
    )
    .execute(&pool)
    .await
    .unwrap();

    // Add Lot
    sqlx::query(
        "INSERT INTO product_lots (id, product_id, current_quantity, initial_quantity, cost_price, status, expiration_date, purchase_date) \
         VALUES ('lot-finish-01', 'prod-finish-01', 10.0, 10.0, 5.0, 'AVAILABLE', '2030-01-01', datetime('now'))"
    )
    .execute(&pool)
    .await
    .unwrap();

    repo.add_item(crate::models::AddServiceOrderItem {
        order_id: order.id.clone(),
        product_id: Some("prod-finish-01".to_string()),
        item_type: "PART".to_string(),
        description: "Test Product".to_string(),
        quantity: 1.0,
        unit_price: 50.0,
        discount: None,
        notes: None,
        employee_id: Some(emp_id.clone()),
    })
    .await
    .unwrap();

    // 5. Finish Order ($200 + $50 = $250)
    let result = repo
        .finish_order_transaction(&order.id, "CASH", 250.0, cashier_id, session_id)
        .await;

    assert!(result.is_ok(), "Finish order failed: {:?}", result.err());
    let sale_id = result.unwrap();

    // 6. Verify Sale Items (Must have 2 items: 1 labor, 1 part with lot)
    let items_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sale_items WHERE sale_id = ?")
        .bind(&sale_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(items_count.0, 2, "Should have 2 sale items (Labor + Part)");

    let labor_item: (String, Option<String>) = sqlx::query_as(
        "SELECT product_id, lot_id FROM sale_items WHERE sale_id = ? AND product_unit = 'SERV'",
    )
    .bind(&sale_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(labor_item.0, "SERVICE");
    assert!(labor_item.1.is_none());

    let part_item: (String, String) = sqlx::query_as(
        "SELECT product_id, lot_id FROM sale_items WHERE sale_id = ? AND product_id = 'prod-finish-01'",
    )
    .bind(&sale_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(part_item.0, "prod-finish-01");
    assert_eq!(part_item.1, "lot-finish-01");

    // 7. Verify Commission
    // Expect 10% of 250 = 25.0
    let row = sqlx::query("SELECT amount, employee_id FROM commissions WHERE sale_id = ?")
        .bind(&sale_id)
        .fetch_optional(&pool)
        .await
        .unwrap();

    assert!(row.is_some(), "Commission record not found");

    use sqlx::Row;
    let r = row.unwrap();
    let comm_amount: f64 = r.get("amount");
    let comm_emp: String = r.get("employee_id");

    assert_eq!(comm_emp, emp_id);
    assert!(
        (comm_amount - 25.0).abs() < 0.001,
        "Commission amount should be 25.0, got {}",
        comm_amount
    );
}

#[tokio::test]
async fn test_cancel_order_restores_stock() {
    let pool = setup_test_db().await;
    let repo = ServiceOrderRepository::new(pool.clone());

    // 1. Create Product with 10 stock
    let product_id = "prod-cancel-test".to_string();
    sqlx::query(
        "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at) \
         VALUES (?, 'bar-cancel', 'int-cancel', 'Cancel Test', 'Desc', 'UN', 0, 100.0, 50.0, 10.0, 5.0, 1, 'cat-001', datetime('now'), datetime('now'))",
    )
    .bind(&product_id)
    .execute(&pool)
    .await
    .unwrap();

    // 2. Create Order
    let order = repo
        .create(CreateServiceOrder {
            customer_id: "cus-001".to_string(),
            customer_vehicle_id: "cv-001".to_string(),
            vehicle_year_id: "vy-001".to_string(),
            employee_id: "emp-001".to_string(),
            vehicle_km: Some(100),
            symptoms: None,
            scheduled_date: None,
            notes: None,
            internal_notes: None,
            status: Some("OPEN".to_string()),
        })
        .await
        .unwrap();

    // 3. Add Item (Consume 2, Stock -> 8)
    repo.add_item(crate::models::AddServiceOrderItem {
        order_id: order.id.clone(),
        product_id: Some(product_id.clone()),
        item_type: "PART".to_string(),
        description: "Part".to_string(),
        quantity: 2.0,
        unit_price: 100.0,
        discount: None,
        notes: None,
        employee_id: Some("emp-001".to_string()),
    })
    .await
    .unwrap();

    // Verify stock is 8
    let p_before: f64 = sqlx::query_scalar("SELECT current_stock FROM products WHERE id = ?")
        .bind(&product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(p_before, 8.0);

    // 4. Cancel Order
    let canceled = repo
        .cancel_with_stock_restoration(&order.id, Some("Customer canceled".to_string()))
        .await
        .unwrap();

    assert_eq!(canceled.status, "CANCELED");

    // 5. Verify Stock is back to 10
    let p_after: f64 = sqlx::query_scalar("SELECT current_stock FROM products WHERE id = ?")
        .bind(&product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(p_after, 10.0);

    // 6. Verify Movement
    let movement_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stock_movements WHERE reference_id = ? AND type = 'RETURN'",
    )
    .bind(&order.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(movement_count, 1, "Should have 1 return movement");
}
