//! Testes unitários para SupplierRepository

#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::CreateSupplier;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_create_supplier() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        let input = CreateSupplier {
            name: "Fornecedor ABC".to_string(),
            cnpj: Some("12345678000199".to_string()),
            trade_name: None,
            city: None,
            state: None,
            phone: Some("11999999999".to_string()),
            email: Some("contato@abc.com".to_string()),
            address: Some("Rua A, 123".to_string()),
            notes: None,
        };

        let result = repo.create(input).await;

        assert!(result.is_ok());
        let supplier = result.unwrap();
        assert_eq!(supplier.name, "Fornecedor ABC");
        assert_eq!(supplier.cnpj, Some("12345678000199".to_string()));
        assert_eq!(supplier.is_active, true);
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        let input = CreateSupplier {
            name: "Fornecedor XYZ".to_string(),
            cnpj: None,
            trade_name: None,
            city: None,
            state: None,
            phone: None,
            email: None,
            address: None,
            notes: None,
        };
        let created = repo.create(input).await.unwrap();

        let result = repo.find_by_id(&created.id).await;

        assert!(result.is_ok());
        let supplier = result.unwrap();
        assert!(supplier.is_some());
        assert_eq!(supplier.unwrap().name, "Fornecedor XYZ");
    }

    #[tokio::test]
    async fn test_find_by_cnpj() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        let input = CreateSupplier {
            name: "Fornecedor CNPJ".to_string(),
            cnpj: Some("98765432000188".to_string()),
            trade_name: None,
            city: None,
            state: None,
            phone: None,
            email: None,
            address: None,
            notes: None,
        };
        repo.create(input).await.unwrap();

        let result = repo.find_by_cnpj("98765432000188").await;

        assert!(result.is_ok());
        let supplier = result.unwrap();
        assert!(supplier.is_some());
        assert_eq!(supplier.unwrap().name, "Fornecedor CNPJ");
    }

    #[tokio::test]
    async fn test_find_all_active() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        // Create 3 suppliers
        for i in 1..=3 {
            let input = CreateSupplier {
                name: format!("Supplier {}", i),
                cnpj: None,
                trade_name: None,
                city: None,
                state: None,
                phone: None,
                email: None,
                address: None,
                notes: None,
            };
            repo.create(input).await.unwrap();
        }

        let result = repo.find_all_active().await;

        assert!(result.is_ok());
        let suppliers = result.unwrap();
        assert!(suppliers.len() >= 3);
    }

    #[tokio::test]
    async fn test_update_supplier() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        let input = CreateSupplier {
            name: "Original Name".to_string(),
            cnpj: None,
            trade_name: None,
            city: None,
            state: None,
            phone: None,
            email: None,
            address: None,
            notes: None,
        };
        let supplier = repo.create(input).await.unwrap();

        let update = crate::models::UpdateSupplier {
            name: Some("Updated Name".to_string()),
            phone: Some("11988888888".to_string()),
            ..Default::default()
        };

        let result = repo.update(&supplier.id, update).await;

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.phone, Some("11988888888".to_string()));
    }

    #[tokio::test]
    async fn test_delete_supplier() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        let input = CreateSupplier {
            name: "To Delete".to_string(),
            cnpj: None,
            trade_name: None,
            city: None,
            state: None,
            phone: None,
            email: None,
            address: None,
            notes: None,
        };
        let supplier = repo.create(input).await.unwrap();

        let result = repo.delete(&supplier.id).await;
        assert!(result.is_ok());

        // Verify it's deactivated
        let found = repo.find_by_id(&supplier.id).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().is_active, false);
    }

    #[tokio::test]
    async fn test_create_duplicate_cnpj() {
        let pool = setup_test_db().await;
        let repo = SupplierRepository::new(&pool);

        let input1 = CreateSupplier {
            name: "First".to_string(),
            cnpj: Some("11111111000111".to_string()),
            trade_name: None,
            city: None,
            state: None,
            phone: None,
            email: None,
            address: None,
            notes: None,
        };
        repo.create(input1).await.unwrap();

        // Try to create with same CNPJ
        let input2 = CreateSupplier {
            name: "Second".to_string(),
            cnpj: Some("11111111000111".to_string()),
            trade_name: None,
            city: None,
            state: None,
            phone: None,
            email: None,
            address: None,
            notes: None,
        };

        let result = repo.create(input2).await;
        assert!(result.is_err(), "Should fail with duplicate CNPJ");
    }
}
