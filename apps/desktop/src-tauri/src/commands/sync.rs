//! Sync Commands
//!
//! Tauri commands for multi-PC data synchronization

use crate::license::{
    SyncClient, SyncEntityType, SyncItem, SyncItemStatus, SyncOperation, SyncPullItem,
};
use crate::repositories::{
    CategoryRepository, CustomerRepository, ProductRepository, SettingsRepository,
    SupplierRepository,
};
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Sync push payload from frontend
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushPayload {
    pub entity_types: Vec<SyncEntityType>,
}

/// Sync result for frontend
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub success: bool,
    pub pushed: usize,
    pub pulled: usize,
    pub conflicts: usize,
    pub message: String,
}

/// Local wrapper for sync status response (to ensure proper Tauri serialization)
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusResult {
    pub entity_counts: Vec<SyncEntityCount>,
    pub last_sync: Option<String>,
    pub pending_changes: i64,
}

/// Local wrapper for entity count
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncEntityCount {
    pub entity_type: SyncEntityType,
    pub count: i64,
    pub last_version: i64,
    pub synced_version: i64,
}

/// Local wrapper for sync push response
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushResult {
    pub success: bool,
    pub processed: usize,
    pub results: Vec<SyncItemResultLocal>,
    pub server_time: String,
}

/// Local wrapper for sync item result
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncItemResultLocal {
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub status: SyncItemStatus,
    pub server_version: i64,
    pub message: Option<String>,
}

/// Local wrapper for sync pull response
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullResult {
    pub items: Vec<SyncPullItemLocal>,
    pub has_more: bool,
    pub server_time: String,
}

/// Local wrapper for sync pull item
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullItemLocal {
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub operation: SyncOperation,
    pub data: serde_json::Value,
    pub version: i64,
    pub updated_at: String,
}

/// Get sync status
#[tauri::command]
#[specta::specta]
pub async fn get_sync_status(state: State<'_, AppState>) -> Result<SyncStatusResult, String> {
    state
        .session
        .require_authenticated()
        .map_err(|e| e.to_string())?;

    let license_key = get_license_key(&state).await?;
    let hardware_id = &state.hardware_id;

    let sync_client = SyncClient::new(state.license_client.config().clone());
    let response = sync_client.status(&license_key, hardware_id).await?;

    // Convert to local type
    Ok(SyncStatusResult {
        entity_counts: response
            .entity_counts
            .into_iter()
            .map(|e| SyncEntityCount {
                entity_type: e.entity_type,
                count: e.count,
                last_version: e.last_version,
                synced_version: e.synced_version,
            })
            .collect(),
        last_sync: response.last_sync.map(|dt| dt.to_rfc3339()),
        pending_changes: response.pending_changes,
    })
}

/// Push local changes to server
#[tauri::command]
#[specta::specta]
pub async fn sync_push(
    payload: SyncPushPayload,
    state: State<'_, AppState>,
) -> Result<SyncPushResult, String> {
    state
        .session
        .require_authenticated()
        .map_err(|e| e.to_string())?;

    let license_key = get_license_key(&state).await?;
    let hardware_id = &state.hardware_id;
    let pool = state.pool();

    let mut items: Vec<SyncItem> = Vec::new();

    for entity_type in payload.entity_types {
        match entity_type {
            SyncEntityType::Product => {
                let repo = ProductRepository::new(pool);
                let products = repo.find_all().await.map_err(|e| e.to_string())?;

                for product in products {
                    items.push(SyncItem {
                        entity_type: SyncEntityType::Product,
                        entity_id: product.id.clone(),
                        operation: SyncOperation::Update,
                        data: serde_json::to_value(&product).unwrap_or_default(),
                        local_version: 0, // Desktop doesn't track versions yet
                    });
                }
            }
            SyncEntityType::Category => {
                let repo = CategoryRepository::new(pool);
                let categories = repo.find_all().await.map_err(|e| e.to_string())?;

                for category in categories {
                    items.push(SyncItem {
                        entity_type: SyncEntityType::Category,
                        entity_id: category.id.clone(),
                        operation: SyncOperation::Update,
                        data: serde_json::to_value(&category).unwrap_or_default(),
                        local_version: 0,
                    });
                }
            }
            SyncEntityType::Supplier => {
                let repo = SupplierRepository::new(pool);
                let suppliers = repo.find_all().await.map_err(|e| e.to_string())?;

                for supplier in suppliers {
                    items.push(SyncItem {
                        entity_type: SyncEntityType::Supplier,
                        entity_id: supplier.id.clone(),
                        operation: SyncOperation::Update,
                        data: serde_json::to_value(&supplier).unwrap_or_default(),
                        local_version: 0,
                    });
                }
            }
            SyncEntityType::Customer => {
                let repo = CustomerRepository::new(pool);
                let customers = repo.find_all_active().await.map_err(|e| e.to_string())?;

                for customer in customers {
                    items.push(SyncItem {
                        entity_type: SyncEntityType::Customer,
                        entity_id: customer.id.clone(),
                        operation: SyncOperation::Update,
                        data: serde_json::to_value(&customer).unwrap_or_default(),
                        local_version: 0,
                    });
                }
            }
            SyncEntityType::Employee => {
                // Employees are skipped for security - passwords and PINs should not sync
                tracing::info!("Sync push: skipping employees for security");
            }
            SyncEntityType::Setting => {
                let repo = SettingsRepository::new(pool);
                let settings = repo.find_all().await.map_err(|e| e.to_string())?;

                for setting in settings {
                    items.push(SyncItem {
                        entity_type: SyncEntityType::Setting,
                        entity_id: setting.key.clone(),
                        operation: SyncOperation::Update,
                        data: serde_json::to_value(&setting).unwrap_or_default(),
                        local_version: 0,
                    });
                }
            }
        }
    }

    let sync_client = SyncClient::new(state.license_client.config().clone());
    let response = sync_client.push(&license_key, hardware_id, items).await?;

    // Convert to local type
    Ok(SyncPushResult {
        success: response.success,
        processed: response.processed,
        results: response
            .results
            .into_iter()
            .map(|r| SyncItemResultLocal {
                entity_type: r.entity_type,
                entity_id: r.entity_id,
                status: r.status,
                server_version: r.server_version,
                message: r.message,
            })
            .collect(),
        server_time: response.server_time.to_rfc3339(),
    })
}

/// Pull changes from server
#[tauri::command]
#[specta::specta]
pub async fn sync_pull(
    entity_types: Vec<SyncEntityType>,
    state: State<'_, AppState>,
) -> Result<SyncPullResult, String> {
    state
        .session
        .require_authenticated()
        .map_err(|e| e.to_string())?;

    let license_key = get_license_key(&state).await?;
    let hardware_id = &state.hardware_id;

    let sync_client = SyncClient::new(state.license_client.config().clone());
    let response = sync_client
        .pull(&license_key, hardware_id, entity_types, 100)
        .await?;

    // Apply pulled items to local database
    apply_pulled_items(&response.items, state.pool()).await?;

    // Convert to local type
    Ok(SyncPullResult {
        items: response
            .items
            .into_iter()
            .map(|i| SyncPullItemLocal {
                entity_type: i.entity_type,
                entity_id: i.entity_id,
                operation: i.operation,
                data: i.data,
                version: i.version,
                updated_at: i.updated_at.to_rfc3339(),
            })
            .collect(),
        has_more: response.has_more,
        server_time: response.server_time.to_rfc3339(),
    })
}

/// Apply pulled items to local database
/// Handles both deletions and upserts using repository methods
async fn apply_pulled_items(items: &[SyncPullItem], pool: &sqlx::SqlitePool) -> Result<(), String> {
    for item in items {
        match item.entity_type {
            SyncEntityType::Product => {
                let repo = ProductRepository::new(pool);
                if item.operation == SyncOperation::Delete {
                    if let Err(e) = repo.hard_delete(&item.entity_id).await {
                        tracing::warn!("Sync: failed to delete product {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: deleted product {}", item.entity_id);
                    }
                } else if let Ok(product) =
                    serde_json::from_value::<crate::models::Product>(item.data.clone())
                {
                    if let Err(e) = repo.upsert_from_sync(product).await {
                        tracing::warn!("Sync: failed to upsert product {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: upserted product {}", item.entity_id);
                    }
                } else {
                    tracing::warn!("Sync: failed to deserialize product {}", item.entity_id);
                }
            }
            SyncEntityType::Category => {
                let repo = CategoryRepository::new(pool);
                if item.operation == SyncOperation::Delete {
                    if let Err(e) = repo.delete(&item.entity_id).await {
                        tracing::warn!("Sync: failed to delete category {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: deleted category {}", item.entity_id);
                    }
                } else if let Ok(category) =
                    serde_json::from_value::<crate::models::Category>(item.data.clone())
                {
                    if let Err(e) = repo.upsert_from_sync(category).await {
                        tracing::warn!("Sync: failed to upsert category {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: upserted category {}", item.entity_id);
                    }
                } else {
                    tracing::warn!("Sync: failed to deserialize category {}", item.entity_id);
                }
            }
            SyncEntityType::Supplier => {
                let repo = SupplierRepository::new(pool);
                if item.operation == SyncOperation::Delete {
                    if let Err(e) = repo.delete(&item.entity_id).await {
                        tracing::warn!("Sync: failed to delete supplier {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: deleted supplier {}", item.entity_id);
                    }
                } else if let Ok(supplier) =
                    serde_json::from_value::<crate::models::Supplier>(item.data.clone())
                {
                    if let Err(e) = repo.upsert_from_sync(supplier).await {
                        tracing::warn!("Sync: failed to upsert supplier {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: upserted supplier {}", item.entity_id);
                    }
                } else {
                    tracing::warn!("Sync: failed to deserialize supplier {}", item.entity_id);
                }
            }
            SyncEntityType::Customer => {
                let repo = CustomerRepository::new(pool);
                if item.operation == SyncOperation::Delete {
                    if let Err(e) = repo.deactivate(&item.entity_id).await {
                        tracing::warn!(
                            "Sync: failed to deactivate customer {}: {}",
                            item.entity_id,
                            e
                        );
                    } else {
                        tracing::info!("Sync: deactivated customer {}", item.entity_id);
                    }
                } else if let Ok(customer) =
                    serde_json::from_value::<crate::models::Customer>(item.data.clone())
                {
                    if let Err(e) = repo.upsert_from_sync(customer).await {
                        tracing::warn!("Sync: failed to upsert customer {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: upserted customer {}", item.entity_id);
                    }
                } else {
                    tracing::warn!("Sync: failed to deserialize customer {}", item.entity_id);
                }
            }
            SyncEntityType::Employee => {
                // Employees require special handling due to security (passwords, PINs)
                tracing::debug!(
                    "Sync: employee {} sync skipped for security",
                    item.entity_id
                );
            }
            SyncEntityType::Setting => {
                let repo = SettingsRepository::new(pool);
                if item.operation == SyncOperation::Delete {
                    if let Err(e) = repo.delete(&item.entity_id).await {
                        tracing::warn!("Sync: failed to delete setting {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: deleted setting {}", item.entity_id);
                    }
                } else if let Ok(setting) =
                    serde_json::from_value::<crate::models::Setting>(item.data.clone())
                {
                    if let Err(e) = repo.upsert_from_sync(setting.clone()).await {
                        tracing::warn!("Sync: failed to upsert setting {}: {}", item.entity_id, e);
                    } else {
                        tracing::info!("Sync: upserted setting {}", setting.key);
                    }
                } else {
                    tracing::warn!("Sync: failed to deserialize setting {}", item.entity_id);
                }
            }
        }
    }

    Ok(())
}

/// Reset sync cursor (force full resync on next pull)
#[tauri::command]
#[specta::specta]
pub async fn sync_reset(
    entity_type: Option<SyncEntityType>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .session
        .require_authenticated()
        .map_err(|e| e.to_string())?;

    let license_key = get_license_key(&state).await?;
    let hardware_id = &state.hardware_id;

    let sync_client = SyncClient::new(state.license_client.config().clone());
    sync_client
        .reset(&license_key, hardware_id, entity_type)
        .await
}

/// Full bidirectional sync
#[tauri::command]
#[specta::specta]
pub async fn sync_full(state: State<'_, AppState>) -> Result<SyncResult, String> {
    state
        .session
        .require_authenticated()
        .map_err(|e| e.to_string())?;

    let all_types = vec![
        SyncEntityType::Product,
        SyncEntityType::Category,
        SyncEntityType::Supplier,
        SyncEntityType::Customer,
        SyncEntityType::Setting,
    ];

    // 1. Pull first (get latest from server)
    let pull_result = sync_pull(all_types.clone(), state.clone()).await?;
    let pulled = pull_result.items.len();

    // 2. Push local changes
    let push_result = sync_push(
        SyncPushPayload {
            entity_types: all_types,
        },
        state,
    )
    .await?;

    let conflicts = push_result
        .results
        .iter()
        .filter(|r| r.status == SyncItemStatus::Conflict)
        .count();

    Ok(SyncResult {
        success: true,
        pushed: push_result.processed,
        pulled,
        conflicts,
        message: format!(
            "Sincronização completa: {} enviados, {} recebidos, {} conflitos",
            push_result.processed, pulled, conflicts
        ),
    })
}

/// Helper to get license key from stored config
async fn get_license_key(state: &AppState) -> Result<String, String> {
    let config_path = state
        .db_path
        .parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    let content = tokio::fs::read_to_string(&config_path)
        .await
        .map_err(|_| "Licença não encontrada. Ative sua licença primeiro.".to_string())?;

    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Erro ao ler licença: {}", e))?;

    data.get("key")
        .and_then(|k| k.as_str())
        .map(|s| s.to_string())
        .ok_or("Chave de licença não encontrada".to_string())
}
