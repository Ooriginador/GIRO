//! Comandos Tauri para Caixa

use crate::error::AppResult;
use crate::models::{
    CashMovement, CashSession, CashSessionSummary, CreateCashMovement, CreateCashSession,
};
use crate::repositories::CashRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_current_session(state: State<'_, AppState>) -> AppResult<Option<CashSession>> {
    let repo = CashRepository::new(state.pool());
    repo.find_current_session().await
}

// Alias para compatibilidade com frontend
#[tauri::command]
pub async fn get_current_cash_session(
    state: State<'_, AppState>,
) -> AppResult<Option<CashSession>> {
    get_current_session(state).await
}

#[tauri::command]
pub async fn get_session_history(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<CashSession>> {
    let repo = CashRepository::new(state.pool());
    repo.find_session_history(limit).await
}

#[tauri::command]
pub async fn get_session_movements(
    session_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<CashMovement>> {
    let repo = CashRepository::new(state.pool());
    repo.find_movements_by_session(&session_id).await
}

#[tauri::command]
pub async fn open_cash_session(
    input: CreateCashSession,
    state: State<'_, AppState>,
) -> AppResult<CashSession> {
    let repo = CashRepository::new(state.pool());
    repo.open_session(input).await
}

#[tauri::command]
pub async fn close_cash_session(
    id: String,
    actual_balance: f64,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<CashSession> {
    let repo = CashRepository::new(state.pool());
    repo.close_session(&id, actual_balance, notes).await
}

#[tauri::command]
pub async fn add_cash_movement(
    input: CreateCashMovement,
    state: State<'_, AppState>,
) -> AppResult<CashMovement> {
    let repo = CashRepository::new(state.pool());
    repo.add_movement(input).await
}

#[tauri::command]
pub async fn get_cash_session_summary(
    session_id: String,
    state: State<'_, AppState>,
) -> AppResult<CashSessionSummary> {
    let repo = CashRepository::new(state.pool());
    repo.get_session_summary(&session_id).await
}
