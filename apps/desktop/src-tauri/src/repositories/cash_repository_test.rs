//! Testes unitários para CashRepository

#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::{CreateCashMovement, CreateCashSession};
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Insert test employee
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) 
             VALUES ('emp-test-001', 'Test Employee', 'test-pin', 'CASHIER', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_open_session_success() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: Some("Test session".to_string()),
        };

        let result = repo.open_session(input).await;

        assert!(result.is_ok());
        let session = result.unwrap();
        assert_eq!(session.opening_balance, 100.0);
        assert_eq!(session.status, "OPEN");
        assert_eq!(session.employee_id, "emp-test-001");
    }

    #[tokio::test]
    async fn test_open_session_already_open() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // Open first session
        let input1 = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: None,
        };
        repo.open_session(input1).await.unwrap();

        // Try to open second session
        let input2 = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 200.0,
            notes: None,
        };
        let result = repo.open_session(input2).await;

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            crate::error::AppError::CashSessionAlreadyOpen
        ));
    }

    #[tokio::test]
    async fn test_find_current_session() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // No session initially
        let result = repo.find_current_session().await.unwrap();
        assert!(result.is_none());

        // Open session
        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 150.0,
            notes: None,
        };
        repo.open_session(input).await.unwrap();

        // Should find it now
        let result = repo.find_current_session().await.unwrap();
        assert!(result.is_some());
        let session = result.unwrap();
        assert_eq!(session.status, "OPEN");
        assert_eq!(session.opening_balance, 150.0);
    }

    #[tokio::test]
    async fn test_close_session() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // Open session
        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: None,
        };
        let session = repo.open_session(input).await.unwrap();

        // Close session with actual balance
        let result = repo
            .close_session(&session.id, 120.0, Some("End of day".to_string()))
            .await;

        assert!(
            result.is_ok(),
            "Failed to close session: {:?}",
            result.err()
        );
        let closed = result.unwrap();
        assert_eq!(closed.status, "CLOSED");
        assert_eq!(closed.actual_balance, Some(120.0));
        assert_eq!(closed.difference, Some(20.0)); // 120 - 100
        assert!(closed.closed_at.is_some());
    }

    #[tokio::test]
    async fn test_add_movement() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // Open session
        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: None,
        };
        let session = repo.open_session(input).await.unwrap();

        // Add movement - Using BLEED instead of WITHDRAWAL to match what frontend sends
        let movement_input = CreateCashMovement {
            session_id: session.id.clone(),
            employee_id: "emp-test-001".to_string(),
            movement_type: "BLEED".to_string(),
            amount: 50.0,
            description: Some("Test withdrawal".to_string()),
        };

        let result = repo.add_movement(movement_input).await;

        assert!(result.is_ok());
        let movement = result.unwrap();
        assert_eq!(movement.amount, 50.0);
        assert_eq!(movement.movement_type, "BLEED");
        assert_eq!(movement.session_id, session.id);
    }

    #[tokio::test]
    async fn test_find_movements_by_session() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // Open session
        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: None,
        };
        let session = repo.open_session(input).await.unwrap();

        // Add multiple movements
        let m1 = CreateCashMovement {
            session_id: session.id.clone(),
            employee_id: "emp-test-001".to_string(),
            movement_type: "SUPPLY".to_string(),
            amount: 30.0,
            description: Some("Supply 1".to_string()),
        };
        let m2 = CreateCashMovement {
            session_id: session.id.clone(),
            employee_id: "emp-test-001".to_string(),
            movement_type: "BLEED".to_string(),
            amount: 20.0,
            description: Some("Bleed 1".to_string()),
        };

        repo.add_movement(m1).await.unwrap();
        repo.add_movement(m2).await.unwrap();

        // Find all movements for this session
        let result = repo.find_movements_by_session(&session.id).await;

        assert!(result.is_ok());
        let movements = result.unwrap();
        // Should return 3 movements: 1 automatic "OPENING" + 2 manual
        assert_eq!(movements.len(), 3);
    }

    #[tokio::test]
    async fn test_session_history() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // Create and close a session
        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: None,
        };
        let session = repo.open_session(input).await.unwrap();
        repo.close_session(&session.id, 150.0, None).await.unwrap();

        // Get history
        let result = repo.find_session_history(10).await;

        assert!(result.is_ok());
        let history = result.unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].status, "CLOSED");
    }

    #[tokio::test]
    async fn test_get_session_summary_calculations() {
        let pool = setup_test_db().await;
        let repo = CashRepository::new(&pool);

        // 1. Open Session with 100.0
        let input = CreateCashSession {
            employee_id: "emp-test-001".to_string(),
            opening_balance: 100.0,
            notes: None,
        };
        let session = repo.open_session(input).await.unwrap();

        // 2. Add Supply +50.0
        repo.add_movement(CreateCashMovement {
            session_id: session.id.clone(),
            employee_id: "emp-test-001".to_string(),
            movement_type: "SUPPLY".to_string(),
            amount: 50.0,
            description: Some("Extra change".to_string()),
        })
        .await
        .unwrap();

        // 3. Add Bleed -30.0
        repo.add_movement(CreateCashMovement {
            session_id: session.id.clone(),
            employee_id: "emp-test-001".to_string(),
            movement_type: "BLEED".to_string(),
            amount: 30.0,
            description: Some("Lunch money".to_string()),
        })
        .await
        .unwrap();

        // 4. Create a cash sale +200.0
        let sale_id = "sale-test-001";
        sqlx::query(
            "INSERT INTO sales (id, subtotal, discount_value, total, payment_method, amount_paid, change, status, cash_session_id, employee_id, created_at) 
             VALUES (?, 200.0, 0.0, 200.0, 'CASH', 200.0, 0.0, 'COMPLETED', ?, 'emp-test-001', datetime('now'))"
        )
        .bind(sale_id)
        .bind(&session.id)
        .execute(&pool)
        .await
        .unwrap();

        // 5. Create a credit sale +500.0 (should NOT affect cash_in_drawer)
        let sale_id_2 = "sale-test-002";
        sqlx::query(
            "INSERT INTO sales (id, subtotal, discount_value, total, payment_method, amount_paid, change, status, cash_session_id, employee_id, created_at) 
             VALUES (?, 500.0, 0.0, 500.0, 'CREDIT', 500.0, 0.0, 'COMPLETED', ?, 'emp-test-001', datetime('now'))"
        )
        .bind(sale_id_2)
        .bind(&session.id)
        .execute(&pool)
        .await
        .unwrap();

        // 6. Get Summary
        let summary = repo.get_session_summary(&session.id).await.unwrap();

        // Expected Cash in Drawer:
        // Opening (100) + Supply (50) - Bleed (30) + Cash Sales (200) = 320.0
        assert_eq!(summary.cash_in_drawer, 320.0);

        // Assert totals
        assert_eq!(summary.total_supplies, 50.0);
        assert_eq!(summary.total_withdrawals, 30.0);
        assert_eq!(summary.total_sales, 700.0); // 200 + 500
    }
}
