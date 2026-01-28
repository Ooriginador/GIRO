//! Testes para ReportMotopartsRepository

#[cfg(test)]
mod tests {
    use crate::repositories::ReportMotopartsRepository;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_motoparts_report_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Employees (needed for sales/sessions/OS)
        sqlx::query(
            "INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) VALUES ('emp-1', 'Test', '1234', 'ADMIN', 1, datetime('now'), datetime('now'))"
        ).execute(&pool).await.unwrap();

        // Setup: Cash Session (needed for sales)
        sqlx::query(
             "INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at) VALUES ('sess-1', 'emp-1', 100.0, 'OPEN', datetime('now'))"
        ).execute(&pool).await.unwrap();

        // Setup: Categories
        sqlx::query("INSERT INTO categories (id, name, is_active) VALUES ('cat-part', 'Peças', 1), ('cat-serv', 'Serviços', 1)")
            .execute(&pool)
            .await
            .unwrap();

        // Setup: Products (Parts)
        sqlx::query(
            "INSERT INTO products (id, name, internal_code, sale_price, cost_price, current_stock, min_stock, is_active, category_id, updated_at, created_at) 
             VALUES 
             ('p1', 'Óleo Motor', 'OLEO-01', 50.0, 30.0, 100.0, 10.0, 1, 'cat-part', datetime('now'), datetime('now')),
             ('p2', 'Filtro Ar', 'FIL-01', 20.0, 10.0, 5.0, 10.0, 1, 'cat-part', datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Sales (Grocery/Retail flow) - One valid sale today
        sqlx::query(
            "INSERT INTO sales (id, subtotal, total, payment_method, amount_paid, cash_session_id, employee_id, status, created_at, daily_number, discount_value, change) 
             VALUES ('sale-1', 50.0, 50.0, 'CASH', 50.0, 'sess-1', 'emp-1', 'COMPLETED', datetime('now'), 1, 0.0, 0.0)"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Service Orders (Motopeças flow) - One open OS

        sqlx::query("INSERT INTO customers (id, name, created_at, updated_at) VALUES ('cus-1', 'Cliente Moto', datetime('now'), datetime('now'))")
            .execute(&pool)
            .await
            .unwrap();

        sqlx::query(
            "INSERT INTO vehicle_brands (id, name, created_at, updated_at) VALUES ('brand-1', 'Honda', datetime('now'), datetime('now'))"
        ).execute(&pool).await.unwrap();

        sqlx::query(
            "INSERT INTO vehicle_models (id, brand_id, name, created_at, updated_at) VALUES ('model-1', 'brand-1', 'CG 160', datetime('now'), datetime('now'))"
        ).execute(&pool).await.unwrap();

        sqlx::query(
            "INSERT INTO vehicle_years (id, model_id, year, year_label, created_at, updated_at) VALUES ('year-1', 'model-1', 2022, '2022', datetime('now'), datetime('now'))"
        ).execute(&pool).await.unwrap();

        sqlx::query(
            "INSERT INTO customer_vehicles (id, customer_id, vehicle_year_id, plate, is_active, created_at, updated_at) VALUES ('veh-1', 'cus-1', 'year-1', 'ABC-123', 1, datetime('now'), datetime('now'))"
        ).execute(&pool).await.unwrap();

        sqlx::query(
            "INSERT INTO service_orders (id, order_number, customer_id, customer_vehicle_id, vehicle_year_id, employee_id, status, total, created_at, updated_at) 
             VALUES ('os-1', 1001, 'cus-1', 'veh-1', 'year-1', 'emp-1', 'IN_PROGRESS', 150.0, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Alerts (Unread)
        sqlx::query(
            "INSERT INTO alerts (id, type, severity, title, message, is_read) VALUES ('alert-1', 'LOW_STOCK', 'WARNING', 'Baixo Estoque', 'Filtro Ar', 0)"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_dashboard_stats_aggregation() {
        let pool = setup_test_db().await;
        let repo = ReportMotopartsRepository::new(pool);

        let stats = repo.get_dashboard_stats().await.unwrap();

        // Validate Sales (Retail)
        assert_eq!(stats.total_sales_today, 50.0);
        assert_eq!(stats.count_sales_today, 1);

        // Validate OS (Motoparts)
        assert_eq!(stats.open_service_orders, 1);

        // Validate Alerts (Low Stock Logic)
        assert_eq!(stats.active_alerts, 1); // 1 unread alert inserted

        // Validate Low Stock
        // Product p2 has current 5.0, min 10.0 -> Low Stock
        // Product p1 has current 100.0, min 10.0 -> OK
        assert_eq!(stats.low_stock_products, 1);
    }
}
