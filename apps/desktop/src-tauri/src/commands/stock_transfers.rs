//! Comandos Tauri para Transferências de Estoque - GIRO Enterprise

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::repositories::StockTransferRepository;
use crate::AppState;
use tauri::State;

/// Lista transferências por local de origem
#[tauri::command]
#[specta::specta]
pub async fn get_transfers_by_source(
    location_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockTransfer>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.find_by_source(&location_id).await
}

/// Lista transferências por local de destino
#[tauri::command]
#[specta::specta]
pub async fn get_transfers_by_destination(
    location_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockTransfer>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.find_by_destination(&location_id).await
}

/// Lista transferências pendentes de aprovação
#[tauri::command]
#[specta::specta]
pub async fn get_pending_transfers(state: State<'_, AppState>) -> AppResult<Vec<StockTransfer>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.find_pending().await
}

/// Lista transferências em trânsito
#[tauri::command]
#[specta::specta]
pub async fn get_in_transit_transfers(state: State<'_, AppState>) -> AppResult<Vec<StockTransfer>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.find_in_transit().await
}

/// Busca transferência por ID
#[tauri::command]
#[specta::specta]
pub async fn get_stock_transfer_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<StockTransfer>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Busca transferência por número
#[tauri::command]
#[specta::specta]
pub async fn get_stock_transfer_by_number(
    transfer_number: String,
    state: State<'_, AppState>,
) -> AppResult<Option<StockTransfer>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.find_by_number(&transfer_number).await
}

/// Cria nova transferência
#[tauri::command]
#[specta::specta]
pub async fn create_stock_transfer(
    input: CreateStockTransfer,
    state: State<'_, AppState>,
) -> AppResult<StockTransfer> {
    let info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.create(input, &info.employee_id).await
}

/// Adiciona item à transferência
#[tauri::command]
#[specta::specta]
pub async fn add_transfer_item(
    transfer_id: String,
    item: AddTransferItem,
    state: State<'_, AppState>,
) -> AppResult<StockTransferItem> {
    let _info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.add_item(&transfer_id, item).await
}

/// Lista itens da transferência
#[tauri::command]
#[specta::specta]
pub async fn get_transfer_items(
    transfer_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockTransferItem>> {
    let repo = StockTransferRepository::new(state.pool());
    repo.get_items(&transfer_id).await
}

/// Aprova transferência
#[tauri::command]
#[specta::specta]
pub async fn approve_stock_transfer(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<StockTransfer> {
    let info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.approve(&id, &info.employee_id).await
}

/// Rejeita transferência
#[tauri::command]
#[specta::specta]
pub async fn reject_stock_transfer(
    id: String,
    reason: String,
    state: State<'_, AppState>,
) -> AppResult<StockTransfer> {
    let info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.reject(&id, &info.employee_id, &reason).await
}

/// Expede transferência (despacho)
#[tauri::command]
#[specta::specta]
pub async fn ship_stock_transfer(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<StockTransfer> {
    let info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.ship(&id, &info.employee_id).await
}

/// Recebe transferência
#[tauri::command]
#[specta::specta]
pub async fn receive_stock_transfer(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<StockTransfer> {
    let info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.receive(&id, &info.employee_id).await
}

/// Cancela transferência
#[tauri::command]
#[specta::specta]
pub async fn cancel_stock_transfer(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<StockTransfer> {
    let _info = state.session.require_authenticated()?;
    let repo = StockTransferRepository::new(state.pool());
    repo.cancel(&id).await
}
