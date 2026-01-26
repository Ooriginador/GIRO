//! Comandos Tauri para Locais de Estoque - GIRO Enterprise

use crate::error::AppResult;
use crate::models::enterprise::*;
use crate::repositories::StockLocationRepository;
use crate::AppState;
use tauri::State;

/// Lista todos os locais de estoque ativos
#[tauri::command]
#[specta::specta]
pub async fn get_stock_locations(state: State<'_, AppState>) -> AppResult<Vec<StockLocation>> {
    let repo = StockLocationRepository::new(state.pool());
    repo.find_all_active().await
}

/// Lista locais por tipo
#[tauri::command]
#[specta::specta]
pub async fn get_stock_locations_by_type(
    location_type: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockLocation>> {
    let repo = StockLocationRepository::new(state.pool());
    repo.find_by_type(&location_type).await
}

/// Lista locais de um contrato
#[tauri::command]
#[specta::specta]
pub async fn get_stock_locations_by_contract(
    contract_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockLocation>> {
    let repo = StockLocationRepository::new(state.pool());
    repo.find_by_contract(&contract_id).await
}

/// Busca local por ID
#[tauri::command]
#[specta::specta]
pub async fn get_stock_location_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<StockLocation>> {
    let repo = StockLocationRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Busca local por código
#[tauri::command]
#[specta::specta]
pub async fn get_stock_location_by_code(
    code: String,
    state: State<'_, AppState>,
) -> AppResult<Option<StockLocation>> {
    let repo = StockLocationRepository::new(state.pool());
    repo.find_by_code(&code).await
}

/// Cria novo local de estoque
#[tauri::command]
#[specta::specta]
pub async fn create_stock_location(
    input: CreateStockLocation,
    state: State<'_, AppState>,
) -> AppResult<StockLocation> {
    let _info = state.session.require_authenticated()?;
    let repo = StockLocationRepository::new(state.pool());
    repo.create(input).await
}

/// Exclui local de estoque (soft delete)
#[tauri::command]
#[specta::specta]
pub async fn delete_stock_location(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let _info = state.session.require_authenticated()?;
    let repo = StockLocationRepository::new(state.pool());
    repo.delete(&id).await
}

/// Busca saldos de um local de estoque
#[tauri::command]
#[specta::specta]
pub async fn get_location_balances(
    location_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockBalanceWithProduct>> {
    let repo = StockLocationRepository::new(state.pool());
    repo.get_balances(&location_id).await
}

/// Ajusta saldo de estoque em um local
#[tauri::command]
#[specta::specta]
pub async fn adjust_location_balance(
    location_id: String,
    product_id: String,
    quantity_delta: f64,
    state: State<'_, AppState>,
) -> AppResult<StockBalance> {
    let _info = state.session.require_authenticated()?;
    let repo = StockLocationRepository::new(state.pool());
    repo.adjust_balance(&location_id, &product_id, quantity_delta)
        .await
}
