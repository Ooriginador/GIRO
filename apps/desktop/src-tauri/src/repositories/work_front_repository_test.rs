//! Testes unitários para WorkFrontRepository

#[cfg(test)]
mod tests {
    use super::super::work_front_repository::WorkFrontRepository;
    use crate::models::enterprise::{CreateWorkFront, UpdateWorkFront};
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_workfront_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Create a Contract first as WorkFront depends on it
        sqlx::query(
            "INSERT INTO contracts (id, code, name, status, budget, is_active, created_at, updated_at) 
             VALUES ('ctr-test-01', 'CTR-01', 'Test Contract', 'ACTIVE', 100000.0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Create an Employee for supervisor_id
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-001', 'Supervisor Test', '1234', 'MANAGER', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_work_front() {
        let pool = setup_test_db().await;
        let repo = WorkFrontRepository::new(&pool);

        let input = CreateWorkFront {
            contract_id: "ctr-test-01".to_string(),
            code: "WF-01".to_string(),
            name: "Terraplanagem".to_string(),
            description: Some("Fase inicial".to_string()),
            supervisor_id: Some("emp-001".to_string()),
            location: Some("Setor A".to_string()),
            notes: None,
        };

        let result = repo.create(input).await;
        let wf = result.expect("Failed to create work front");
        assert_eq!(wf.name, "Terraplanagem");
        assert_eq!(wf.contract_id, "ctr-test-01");
        assert_eq!(wf.status, "ACTIVE");
        assert!(wf.is_active);
    }

    #[tokio::test]
    async fn test_update_work_front() {
        let pool = setup_test_db().await;
        let repo = WorkFrontRepository::new(&pool);

        let input = CreateWorkFront {
            contract_id: "ctr-test-01".to_string(),
            code: "WF-02".to_string(),
            name: "Fundação".to_string(),
            description: None,
            supervisor_id: None,
            location: None,
            notes: None,
        };

        let created = repo.create(input).await.unwrap();

        let update = UpdateWorkFront {
            name: Some("Fundação Profunda".to_string()),
            status: Some("COMPLETED".to_string()),
            ..Default::default()
        };

        let updated = repo.update(&created.id, update).await.unwrap();
        assert_eq!(updated.name, "Fundação Profunda");
        assert_eq!(updated.status, "COMPLETED");
    }

    #[tokio::test]
    async fn test_find_by_contract() {
        let pool = setup_test_db().await;
        let repo = WorkFrontRepository::new(&pool);

        let input1 = CreateWorkFront {
            contract_id: "ctr-test-01".to_string(),
            code: "WF-A".to_string(),
            name: "Frente A".to_string(),
            description: None,
            supervisor_id: None,
            location: None,
            notes: None,
        };
        repo.create(input1).await.unwrap();

        let input2 = CreateWorkFront {
            contract_id: "ctr-test-01".to_string(),
            code: "WF-B".to_string(),
            name: "Frente B".to_string(),
            description: None,
            supervisor_id: None,
            location: None,
            notes: None,
        };
        repo.create(input2).await.unwrap();

        let list = repo.find_by_contract("ctr-test-01").await.unwrap();
        assert!(list.len() >= 2);
    }
}
