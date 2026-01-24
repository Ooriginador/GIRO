//! Comandos Tauri para Categorias

use crate::audit_log;
use crate::commands::network::NetworkState;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{Category, CategoryWithCount, CreateCategory, UpdateCategory};
use crate::repositories::CategoryRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;
use tokio::sync::RwLock;

#[tauri::command]
#[specta::specta]
pub async fn get_categories(state: State<'_, AppState>) -> AppResult<Vec<Category>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_all_active().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_categories_with_count(
    state: State<'_, AppState>,
) -> AppResult<Vec<CategoryWithCount>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_all_with_count().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_category_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Category>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_by_id(&id).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_category(
    input: CreateCategory,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Category> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageCategories);
    let repo = CategoryRepository::new(state.pool());
    let result = repo.create(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CategoryCreated,
        &employee.id,
        &employee.name,
        "Category",
        &result.id,
        format!("Categoria Criada: {}", result.name)
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "category",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn update_category(
    id: String,
    input: UpdateCategory,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Category> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageCategories);
    let repo = CategoryRepository::new(state.pool());
    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CategoryUpdated,
        &employee.id,
        &employee.name,
        "Category",
        &id,
        format!("Categoria Atualizada: {}", result.name)
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "category",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_category(
    id: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageCategories);
    let repo = CategoryRepository::new(state.pool());
    repo.delete(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CategoryDeleted,
        &employee.id,
        &employee.name,
        "Category",
        &id
    );

    // Push Update (Fetch updated entity to send correct status)
    let updated = repo.find_by_id(&id).await?;
    if let Some(c) = updated {
        if let Some(client) = network_state.read().await.client.as_ref() {
            let _ = client
                .push_update("category", serde_json::to_value(&c).unwrap_or_default())
                .await;
        }
    }

    Ok(())
}

/// Desativa uma categoria (alias para delete)
#[tauri::command]
#[specta::specta]
pub async fn deactivate_category(
    id: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::ManageCategories);
    let repo = CategoryRepository::new(state.pool());
    repo.delete(&id).await?;

    // Push Update
    let updated = repo.find_by_id(&id).await?;
    if let Some(c) = updated {
        if let Some(client) = network_state.read().await.client.as_ref() {
            let _ = client
                .push_update("category", serde_json::to_value(&c).unwrap_or_default())
                .await;
        }
    }

    Ok(())
}

/// Reativa uma categoria desativada
#[tauri::command]
#[specta::specta]
pub async fn reactivate_category(
    id: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Category> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::ManageCategories);
    let repo = CategoryRepository::new(state.pool());
    let result = repo.reactivate(&id).await?;

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "category",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

/// Lista todas as categorias (ativas e inativas)
#[tauri::command]
#[specta::specta]
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
#[specta::specta]
pub async fn get_inactive_categories(state: State<'_, AppState>) -> AppResult<Vec<Category>> {
    let repo = CategoryRepository::new(state.pool());
    repo.find_inactive().await
}
