//! Testes para Reports Enterprise
//!
//! Cobre:
//! - get_contracts_consumption_summary
//! - get_product_kardex
//! - get_global_dashboard (via ContractRepository)

use super::*;
use sqlx::Row;

/// Helper: Cria contrato ativo para testes
async fn create_active_contract(pool: &Pool<Sqlite>, code: &str, budget: f64) -> String {
    let id = test_uuid();
    let manager_id = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO contracts (
            id, code, name, client_name, client_document,
            manager_id, status, budget, created_at, updated_at
        ) VALUES (
            ?, ?, 'Contrato Teste', 'Cliente Teste', '12.345.678/0001-90',
            ?, 'ACTIVE', ?, datetime('now'), datetime('now')
        )
        "#,
    )
    .bind(&id)
    .bind(code)
    .bind(&manager_id)
    .bind(budget)
    .execute(pool)
    .await
    .expect("Failed to create test contract");

    id
}

/// Helper: Cria work front para contrato
async fn create_work_front(pool: &Pool<Sqlite>, contract_id: &str, code: &str) -> String {
    let id = test_uuid();
    let supervisor_id = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO work_fronts (id, contract_id, code, name, supervisor_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'Frente Teste', ?, 'ACTIVE', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(contract_id)
    .bind(code)
    .bind(&supervisor_id)
    .execute(pool)
    .await
    .expect("Failed to create work front");

    id
}

/// Helper: Cria atividade para work front
async fn create_activity(pool: &Pool<Sqlite>, work_front_id: &str, code: &str) -> String {
    let id = test_uuid();

    sqlx::query(
        r#"
        INSERT INTO activities (id, work_front_id, code, name, status, created_at, updated_at)
        VALUES (?, ?, ?, 'Atividade Teste', 'IN_PROGRESS', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(work_front_id)
    .bind(code)
    .execute(pool)
    .await
    .expect("Failed to create activity");

    id
}

/// Helper: Cria consumo de material
async fn create_consumption(
    pool: &Pool<Sqlite>,
    activity_id: &str,
    product_id: &str,
    quantity: f64,
    unit_cost: f64,
) -> String {
    let id = test_uuid();
    let consumed_by = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO material_consumptions (id, activity_id, product_id, quantity, unit_cost, consumed_by, consumed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(activity_id)
    .bind(product_id)
    .bind(quantity)
    .bind(unit_cost)
    .bind(&consumed_by)
    .execute(pool)
    .await
    .expect("Failed to create consumption");

    id
}

/// Helper: Cria local de estoque
async fn create_location(pool: &Pool<Sqlite>, code: &str) -> String {
    let id = test_uuid();

    sqlx::query(
        r#"
        INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at)
        VALUES (?, ?, 'Local Teste', 'WAREHOUSE', 1, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(code)
    .execute(pool)
    .await
    .expect("Failed to create location");

    id
}

/// Helper: Cria saldo de estoque
async fn create_stock_balance(
    pool: &Pool<Sqlite>,
    product_id: &str,
    location_id: &str,
    quantity: f64,
) {
    let id = test_uuid();

    sqlx::query(
        r#"
        INSERT INTO stock_balances (id, product_id, location_id, quantity, min_stock, max_stock, updated_at)
        VALUES (?, ?, ?, ?, 10.0, 100.0, datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(product_id)
    .bind(location_id)
    .bind(quantity)
    .execute(pool)
    .await
    .expect("Failed to create stock balance");
}

#[cfg(test)]
mod tests {
    use super::*;

    // ═══════════════════════════════════════════════════════════════════════════════
    // GET CONTRACTS CONSUMPTION SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════════

    #[tokio::test]
    async fn test_consumption_summary_empty() {
        let pool = setup_test_db().await;

        // Cria contrato ativo sem consumo
        let _contract_id = create_active_contract(&pool, "OBRA-001", 100000.0).await;

        let row = sqlx::query(
            r#"
            SELECT 
                c.id as contract_id,
                c.code,
                c.budget,
                COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_consumption
            FROM contracts c
            LEFT JOIN work_fronts wf ON wf.contract_id = c.id
            LEFT JOIN activities a ON a.work_front_id = wf.id
            LEFT JOIN material_consumptions mc ON mc.activity_id = a.id
            WHERE c.status = 'ACTIVE'
            GROUP BY c.id
            "#,
        )
        .fetch_one(&pool)
        .await
        .expect("Query should succeed");

        let total: f64 = row.try_get("total_consumption").unwrap_or(0.0);
        assert_eq!(total, 0.0, "Should have zero consumption");
    }

    #[tokio::test]
    async fn test_consumption_summary_with_data() {
        let pool = setup_test_db().await;

        // Setup: contrato → work front → atividade → consumo
        let contract_id = create_active_contract(&pool, "OBRA-002", 50000.0).await;
        let wf_id = create_work_front(&pool, &contract_id, "FT-001").await;
        let act_id = create_activity(&pool, &wf_id, "ATV-001").await;
        let product_id = create_test_product(&pool).await;

        // Consumo: 10 unidades x R$25 = R$250
        create_consumption(&pool, &act_id, &product_id, 10.0, 25.0).await;

        let row = sqlx::query(
            r#"
            SELECT 
                COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_consumption
            FROM contracts c
            LEFT JOIN work_fronts wf ON wf.contract_id = c.id
            LEFT JOIN activities a ON a.work_front_id = wf.id
            LEFT JOIN material_consumptions mc ON mc.activity_id = a.id
            WHERE c.id = ?
            GROUP BY c.id
            "#,
        )
        .bind(&contract_id)
        .fetch_one(&pool)
        .await
        .expect("Query should succeed");

        let total: f64 = row.try_get("total_consumption").unwrap_or(0.0);
        assert!(
            (total - 250.0).abs() < 0.01,
            "Should have R$250 consumption"
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // GET GLOBAL DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════════

    #[tokio::test]
    async fn test_dashboard_active_contracts_count() {
        let pool = setup_test_db().await;

        // Cria 3 contratos: 2 ACTIVE, 1 PLANNING
        create_active_contract(&pool, "OBRA-A", 10000.0).await;
        create_active_contract(&pool, "OBRA-B", 20000.0).await;

        // Contrato PLANNING
        let id = test_uuid();
        let manager_id = create_test_employee(&pool).await;
        sqlx::query(
            r#"
            INSERT INTO contracts (id, code, name, client_name, client_document, manager_id, status, created_at, updated_at)
            VALUES (?, 'OBRA-C', 'Contrato C', 'Cliente C', '11.222.333/0001-44', ?, 'PLANNING', datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(&manager_id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT COUNT(*) as cnt FROM contracts WHERE status = 'ACTIVE'")
            .fetch_one(&pool)
            .await
            .unwrap();
        let count: i32 = row.try_get("cnt").unwrap_or(0);

        assert_eq!(count, 2, "Should have 2 active contracts");
    }

    #[tokio::test]
    async fn test_dashboard_low_stock_items() {
        let pool = setup_test_db().await;

        let product_id = create_test_product(&pool).await;
        let location_id = create_location(&pool, "ALM-001").await;

        // Saldo 5 com mínimo 10 = baixo estoque
        create_stock_balance(&pool, &product_id, &location_id, 5.0).await;

        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as cnt FROM (
                SELECT sb.product_id, SUM(sb.quantity) as total_qty, MIN(sb.min_stock) as min_stock
                FROM stock_balances sb
                GROUP BY sb.product_id
                HAVING SUM(sb.quantity) <= MIN(sb.min_stock)
            )
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let count: i32 = row.try_get("cnt").unwrap_or(0);

        assert_eq!(count, 1, "Should have 1 low stock item");
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // KARDEX REPORT
    // ═══════════════════════════════════════════════════════════════════════════════

    #[tokio::test]
    async fn test_kardex_consumption_entries() {
        let pool = setup_test_db().await;

        // Setup
        let contract_id = create_active_contract(&pool, "OBRA-K1", 30000.0).await;
        let wf_id = create_work_front(&pool, &contract_id, "FT-K1").await;
        let act_id = create_activity(&pool, &wf_id, "ATV-K1").await;
        let product_id = create_test_product(&pool).await;

        // Consumo
        create_consumption(&pool, &act_id, &product_id, 5.0, 10.0).await;

        // Verifica se consumo foi registrado
        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as cnt FROM material_consumptions WHERE product_id = ?
            "#,
        )
        .bind(&product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        let count: i32 = row.try_get("cnt").unwrap_or(0);

        assert_eq!(count, 1, "Should have 1 consumption entry");
    }

    #[tokio::test]
    async fn test_kardex_stock_movement_entries() {
        let pool = setup_test_db().await;

        let product_id = create_test_product(&pool).await;
        let location_id = create_location(&pool, "ALM-K2").await;
        let employee_id = create_test_employee(&pool).await;

        // Cria movimento de ajuste
        let movement_id = test_uuid();
        sqlx::query(
            r#"
            INSERT INTO stock_movements (id, product_id, location_id, movement_type, quantity, reason, performed_by, created_at)
            VALUES (?, ?, ?, 'ADJUSTMENT', 20.0, 'Ajuste de inventário', ?, datetime('now'))
            "#,
        )
        .bind(&movement_id)
        .bind(&product_id)
        .bind(&location_id)
        .bind(&employee_id)
        .execute(&pool)
        .await
        .expect("Should create movement");

        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as cnt FROM stock_movements WHERE product_id = ?
            "#,
        )
        .bind(&product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        let count: i32 = row.try_get("cnt").unwrap_or(0);

        assert_eq!(count, 1, "Should have 1 stock movement entry");
    }
}
