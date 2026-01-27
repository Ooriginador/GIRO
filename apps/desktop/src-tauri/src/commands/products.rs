//! Comandos Tauri para Produtos

use crate::audit_log;
use crate::commands::network::NetworkState;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{CreateProduct, Product, UpdateProduct};
use crate::repositories::ProductRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;
use tokio::sync::RwLock;

#[tauri::command]
#[specta::specta]
pub async fn get_products(state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    repo.find_all_active(None).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_products_paginated(
    state: State<'_, AppState>,
    page: Option<i32>,
    per_page: Option<i32>,
    search: Option<String>,
    category_id: Option<String>,
    is_active: Option<bool>,
) -> AppResult<crate::models::PaginatedResult<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    let pagination =
        crate::repositories::Pagination::new(page.unwrap_or(1), per_page.unwrap_or(50));
    let filters = crate::models::ProductFilters {
        search,
        category_id,
        is_active,
        ..Default::default()
    };
    repo.find_paginated(&pagination, &filters).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_product_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    repo.find_by_id(&id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_product_by_barcode(
    barcode: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    repo.find_by_barcode(&barcode).await
}

#[tauri::command]
#[specta::specta]
pub async fn search_products(query: String, state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    repo.search(&query, 50).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_low_stock_products(
    category_id: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    repo.find_low_stock(category_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_product(
    input: CreateProduct,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Product> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;

    tracing::debug!(
        "create_product called with input: {:?}, employee_id: {}",
        input,
        employee_id
    );

    let employee = require_permission!(state.pool(), &employee_id, Permission::CreateProducts);
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    let result = match repo.create(input).await {
        Ok(product) => {
            tracing::debug!("Product created successfully: {:?}", product.id);
            product
        }
        Err(e) => {
            tracing::error!("Failed to create product: {:?}", e);
            return Err(e);
        }
    };

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ProductCreated,
        &employee.id,
        &employee.name,
        "Product",
        &result.id,
        format!("Nome: {}, Preço: {}", result.name, result.sale_price)
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update("product", serde_json::to_value(&result).unwrap_or_default())
            .await;
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn update_product(
    id: String,
    input: UpdateProduct,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Product> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::UpdateProducts);
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ProductUpdated,
        &employee.id,
        &employee.name,
        "Product",
        &id,
        format!("Alterações: {:?}", result) // Simplificado
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update("product", serde_json::to_value(&result).unwrap_or_default())
            .await;
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_product(
    id: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::DeleteProducts);
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);

    // Hard delete - exclusão permanente
    let product_name = repo.hard_delete(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ProductDeleted,
        &employee.id,
        &employee.name,
        "Product",
        &id,
        format!("Produto '{}' excluído permanentemente", product_name)
    );

    // Push Update - notificar que produto foi deletado
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "product_deleted",
                serde_json::json!({ "id": id, "name": product_name }),
            )
            .await;
    }

    Ok(())
}

/// Desativa um produto (soft delete) - alias para consistência com frontend
#[tauri::command]
#[specta::specta]
pub async fn deactivate_product(
    id: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    require_permission!(state.pool(), &info.employee_id, Permission::UpdateProducts);
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);

    // Get product name for audit
    let name = repo
        .find_by_id(&id)
        .await?
        .map(|p| p.name)
        .unwrap_or_else(|| "Produto".to_string());

    repo.soft_delete(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ProductDeleted,
        &info.employee_id,
        &info.employee_name,
        "Product",
        &id,
        format!("Produto desativado (soft delete): {}", name)
    );

    // Push Update
    let updated = repo.find_by_id(&id).await?;
    if let Some(p) = updated {
        if let Some(client) = network_state.read().await.client.as_ref() {
            let _ = client
                .push_update("product", serde_json::to_value(&p).unwrap_or_default())
                .await;
        }
    }

    Ok(())
}

/// Reativa um produto que foi desativado
#[tauri::command]
#[specta::specta]
pub async fn reactivate_product(
    id: String,
    state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Product> {
    let info = state.session.require_authenticated()?;
    require_permission!(state.pool(), &info.employee_id, Permission::UpdateProducts);
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    let result = repo.reactivate(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ProductUpdated,
        &info.employee_id,
        &info.employee_name,
        "Product",
        &id,
        "Produto reativado"
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update("product", serde_json::to_value(&result).unwrap_or_default())
            .await;
    }

    Ok(result)
}

/// Lista todos os produtos (ativos e inativos)
#[tauri::command]
#[specta::specta]
pub async fn get_all_products(
    include_inactive: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    if include_inactive {
        repo.find_all().await
    } else {
        repo.find_all_active(None).await
    }
}

/// Lista apenas produtos inativos
#[tauri::command]
#[specta::specta]
pub async fn get_inactive_products(state: State<'_, AppState>) -> AppResult<Vec<Product>> {
    let repo = ProductRepository::with_events(state.pool(), &state.event_service);
    repo.find_inactive().await
}
