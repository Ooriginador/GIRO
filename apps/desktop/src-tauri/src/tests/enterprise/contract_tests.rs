//! Testes para ContractRepository e ContractService
//!
//! Cobre:
//! - Criação de contratos
//! - Ciclo de vida (Planning → Active → Completed)
//! - Validação de código duplicado
//! - Soft delete

use super::*;
use sqlx::Row;

/// Helper: Cria um contrato de teste
async fn create_contract(pool: &Pool<Sqlite>, code: &str) -> String {
    let id = test_uuid();
    let manager_id = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO contracts (
            id, code, name, client_name, client_document,
            manager_id, status, created_at, updated_at
        ) VALUES (
            ?, ?, 'Contrato Teste', 'Cliente Teste', '12.345.678/0001-90',
            ?, 'PLANNING', datetime('now'), datetime('now')
        )
        "#,
    )
    .bind(&id)
    .bind(code)
    .bind(&manager_id)
    .execute(pool)
    .await
    .expect("Failed to create test contract");

    id
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_contract() {
        let pool = setup_test_db().await;
        let id = create_contract(&pool, "OBRA-001").await;

        let row = sqlx::query("SELECT * FROM contracts WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .expect("Contract should exist");

        let code: String = row.get("code");
        let status: String = row.get("status");

        assert_eq!(code, "OBRA-001");
        assert_eq!(status, "PLANNING");
    }

    #[tokio::test]
    async fn test_contract_status_transitions() {
        let pool = setup_test_db().await;
        let id = create_contract(&pool, "OBRA-002").await;

        // Planning → Active
        sqlx::query(
            "UPDATE contracts SET status = 'ACTIVE', started_at = datetime('now') WHERE id = ?",
        )
        .bind(&id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT status FROM contracts WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();
        let status: String = row.get("status");
        assert_eq!(status, "ACTIVE");

        // Active → Suspended
        sqlx::query("UPDATE contracts SET status = 'SUSPENDED' WHERE id = ?")
            .bind(&id)
            .execute(&pool)
            .await
            .unwrap();

        let row = sqlx::query("SELECT status FROM contracts WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();
        let status: String = row.get("status");
        assert_eq!(status, "SUSPENDED");

        // Suspended → Active (resume)
        sqlx::query("UPDATE contracts SET status = 'ACTIVE' WHERE id = ?")
            .bind(&id)
            .execute(&pool)
            .await
            .unwrap();

        // Active → Completed
        sqlx::query(
            "UPDATE contracts SET status = 'COMPLETED', finished_at = datetime('now') WHERE id = ?",
        )
        .bind(&id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT status, finished_at FROM contracts WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();
        let status: String = row.get("status");
        assert_eq!(status, "COMPLETED");
        assert!(row.get::<Option<String>, _>("finished_at").is_some());
    }

    #[tokio::test]
    async fn test_duplicate_contract_code() {
        let pool = setup_test_db().await;

        // Criar primeiro contrato
        create_contract(&pool, "OBRA-DUP").await;

        // Tentar criar com mesmo código deve falhar
        let result = sqlx::query(
            r#"
            INSERT INTO contracts (id, code, name, client_name, client_document, manager_id, status, created_at, updated_at)
            VALUES (?, 'OBRA-DUP', 'Outro', 'Cliente', '00.000.000/0001-00', ?, 'PLANNING', datetime('now'), datetime('now'))
            "#,
        )
        .bind(test_uuid())
        .bind(test_uuid())
        .execute(&pool)
        .await;

        assert!(result.is_err(), "Duplicate code should fail");
    }

    #[tokio::test]
    async fn test_contract_soft_delete() {
        let pool = setup_test_db().await;
        let id = create_contract(&pool, "OBRA-DEL").await;

        // Soft delete
        sqlx::query("UPDATE contracts SET deleted_at = datetime('now') WHERE id = ?")
            .bind(&id)
            .execute(&pool)
            .await
            .unwrap();

        // Query sem deleted_at não deve retornar
        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM contracts WHERE id = ? AND deleted_at IS NULL",
        )
        .bind(&id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 0);

        // Mas o registro ainda existe
        let count = sqlx::query_scalar::<_, i32>("SELECT COUNT(*) FROM contracts WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_contract_with_work_fronts() {
        let pool = setup_test_db().await;
        let contract_id = create_contract(&pool, "OBRA-WF").await;

        // Criar frentes de trabalho
        let wf1_id = test_uuid();
        let wf2_id = test_uuid();

        sqlx::query(
            r#"
            INSERT INTO work_fronts (id, contract_id, code, name, status, created_at, updated_at)
            VALUES (?, ?, 'FT-001', 'Frente Norte', 'ACTIVE', datetime('now'), datetime('now'))
            "#,
        )
        .bind(&wf1_id)
        .bind(&contract_id)
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO work_fronts (id, contract_id, code, name, status, created_at, updated_at)
            VALUES (?, ?, 'FT-002', 'Frente Sul', 'ACTIVE', datetime('now'), datetime('now'))
            "#,
        )
        .bind(&wf2_id)
        .bind(&contract_id)
        .execute(&pool)
        .await
        .unwrap();

        // Contar frentes
        let count =
            sqlx::query_scalar::<_, i32>("SELECT COUNT(*) FROM work_fronts WHERE contract_id = ?")
                .bind(&contract_id)
                .fetch_one(&pool)
                .await
                .unwrap();

        assert_eq!(count, 2);
    }

    #[tokio::test]
    async fn test_contract_budget_tracking() {
        let pool = setup_test_db().await;
        let id = create_contract(&pool, "OBRA-BUDGET").await;

        // Atualizar budget
        sqlx::query(
            "UPDATE contracts SET estimated_value = 1000000.0, consumed_value = 250000.0 WHERE id = ?",
        )
        .bind(&id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT estimated_value, consumed_value FROM contracts WHERE id = ?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();

        let estimated: f64 = row.get("estimated_value");
        let consumed: f64 = row.get("consumed_value");
        let remaining = estimated - consumed;
        let percentage = (consumed / estimated) * 100.0;

        assert_eq!(estimated, 1_000_000.0);
        assert_eq!(consumed, 250_000.0);
        assert_eq!(remaining, 750_000.0);
        assert!((percentage - 25.0).abs() < 0.01);
    }
}
