//! Testes unitários para CustomerRepository

#[cfg(test)]
mod tests {
    use super::super::customer_repository::CustomerRepository;
    use crate::models::{CreateCustomer, UpdateCustomer};
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_customer_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_customer() {
        let pool = setup_test_db().await;
        let repo = CustomerRepository::new(&pool);

        let input = CreateCustomer {
            name: "João Silva".to_string(),
            cpf: Some("12345678900".to_string()),
            email: Some("joao@example.com".to_string()),
            phone: Some("11999999999".to_string()),
            phone2: None,
            zip_code: Some("01001000".to_string()),
            street: Some("Rua Teste".to_string()),
            number: Some("123".to_string()),
            complement: None,
            neighborhood: Some("Centro".to_string()),
            city: Some("São Paulo".to_string()),
            state: Some("SP".to_string()),
            notes: Some("Cliente teste".to_string()),
        };

        let result = repo.create(input).await;
        assert!(
            result.is_ok(),
            "Failed to create customer: {:?}",
            result.err()
        );
        let customer = result.unwrap();
        assert_eq!(customer.name, "João Silva");
        assert_eq!(customer.cpf.unwrap(), "12345678900");
        assert!(customer.is_active);
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;
        let repo = CustomerRepository::new(&pool);

        let input = CreateCustomer {
            name: "Maria Santos".to_string(),
            cpf: Some("98765432100".to_string()),
            email: None,
            phone: None,
            phone2: None,
            zip_code: None,
            street: None,
            number: None,
            complement: None,
            neighborhood: None,
            city: None,
            state: None,
            notes: None,
        };

        let created = repo.create(input).await.unwrap();
        let found = repo.find_by_id(&created.id).await.unwrap();

        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.id, created.id);
        assert_eq!(found.name, "Maria Santos");
    }

    #[tokio::test]
    async fn test_update_customer() {
        let pool = setup_test_db().await;
        let repo = CustomerRepository::new(&pool);

        let input = CreateCustomer {
            name: "Pedro Alterado".to_string(),
            cpf: None,
            email: None,
            phone: None,
            phone2: None,
            zip_code: None,
            street: None,
            number: None,
            complement: None,
            neighborhood: None,
            city: None,
            state: None,
            notes: None,
        };

        let created = repo.create(input).await.unwrap();

        let update_input = UpdateCustomer {
            name: Some("Pedro Atualizado".to_string()),
            phone: Some("11888888888".to_string()),
            ..Default::default()
        };

        let updated = repo.update(&created.id, update_input).await.unwrap();
        assert_eq!(updated.name, "Pedro Atualizado");
        assert_eq!(updated.phone.unwrap(), "11888888888");
    }

    #[tokio::test]
    async fn test_deactivate_reactivate() {
        let pool = setup_test_db().await;
        let repo = CustomerRepository::new(&pool);

        let input = CreateCustomer {
            name: "Ana Inativa".to_string(),
            cpf: None,
            email: None,
            phone: None,
            phone2: None,
            zip_code: None,
            street: None,
            number: None,
            complement: None,
            neighborhood: None,
            city: None,
            state: None,
            notes: None,
        };

        let created = repo.create(input).await.unwrap();
        assert!(created.is_active);

        repo.deactivate(&created.id).await.unwrap();

        let found = repo.find_by_id(&created.id).await.unwrap().unwrap();
        assert!(!found.is_active);

        repo.reactivate(&created.id).await.unwrap();

        let found = repo.find_by_id(&created.id).await.unwrap().unwrap();
        assert!(found.is_active);
    }
}
