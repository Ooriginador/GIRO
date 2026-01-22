//! Comandos Tauri para Configurações

use crate::error::AppResult;
use crate::middleware::permissions::Permission;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::audit_log_tx;
use crate::models::{SetSetting, Setting};
use crate::repositories::SettingsRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_settings(state: State<'_, AppState>) -> AppResult<Vec<Setting>> {
    let repo = SettingsRepository::new(state.pool());
    repo.find_all().await
}

#[tauri::command]
pub async fn get_settings_by_group(
    group: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<Setting>> {
    let repo = SettingsRepository::new(state.pool());
    repo.find_by_group(&group).await
}

#[tauri::command]
pub async fn get_setting(key: String, state: State<'_, AppState>) -> AppResult<Option<String>> {
    let repo = SettingsRepository::new(state.pool());
    repo.get_value(&key).await
}

#[tauri::command]
pub async fn get_setting_bool(key: String, state: State<'_, AppState>) -> AppResult<bool> {
    let repo = SettingsRepository::new(state.pool());
    repo.get_bool(&key).await
}

#[tauri::command]
pub async fn get_setting_number(key: String, state: State<'_, AppState>) -> AppResult<Option<f64>> {
    let repo = SettingsRepository::new(state.pool());
    repo.get_number(&key).await
}

#[tauri::command]
pub async fn set_setting(
    input: SetSetting,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<Setting> {
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
pub async fn delete_setting(
    key: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    require_permission!(state.pool(), &employee_id, Permission::UpdateSettings);
    let repo = SettingsRepository::new(state.pool());
    repo.delete(&key).await
}
