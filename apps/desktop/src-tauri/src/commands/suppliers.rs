//! Comandos Tauri para Fornecedores

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{CreateSupplier, Supplier, UpdateSupplier};
use crate::repositories::SupplierRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_suppliers(state: State<'_, AppState>) -> AppResult<Vec<Supplier>> {
    let repo = SupplierRepository::new(state.pool());
    repo.find_all_active().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_supplier_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Supplier>> {
    let repo = SupplierRepository::new(state.pool());
    repo.find_by_id(&id).await
}

#[tauri::command]
#[specta::specta]
pub async fn search_suppliers(
    query: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<Supplier>> {
    let repo = SupplierRepository::new(state.pool());
    repo.search(&query).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_supplier(
    input: CreateSupplier,
    state: State<'_, AppState>,
) -> AppResult<Supplier> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageSuppliers);
    let repo = SupplierRepository::new(state.pool());
    let result = repo.create(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::SupplierCreated,
        &employee.id,
        &employee.name,
        "Supplier",
        &result.id,
        format!("Fornecedor Criado: {}", result.name)
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn update_supplier(
    id: String,
    input: UpdateSupplier,
    state: State<'_, AppState>,
) -> AppResult<Supplier> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageSuppliers);
    let repo = SupplierRepository::new(state.pool());
    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::SupplierUpdated,
        &employee.id,
        &employee.name,
        "Supplier",
        &id,
        format!("Fornecedor Atualizado: {}", result.name)
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_supplier(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageSuppliers);
    let repo = SupplierRepository::new(state.pool());
    repo.delete(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::SupplierDeleted,
        &employee.id,
        &employee.name,
        "Supplier",
        &id
    );

    Ok(())
}

/// Desativa um fornecedor (alias para delete)
#[tauri::command]
#[specta::specta]
pub async fn deactivate_supplier(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::ManageSuppliers);
    let repo = SupplierRepository::new(state.pool());
    repo.delete(&id).await
}

/// Reativa um fornecedor desativado
#[tauri::command]
#[specta::specta]
pub async fn reactivate_supplier(id: String, state: State<'_, AppState>) -> AppResult<Supplier> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::ManageSuppliers);
    let repo = SupplierRepository::new(state.pool());
    repo.reactivate(&id).await
}

/// Lista todos os fornecedores (ativos e inativos)
#[tauri::command]
#[specta::specta]
pub async fn get_all_suppliers(
    include_inactive: bool,
    state: State<'_, AppState>,
) -> AppResult<Vec<Supplier>> {
    let repo = SupplierRepository::new(state.pool());
    if include_inactive {
        repo.find_all().await
    } else {
        repo.find_all_active().await
    }
}

/// Lista apenas fornecedores inativos
#[tauri::command]
#[specta::specta]
pub async fn get_inactive_suppliers(state: State<'_, AppState>) -> AppResult<Vec<Supplier>> {
    let repo = SupplierRepository::new(state.pool());
    repo.find_inactive().await
}
