//! Repositório de Configurações

use crate::error::AppResult;
use crate::models::{SetSetting, Setting};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct SettingsRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SettingsRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const COLS: &'static str =
        "id, key, value, type, group_name, description, updated_by_id, created_at, updated_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Setting>> {
        let query = format!("SELECT {} FROM settings WHERE id = ?", Self::COLS);
        let result = sqlx::query_as::<_, Setting>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_key(&self, key: &str) -> AppResult<Option<Setting>> {
        let query = format!("SELECT {} FROM settings WHERE key = ?", Self::COLS);
        let result = sqlx::query_as::<_, Setting>(&query)
            .bind(key)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_group(&self, group: &str) -> AppResult<Vec<Setting>> {
        let query = format!(
            "SELECT {} FROM settings WHERE group_name = ? ORDER BY key",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Setting>(&query)
            .bind(group)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all(&self) -> AppResult<Vec<Setting>> {
        let query = format!(
            "SELECT {} FROM settings ORDER BY group_name, key",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Setting>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn get_value(&self, key: &str) -> AppResult<Option<String>> {
        let setting = self.find_by_key(key).await?;
        Ok(setting.map(|s| s.value))
    }

    pub async fn get_bool(&self, key: &str) -> AppResult<bool> {
        let value = self.get_value(key).await?;
        Ok(value.map(|v| v == "true" || v == "1").unwrap_or(false))
    }

    pub async fn get_number(&self, key: &str) -> AppResult<Option<f64>> {
        let value = self.get_value(key).await?;
        Ok(value.and_then(|v| v.parse().ok()))
    }

    pub async fn set(&self, data: SetSetting) -> AppResult<Setting> {
        let existing = self.find_by_key(&data.key).await?;
        let now = chrono::Utc::now().to_rfc3339();

        tracing::info!("Salvando configuração: {} = {}", data.key, data.value);
        let result = if let Some(setting) = existing {
            // Update
            let value_type = data
                .value_type
                .unwrap_or_else(|| setting.setting_type.clone());
            sqlx::query("UPDATE settings SET value = ?, type = ?, description = ?, updated_at = ? WHERE id = ?")
                .bind(&data.value)
                .bind(&value_type)
                .bind(&data.description)
                .bind(&now)
                .bind(&setting.id)
                .execute(self.pool)
                .await
        } else {
            // Create new
            let id = new_id();
            let value_type = data.value_type.unwrap_or_else(|| "STRING".to_string());
            let group = data.group_name.unwrap_or_else(|| "general".to_string());

            sqlx::query(
                "INSERT INTO settings (id, key, value, type, group_name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(&data.key)
            .bind(&data.value)
            .bind(&value_type)
            .bind(&group)
            .bind(&data.description)
            .bind(&now)
            .bind(&now)
            .execute(self.pool)
            .await
        };

        if let Err(e) = result {
            tracing::error!("Erro ao salvar configuração {}: {:?}", data.key, e);
            return Err(e.into());
        }

        self.find_by_key(&data.key).await?.ok_or_else(|| {
            crate::error::AppError::NotFound {
                entity: "Setting".into(),
                id: data.key,
            }
        })
    }

    pub async fn delete(&self, key: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM settings WHERE key = ?")
            .bind(key)
            .execute(self.pool)
            .await?;
        Ok(())
    }
    pub async fn upsert_from_sync(&self, setting: Setting) -> AppResult<()> {
        sqlx::query(
            "INSERT INTO settings (id, key, value, type, group_name, description, updated_by_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                key=excluded.key,
                value=excluded.value,
                type=excluded.type,
                group_name=excluded.group_name,
                description=excluded.description,
                updated_by_id=excluded.updated_by_id,
                updated_at=excluded.updated_at"
        )
        .bind(&setting.id)
        .bind(&setting.key)
        .bind(&setting.value)
        .bind(&setting.setting_type)
        .bind(&setting.group_name)
        .bind(&setting.description)
        .bind(&setting.updated_by_id)
        .bind(&setting.created_at)
        .bind(&setting.updated_at)
        .execute(self.pool)
        .await?;
        Ok(())
    }
}
