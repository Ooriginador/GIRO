//! Comandos Tauri para Requisições de Material - GIRO Enterprise

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::models::PaginatedResult;
use crate::repositories::{MaterialRequestRepository, Pagination};
use crate::AppState;
use tauri::State;

/// Lista requisições com paginação e filtros
#[tauri::command]
#[specta::specta]
pub async fn get_material_requests_paginated(
    state: State<'_, AppState>,
    page: Option<i32>,
    per_page: Option<i32>,
    filters: Option<RequestFilters>,
) -> AppResult<PaginatedResult<MaterialRequest>> {
    let repo = MaterialRequestRepository::new(state.pool());
    let pagination = Pagination::new(page.unwrap_or(1), per_page.unwrap_or(20));
    let filters = filters.unwrap_or_default();
    repo.find_paginated(&pagination, &filters).await
}

/// Lista requisições pendentes de aprovação
#[tauri::command]
#[specta::specta]
pub async fn get_pending_requests(
    approver_id: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<Vec<MaterialRequest>> {
    let repo = MaterialRequestRepository::new(state.pool());
    repo.find_pending_approval(approver_id.as_deref()).await
}

/// Busca requisição por ID
#[tauri::command]
#[specta::specta]
pub async fn get_material_request_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<MaterialRequest>> {
    let repo = MaterialRequestRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Busca requisição por número
#[tauri::command]
#[specta::specta]
pub async fn get_material_request_by_number(
    contract_id: String,
    request_number: String,
    state: State<'_, AppState>,
) -> AppResult<Option<MaterialRequest>> {
    let repo = MaterialRequestRepository::new(state.pool());
    repo.find_by_number(&contract_id, &request_number).await
}

/// Cria nova requisição
#[tauri::command]
#[specta::specta]
pub async fn create_material_request(
    input: CreateMaterialRequest,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.create(input, &info.employee_id).await
}

/// Adiciona item à requisição
#[tauri::command]
#[specta::specta]
pub async fn add_request_item(
    request_id: String,
    item: AddRequestItem,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequestItem> {
    let _info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.add_item(&request_id, item).await
}

/// Lista itens da requisição
#[tauri::command]
#[specta::specta]
pub async fn get_request_items(
    request_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<MaterialRequestItemWithProduct>> {
    let repo = MaterialRequestRepository::new(state.pool());
    repo.get_items_with_products(&request_id).await
}

/// Remove item da requisição
#[tauri::command]
#[specta::specta]
pub async fn remove_request_item(
    request_id: String,
    item_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let _info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.remove_item(&request_id, &item_id).await
}

/// Submete requisição para aprovação
#[tauri::command]
#[specta::specta]
pub async fn submit_material_request(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let _info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.submit(&id).await
}

/// Aprova requisição
#[tauri::command]
#[specta::specta]
pub async fn approve_material_request(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.approve(&id, &info.employee_id).await
}

/// Rejeita requisição
#[tauri::command]
#[specta::specta]
pub async fn reject_material_request(
    id: String,
    reason: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.reject(&id, &info.employee_id, &reason).await
}

/// Inicia separação da requisição
#[tauri::command]
#[specta::specta]
pub async fn start_request_separation(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.start_separation(&id, &info.employee_id).await
}

/// Finaliza separação da requisição
#[tauri::command]
#[specta::specta]
pub async fn complete_request_separation(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let _info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.complete_separation(&id).await
}

/// Registra entrega da requisição
#[tauri::command]
#[specta::specta]
pub async fn deliver_material_request(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let _info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.deliver(&id).await
}

/// Cancela requisição
#[tauri::command]
#[specta::specta]
pub async fn cancel_material_request(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<MaterialRequest> {
    let _info = state.session.require_authenticated()?;
    let repo = MaterialRequestRepository::new(state.pool());
    repo.cancel(&id).await
}
