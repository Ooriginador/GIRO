//! Testes unitários para StockTransferRepository

#[cfg(test)]
mod tests {
    use super::super::stock_transfer_repository::StockTransferRepository;
    use crate::models::enterprise::CreateStockTransfer;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_transfer_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Create Employee (Requester)
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-req', 'Requester', '0000', 'MANAGER', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Create Locations (Source & Dest)
        sqlx::query(
            "INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at) 
             VALUES ('loc-src', 'LOC-A', 'Source Loc', 'WAREHOUSE', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at) 
             VALUES ('loc-dst', 'LOC-B', 'Dest Loc', 'WORK_FRONT', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_stock_transfer() {
        let pool = setup_test_db().await;
        let repo = StockTransferRepository::new(&pool);

        let input = CreateStockTransfer {
            source_location_id: "loc-src".to_string(),
            destination_location_id: "loc-dst".to_string(),
            notes: Some("Initial transfer".to_string()),
        };

        let result = repo.create(input, "emp-req").await;
        assert!(result.is_ok());
        let tr = result.unwrap();
        assert!(tr.transfer_number.starts_with("TR-"));
        assert_eq!(tr.status, "PENDING");
        assert_eq!(tr.requester_id, "emp-req");
    }

    #[tokio::test]
    async fn test_find_paginated_filters() {
        let pool = setup_test_db().await;
        let repo = StockTransferRepository::new(&pool);

        // Create one transfer
        let input = CreateStockTransfer {
            source_location_id: "loc-src".to_string(),
            destination_location_id: "loc-dst".to_string(),
            notes: None,
        };
        repo.create(input, "emp-req").await.unwrap();

        // Test filter by source
        let pagination = crate::repositories::Pagination {
            page: 1,
            per_page: 10,
        };
        let result = repo
            .find_paginated(&pagination, None, Some("loc-src"), None)
            .await;

        if let Err(e) = &result {
            println!("StockTransfer Filter Error: {:?}", e);
        }
        assert!(result.is_ok());
        let page = result.unwrap();
        assert_eq!(page.total, 1);

        // Test filter by wrong destination
        let result_empty = repo
            .find_paginated(
                &pagination,
                None,
                None,
                Some("loc-src"), // It is source, not dest
            )
            .await;

        assert!(result_empty.is_ok());
        assert_eq!(result_empty.unwrap().total, 0);
    }
}
