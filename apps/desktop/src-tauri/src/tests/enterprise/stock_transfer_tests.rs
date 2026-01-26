//! Testes para StockTransferRepository
//!
//! Cobre:
//! - Criação de transferências
//! - Workflow (PENDING → IN_TRANSIT → DELIVERED)
//! - Movimentação de estoque
//! - Cancelamento

use super::*;
use sqlx::Row;

/// Helper: Cria local de estoque
async fn create_location(pool: &Pool<Sqlite>, code: &str, loc_type: &str) -> String {
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
    .expect("Failed to create location");
    id
}

/// Helper: Cria saldo de estoque
async fn create_balance(pool: &Pool<Sqlite>, location_id: &str, product_id: &str, qty: f64) {
    let id = test_uuid();
    sqlx::query(
        r#"
        INSERT INTO stock_balances (id, location_id, product_id, quantity, reserved_quantity, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(location_id)
    .bind(product_id)
    .bind(qty)
    .execute(pool)
    .await
    .expect("Failed to create balance");
}

/// Helper: Cria transferência
async fn create_transfer(pool: &Pool<Sqlite>, origin: &str, destination: &str) -> String {
    let id = test_uuid();
    let number = format!("TRF-{}", &id[..8]);
    let created_by = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO stock_transfers (
            id, transfer_number, origin_location_id, destination_location_id,
            created_by, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&number)
    .bind(origin)
    .bind(destination)
    .bind(&created_by)
    .execute(pool)
    .await
    .expect("Failed to create transfer");

    id
}

/// Helper: Adiciona item à transferência
async fn add_transfer_item(pool: &Pool<Sqlite>, transfer_id: &str, product_id: &str, qty: f64) {
    let id = test_uuid();
    sqlx::query(
        r#"
        INSERT INTO stock_transfer_items (id, transfer_id, product_id, quantity, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(transfer_id)
    .bind(product_id)
    .bind(qty)
    .execute(pool)
    .await
    .expect("Failed to add transfer item");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_stock_transfer() {
        let pool = setup_test_db().await;
        let origin = create_location(&pool, "ALM-CENTRAL", "CENTRAL").await;
        let destination = create_location(&pool, "FT-001", "FIELD").await;

        let transfer_id = create_transfer(&pool, &origin, &destination).await;

        let row = sqlx::query("SELECT * FROM stock_transfers WHERE id = ?")
            .bind(&transfer_id)
            .fetch_one(&pool)
            .await
            .expect("Transfer should exist");

        let status: String = row.get("status");
        assert_eq!(status, "PENDING");
    }

    #[tokio::test]
    async fn test_transfer_workflow_complete() {
        let pool = setup_test_db().await;
        let origin = create_location(&pool, "ALM-001", "CENTRAL").await;
        let destination = create_location(&pool, "FT-002", "FIELD").await;
        let product_id = create_test_product(&pool).await;

        // Criar estoque na origem
        create_balance(&pool, &origin, &product_id, 100.0).await;

        // Criar transferência
        let transfer_id = create_transfer(&pool, &origin, &destination).await;
        add_transfer_item(&pool, &transfer_id, &product_id, 30.0).await;

        // PENDING → IN_TRANSIT (despachar)
        // Reservar/baixar do origem
        sqlx::query("UPDATE stock_balances SET quantity = quantity - 30 WHERE location_id = ? AND product_id = ?")
            .bind(&origin)
            .bind(&product_id)
            .execute(&pool)
            .await
            .unwrap();

        sqlx::query("UPDATE stock_transfers SET status = 'IN_TRANSIT', dispatched_at = datetime('now') WHERE id = ?")
            .bind(&transfer_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_transfer_status(&pool, &transfer_id).await;
        assert_eq!(status, "IN_TRANSIT");

        // Verificar estoque origem
        let origin_qty = get_stock_qty(&pool, &origin, &product_id).await;
        assert_eq!(origin_qty, 70.0);

        // IN_TRANSIT → DELIVERED (receber)
        // Criar saldo no destino
        create_balance(&pool, &destination, &product_id, 30.0).await;

        sqlx::query("UPDATE stock_transfers SET status = 'DELIVERED', received_at = datetime('now') WHERE id = ?")
            .bind(&transfer_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_transfer_status(&pool, &transfer_id).await;
        assert_eq!(status, "DELIVERED");

        // Verificar estoque destino
        let dest_qty = get_stock_qty(&pool, &destination, &product_id).await;
        assert_eq!(dest_qty, 30.0);
    }

    #[tokio::test]
    async fn test_transfer_cancellation() {
        let pool = setup_test_db().await;
        let origin = create_location(&pool, "ALM-CANCEL", "CENTRAL").await;
        let destination = create_location(&pool, "FT-CANCEL", "FIELD").await;

        let transfer_id = create_transfer(&pool, &origin, &destination).await;

        // Cancelar
        sqlx::query("UPDATE stock_transfers SET status = 'CANCELLED', cancelled_at = datetime('now') WHERE id = ?")
            .bind(&transfer_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_transfer_status(&pool, &transfer_id).await;
        assert_eq!(status, "CANCELLED");
    }

    #[tokio::test]
    async fn test_transfer_with_multiple_items() {
        let pool = setup_test_db().await;
        let origin = create_location(&pool, "ALM-MULTI", "CENTRAL").await;
        let destination = create_location(&pool, "FT-MULTI", "FIELD").await;

        let transfer_id = create_transfer(&pool, &origin, &destination).await;

        // Adicionar múltiplos itens
        let p1 = create_test_product(&pool).await;
        let p2 = create_test_product(&pool).await;
        let p3 = create_test_product(&pool).await;

        add_transfer_item(&pool, &transfer_id, &p1, 10.0).await;
        add_transfer_item(&pool, &transfer_id, &p2, 25.0).await;
        add_transfer_item(&pool, &transfer_id, &p3, 5.0).await;

        // Contar itens
        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM stock_transfer_items WHERE transfer_id = ?",
        )
        .bind(&transfer_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 3);

        // Soma das quantidades
        let total = sqlx::query_scalar::<_, f64>(
            "SELECT SUM(quantity) FROM stock_transfer_items WHERE transfer_id = ?",
        )
        .bind(&transfer_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(total, 40.0);
    }

    #[tokio::test]
    async fn test_transfer_between_work_fronts() {
        let pool = setup_test_db().await;

        // Transferência entre duas frentes de trabalho
        let wf1 = create_location(&pool, "FT-A", "FIELD").await;
        let wf2 = create_location(&pool, "FT-B", "FIELD").await;
        let product_id = create_test_product(&pool).await;

        create_balance(&pool, &wf1, &product_id, 50.0).await;

        let transfer_id = create_transfer(&pool, &wf1, &wf2).await;
        add_transfer_item(&pool, &transfer_id, &product_id, 20.0).await;

        // Executar transferência
        sqlx::query("UPDATE stock_balances SET quantity = quantity - 20 WHERE location_id = ? AND product_id = ?")
            .bind(&wf1)
            .bind(&product_id)
            .execute(&pool)
            .await
            .unwrap();

        create_balance(&pool, &wf2, &product_id, 20.0).await;

        sqlx::query("UPDATE stock_transfers SET status = 'DELIVERED' WHERE id = ?")
            .bind(&transfer_id)
            .execute(&pool)
            .await
            .unwrap();

        // Verificar saldos
        let wf1_qty = get_stock_qty(&pool, &wf1, &product_id).await;
        let wf2_qty = get_stock_qty(&pool, &wf2, &product_id).await;

        assert_eq!(wf1_qty, 30.0);
        assert_eq!(wf2_qty, 20.0);
    }

    #[tokio::test]
    async fn test_transfer_route_tracking() {
        let pool = setup_test_db().await;
        let origin = create_location(&pool, "ALM-ROUTE", "CENTRAL").await;
        let destination = create_location(&pool, "FT-ROUTE", "FIELD").await;

        let transfer_id = create_transfer(&pool, &origin, &destination).await;

        // Adicionar informações de rota
        sqlx::query(
            r#"
            UPDATE stock_transfers SET
                vehicle_plate = 'ABC-1234',
                driver_name = 'João Silva',
                estimated_arrival = datetime('now', '+2 hours'),
                notes = 'Entregar na portaria principal'
            WHERE id = ?
            "#,
        )
        .bind(&transfer_id)
        .execute(&pool)
        .await
        .unwrap();

        let row =
            sqlx::query("SELECT vehicle_plate, driver_name FROM stock_transfers WHERE id = ?")
                .bind(&transfer_id)
                .fetch_one(&pool)
                .await
                .unwrap();

        let plate: String = row.get("vehicle_plate");
        let driver: String = row.get("driver_name");

        assert_eq!(plate, "ABC-1234");
        assert_eq!(driver, "João Silva");
    }

    // Helper functions
    async fn get_transfer_status(pool: &Pool<Sqlite>, id: &str) -> String {
        sqlx::query_scalar::<_, String>("SELECT status FROM stock_transfers WHERE id = ?")
            .bind(id)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    async fn get_stock_qty(pool: &Pool<Sqlite>, location_id: &str, product_id: &str) -> f64 {
        sqlx::query_scalar::<_, f64>(
            "SELECT quantity FROM stock_balances WHERE location_id = ? AND product_id = ?",
        )
        .bind(location_id)
        .bind(product_id)
        .fetch_one(pool)
        .await
        .unwrap_or(0.0)
    }
}
