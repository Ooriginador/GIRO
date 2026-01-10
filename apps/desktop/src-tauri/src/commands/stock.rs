//! Comandos Tauri para Estoque

use crate::error::AppResult;
use crate::models::{CreateStockMovement, ProductLot, StockMovementRow};
use crate::repositories::StockRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_recent_stock_movements(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockMovementRow>> {
    let repo = StockRepository::new(state.pool());
    repo.find_recent_movements(limit).await
}

#[tauri::command]
pub async fn get_product_stock_movements(
    product_id: String,
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockMovementRow>> {
    let repo = StockRepository::new(state.pool());
    repo.find_movements_by_product(&product_id, limit).await
}

#[tauri::command]
pub async fn create_stock_movement(
    input: CreateStockMovement,
    state: State<'_, AppState>,
) -> AppResult<StockMovementRow> {
    let repo = StockRepository::new(state.pool());
    repo.create_movement(input).await
}

#[tauri::command]
pub async fn get_product_lots(
    product_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<ProductLot>> {
    let repo = StockRepository::new(state.pool());
    repo.find_lots_by_product(&product_id).await
}

#[tauri::command]
pub async fn get_expiring_lots(
    days: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<ProductLot>> {
    let repo = StockRepository::new(state.pool());
    repo.find_expiring_lots(days).await
}

#[tauri::command]
pub async fn get_expired_lots(state: State<'_, AppState>) -> AppResult<Vec<ProductLot>> {
    let repo = StockRepository::new(state.pool());
    repo.find_expired_lots().await
}
