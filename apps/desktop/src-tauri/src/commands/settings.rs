//! Comandos Tauri para Configurações

use crate::audit_log_tx;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::permissions::Permission;
use crate::models::{SetSetting, Setting};
use crate::repositories::SettingsRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;

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
pub async fn set_setting(input: SetSetting, state: State<'_, AppState>) -> AppResult<Setting> {
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

    tx.commit().await?;

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_setting(key: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::UpdateSettings);
    let repo = SettingsRepository::new(state.pool());
    repo.delete(&key).await
}
