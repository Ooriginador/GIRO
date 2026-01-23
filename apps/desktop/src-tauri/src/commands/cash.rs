//! Comandos Tauri para Caixa

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{
    CashMovement, CashSession, CashSessionSummary, CreateCashMovement, CreateCashSession,
};
use crate::repositories::CashRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_current_session(state: State<'_, AppState>) -> AppResult<Option<CashSession>> {
    let repo = CashRepository::new(state.pool());
    repo.find_current_session().await
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn get_current_cash_session(
    state: State<'_, AppState>,
) -> AppResult<Option<CashSession>> {
    get_current_session(state).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_session_history(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<CashSession>> {
    let repo = CashRepository::new(state.pool());
    repo.find_session_history(limit).await
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn get_cash_session_history(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<CashSession>> {
    get_session_history(limit, state).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_session_movements(
    session_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<CashMovement>> {
    let repo = CashRepository::new(state.pool());
    repo.find_movements_by_session(&session_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn open_cash_session(
    mut input: CreateCashSession,
    state: State<'_, AppState>,
) -> AppResult<CashSession> {
    let info = state.session.require_authenticated()?;
    input.employee_id = info.employee_id.clone();
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::OpenCash);
    let repo = CashRepository::new(state.pool());
    let result = repo.open_session(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CashSessionOpened,
        &employee.id,
        &employee.name,
        "CashSession",
        &result.id,
        format!("Saldo Inicial: {}", result.opening_balance)
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn close_cash_session(
    id: String,
    actual_balance: f64,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<CashSession> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::CloseCash);
    let repo = CashRepository::new(state.pool());
    let result = repo.close_session(&id, actual_balance, notes).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CashSessionClosed,
        &employee.id,
        &employee.name,
        "CashSession",
        &id,
        format!("Saldo Final: {}", actual_balance)
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn add_cash_movement(
    mut input: CreateCashMovement,
    state: State<'_, AppState>,
) -> AppResult<CashMovement> {
    let info = state.session.require_authenticated()?;
    input.employee_id = info.employee_id.clone();
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageCash);
    let repo = CashRepository::new(state.pool());
    let result = repo.add_movement(input.clone()).await?;

    // Audit Log
    let action = match input.movement_type.as_str() {
        "SUPPLY" => AuditAction::CashSupply,
        "WITHDRAWAL" => AuditAction::CashWithdrawal,
        _ => AuditAction::CashMovement,
    };

    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        action,
        &employee.id,
        &employee.name,
        "CashSession",
        &input.session_id,
        format!("Valor: {}, Desc: {:?}", input.amount, input.description)
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn get_cash_session_summary(
    session_id: String,
    state: State<'_, AppState>,
) -> AppResult<CashSessionSummary> {
    let repo = CashRepository::new(state.pool());
    repo.get_session_summary(&session_id).await
}
