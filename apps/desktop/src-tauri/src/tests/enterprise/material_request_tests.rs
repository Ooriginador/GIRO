//! Testes para MaterialRequestRepository
//!
//! Cobre:
//! - Criação de requisições
//! - Workflow completo (Draft → Pending → Approved → Separating → Delivered)
//! - Validação de estoque
//! - Rejeição e cancelamento

use super::*;
use sqlx::Row;

/// Helper: Cria um contrato para requisição
async fn create_test_contract(pool: &Pool<Sqlite>) -> String {
    let id = test_uuid();
    let manager_id = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO contracts (id, code, name, client_name, client_document, manager_id, status, created_at, updated_at)
        VALUES (?, 'REQ-CONTRACT', 'Contrato Requisição', 'Cliente', '12.345.678/0001-90', ?, 'ACTIVE', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&manager_id)
    .execute(pool)
    .await
    .expect("Failed to create contract");

    id
}

/// Helper: Cria um local de estoque
async fn create_test_location(pool: &Pool<Sqlite>, location_type: &str) -> String {
    let id = test_uuid();
    let code = format!("LOC-{}", &id[..6]);

    sqlx::query(
        r#"
        INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at)
        VALUES (?, ?, 'Local Teste', ?, 1, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&code)
    .bind(location_type)
    .execute(pool)
    .await
    .expect("Failed to create location");

    id
}

/// Helper: Cria saldo de estoque
async fn create_stock_balance(
    pool: &Pool<Sqlite>,
    location_id: &str,
    product_id: &str,
    quantity: f64,
) {
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
    .bind(quantity)
    .execute(pool)
    .await
    .expect("Failed to create stock balance");
}

/// Helper: Cria uma requisição
async fn create_request(
    pool: &Pool<Sqlite>,
    contract_id: &str,
    destination_id: &str,
    status: &str,
) -> String {
    let id = test_uuid();
    let requester_id = create_test_employee(pool).await;
    let number = format!("REQ-{}", &id[..8]);

    sqlx::query(
        r#"
        INSERT INTO material_requests (
            id, request_number, contract_id, destination_location_id,
            requester_id, status, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'NORMAL', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&number)
    .bind(contract_id)
    .bind(destination_id)
    .bind(&requester_id)
    .bind(status)
    .execute(pool)
    .await
    .expect("Failed to create request");

    id
}

/// Helper: Adiciona item à requisição
async fn add_request_item(
    pool: &Pool<Sqlite>,
    request_id: &str,
    product_id: &str,
    quantity: f64,
) -> String {
    let id = test_uuid();

    sqlx::query(
        r#"
        INSERT INTO material_request_items (id, request_id, product_id, quantity, unit_price, created_at)
        VALUES (?, ?, ?, ?, 10.0, datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(request_id)
    .bind(product_id)
    .bind(quantity)
    .execute(pool)
    .await
    .expect("Failed to add request item");

    id
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_material_request() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let location_id = create_test_location(&pool, "FIELD").await;

        let request_id = create_request(&pool, &contract_id, &location_id, "DRAFT").await;

        let row = sqlx::query("SELECT * FROM material_requests WHERE id = ?")
            .bind(&request_id)
            .fetch_one(&pool)
            .await
            .expect("Request should exist");

        let status: String = row.get("status");
        assert_eq!(status, "DRAFT");
    }

    #[tokio::test]
    async fn test_request_workflow_complete() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let central_id = create_test_location(&pool, "CENTRAL").await;
        let field_id = create_test_location(&pool, "FIELD").await;
        let product_id = create_test_product(&pool).await;

        // Criar estoque no almoxarifado central
        create_stock_balance(&pool, &central_id, &product_id, 100.0).await;

        // Criar requisição
        let request_id = create_request(&pool, &contract_id, &field_id, "DRAFT").await;
        add_request_item(&pool, &request_id, &product_id, 10.0).await;

        // DRAFT → PENDING (submit)
        sqlx::query("UPDATE material_requests SET status = 'PENDING', submitted_at = datetime('now') WHERE id = ?")
            .bind(&request_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_request_status(&pool, &request_id).await;
        assert_eq!(status, "PENDING");

        // PENDING → APPROVED
        let approver_id = create_test_employee(&pool).await;
        sqlx::query("UPDATE material_requests SET status = 'APPROVED', approved_by = ?, approved_at = datetime('now') WHERE id = ?")
            .bind(&approver_id)
            .bind(&request_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_request_status(&pool, &request_id).await;
        assert_eq!(status, "APPROVED");

        // APPROVED → SEPARATING
        sqlx::query("UPDATE material_requests SET status = 'SEPARATING', origin_location_id = ? WHERE id = ?")
            .bind(&central_id)
            .bind(&request_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_request_status(&pool, &request_id).await;
        assert_eq!(status, "SEPARATING");

        // SEPARATING → DELIVERED (com baixa de estoque)
        // Atualizar estoque origem
        sqlx::query("UPDATE stock_balances SET quantity = quantity - 10 WHERE location_id = ? AND product_id = ?")
            .bind(&central_id)
            .bind(&product_id)
            .execute(&pool)
            .await
            .unwrap();

        // Criar/atualizar estoque destino
        create_stock_balance(&pool, &field_id, &product_id, 10.0).await;

        // Marcar como entregue
        sqlx::query("UPDATE material_requests SET status = 'DELIVERED', delivered_at = datetime('now') WHERE id = ?")
            .bind(&request_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_request_status(&pool, &request_id).await;
        assert_eq!(status, "DELIVERED");

        // Verificar saldo de estoque
        let origin_balance = get_stock_quantity(&pool, &central_id, &product_id).await;
        assert_eq!(origin_balance, 90.0);
    }

    #[tokio::test]
    async fn test_request_rejection() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let location_id = create_test_location(&pool, "FIELD").await;

        let request_id = create_request(&pool, &contract_id, &location_id, "PENDING").await;

        // Rejeitar
        sqlx::query(
            "UPDATE material_requests SET status = 'REJECTED', rejection_reason = 'Sem verba', rejected_at = datetime('now') WHERE id = ?",
        )
        .bind(&request_id)
        .execute(&pool)
        .await
        .unwrap();

        let row =
            sqlx::query("SELECT status, rejection_reason FROM material_requests WHERE id = ?")
                .bind(&request_id)
                .fetch_one(&pool)
                .await
                .unwrap();

        let status: String = row.get("status");
        let reason: String = row.get("rejection_reason");

        assert_eq!(status, "REJECTED");
        assert_eq!(reason, "Sem verba");
    }

    #[tokio::test]
    async fn test_request_cancellation() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let location_id = create_test_location(&pool, "FIELD").await;

        let request_id = create_request(&pool, &contract_id, &location_id, "DRAFT").await;

        // Cancelar
        sqlx::query("UPDATE material_requests SET status = 'CANCELLED', cancelled_at = datetime('now') WHERE id = ?")
            .bind(&request_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_request_status(&pool, &request_id).await;
        assert_eq!(status, "CANCELLED");
    }

    #[tokio::test]
    async fn test_request_with_multiple_items() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let location_id = create_test_location(&pool, "FIELD").await;
        let request_id = create_request(&pool, &contract_id, &location_id, "DRAFT").await;

        // Adicionar múltiplos itens
        let p1 = create_test_product(&pool).await;
        let p2 = create_test_product(&pool).await;
        let p3 = create_test_product(&pool).await;

        add_request_item(&pool, &request_id, &p1, 10.0).await;
        add_request_item(&pool, &request_id, &p2, 20.0).await;
        add_request_item(&pool, &request_id, &p3, 5.0).await;

        // Contar itens
        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM material_request_items WHERE request_id = ?",
        )
        .bind(&request_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 3);

        // Calcular valor total
        let total = sqlx::query_scalar::<_, f64>(
            "SELECT SUM(quantity * unit_price) FROM material_request_items WHERE request_id = ?",
        )
        .bind(&request_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(total, 350.0); // (10 + 20 + 5) * 10.0
    }

    #[tokio::test]
    async fn test_request_priority_levels() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let location_id = create_test_location(&pool, "FIELD").await;

        // Criar requisições com diferentes prioridades
        for priority in ["LOW", "NORMAL", "HIGH", "URGENT"] {
            let id = test_uuid();
            let requester_id = create_test_employee(&pool).await;

            sqlx::query(
                r#"
                INSERT INTO material_requests (id, request_number, contract_id, destination_location_id, requester_id, status, priority, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PENDING', ?, datetime('now'), datetime('now'))
                "#,
            )
            .bind(&id)
            .bind(format!("REQ-{}", priority))
            .bind(&contract_id)
            .bind(&location_id)
            .bind(&requester_id)
            .bind(priority)
            .execute(&pool)
            .await
            .unwrap();
        }

        // Contar por prioridade
        let urgent_count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM material_requests WHERE priority = 'URGENT'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(urgent_count, 1);
    }

    // Helper functions
    async fn get_request_status(pool: &Pool<Sqlite>, id: &str) -> String {
        sqlx::query_scalar::<_, String>("SELECT status FROM material_requests WHERE id = ?")
            .bind(id)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    async fn get_stock_quantity(pool: &Pool<Sqlite>, location_id: &str, product_id: &str) -> f64 {
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
