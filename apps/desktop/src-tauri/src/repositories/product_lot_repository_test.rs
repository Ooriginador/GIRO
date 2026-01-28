//! Testes unitários para ProductLotRepository

#[cfg(test)]
mod tests {
    use super::super::product_lot_repository::ProductLotRepository;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_lot_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup: Create Category (Product needs it)
        sqlx::query(
            "INSERT INTO categories (id, name, is_active, created_at, updated_at) 
             VALUES ('cat-001', 'Test Cat', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Create Product
        sqlx::query(
            "INSERT INTO products (id, name, barcode, internal_code, category_id, unit, cost_price, sale_price, current_stock, min_stock, is_weighted, is_active, created_at, updated_at) 
             VALUES ('prod-lot-01', 'Leite Longa Vida', '789123', 'CODE123', 'cat-001', 'UN', 5.0, 10.0, 100.0, 10.0, 0, 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Create Supplier
        sqlx::query(
            "INSERT INTO suppliers (id, name, is_active, created_at, updated_at) 
             VALUES ('sup-001', 'Fornecedor A', 1, datetime('now'), datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Setup: Create ProductLot
        // Using raw insert as we are testing retrieval mostly
        let yesterday = chrono::Utc::now() - chrono::Duration::days(1);
        let tomorrow = chrono::Utc::now() + chrono::Duration::days(1);

        // Expired Lot
        sqlx::query(
            "INSERT INTO product_lots (id, product_id, supplier_id, lot_number, expiration_date, initial_quantity, current_quantity, cost_price, status, created_at, updated_at) 
             VALUES ('lot-exp', 'prod-lot-01', 'sup-001', 'L001', ?, 10.0, 10.0, 5.0, 'active', datetime('now'), datetime('now'))"
        )
        .bind(yesterday.to_rfc3339())
        .execute(&pool)
        .await
        .unwrap();

        // Valid Lot
        sqlx::query(
            "INSERT INTO product_lots (id, product_id, supplier_id, lot_number, expiration_date, initial_quantity, current_quantity, cost_price, status, created_at, updated_at) 
             VALUES ('lot-ok', 'prod-lot-01', 'sup-001', 'L002', ?, 20.0, 20.0, 5.5, 'active', datetime('now'), datetime('now'))"
        )
        .bind(tomorrow.to_rfc3339())
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_get_by_id() {
        let pool = setup_test_db().await;
        let repo = ProductLotRepository::new(&pool);

        let lot = repo.get_by_id("lot-ok").await.unwrap();
        assert!(lot.is_some());
        let l = lot.unwrap();
        assert_eq!(l.lot_number.as_deref(), Some("L002"));
        assert_eq!(l.product_name.as_deref(), Some("Leite Longa Vida"));
    }

    #[tokio::test]
    async fn test_list_expired() {
        let pool = setup_test_db().await;
        let repo = ProductLotRepository::new(&pool);

        let expired = repo.list_expired(10, 0).await.unwrap();
        assert_eq!(expired.len(), 1);
        assert_eq!(expired[0].id, "lot-exp");
    }

    #[tokio::test]
    async fn test_list_expiring_within() {
        let pool = setup_test_db().await;
        let repo = ProductLotRepository::new(&pool);

        // Check lots expiring in next 2 days (should verify tomorrow's lot)
        let expiring = repo.list_expiring_within(2, 10, 0).await.unwrap();
        // Depending on logic, this might include already expired or only future ones.
        // Let's verify standard SQL: expiration > now AND expiration < now + days
        // Reading code...
        // WHERE pl.expiration_date IS NOT NULL
        // AND date(pl.expiration_date) > date('now')
        // AND date(pl.expiration_date) <= date('now', '+' || ? || ' days')

        assert_eq!(expiring.len(), 1);
        assert_eq!(expiring[0].id, "lot-ok");
    }
}
