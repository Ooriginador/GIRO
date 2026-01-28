//! Sync Pending Repository
//!
//! Manages local sync queue and cursors for multi-PC synchronization

use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

use crate::error::AppResult;
use crate::license::{SyncEntityType, SyncItem, SyncOperation};

/// Local sync pending item
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncPending {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub data: Option<String>,
    pub local_version: i64,
    pub created_at: String,
}

/// Local sync cursor
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LocalSyncCursor {
    pub id: String,
    pub entity_type: String,
    pub last_synced_version: i64,
    pub last_synced_at: String,
    pub created_at: String,
}

/// Sync pending repository
pub struct SyncPendingRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SyncPendingRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Get all pending sync items
    pub async fn get_all_pending(&self) -> AppResult<Vec<SyncPending>> {
        let items = sqlx::query_as::<_, SyncPending>(
            r#"
            SELECT id, entity_type, entity_id, operation, data, local_version, created_at
            FROM sync_pending
            ORDER BY created_at ASC
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        Ok(items)
    }

    /// Get pending items by entity type
    pub async fn get_pending_by_type(&self, entity_type: &str) -> AppResult<Vec<SyncPending>> {
        let items = sqlx::query_as::<_, SyncPending>(
            r#"
            SELECT id, entity_type, entity_id, operation, data, local_version, created_at
            FROM sync_pending
            WHERE entity_type = ?
            ORDER BY created_at ASC
            "#,
        )
        .bind(entity_type)
        .fetch_all(self.pool)
        .await?;

        Ok(items)
    }

    /// Convert pending items to sync items for push
    pub async fn get_pending_as_sync_items(
        &self,
        entity_types: &[SyncEntityType],
    ) -> AppResult<Vec<SyncItem>> {
        let mut items = Vec::new();

        for entity_type in entity_types {
            let type_str = entity_type_to_string(*entity_type);
            let pending = self.get_pending_by_type(&type_str).await?;

            for p in pending {
                let operation = match p.operation.as_str() {
                    "create" => SyncOperation::Create,
                    "update" => SyncOperation::Update,
                    "delete" => SyncOperation::Delete,
                    _ => continue,
                };

                let data = if let Some(json_str) = &p.data {
                    serde_json::from_str(json_str).unwrap_or_default()
                } else {
                    serde_json::Value::Null
                };

                items.push(SyncItem {
                    entity_type: *entity_type,
                    entity_id: p.entity_id,
                    operation,
                    data,
                    local_version: p.local_version,
                });
            }
        }

        Ok(items)
    }

    /// Remove pending items after successful sync
    pub async fn remove_synced(
        &self,
        entity_type: SyncEntityType,
        entity_id: &str,
    ) -> AppResult<()> {
        let type_str = entity_type_to_string(entity_type);

        sqlx::query(
            r#"
            DELETE FROM sync_pending
            WHERE entity_type = ? AND entity_id = ?
            "#,
        )
        .bind(&type_str)
        .bind(entity_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Remove all pending items for an entity type
    pub async fn remove_all_by_type(&self, entity_type: SyncEntityType) -> AppResult<u64> {
        let type_str = entity_type_to_string(entity_type);

        let result = sqlx::query(
            r#"
            DELETE FROM sync_pending
            WHERE entity_type = ?
            "#,
        )
        .bind(&type_str)
        .execute(self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Count pending items
    pub async fn count_pending(&self) -> AppResult<i64> {
        let count = sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM sync_pending"#)
            .fetch_one(self.pool)
            .await?;

        Ok(count)
    }

    /// Count pending items by entity type
    pub async fn count_pending_by_type(&self, entity_type: SyncEntityType) -> AppResult<i64> {
        let type_str = entity_type_to_string(entity_type);

        let count = sqlx::query_scalar::<_, i64>(
            r#"SELECT COUNT(*) FROM sync_pending WHERE entity_type = ?"#,
        )
        .bind(&type_str)
        .fetch_one(self.pool)
        .await?;

        Ok(count)
    }
}

/// Sync cursor repository
pub struct SyncCursorRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SyncCursorRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Get cursor for an entity type
    pub async fn get_cursor(&self, entity_type: SyncEntityType) -> AppResult<LocalSyncCursor> {
        let type_str = entity_type_to_string(entity_type);

        let cursor = sqlx::query_as::<_, LocalSyncCursor>(
            r#"
            SELECT id, entity_type, last_synced_version, last_synced_at, created_at
            FROM sync_cursors
            WHERE entity_type = ?
            "#,
        )
        .bind(&type_str)
        .fetch_optional(self.pool)
        .await?;

        // If cursor doesn't exist, create it
        if let Some(c) = cursor {
            Ok(c)
        } else {
            self.create_cursor_and_return(entity_type).await
        }
    }

    /// Create cursor for an entity type and return it directly (avoids recursion)
    async fn create_cursor_and_return(
        &self,
        entity_type: SyncEntityType,
    ) -> AppResult<LocalSyncCursor> {
        let type_str = entity_type_to_string(entity_type);
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        sqlx::query(
            r#"
            INSERT INTO sync_cursors (id, entity_type, last_synced_version, last_synced_at, created_at)
            VALUES (?, ?, 0, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&type_str)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Return the created cursor directly
        Ok(LocalSyncCursor {
            id,
            entity_type: type_str,
            last_synced_version: 0,
            last_synced_at: now.clone(),
            created_at: now,
        })
    }

    /// Update cursor after successful sync
    pub async fn update_cursor(&self, entity_type: SyncEntityType, version: i64) -> AppResult<()> {
        let type_str = entity_type_to_string(entity_type);

        sqlx::query(
            r#"
            UPDATE sync_cursors
            SET last_synced_version = ?, last_synced_at = datetime('now')
            WHERE entity_type = ?
            "#,
        )
        .bind(version)
        .bind(&type_str)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Reset cursor (force full resync)
    pub async fn reset_cursor(&self, entity_type: Option<SyncEntityType>) -> AppResult<()> {
        if let Some(et) = entity_type {
            let type_str = entity_type_to_string(et);
            sqlx::query(
                r#"
                UPDATE sync_cursors
                SET last_synced_version = 0, last_synced_at = datetime('now')
                WHERE entity_type = ?
                "#,
            )
            .bind(&type_str)
            .execute(self.pool)
            .await?;
        } else {
            sqlx::query(
                r#"
                UPDATE sync_cursors
                SET last_synced_version = 0, last_synced_at = datetime('now')
                "#,
            )
            .execute(self.pool)
            .await?;
        }

        Ok(())
    }

    /// Get all cursors
    pub async fn get_all_cursors(&self) -> AppResult<Vec<LocalSyncCursor>> {
        let cursors = sqlx::query_as::<_, LocalSyncCursor>(
            r#"
            SELECT id, entity_type, last_synced_version, last_synced_at, created_at
            FROM sync_cursors
            ORDER BY entity_type
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        Ok(cursors)
    }
}

/// Helper to convert SyncEntityType to string
fn entity_type_to_string(entity_type: SyncEntityType) -> String {
    match entity_type {
        SyncEntityType::Product => "product".to_string(),
        SyncEntityType::Category => "category".to_string(),
        SyncEntityType::Supplier => "supplier".to_string(),
        SyncEntityType::Customer => "customer".to_string(),
        SyncEntityType::Employee => "employee".to_string(),
        SyncEntityType::Setting => "setting".to_string(),
    }
}

/// Helper to convert string to SyncEntityType
#[allow(dead_code)]
fn string_to_entity_type(s: &str) -> Option<SyncEntityType> {
    match s {
        "product" => Some(SyncEntityType::Product),
        "category" => Some(SyncEntityType::Category),
        "supplier" => Some(SyncEntityType::Supplier),
        "customer" => Some(SyncEntityType::Customer),
        "employee" => Some(SyncEntityType::Employee),
        "setting" => Some(SyncEntityType::Setting),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entity_type_conversion() {
        assert_eq!(entity_type_to_string(SyncEntityType::Product), "product");
        assert_eq!(entity_type_to_string(SyncEntityType::Category), "category");
        assert_eq!(
            string_to_entity_type("product"),
            Some(SyncEntityType::Product)
        );
        assert_eq!(string_to_entity_type("unknown"), None);
    }
}
