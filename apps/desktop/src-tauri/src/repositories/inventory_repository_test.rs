//! Testes unitários para InventoryRepository

#[cfg(test)]
mod tests {
    use super::super::inventory_repository::InventoryRepository;
    use crate::models::{Inventory, InventoryStatus};
    use chrono::Utc;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_inventory_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Need an employee? Inventory table usually references employees.
        // Let's check schema. But creation just binds string ID.
        // Assuming foreign key constraints are not restrictive unless setup.
        // But usually there is a FK to employees(id).
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-inv', 'Inv Manager', '9999', 'MANAGER', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_inventory() {
        let pool = setup_test_db().await;
        let repo = InventoryRepository::new(&pool);

        let inv = Inventory {
            id: "inv-001".to_string(),
            name: "Annual Audit".to_string(),
            description: Some("Full check".to_string()),
            status: InventoryStatus::InProgress,
            category_filter: None,
            section_filter: None,
            started_at: Utc::now(),
            finished_at: None,
            started_by: "emp-inv".to_string(),
            finished_by: None,
            total_products: 100,
            counted_products: 0,
            divergent_products: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let result = repo.create(&inv).await;
        assert!(
            result.is_ok(),
            "Failed to create inventory: {:?}",
            result.err()
        );
    }
}
