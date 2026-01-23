//! Comandos Tauri para Histórico de Preços

use crate::error::AppResult;
use crate::models::{PriceHistory, PriceHistoryWithProduct};
use crate::repositories::PriceHistoryRepository;
use crate::AppState;
use tauri::State;

/// Busca histórico de preços de um produto específico
#[tauri::command]
#[specta::specta]
pub async fn get_price_history_by_product(
    product_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<PriceHistory>> {
    state.session.require_authenticated()?;
    let repo = PriceHistoryRepository::new(state.pool());
    let history = repo.find_by_product(&product_id).await?;
    Ok(history)
}

/// Busca histórico de preços recente (últimos N registros)
#[tauri::command]
#[specta::specta]
pub async fn get_recent_price_history(
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> AppResult<Vec<PriceHistoryWithProduct>> {
    state.session.require_authenticated()?;
    let repo = PriceHistoryRepository::new(state.pool());
    let limit = limit.unwrap_or(50);
    let history = repo.find_recent(limit).await?;
    Ok(history)
}

/// Busca um registro de histórico de preço por ID
#[tauri::command]
#[specta::specta]
pub async fn get_price_history_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<PriceHistory>> {
    state.session.require_authenticated()?;
    let repo = PriceHistoryRepository::new(state.pool());
    let history = repo.find_by_id(&id).await?;
    Ok(history)
}
