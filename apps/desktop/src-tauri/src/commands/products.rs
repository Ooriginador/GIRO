//! Comandos Tauri para Produtos

use crate::error::AppResult;
use crate::models::{CreateProduct, Product, UpdateProduct};
use crate::repositories::ProductRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_products(state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::new(state.pool());
    repo.find_all_active().await
}

#[tauri::command]
pub async fn get_product_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Product>> {
    let repo = ProductRepository::new(state.pool());
    repo.find_by_id(&id).await
}

#[tauri::command]
pub async fn get_product_by_barcode(
    barcode: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Product>> {
    let repo = ProductRepository::new(state.pool());
    repo.find_by_barcode(&barcode).await
}

#[tauri::command]
pub async fn search_products(query: String, state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::new(state.pool());
    repo.search(&query, 50).await
}

#[tauri::command]
pub async fn get_low_stock_products(state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::new(state.pool());
    repo.find_low_stock().await
}

#[tauri::command]
pub async fn create_product(
    input: CreateProduct,
    state: State<'_, AppState>,
) -> AppResult<Product> {
    let repo = ProductRepository::new(state.pool());
    repo.create(input).await
}

#[tauri::command]
pub async fn update_product(
    id: String,
    input: UpdateProduct,
    state: State<'_, AppState>,
) -> AppResult<Product> {
    let repo = ProductRepository::new(state.pool());
    repo.update(&id, input).await
}

#[tauri::command]
pub async fn delete_product(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let repo = ProductRepository::new(state.pool());
    repo.soft_delete(&id).await
}

/// Desativa um produto (soft delete) - alias para consistência com frontend
#[tauri::command]
pub async fn deactivate_product(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let repo = ProductRepository::new(state.pool());
    repo.soft_delete(&id).await
}

/// Reativa um produto que foi desativado
#[tauri::command]
pub async fn reactivate_product(id: String, state: State<'_, AppState>) -> AppResult<Product> {
    let repo = ProductRepository::new(state.pool());
    repo.reactivate(&id).await
}

/// Lista todos os produtos (ativos e inativos)
#[tauri::command]
pub async fn get_all_products(
    include_inactive: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::new(state.pool());
    if include_inactive {
        repo.find_all().await
    } else {
        repo.find_all_active().await
    }
}

/// Lista apenas produtos inativos
#[tauri::command]
pub async fn get_inactive_products(state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::new(state.pool());
    repo.find_inactive().await
}
