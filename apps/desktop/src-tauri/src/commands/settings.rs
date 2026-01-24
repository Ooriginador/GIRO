//! Comandos Tauri para Configurações

use crate::audit_log_tx;
use crate::commands::network::NetworkState;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::permissions::Permission;
use crate::models::{SetSetting, Setting};
use crate::repositories::SettingsRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;
use tokio::sync::RwLock;

#[tauri::command]
#[specta::specta]
pub async fn get_all_settings(state: State<'_, AppState>) -> AppResult<Vec<Setting>> {
    let repo = SettingsRepository::new(state.pool());
    repo.find_all().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings_by_group(
    group: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<Setting>> {
    let repo = SettingsRepository::new(state.pool());
    repo.find_by_group(&group).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_setting(key: String, state: State<'_, AppState>) -> AppResult<Option<String>> {
    let repo = SettingsRepository::new(state.pool());
    repo.get_value(&key).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_setting_bool(key: String, state: State<'_, AppState>) -> AppResult<bool> {
    let repo = SettingsRepository::new(state.pool());
    repo.get_bool(&key).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_setting_number(key: String, state: State<'_, AppState>) -> AppResult<Option<f64>> {
    let repo = SettingsRepository::new(state.pool());
    repo.get_number(&key).await
}

#[tauri::command]
#[specta::specta]
pub async fn set_setting(
    input: SetSetting,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Setting> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::UpdateSettings);

    let mut tx = state.pool().begin().await?;

    let repo = SettingsRepository::new(state.pool());
    let result = repo.set_tx(&mut tx, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log_tx!(
        audit_service,
        &mut tx,
        AuditAction::SettingsChanged,
        &employee.id,
        &employee.name,
        "Setting",
        &result.key,
        format!("Valor alterado para: {}", result.value)
    );

    // Push to Network (before commit to ensure consistent state? No, after commit usually but inside TX is fine if we don't await blocking)
    // Actually we should push AFTER commit.

    tx.commit().await?;

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update("setting", serde_json::to_value(&result).unwrap_or_default())
            .await;
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_setting(
    key: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::UpdateSettings);
    let repo = SettingsRepository::new(state.pool());

    // Fetch before delete for push
    let existing = repo.get_value(&key).await?;

    repo.delete(&key).await?;

    if let Some(val) = existing {
        // Reconstruct setting object loosely or just push key? Sync protocol expects full object for upsert normally.
        // But delete might need special handling or we verify upsert handles deletes?
        // upsert_from_sync in SettingsRepository:
        /*
           INSERT INTO settings (key, value, value_type, group_name, description, created_at, updated_at) ...
           ON CONFLICT(key) DO UPDATE SET ...
        */
        // It doesn't handle deletion. It's UPSERT.
        // If we delete locally, we want to delete remotely?
        // Protocol: SyncPushPayload { entity: "setting", data: ... }
        // SyncHandler::push calls repo.upsert_from_sync.
        // So pushing a deleted setting will just UPSERT it back!
        // We need a DELETE action or soft delete. Settings table usually hard deletes.
        // For now, let's skip push on delete for settings or implement soft delete for settings.
        // Task doesn't specify soft delete settings.
        // Let's assume we maintain consistency manually or just skip for now.
        // Actually, if I delete a setting, I want it deleted on Master.
        // But SyncHandler uses upsert.
        // I will skip pushing delete for settings for now to avoid re-creation.
    }

    Ok(())
}
