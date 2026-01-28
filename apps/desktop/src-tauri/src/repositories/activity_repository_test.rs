//! Testes unitários para ActivityRepository

#[cfg(test)]
mod tests {
    use super::super::activity_repository::ActivityRepository;
    use crate::models::enterprise::CreateActivity;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_activity_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Create Contract and WorkFront dependencies
        sqlx::query(
            "INSERT INTO contracts (id, code, name, status, budget, is_active, created_at, updated_at) 
             VALUES ('ctr-act-01', 'CTR-ACT-01', 'Test Contract', 'ACTIVE', 100000.0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO work_fronts (id, contract_id, code, name, status, is_active, created_at, updated_at) 
             VALUES ('wf-act-01', 'ctr-act-01', 'WF-ACT-01', 'Frente Teste', 'ACTIVE', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_activity() {
        let pool = setup_test_db().await;
        let repo = ActivityRepository::new(&pool);

        let input = CreateActivity {
            work_front_id: "wf-act-01".to_string(),
            code: "ACT-001".to_string(),
            name: "Escavação".to_string(),
            description: Some("Escavação manual".to_string()),
            unit: Some("m3".to_string()),
            planned_qty: Some(50.0),
            unit_cost: Some(100.0),
            cost_center: Some("CC-001".to_string()),
            start_date: None,
            end_date: None,
            notes: None,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());
        let act = result.unwrap();
        assert_eq!(act.name, "Escavação");
        assert_eq!(act.unit, "m3");
        assert_eq!(act.planned_qty, 50.0);
        assert_eq!(act.status, "PENDING");
    }

    #[tokio::test]
    async fn test_update_activity_progress() {
        let pool = setup_test_db().await;
        let repo = ActivityRepository::new(&pool);

        let input = CreateActivity {
            work_front_id: "wf-act-01".to_string(),
            code: "ACT-002".to_string(),
            name: "Concretagem".to_string(),
            description: None,
            unit: None,
            planned_qty: Some(100.0),
            unit_cost: None,
            cost_center: None,
            start_date: None,
            end_date: None,
            notes: None,
        };

        let created = repo.create(input).await.unwrap();

        let updated = repo.update_progress(&created.id, 25.0).await.unwrap();
        assert_eq!(updated.executed_qty, 25.0);
    }

    #[tokio::test]
    async fn test_find_by_work_front() {
        let pool = setup_test_db().await;
        let repo = ActivityRepository::new(&pool);

        let input1 = CreateActivity {
            work_front_id: "wf-act-01".to_string(),
            code: "ACT-A".to_string(),
            name: "Atividade A".to_string(),
            description: None,
            unit: None,
            planned_qty: None,
            unit_cost: None,
            cost_center: None,
            start_date: None,
            end_date: None,
            notes: None,
        };
        repo.create(input1).await.unwrap();

        let input2 = CreateActivity {
            work_front_id: "wf-act-01".to_string(),
            code: "ACT-B".to_string(),
            name: "Atividade B".to_string(),
            description: None,
            unit: None,
            planned_qty: None,
            unit_cost: None,
            cost_center: None,
            start_date: None,
            end_date: None,
            notes: None,
        };
        repo.create(input2).await.unwrap();

        let activities = repo.find_by_work_front("wf-act-01").await.unwrap();
        assert!(activities.len() >= 2);
    }
}
