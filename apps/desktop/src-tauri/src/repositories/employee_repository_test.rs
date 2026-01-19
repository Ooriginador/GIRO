//! Testes unitários para EmployeeRepository

#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::{CreateEmployee, EmployeeRole};
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
    async fn test_create_employee() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let input = CreateEmployee {
            name: "João Silva".to_string(),
            cpf: Some("12345678900".to_string()),
            phone: Some("11999999999".to_string()),
            email: Some("joao@example.com".to_string()),
            // Avoid collision with any migration/seeded default employee PINs.
            pin: "2345".to_string(),
            password: Some("senha123".to_string()),
            role: Some(EmployeeRole::Cashier),
        };

        let result = repo.create(input).await;

        assert!(result.is_ok(), "{:?}", result.err());
        let employee = result.unwrap();
        assert_eq!(employee.name, "João Silva");
        assert_eq!(employee.cpf, Some("12345678900".to_string()));
        assert!(employee.is_active);
        // PIN should be hashed
        assert_ne!(employee.pin, "2345");
    }

    #[tokio::test]
    async fn test_create_employee_duplicate_pin() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let input1 = CreateEmployee {
            name: "Employee 1".to_string(),
            cpf: None,
            phone: None,
            email: None,
            pin: "5678".to_string(),
            password: None,
            role: None,
        };
        repo.create(input1).await.unwrap();

        // Try to create with same PIN
        let input2 = CreateEmployee {
            name: "Employee 2".to_string(),
            cpf: None,
            phone: None,
            email: None,
            pin: "5678".to_string(),
            password: None,
            role: None,
        };

        let result = repo.create(input2).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_authenticate_pin() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let input = CreateEmployee {
            name: "Test Auth".to_string(),
            cpf: None,
            phone: None,
            email: None,
            pin: "9999".to_string(),
            password: None,
            role: Some(EmployeeRole::Admin),
        };
        repo.create(input).await.unwrap();

        // Correct PIN
        let result = repo.authenticate_pin("9999").await;
        assert!(result.is_ok());
        let employee = result.unwrap();
        assert!(employee.is_some());
        assert_eq!(employee.unwrap().name, "Test Auth");

        // Wrong PIN
        let result = repo.authenticate_pin("0000").await;
        assert!(result.is_ok());
        let employee = result.unwrap();
        assert!(employee.is_none());
    }

    #[tokio::test]
    async fn test_find_by_cpf() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let input = CreateEmployee {
            name: "CPF Test".to_string(),
            cpf: Some("98765432100".to_string()),
            phone: None,
            email: None,
            pin: "1111".to_string(),
            password: None,
            role: None,
        };
        repo.create(input).await.unwrap();

        let result = repo.find_by_cpf("98765432100").await;

        assert!(result.is_ok());
        let employee = result.unwrap();
        assert!(employee.is_some());
        assert_eq!(employee.unwrap().name, "CPF Test");
    }

    #[tokio::test]
    async fn test_find_all_active() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        // Create 4 employees
        for i in 1..=4 {
            let input = CreateEmployee {
                name: format!("Employee {}", i),
                cpf: None,
                phone: None,
                email: None,
                pin: format!("{:04}", i),
                password: None,
                role: None,
            };
            let emp = repo.create(input).await.unwrap();

            // Deactivate the 4th one
            if i == 4 {
                repo.deactivate(&emp.id).await.unwrap();
                // Verify deactivation
                let deactivated = repo.find_by_id(&emp.id).await.unwrap().unwrap();
                assert_eq!(
                    deactivated.is_active, false,
                    "Employee 4 should be deactivated"
                );
            }
        }

        let result = repo.find_all_active().await;

        assert!(result.is_ok());
        let employees = result.unwrap();
        // Should return 3 active employees (created in test)
        // Default administrator might not be created in test env or migrations changed
        assert_eq!(employees.len(), 3);
    }

    #[tokio::test]
    async fn test_update_employee() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let input = CreateEmployee {
            name: "Original".to_string(),
            cpf: None,
            phone: None,
            email: None,
            pin: "2222".to_string(),
            password: None,
            role: Some(EmployeeRole::Cashier),
        };
        let employee = repo.create(input).await.unwrap();

        let update = crate::models::UpdateEmployee {
            name: Some("Updated Name".to_string()),
            phone: Some("11988888888".to_string()),
            ..Default::default()
        };

        let result = repo.update(&employee.id, update).await;

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.phone, Some("11988888888".to_string()));
    }

    #[tokio::test]
    async fn test_deactivate_employee() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let input = CreateEmployee {
            name: "To Deactivate".to_string(),
            cpf: None,
            phone: None,
            email: None,
            pin: "3333".to_string(),
            password: None,
            role: None,
        };
        let employee = repo.create(input).await.unwrap();

        let result = repo.deactivate(&employee.id).await;
        assert!(result.is_ok());

        // Verify it's deactivated
        let found = repo.find_by_id(&employee.id).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().is_active, false);
    }

    #[tokio::test]
    async fn test_role_formatting() {
        let pool = setup_test_db().await;
        let repo = EmployeeRepository::new(&pool);

        let roles = vec![
            EmployeeRole::Admin,
            EmployeeRole::Manager,
            EmployeeRole::Cashier,
            EmployeeRole::Viewer,
        ];

        for (i, role) in roles.iter().enumerate() {
            let input = CreateEmployee {
                name: format!("Role Test {}", i),
                cpf: None,
                phone: None,
                email: None,
                pin: format!("40{:02}", i),
                password: None,
                role: Some(*role),
            };
            let employee = repo.create(input).await.unwrap();

            // Role should be stored as uppercase string
            assert!(["ADMIN", "MANAGER", "CASHIER", "VIEWER"].contains(&employee.role.as_str()));
        }
    }
}
