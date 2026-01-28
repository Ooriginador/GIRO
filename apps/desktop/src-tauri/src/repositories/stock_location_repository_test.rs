//! Testes unitários para StockLocationRepository

#[cfg(test)]
mod tests {
    use super::super::stock_location_repository::StockLocationRepository;
    use crate::models::enterprise::CreateStockLocation;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_stock_loc_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Create Contract
        sqlx::query(
            "INSERT INTO contracts (id, code, name, status, budget, is_active, created_at, updated_at) 
             VALUES ('ctr-loc-01', 'CTR-LOC', 'Loc Contract', 'ACTIVE', 50000.0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Create WorkFront
        sqlx::query(
            "INSERT INTO work_fronts (id, contract_id, code, name, status, is_active, created_at, updated_at) 
             VALUES ('wf-loc-01', 'ctr-loc-01', 'WF-LOC', 'Frente Loc', 'ACTIVE', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_stock_location() {
        let pool = setup_test_db().await;
        let repo = StockLocationRepository::new(&pool);

        let input = CreateStockLocation {
            code: "LOC-001".to_string(),
            name: "Central Warehouse".to_string(),
            description: Some("Main storage".to_string()),
            location_type: Some("CENTRAL".to_string()),
            contract_id: None,
            work_front_id: None,
            address: Some("Rua Central, 123".to_string()),
            responsible_id: None,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());
        let loc = result.unwrap();
        assert_eq!(loc.name, "Central Warehouse");
        assert_eq!(loc.location_type, "CENTRAL");
    }

    #[tokio::test]
    async fn test_find_by_contract() {
        let pool = setup_test_db().await;
        let repo = StockLocationRepository::new(&pool);

        // Create location linked to contract
        let input = CreateStockLocation {
            code: "LOC-CTR".to_string(),
            name: "Site Storage".to_string(),
            description: None,
            location_type: Some("WORK_FRONT".to_string()),
            contract_id: Some("ctr-loc-01".to_string()),
            work_front_id: Some("wf-loc-01".to_string()),
            address: None,
            responsible_id: None,
        };
        repo.create(input).await.unwrap();

        let result = repo.find_by_contract("ctr-loc-01").await;
        assert!(result.is_ok());
        let valid_result = result.unwrap();
        assert!(!valid_result.is_empty());
        assert_eq!(valid_result[0].code, "LOC-CTR");
    }

    #[tokio::test]
    async fn test_delete_stock_location() {
        let pool = setup_test_db().await;
        let repo = StockLocationRepository::new(&pool);

        let input = CreateStockLocation {
            code: "LOC-DEL".to_string(),
            name: "To Delete".to_string(),
            description: None,
            location_type: Some("WAREHOUSE".to_string()),
            contract_id: None,
            work_front_id: None,
            address: None,
            responsible_id: None,
        };
        let created = repo.create(input).await.unwrap();

        // Delete it
        let del_res = repo.delete(&created.id).await;
        assert!(del_res.is_ok());

        // Verify it's gone from active finds
        let find = repo.find_by_id(&created.id).await.unwrap();
        // Depending on implementation find_by_id checks deleted_at IS NULL
        assert!(find.is_none());
    }
}
