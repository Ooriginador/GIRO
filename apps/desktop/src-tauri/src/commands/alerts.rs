//! Comandos Tauri para Alertas

use crate::error::AppResult;
use crate::models::{Alert, CreateAlert};
use crate::repositories::AlertRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_alerts(limit: i32, state: State<'_, AppState>) -> AppResult<Vec<Alert>> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.find_all(limit).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_unread_alerts(state: State<'_, AppState>) -> AppResult<Vec<Alert>> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.find_unread().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_unread_alert_count(state: State<'_, AppState>) -> AppResult<i32> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.count_unread().await
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn get_unread_alerts_count(state: State<'_, AppState>) -> AppResult<i32> {
    get_unread_alert_count(state).await
}

#[tauri::command]
#[specta::specta]
pub async fn mark_alert_read(id: String, state: State<'_, AppState>) -> AppResult<()> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.mark_as_read(&id).await
}

#[tauri::command]
#[specta::specta]
pub async fn mark_all_alerts_read(state: State<'_, AppState>) -> AppResult<()> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.mark_all_as_read().await
}

#[tauri::command]
#[specta::specta]
pub async fn create_alert(input: CreateAlert, state: State<'_, AppState>) -> AppResult<Alert> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.create(input).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_alert(id: String, state: State<'_, AppState>) -> AppResult<()> {
    state.session.require_authenticated()?;
    let repo = AlertRepository::new(state.pool());
    repo.delete(&id).await
}
