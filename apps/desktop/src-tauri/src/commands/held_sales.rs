//! Comandos Tauri para Vendas em Espera
//!
//! Permite salvar e recuperar vendas pausadas do PDV.

use crate::error::AppResult;
use crate::models::{CreateHeldSale, HeldSale};
use crate::repositories::HeldSaleRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_held_sales(state: State<'_, AppState>) -> AppResult<Vec<HeldSale>> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.find_all_by_employee(&info.employee_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn save_held_sale(
    input: CreateHeldSale,
    state: State<'_, AppState>,
) -> AppResult<HeldSale> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.create(&info.employee_id, input).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_held_sale(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let _info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.delete(&id).await
}
