//! Testes unitários para SettingsRepository

#[cfg(test)]
mod tests {
    use super::super::settings_repository::SettingsRepository;
    use crate::models::SetSetting;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_settings_test_{}?mode=rwc", ts);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_set_and_get_setting() {
        let pool = setup_test_db().await;
        let repo = SettingsRepository::new(&pool);

        let input = SetSetting {
            key: "app_theme".to_string(),
            value: "dark".to_string(),
            value_type: Some("STRING".to_string()),
            group_name: Some("ui".to_string()),
            description: Some("Theme preference".to_string()),
        };

        let saved = repo.set(input).await;
        assert!(saved.is_ok());

        let value = repo.get_value("app_theme").await.unwrap();
        assert_eq!(value.unwrap(), "dark");
    }

    #[tokio::test]
    async fn test_update_existing_setting() {
        let pool = setup_test_db().await;
        let repo = SettingsRepository::new(&pool);

        let input = SetSetting {
            key: "tax_rate".to_string(),
            value: "10".to_string(),
            value_type: Some("NUMBER".to_string()),
            group_name: None,
            description: None,
        };
        repo.set(input).await.unwrap();

        let update = SetSetting {
            key: "tax_rate".to_string(),
            value: "12".to_string(),
            value_type: None,
            group_name: None,
            description: None,
        };
        repo.set(update).await.unwrap();

        let val_num = repo.get_number("tax_rate").await.unwrap();
        assert_eq!(val_num.unwrap(), 12.0);
    }

    #[tokio::test]
    async fn test_get_bool() {
        let pool = setup_test_db().await;
        let repo = SettingsRepository::new(&pool);

        let input = SetSetting {
            key: "feature_x".to_string(),
            value: "true".to_string(),
            value_type: Some("BOOLEAN".to_string()),
            group_name: None,
            description: None,
        };
        repo.set(input).await.unwrap();

        let val_bool = repo.get_bool("feature_x").await.unwrap();
        assert!(val_bool);

        let input2 = SetSetting {
            key: "feature_y".to_string(),
            value: "0".to_string(),
            value_type: None,
            group_name: None,
            description: None,
        };
        repo.set(input2).await.unwrap();

        let val_bool2 = repo.get_bool("feature_y").await.unwrap();
        assert!(!val_bool2);
    }
}
