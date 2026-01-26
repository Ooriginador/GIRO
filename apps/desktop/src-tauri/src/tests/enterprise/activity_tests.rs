//! Testes para ActivityRepository
//!
//! Cobre:
//! - Criação de atividades
//! - Progresso e conclusão
//! - Consumo de materiais
//! - Tracking de centro de custo

use super::*;
use sqlx::Row;

/// Helper: Cria contrato para atividade
async fn create_test_contract(pool: &Pool<Sqlite>) -> String {
    let id = test_uuid();
    let manager = create_test_employee(pool).await;

    sqlx::query(
        r#"
        INSERT INTO contracts (id, code, name, client_name, client_document, manager_id, status, created_at, updated_at)
        VALUES (?, 'ACT-CONTRACT', 'Contrato Atividade', 'Cliente', '12.345.678/0001-90', ?, 'ACTIVE', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&manager)
    .execute(pool)
    .await
    .unwrap();
    id
}

/// Helper: Cria frente de trabalho
async fn create_work_front(pool: &Pool<Sqlite>, contract_id: &str) -> String {
    let id = test_uuid();

    sqlx::query(
        r#"
        INSERT INTO work_fronts (id, contract_id, code, name, status, created_at, updated_at)
        VALUES (?, ?, 'WF-ACT', 'Frente Atividades', 'ACTIVE', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(contract_id)
    .execute(pool)
    .await
    .unwrap();
    id
}

/// Helper: Cria atividade
async fn create_activity(
    pool: &Pool<Sqlite>,
    work_front_id: &str,
    code: &str,
    cost_center: &str,
) -> String {
    let id = test_uuid();

    sqlx::query(
        r#"
        INSERT INTO activities (
            id, work_front_id, code, name, cost_center, status,
            planned_quantity, executed_quantity, unit,
            created_at, updated_at
        ) VALUES (?, ?, ?, 'Atividade Teste', ?, 'PENDING', 100.0, 0.0, 'M', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(work_front_id)
    .bind(code)
    .bind(cost_center)
    .execute(pool)
    .await
    .unwrap();
    id
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_activity() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let work_front_id = create_work_front(&pool, &contract_id).await;

        let activity_id = create_activity(&pool, &work_front_id, "AT-001", "CC-001").await;

        let row = sqlx::query("SELECT * FROM activities WHERE id = ?")
            .bind(&activity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

        let code: String = row.get("code");
        let status: String = row.get("status");
        let cost_center: String = row.get("cost_center");

        assert_eq!(code, "AT-001");
        assert_eq!(status, "PENDING");
        assert_eq!(cost_center, "CC-001");
    }

    #[tokio::test]
    async fn test_activity_lifecycle() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let work_front_id = create_work_front(&pool, &contract_id).await;
        let activity_id = create_activity(&pool, &work_front_id, "AT-LIFE", "CC-002").await;

        // PENDING → IN_PROGRESS
        sqlx::query("UPDATE activities SET status = 'IN_PROGRESS', started_at = datetime('now') WHERE id = ?")
            .bind(&activity_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_activity_status(&pool, &activity_id).await;
        assert_eq!(status, "IN_PROGRESS");

        // Atualizar progresso
        sqlx::query("UPDATE activities SET executed_quantity = 50.0 WHERE id = ?")
            .bind(&activity_id)
            .execute(&pool)
            .await
            .unwrap();

        let row =
            sqlx::query("SELECT planned_quantity, executed_quantity FROM activities WHERE id = ?")
                .bind(&activity_id)
                .fetch_one(&pool)
                .await
                .unwrap();

        let planned: f64 = row.get("planned_quantity");
        let executed: f64 = row.get("executed_quantity");
        let progress = (executed / planned) * 100.0;

        assert_eq!(progress, 50.0);

        // IN_PROGRESS → COMPLETED
        sqlx::query("UPDATE activities SET status = 'COMPLETED', executed_quantity = 100.0, finished_at = datetime('now') WHERE id = ?")
            .bind(&activity_id)
            .execute(&pool)
            .await
            .unwrap();

        let status = get_activity_status(&pool, &activity_id).await;
        assert_eq!(status, "COMPLETED");
    }

    #[tokio::test]
    async fn test_activity_material_consumption() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let work_front_id = create_work_front(&pool, &contract_id).await;
        let activity_id = create_activity(&pool, &work_front_id, "AT-CONS", "CC-003").await;
        let product_id = create_test_product(&pool).await;

        // Registrar consumo
        let consumption_id = test_uuid();
        let employee_id = create_test_employee(&pool).await;

        sqlx::query(
            r#"
            INSERT INTO material_consumptions (
                id, activity_id, product_id, quantity, unit_cost,
                consumed_by, consumed_at, created_at
            ) VALUES (?, ?, ?, 25.0, 10.0, ?, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&consumption_id)
        .bind(&activity_id)
        .bind(&product_id)
        .bind(&employee_id)
        .execute(&pool)
        .await
        .unwrap();

        // Verificar consumo total da atividade
        let total = sqlx::query_scalar::<_, f64>(
            "SELECT SUM(quantity * unit_cost) FROM material_consumptions WHERE activity_id = ?",
        )
        .bind(&activity_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(total, 250.0);
    }

    #[tokio::test]
    async fn test_activity_cost_center_aggregation() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let work_front_id = create_work_front(&pool, &contract_id).await;

        // Criar várias atividades no mesmo centro de custo
        let a1 = create_activity(&pool, &work_front_id, "AT-CC-1", "CC-TOTAL").await;
        let a2 = create_activity(&pool, &work_front_id, "AT-CC-2", "CC-TOTAL").await;
        let a3 = create_activity(&pool, &work_front_id, "AT-CC-3", "CC-OTHER").await;

        let product_id = create_test_product(&pool).await;
        let employee_id = create_test_employee(&pool).await;

        // Consumos
        add_consumption(&pool, &a1, &product_id, 10.0, 10.0, &employee_id).await;
        add_consumption(&pool, &a2, &product_id, 20.0, 10.0, &employee_id).await;
        add_consumption(&pool, &a3, &product_id, 15.0, 10.0, &employee_id).await;

        // Agregar por centro de custo
        let rows = sqlx::query(
            r#"
            SELECT a.cost_center, SUM(mc.quantity * mc.unit_cost) as total
            FROM material_consumptions mc
            JOIN activities a ON mc.activity_id = a.id
            GROUP BY a.cost_center
            ORDER BY total DESC
            "#,
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(rows.len(), 2);

        let cc1: String = rows[0].get("cost_center");
        let total1: f64 = rows[0].get("total");
        let cc2: String = rows[1].get("cost_center");
        let total2: f64 = rows[1].get("total");

        assert_eq!(cc1, "CC-TOTAL");
        assert_eq!(total1, 300.0); // (10 + 20) * 10

        assert_eq!(cc2, "CC-OTHER");
        assert_eq!(total2, 150.0); // 15 * 10
    }

    #[tokio::test]
    async fn test_activity_suspension_and_resume() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let work_front_id = create_work_front(&pool, &contract_id).await;
        let activity_id = create_activity(&pool, &work_front_id, "AT-SUSP", "CC-004").await;

        // Iniciar
        sqlx::query("UPDATE activities SET status = 'IN_PROGRESS' WHERE id = ?")
            .bind(&activity_id)
            .execute(&pool)
            .await
            .unwrap();

        // Suspender
        sqlx::query(
            "UPDATE activities SET status = 'SUSPENDED', suspension_reason = 'Chuvas' WHERE id = ?",
        )
        .bind(&activity_id)
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT status, suspension_reason FROM activities WHERE id = ?")
            .bind(&activity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

        let status: String = row.get("status");
        let reason: Option<String> = row.get("suspension_reason");

        assert_eq!(status, "SUSPENDED");
        assert_eq!(reason, Some("Chuvas".to_string()));

        // Retomar
        sqlx::query(
            "UPDATE activities SET status = 'IN_PROGRESS', suspension_reason = NULL WHERE id = ?",
        )
        .bind(&activity_id)
        .execute(&pool)
        .await
        .unwrap();

        let status = get_activity_status(&pool, &activity_id).await;
        assert_eq!(status, "IN_PROGRESS");
    }

    #[tokio::test]
    async fn test_activities_by_work_front() {
        let pool = setup_test_db().await;
        let contract_id = create_test_contract(&pool).await;
        let wf1 = create_work_front(&pool, &contract_id).await;

        // Segunda frente
        let wf2 = test_uuid();
        sqlx::query(
            r#"
            INSERT INTO work_fronts (id, contract_id, code, name, status, created_at, updated_at)
            VALUES (?, ?, 'WF-002', 'Frente 2', 'ACTIVE', datetime('now'), datetime('now'))
            "#,
        )
        .bind(&wf2)
        .bind(&contract_id)
        .execute(&pool)
        .await
        .unwrap();

        // Atividades em cada frente
        create_activity(&pool, &wf1, "AT-WF1-1", "CC-A").await;
        create_activity(&pool, &wf1, "AT-WF1-2", "CC-A").await;
        create_activity(&pool, &wf2, "AT-WF2-1", "CC-B").await;

        // Contar por frente
        let count_wf1 =
            sqlx::query_scalar::<_, i32>("SELECT COUNT(*) FROM activities WHERE work_front_id = ?")
                .bind(&wf1)
                .fetch_one(&pool)
                .await
                .unwrap();

        let count_wf2 =
            sqlx::query_scalar::<_, i32>("SELECT COUNT(*) FROM activities WHERE work_front_id = ?")
                .bind(&wf2)
                .fetch_one(&pool)
                .await
                .unwrap();

        assert_eq!(count_wf1, 2);
        assert_eq!(count_wf2, 1);
    }

    // Helper functions
    async fn get_activity_status(pool: &Pool<Sqlite>, id: &str) -> String {
        sqlx::query_scalar::<_, String>("SELECT status FROM activities WHERE id = ?")
            .bind(id)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    async fn add_consumption(
        pool: &Pool<Sqlite>,
        activity_id: &str,
        product_id: &str,
        qty: f64,
        cost: f64,
        employee_id: &str,
    ) {
        let id = test_uuid();
        sqlx::query(
            r#"
            INSERT INTO material_consumptions (id, activity_id, product_id, quantity, unit_cost, consumed_by, consumed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(activity_id)
        .bind(product_id)
        .bind(qty)
        .bind(cost)
        .bind(employee_id)
        .execute(pool)
        .await
        .unwrap();
    }
}
