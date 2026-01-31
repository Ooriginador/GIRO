//! Testes de Integração - Comandos de Autenticação

#[cfg(test)]
mod tests {
    use crate::middleware::session::SessionState;
    use crate::models::{CreateEmployee, EmployeeRole};
    use crate::repositories::EmployeeRepository;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;
    use std::sync::Arc;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_auth_cmd_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        pool
    }

    const TEST_PASSWORD: &str = "TestPassword123!";

    #[tokio::test]
    async fn test_login_pin_command() {
        let pool = Arc::new(setup_test_db().await);

        // Create employee with PIN
        let repo = EmployeeRepository::new(&pool);
        let input = CreateEmployee {
            name: "Cashier Test".to_string(),
            cpf: None,
            phone: None,
            email: None,
            username: Some("cashier".to_string()),
            pin: "1234".to_string(),
            password: None,
            role: Some(EmployeeRole::Cashier),
            commission_rate: None,
        };
        repo.create(input).await.unwrap();

        // Test authentication with PIN
        use crate::models::auth::LoginCredentials;
        let credentials = LoginCredentials {
            pin: Some("1234".to_string()),
            username: None,
            password: None,
            cpf: None,
        };
        let result = repo.authenticate(credentials).await;

        assert!(result.is_ok());
        let auth_result = result.unwrap();
        assert_eq!(auth_result.employee.name, "Cashier Test");
        assert_eq!(auth_result.employee.role, "CASHIER");
    }

    #[tokio::test]
    async fn test_login_password_command() {
        let pool = Arc::new(setup_test_db().await);

        // Create employee with password
        let repo = EmployeeRepository::new(&pool);
        let input = CreateEmployee {
            name: "Admin Test".to_string(),
            cpf: None,
            phone: None,
            email: Some("admin@test.com".to_string()),
            username: Some("admin".to_string()),
            pin: "5678".to_string(),
            password: Some(TEST_PASSWORD.to_string()),
            role: Some(EmployeeRole::Admin),
            commission_rate: None,
        };
        repo.create(input).await.unwrap();

        // Test authentication with password
        use crate::models::auth::LoginCredentials;
        let credentials = LoginCredentials {
            pin: None,
            username: Some("admin".to_string()),
            password: Some(TEST_PASSWORD.to_string()),
            cpf: None,
        };
        let result = repo.authenticate(credentials).await;

        assert!(result.is_ok());
        let auth_result = result.unwrap();
        assert_eq!(auth_result.employee.name, "Admin Test");
        assert_eq!(auth_result.employee.role, "ADMIN");
    }

    #[tokio::test]
    async fn test_logout_command() {
        let session = SessionState::new();

        // Create mock employee info
        use crate::models::Employee;
        let employee = Employee {
            id: "test_id".to_string(),
            name: "Logout Test".to_string(),
            cpf: None,
            phone: None,
            email: None,
            username: Some("logouttest".to_string()),
            pin: "hashed_pin".to_string(),
            password: None,
            password_changed_at: None,
            password_reset_token: None,
            password_reset_expires_at: None,
            failed_login_attempts: 0,
            locked_until: None,
            last_login_at: None,
            last_login_ip: None,
            role: "CASHIER".to_string(),
            is_active: true,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            commission_rate: Some(0.0),
        };
        session.set_employee(&employee);

        // Verify logged in
        assert!(session.is_authenticated());

        // Test logout
        session.clear();

        // Verify logged out
        assert!(!session.is_authenticated());
    }

    #[tokio::test]
    async fn test_change_password_command() {
        let pool = Arc::new(setup_test_db().await);

        // Create employee with password
        let repo = EmployeeRepository::new(&pool);
        let input = CreateEmployee {
            name: "Change Password Test".to_string(),
            cpf: None,
            phone: None,
            email: Some("changepwd@test.com".to_string()),
            username: Some("changeuser".to_string()),
            pin: "7777".to_string(),
            password: Some(TEST_PASSWORD.to_string()),
            role: Some(EmployeeRole::Admin),
            commission_rate: None,
        };
        let employee = repo.create(input).await.unwrap();

        // Change password using repository method
        let new_password = "NewPassword456!";
        let result = repo
            .change_password(&employee.id, Some(TEST_PASSWORD), new_password)
            .await;

        assert!(result.is_ok());

        // Verify can authenticate with new password
        use crate::models::auth::LoginCredentials;
        let credentials = LoginCredentials {
            pin: None,
            username: Some("changeuser".to_string()),
            password: Some(new_password.to_string()),
            cpf: None,
        };
        let auth_result = repo.authenticate(credentials).await;
        assert!(auth_result.is_ok());

        // Verify old password doesn't work
        let old_credentials = LoginCredentials {
            pin: None,
            username: Some("changeuser".to_string()),
            password: Some(TEST_PASSWORD.to_string()),
            cpf: None,
        };
        let auth_result_old = repo.authenticate(old_credentials).await;
        assert!(auth_result_old.is_err());
    }

    #[tokio::test]
    async fn test_request_password_reset_command() {
        let pool = Arc::new(setup_test_db().await);

        // Create employee with email
        let repo = EmployeeRepository::new(&pool);
        let input = CreateEmployee {
            name: "Reset Request Test".to_string(),
            cpf: None,
            phone: None,
            email: Some("reset@test.com".to_string()),
            username: Some("resetrequest".to_string()),
            pin: "8888".to_string(),
            password: Some(TEST_PASSWORD.to_string()),
            role: Some(EmployeeRole::Admin),
            commission_rate: None,
        };
        repo.create(input).await.unwrap();

        // Request password reset using repository method
        let result = repo.request_password_reset("reset@test.com").await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(!response.token.is_empty());
    }

    #[tokio::test]
    async fn test_full_authentication_flow() {
        let pool = Arc::new(setup_test_db().await);

        // Create employee
        let repo = EmployeeRepository::new(&pool);
        let input = CreateEmployee {
            name: "Flow Test".to_string(),
            cpf: None,
            phone: None,
            email: Some("flow@test.com".to_string()),
            username: Some("flowtest".to_string()),
            pin: "4444".to_string(),
            password: Some(TEST_PASSWORD.to_string()),
            role: Some(EmployeeRole::Manager),
            commission_rate: None,
        };
        repo.create(input).await.unwrap();

        // Step 1: Authenticate with password
        use crate::models::auth::LoginCredentials;
        let credentials = LoginCredentials {
            pin: None,
            username: Some("flowtest".to_string()),
            password: Some(TEST_PASSWORD.to_string()),
            cpf: None,
        };
        let login_result = repo.authenticate(credentials).await;
        assert!(login_result.is_ok());

        let auth_result = login_result.unwrap();
        assert_eq!(auth_result.employee.name, "Flow Test");
        assert_eq!(auth_result.employee.role, "MANAGER");

        // Step 2: Change password
        let new_password = "NewFlowPassword123!";
        let change_result = repo
            .change_password(&auth_result.employee.id, Some(TEST_PASSWORD), new_password)
            .await;
        assert!(change_result.is_ok());

        // Step 3: Verify can authenticate with new password
        let new_credentials = LoginCredentials {
            pin: None,
            username: Some("flowtest".to_string()),
            password: Some(new_password.to_string()),
            cpf: None,
        };
        let final_auth = repo.authenticate(new_credentials).await;
        assert!(final_auth.is_ok());
    }
}
