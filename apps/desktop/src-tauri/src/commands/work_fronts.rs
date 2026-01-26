//! Comandos Tauri para Frentes de Trabalho - GIRO Enterprise

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::repositories::WorkFrontRepository;
use crate::AppState;
use tauri::State;

/// Lista frentes de trabalho de um contrato
#[tauri::command]
#[specta::specta]
pub async fn get_work_fronts_by_contract(
    contract_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<WorkFront>> {
    let repo = WorkFrontRepository::new(state.pool());
    repo.find_by_contract(&contract_id).await
}

/// Lista frentes de trabalho por supervisor
#[tauri::command]
#[specta::specta]
pub async fn get_work_fronts_by_supervisor(
    supervisor_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<WorkFront>> {
    let repo = WorkFrontRepository::new(state.pool());
    repo.find_by_supervisor(&supervisor_id).await
}

/// Busca frente de trabalho por ID
#[tauri::command]
#[specta::specta]
pub async fn get_work_front_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<WorkFront>> {
    let repo = WorkFrontRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Cria nova frente de trabalho
#[tauri::command]
#[specta::specta]
pub async fn create_work_front(
    input: CreateWorkFront,
    state: State<'_, AppState>,
) -> AppResult<WorkFront> {
    let _info = state.session.require_authenticated()?;
    let repo = WorkFrontRepository::new(state.pool());
    repo.create(input).await
}

/// Atualiza frente de trabalho
#[tauri::command]
#[specta::specta]
pub async fn update_work_front(
    id: String,
    input: UpdateWorkFront,
    state: State<'_, AppState>,
) -> AppResult<WorkFront> {
    let _info = state.session.require_authenticated()?;
    let repo = WorkFrontRepository::new(state.pool());
    repo.update(&id, input).await
}

/// Exclui frente de trabalho (soft delete)
#[tauri::command]
#[specta::specta]
pub async fn delete_work_front(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let _info = state.session.require_authenticated()?;
    let repo = WorkFrontRepository::new(state.pool());
    repo.delete(&id).await
}
