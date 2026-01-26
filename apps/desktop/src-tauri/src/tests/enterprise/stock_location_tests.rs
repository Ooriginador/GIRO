//! Testes para StockLocationRepository
//!
//! Cobre:
//! - Tipos de local (CENTRAL, FIELD, TRANSIT)
//! - Hierarquia de locais
//! - Saldos de estoque por local

use super::*;
use sqlx::Row;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_central_warehouse() {
        let pool = setup_test_db().await;
        let id = test_uuid();

        sqlx::query(
            r#"
            INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at)
            VALUES (?, 'ALM-CENTRAL', 'Almoxarifado Central', 'CENTRAL', 1, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT * FROM stock_locations WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();

        let loc_type: String = row.get("location_type");
        assert_eq!(loc_type, "CENTRAL");
    }

    #[tokio::test]
    async fn test_create_field_location() {
        let pool = setup_test_db().await;
        let id = test_uuid();

        // Criar contrato e frente primeiro
        let contract_id = create_contract_for_location(&pool).await;
        let work_front_id = create_work_front(&pool, &contract_id).await;

        sqlx::query(
            r#"
            INSERT INTO stock_locations (id, code, name, location_type, work_front_id, is_active, created_at, updated_at)
            VALUES (?, 'FT-001-ALM', 'Almoxarifado Frente 1', 'FIELD', ?, 1, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(&work_front_id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT * FROM stock_locations WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();

        let loc_type: String = row.get("location_type");
        let wf_id: Option<String> = row.get("work_front_id");

        assert_eq!(loc_type, "FIELD");
        assert_eq!(wf_id, Some(work_front_id));
    }

    #[tokio::test]
    async fn test_create_transit_location() {
        let pool = setup_test_db().await;
        let id = test_uuid();

        sqlx::query(
            r#"
            INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at)
            VALUES (?, 'TRANSIT-001', 'Em Trânsito Veículo 01', 'TRANSIT', 1, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT location_type FROM stock_locations WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();

        let loc_type: String = row.get("location_type");
        assert_eq!(loc_type, "TRANSIT");
    }

    #[tokio::test]
    async fn test_location_stock_balances() {
        let pool = setup_test_db().await;
        let location_id = create_location_helper(&pool, "ALM-STOCK", "CENTRAL").await;

        // Adicionar múltiplos produtos
        let p1 = create_test_product(&pool).await;
        let p2 = create_test_product(&pool).await;
        let p3 = create_test_product(&pool).await;

        create_balance_helper(&pool, &location_id, &p1, 100.0).await;
        create_balance_helper(&pool, &location_id, &p2, 50.0).await;
        create_balance_helper(&pool, &location_id, &p3, 25.0).await;

        // Contar itens no local
        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM stock_balances WHERE location_id = ?",
        )
        .bind(&location_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 3);

        // Soma total do estoque
        let total = sqlx::query_scalar::<_, f64>(
            "SELECT SUM(quantity) FROM stock_balances WHERE location_id = ?",
        )
        .bind(&location_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(total, 175.0);
    }

    #[tokio::test]
    async fn test_location_with_reserved_stock() {
        let pool = setup_test_db().await;
        let location_id = create_location_helper(&pool, "ALM-RES", "CENTRAL").await;
        let product_id = create_test_product(&pool).await;

        let balance_id = test_uuid();
        sqlx::query(
            r#"
            INSERT INTO stock_balances (id, location_id, product_id, quantity, reserved_quantity, created_at, updated_at)
            VALUES (?, ?, ?, 100.0, 30.0, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&balance_id)
        .bind(&location_id)
        .bind(&product_id)
        .execute(&pool)
        .await
        .unwrap();

        let row =
            sqlx::query("SELECT quantity, reserved_quantity FROM stock_balances WHERE id = ?")
                .bind(&balance_id)
                .fetch_one(&pool)
                .await
                .unwrap();

        let qty: f64 = row.get("quantity");
        let reserved: f64 = row.get("reserved_quantity");
        let available = qty - reserved;

        assert_eq!(qty, 100.0);
        assert_eq!(reserved, 30.0);
        assert_eq!(available, 70.0);
    }

    #[tokio::test]
    async fn test_duplicate_location_code() {
        let pool = setup_test_db().await;

        // Primeiro local
        create_location_helper(&pool, "ALM-DUP", "CENTRAL").await;

        // Tentar criar com mesmo código
        let result = sqlx::query(
            r#"
            INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at)
            VALUES (?, 'ALM-DUP', 'Outro', 'CENTRAL', 1, datetime('now'), datetime('now'))
            "#,
        )
        .bind(test_uuid())
        .execute(&pool)
        .await;

        assert!(result.is_err(), "Duplicate code should fail");
    }

    #[tokio::test]
    async fn test_deactivate_location() {
        let pool = setup_test_db().await;
        let location_id = create_location_helper(&pool, "ALM-DEACT", "CENTRAL").await;

        // Desativar
        sqlx::query("UPDATE stock_locations SET is_active = 0 WHERE id = ?")
            .bind(&location_id)
            .execute(&pool)
            .await
            .unwrap();

        // Verificar que não aparece em query de ativos
        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM stock_locations WHERE id = ? AND is_active = 1",
        )
        .bind(&location_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_location_min_stock_alerts() {
        let pool = setup_test_db().await;
        let location_id = create_location_helper(&pool, "ALM-ALERT", "CENTRAL").await;

        let product_id = create_test_product(&pool).await;

        // Definir estoque mínimo no produto
        sqlx::query("UPDATE products SET min_stock = 50.0 WHERE id = ?")
            .bind(&product_id)
            .execute(&pool)
            .await
            .unwrap();

        // Criar saldo abaixo do mínimo
        create_balance_helper(&pool, &location_id, &product_id, 20.0).await;

        // Query para produtos abaixo do mínimo
        let low_stock = sqlx::query(
            r#"
            SELECT sb.product_id, sb.quantity, p.min_stock
            FROM stock_balances sb
            JOIN products p ON sb.product_id = p.id
            WHERE sb.location_id = ? AND sb.quantity < p.min_stock
            "#,
        )
        .bind(&location_id)
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(low_stock.len(), 1);

        let qty: f64 = low_stock[0].get("quantity");
        let min: f64 = low_stock[0].get("min_stock");
        assert_eq!(qty, 20.0);
        assert_eq!(min, 50.0);
    }

    // Helpers
    async fn create_contract_for_location(pool: &Pool<Sqlite>) -> String {
        let id = test_uuid();
        let manager_id = create_test_employee(pool).await;

        sqlx::query(
            r#"
            INSERT INTO contracts (id, code, name, client_name, client_document, manager_id, status, created_at, updated_at)
            VALUES (?, 'LOC-CONTRACT', 'Contrato Local', 'Cliente', '12.345.678/0001-90', ?, 'ACTIVE', datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(&manager_id)
        .execute(pool)
        .await
        .unwrap();

        id
    }

    async fn create_work_front(pool: &Pool<Sqlite>, contract_id: &str) -> String {
        let id = test_uuid();

        sqlx::query(
            r#"
            INSERT INTO work_fronts (id, contract_id, code, name, status, created_at, updated_at)
            VALUES (?, ?, 'FT-TEST', 'Frente Teste', 'ACTIVE', datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(contract_id)
        .execute(pool)
        .await
        .unwrap();

        id
    }

    async fn create_location_helper(pool: &Pool<Sqlite>, code: &str, loc_type: &str) -> String {
        let id = test_uuid();

        sqlx::query(
            r#"
            INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at)
            VALUES (?, ?, 'Local Teste', ?, 1, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(code)
        .bind(loc_type)
        .execute(pool)
        .await
        .unwrap();

        id
    }

    async fn create_balance_helper(pool: &Pool<Sqlite>, loc_id: &str, prod_id: &str, qty: f64) {
        let id = test_uuid();

        sqlx::query(
            r#"
            INSERT INTO stock_balances (id, location_id, product_id, quantity, reserved_quantity, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(loc_id)
        .bind(prod_id)
        .bind(qty)
        .execute(pool)
        .await
        .unwrap();
    }
}
