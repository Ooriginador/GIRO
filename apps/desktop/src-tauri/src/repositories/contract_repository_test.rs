//! Testes unitários para ContractRepository

#[cfg(test)]
mod tests {
    use super::super::contract_repository::ContractRepository;
    use crate::models::enterprise::{CreateContract, UpdateContract};
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_contract_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_contract() {
        let pool = setup_test_db().await;
        let repo = ContractRepository::new(&pool);

        let input = CreateContract {
            code: "CTR-2026-001".to_string(),
            name: "Obra Residencial Alpha".to_string(),
            description: Some("Construção de condomínio".to_string()),
            client_name: Some("Alpha Empreendimentos".to_string()),
            client_document: Some("12.345.678/0001-90".to_string()),
            start_date: Some("2026-01-01".to_string()),
            end_date: Some("2026-12-31".to_string()),
            budget: Some(1500000.0),
            manager_id: None,
            address: Some("Av. Principal, 100".to_string()),
            city: Some("São Paulo".to_string()),
            state: Some("SP".to_string()),
            notes: None,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());
        let contract = result.unwrap();
        assert_eq!(contract.code, "CTR-2026-001");
        assert_eq!(contract.name, "Obra Residencial Alpha");
        assert_eq!(contract.status, "PLANNING");
        assert!(contract.is_active);
        assert_eq!(contract.budget, 1500000.0);
    }

    #[tokio::test]
    async fn test_update_contract() {
        let pool = setup_test_db().await;
        let repo = ContractRepository::new(&pool);

        let input = CreateContract {
            code: "CTR-2026-002".to_string(),
            name: "Reforma Shopping".to_string(),
            description: None,
            client_name: None,
            client_document: None,
            start_date: None,
            end_date: None,
            budget: None,
            manager_id: None,
            address: None,
            city: None,
            state: None,
            notes: None,
        };

        let created = repo.create(input).await.unwrap();

        let update = UpdateContract {
            name: Some("Reforma Shopping Center Norte".to_string()),
            status: Some("ACTIVE".to_string()),
            budget: Some(500000.0),
            ..Default::default()
        };

        let updated = repo.update(&created.id, update).await.unwrap();
        assert_eq!(updated.name, "Reforma Shopping Center Norte");
        assert_eq!(updated.status, "ACTIVE");
        assert_eq!(updated.budget, 500000.0);
    }

    #[tokio::test]
    async fn test_find_all_active() {
        let pool = setup_test_db().await;
        let repo = ContractRepository::new(&pool);

        let input1 = CreateContract {
            code: "CTR-001".to_string(),
            name: "Contract 1".to_string(),
            description: None,
            client_name: None,
            client_document: None,
            start_date: None,
            end_date: None,
            budget: None,
            manager_id: None,
            address: None,
            city: None,
            state: None,
            notes: None,
        };
        repo.create(input1).await.unwrap();

        let input2 = CreateContract {
            code: "CTR-002".to_string(),
            name: "Contract 2".to_string(),
            description: None,
            client_name: None,
            client_document: None,
            start_date: None,
            end_date: None,
            budget: None,
            manager_id: None,
            address: None,
            city: None,
            state: None,
            notes: None,
        };
        repo.create(input2).await.unwrap();

        let contracts = repo.find_all_active().await.unwrap();
        assert!(contracts.len() >= 2);
    }
}
