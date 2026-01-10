//! Testes unitários para CategoryRepository

#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::CreateCategory;
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
    async fn test_create_category() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        let input = CreateCategory {
            name: "Bebidas".to_string(),
            description: Some("Bebidas em geral".to_string()),
            color: Some("#FF5733".to_string()),
            icon: Some("🍹".to_string()),
            parent_id: None,
            sort_order: Some(1),
        };

        let result = repo.create(input).await;

        assert!(result.is_ok());
        let category = result.unwrap();
        assert_eq!(category.name, "Bebidas");
        assert_eq!(category.color, Some("#FF5733".to_string()));
        assert_eq!(category.active, true);
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        let input = CreateCategory {
            name: "Alimentos".to_string(),
            description: None,
            color: None,
            icon: None,
            parent_id: None,
            sort_order: None,
        };
        let created = repo.create(input).await.unwrap();

        let result = repo.find_by_id(&created.id).await;

        assert!(result.is_ok());
        let category = result.unwrap();
        assert!(category.is_some());
        assert_eq!(category.unwrap().name, "Alimentos");
    }

    #[tokio::test]
    async fn test_find_all_active() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        // Create 3 categories
        for i in 1..=3 {
            let input = CreateCategory {
                name: format!("Category {}", i),
                description: None,
                color: None,
                icon: None,
                parent_id: None,
                sort_order: Some(i),
            };
            repo.create(input).await.unwrap();
        }

        let result = repo.find_all_active().await;

        assert!(result.is_ok());
        let categories = result.unwrap();
        // Should have at least 3 categories (may include defaults from migration)
        assert!(categories.len() >= 3);
    }

    #[tokio::test]
    async fn test_update_category() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        let input = CreateCategory {
            name: "Original Name".to_string(),
            description: None,
            color: None,
            icon: None,
            parent_id: None,
            sort_order: None,
        };
        let category = repo.create(input).await.unwrap();

        let update = crate::models::UpdateCategory {
            name: Some("Updated Name".to_string()),
            description: Some("New description".to_string()),
            ..Default::default()
        };

        let result = repo.update(&category.id, update).await;

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.description, Some("New description".to_string()));
    }

    #[tokio::test]
    async fn test_delete_category() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        let input = CreateCategory {
            name: "To Delete".to_string(),
            description: None,
            color: None,
            icon: None,
            parent_id: None,
            sort_order: None,
        };
        let category = repo.create(input).await.unwrap();

        let result = repo.delete(&category.id).await;
        assert!(result.is_ok());

        // Verify it's deactivated
        let found = repo.find_by_id(&category.id).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().active, false);
    }

    #[tokio::test]
    async fn test_find_children() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        // Create parent
        let parent_input = CreateCategory {
            name: "Parent".to_string(),
            description: None,
            color: None,
            icon: None,
            parent_id: None,
            sort_order: None,
        };
        let parent = repo.create(parent_input).await.unwrap();

        // Create children
        for i in 1..=2 {
            let child_input = CreateCategory {
                name: format!("Child {}", i),
                description: None,
                color: None,
                icon: None,
                parent_id: Some(parent.id.clone()),
                sort_order: Some(i),
            };
            repo.create(child_input).await.unwrap();
        }

        let result = repo.find_children(&parent.id).await;

        assert!(result.is_ok());
        let children = result.unwrap();
        assert_eq!(children.len(), 2);
    }

    #[tokio::test]
    async fn test_find_all_with_count() {
        let pool = setup_test_db().await;
        let repo = CategoryRepository::new(&pool);

        // Create a category
        let cat_input = CreateCategory {
            name: "Test Category".to_string(),
            description: None,
            color: None,
            icon: None,
            parent_id: None,
            sort_order: None,
        };
        repo.create(cat_input).await.unwrap();

        let result = repo.find_all_with_count().await;

        assert!(result.is_ok());
        let categories = result.unwrap();
        assert!(!categories.is_empty());
        // Each category should have a product_count (even if 0)
        for cat in &categories {
            assert!(cat.product_count >= 0);
        }
    }
}
