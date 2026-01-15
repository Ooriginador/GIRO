//! Testes para ServiceOrderRepository

use crate::models::CreateServiceOrder;
use crate::repositories::service_order_repository::ServiceOrderRepository;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
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
