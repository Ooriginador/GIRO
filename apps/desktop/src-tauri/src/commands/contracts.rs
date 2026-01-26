//! Comandos Tauri para Contratos - GIRO Enterprise

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::models::PaginatedResult;
use crate::repositories::{ContractRepository, Pagination};
use crate::AppState;
use tauri::State;

/// Lista todos os contratos ativos
#[tauri::command]
#[specta::specta]
pub async fn get_contracts(state: State<'_, AppState>) -> AppResult<Vec<Contract>> {
    let repo = ContractRepository::new(state.pool());
    repo.find_all_active().await
}

/// Lista contratos com paginação e filtros
#[tauri::command]
#[specta::specta]
pub async fn get_contracts_paginated(
    state: State<'_, AppState>,
    page: Option<i32>,
    per_page: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    manager_id: Option<String>,
    is_active: Option<bool>,
) -> AppResult<PaginatedResult<Contract>> {
    let repo = ContractRepository::new(state.pool());
    let pagination = Pagination::new(page.unwrap_or(1), per_page.unwrap_or(20));
    let filters = ContractFilters {
        search,
        status,
        manager_id,
        is_active,
    };
    repo.find_paginated(&pagination, &filters).await
}

/// Busca contrato por ID
#[tauri::command]
#[specta::specta]
pub async fn get_contract_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Contract>> {
    let repo = ContractRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Busca contrato por código
#[tauri::command]
#[specta::specta]
pub async fn get_contract_by_code(
    code: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Contract>> {
    let repo = ContractRepository::new(state.pool());
    repo.find_by_code(&code).await
}

/// Cria novo contrato
#[tauri::command]
#[specta::specta]
pub async fn create_contract(
    input: CreateContract,
    state: State<'_, AppState>,
) -> AppResult<Contract> {
    let _info = state.session.require_authenticated()?;
    let repo = ContractRepository::new(state.pool());
    repo.create(input).await
}

/// Atualiza contrato
#[tauri::command]
#[specta::specta]
pub async fn update_contract(
    id: String,
    input: UpdateContract,
    state: State<'_, AppState>,
) -> AppResult<Contract> {
    let _info = state.session.require_authenticated()?;
    let repo = ContractRepository::new(state.pool());
    repo.update(&id, input).await
}

/// Exclui contrato (soft delete)
#[tauri::command]
#[specta::specta]
pub async fn delete_contract(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let _info = state.session.require_authenticated()?;
    let repo = ContractRepository::new(state.pool());
    repo.delete(&id).await
}

/// Busca dashboard do contrato
#[tauri::command]
#[specta::specta]
pub async fn get_contract_dashboard(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<ContractDashboard> {
    let repo = ContractRepository::new(state.pool());
    repo.get_dashboard(&id).await
}
