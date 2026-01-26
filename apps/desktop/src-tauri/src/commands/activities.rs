//! Comandos Tauri para Atividades - GIRO Enterprise

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::repositories::ActivityRepository;
use crate::AppState;
use tauri::State;

/// Lista atividades de uma frente de trabalho
#[tauri::command]
#[specta::specta]
pub async fn get_activities_by_work_front(
    work_front_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<Activity>> {
    let repo = ActivityRepository::new(state.pool());
    repo.find_by_work_front(&work_front_id).await
}

/// Lista atividades por centro de custo
#[tauri::command]
#[specta::specta]
pub async fn get_activities_by_cost_center(
    cost_center: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<Activity>> {
    let repo = ActivityRepository::new(state.pool());
    repo.find_by_cost_center(&cost_center).await
}

/// Busca atividade por ID
#[tauri::command]
#[specta::specta]
pub async fn get_activity_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Activity>> {
    let repo = ActivityRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Cria nova atividade
#[tauri::command]
#[specta::specta]
pub async fn create_activity(
    input: CreateActivity,
    state: State<'_, AppState>,
) -> AppResult<Activity> {
    let _info = state.session.require_authenticated()?;
    let repo = ActivityRepository::new(state.pool());
    repo.create(input).await
}

/// Atualiza atividade
#[tauri::command]
#[specta::specta]
pub async fn update_activity(
    id: String,
    input: UpdateActivity,
    state: State<'_, AppState>,
) -> AppResult<Activity> {
    let _info = state.session.require_authenticated()?;
    let repo = ActivityRepository::new(state.pool());
    repo.update(&id, input).await
}

/// Atualiza progresso da atividade
#[tauri::command]
#[specta::specta]
pub async fn update_activity_progress(
    id: String,
    executed_qty: f64,
    state: State<'_, AppState>,
) -> AppResult<Activity> {
    let _info = state.session.require_authenticated()?;
    let repo = ActivityRepository::new(state.pool());
    repo.update_progress(&id, executed_qty).await
}

/// Exclui atividade (soft delete)
#[tauri::command]
#[specta::specta]
pub async fn delete_activity(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let _info = state.session.require_authenticated()?;
    let repo = ActivityRepository::new(state.pool());
    repo.delete(&id).await
}
