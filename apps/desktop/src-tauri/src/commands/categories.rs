//! Comandos Tauri para Categorias

use crate::error::AppResult;
use crate::models::{Category, CategoryWithCount, CreateCategory, UpdateCategory};
use crate::repositories::CategoryRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_categories(state: State<'_, AppState>) -> AppResult<Vec<Category>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_all_active().await
}

#[tauri::command]
pub async fn get_categories_with_count(
    state: State<'_, AppState>,
) -> AppResult<Vec<CategoryWithCount>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_all_with_count().await
}

#[tauri::command]
pub async fn get_category_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Category>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_by_id(&id).await
}

#[tauri::command]
pub async fn create_category(
    input: CreateCategory,
    state: State<'_, AppState>,
) -> AppResult<Category> {
    let repo = CategoryRepository::new(state.pool());
    repo.create(input).await
}

#[tauri::command]
pub async fn update_category(
    id: String,
    input: UpdateCategory,
    state: State<'_, AppState>,
) -> AppResult<Category> {
    let repo = CategoryRepository::new(state.pool());
    repo.update(&id, input).await
}

#[tauri::command]
pub async fn delete_category(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let repo = CategoryRepository::new(state.pool());
    repo.delete(&id).await
}

/// Desativa uma categoria (alias para delete)
#[tauri::command]
pub async fn deactivate_category(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let repo = CategoryRepository::new(state.pool());
    repo.delete(&id).await
}

/// Reativa uma categoria desativada
#[tauri::command]
pub async fn reactivate_category(id: String, state: State<'_, AppState>) -> AppResult<Category> {
    let repo = CategoryRepository::new(state.pool());
    repo.reactivate(&id).await
}

/// Lista todas as categorias (ativas e inativas)
#[tauri::command]
pub async fn get_all_categories(
    include_inactive: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<Category>> {
    let repo = CategoryRepository::new(state.pool());
    if include_inactive {
        repo.find_all().await
    } else {
        repo.find_all_active().await
    }
}

/// Lista apenas categorias inativas
#[tauri::command]
pub async fn get_inactive_categories(state: State<'_, AppState>) -> AppResult<Vec<Category>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_inactive().await
}
