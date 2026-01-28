//! Testes Unitários - Enterprise Module
//!
//! Testes para os serviços e repositórios do módulo Enterprise (Almoxarifado Industrial)

pub mod activity_tests;
pub mod contract_tests;
pub mod material_request_tests;
pub mod mobile_handlers_tests;
pub mod reports_tests;
pub mod stock_location_tests;
pub mod stock_transfer_tests;

use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use uuid::Uuid;

/// Setup de banco de dados em memória para testes
pub async fn setup_test_db() -> Pool<Sqlite> {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("Failed to create test database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

/// Gera um UUID único para testes
pub fn test_uuid() -> String {
    Uuid::new_v4().to_string()
}

/// Helper: Cria um funcionário de teste
pub async fn create_test_employee(pool: &Pool<Sqlite>) -> String {
    let id = test_uuid();
    sqlx::query(
        r#"
        INSERT INTO employees (id, name, document, role, is_active, created_at, updated_at)
        VALUES (?, 'Funcionário Teste', '123.456.789-00', 'OPERATOR', 1, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .execute(pool)
    .await
    .expect("Failed to create test employee");
    id
}

/// Helper: Cria um produto de teste
pub async fn create_test_product(pool: &Pool<Sqlite>) -> String {
    let id = test_uuid();
    let code = format!("PROD-{}", &id[..8]);
    sqlx::query(
        r#"
        INSERT INTO products (id, code, name, unit, cost_price, sell_price, is_active, created_at, updated_at)
        VALUES (?, ?, 'Produto Teste', 'UN', 10.0, 15.0, 1, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&code)
    .execute(pool)
    .await
    .expect("Failed to create test product");
    id
}
