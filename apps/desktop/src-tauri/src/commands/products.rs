//! Comandos Tauri para Produtos

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{CreateProduct, Product, UpdateProduct};
use crate::repositories::ProductRepository;
use crate::require_permission;
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
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<Product> {
    tracing::debug!(
        "create_product called with input: {:?}, employee_id: {}",
        input,
        employee_id
    );

    let employee = require_permission!(state.pool(), &employee_id, Permission::CreateProducts);
    let repo = ProductRepository::new(state.pool());
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

    Ok(result)
}

#[tauri::command]
pub async fn update_product(
    id: String,
    input: UpdateProduct,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<Product> {
    let employee = require_permission!(state.pool(), &employee_id, Permission::UpdateProducts);
    let repo = ProductRepository::new(state.pool());
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

    Ok(result)
}

#[tauri::command]
pub async fn delete_product(
    id: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let employee = require_permission!(state.pool(), &employee_id, Permission::DeleteProducts);
    let repo = ProductRepository::new(state.pool());
    repo.soft_delete(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ProductDeleted,
        &employee.id,
        &employee.name,
        "Product",
        &id
    );

    Ok(())
}

/// Desativa um produto (soft delete) - alias para consistência com frontend
#[tauri::command]
pub async fn deactivate_product(
    id: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    require_permission!(state.pool(), &employee_id, Permission::UpdateProducts);
    let repo = ProductRepository::new(state.pool());
    repo.soft_delete(&id).await
}

/// Reativa um produto que foi desativado
#[tauri::command]
pub async fn reactivate_product(
    id: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<Product> {
    require_permission!(state.pool(), &employee_id, Permission::UpdateProducts);
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
