//! Testes unitários para MaterialRequestRepository

#[cfg(test)]
mod tests {
    use super::super::material_request_repository::MaterialRequestRepository;
    use crate::models::enterprise::CreateMaterialRequest;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_req_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Employee (Requester)
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-req-01', 'Requester Test', '1111', 'MANAGER', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Contract
        sqlx::query(
            "INSERT INTO contracts (id, code, name, status, budget, is_active, created_at, updated_at) 
             VALUES ('ctr-req-01', 'CTR-REQ', 'Req Contract', 'ACTIVE', 50000.0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_material_request() {
        let pool = setup_test_db().await;
        let repo = MaterialRequestRepository::new(&pool);

        let input = CreateMaterialRequest {
            contract_id: "ctr-req-01".to_string(),
            work_front_id: None,
            activity_id: None,
            priority: Some("HIGH".to_string()),
            needed_date: Some("2026-12-31".to_string()),
            source_location_id: None,
            destination_location_id: None,
            notes: Some("Urgente".to_string()),
        };

        let result = repo.create(input, "emp-req-01").await;
        if let Err(e) = &result {
            println!("Create Request Error: {:?}", e);
        }
        assert!(result.is_ok());

        let req = result.unwrap();
        assert!(req.request_number.starts_with("RM-"));
        assert_eq!(req.status, "DRAFT");
        assert_eq!(req.contract_id, "ctr-req-01");
        assert_eq!(req.priority, "HIGH");
    }
}
