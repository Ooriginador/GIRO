//! Comandos Tauri para Inventário - Enterprise Module

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::models::PaginatedResult;
use crate::repositories::{EnterpriseInventoryRepository, Pagination};
use crate::AppState;
use tauri::State;

/// Cria nova contagem de inventário
#[tauri::command]
#[specta::specta]
pub async fn create_inventory_count(
    data: CreateEnterpriseInventoryCount,
    state: State<'_, AppState>,
) -> AppResult<InventoryCount> {
    let info = state.session.require_authenticated()?;
    let repo = EnterpriseInventoryRepository::new(state.pool());
    repo.create(data, &info.employee_id).await
}

/// Lista contagens com filtros e paginação
#[tauri::command]
#[specta::specta]
pub async fn get_inventory_counts_paginated(
    state: State<'_, AppState>,
    page: Option<i32>,
    per_page: Option<i32>,
    location_id: Option<String>,
    status: Option<String>,
) -> AppResult<PaginatedResult<InventoryCount>> {
    let repo = EnterpriseInventoryRepository::new(state.pool());
    let pagination = Pagination::new(page.unwrap_or(1), per_page.unwrap_or(20));
    repo.find_paginated(&pagination, location_id.as_deref(), status.as_deref())
        .await
}

/// Busca contagem por ID
#[tauri::command]
#[specta::specta]
pub async fn get_inventory_count_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<InventoryCount>> {
    let repo = EnterpriseInventoryRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Busca itens da contagem
#[tauri::command]
#[specta::specta]
pub async fn get_inventory_count_items(
    count_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<InventoryCountItemWithProduct>> {
    let repo = EnterpriseInventoryRepository::new(state.pool());
    repo.get_items(&count_id).await
}

/// Registra contagem de um item
#[tauri::command]
#[specta::specta]
pub async fn register_inventory_count_item(
    item_id: String,
    counted_qty: f64,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<InventoryCountItem> {
    let info = state.session.require_authenticated()?;
    let repo = EnterpriseInventoryRepository::new(state.pool());
    repo.count_item(&item_id, counted_qty, &info.employee_id, notes)
        .await
}

/// Finaliza contagem de inventário
#[tauri::command]
#[specta::specta]
pub async fn complete_inventory_count(
    id: String,
    apply_adjustments: Option<bool>,
    state: State<'_, AppState>,
) -> AppResult<InventoryCount> {
    let info = state.session.require_authenticated()?;
    let repo = EnterpriseInventoryRepository::new(state.pool());
    repo.complete(&id, &info.employee_id, apply_adjustments.unwrap_or(true)) // Default to true if not provided
        .await
}

/// Atualiza informações básicas da contagem
#[tauri::command]
#[specta::specta]
pub async fn update_inventory_count(
    id: String,
    data: UpdateInventoryCount,
    state: State<'_, AppState>,
) -> AppResult<InventoryCount> {
    let _info = state.session.require_authenticated()?;
    let repo = EnterpriseInventoryRepository::new(state.pool());
    repo.update(&id, data).await
}
