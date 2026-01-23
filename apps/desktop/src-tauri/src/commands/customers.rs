//! Comandos Tauri para Clientes - Motopeças
//!
//! Expõe funcionalidades de clientes e seus veículos para o frontend

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{
    CreateCustomer, CreateCustomerVehicle, Customer, CustomerFilters, CustomerVehicle,
    CustomerVehicleWithDetails, CustomerWithStats, UpdateCustomer, UpdateCustomerVehicle,
};
use crate::repositories::{CustomerRepository, PaginatedResult, Pagination};
use crate::require_permission;
use crate::AppState;
use tauri::State;

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════════════════════

/// Lista todos os clientes ativos
#[tauri::command]
#[specta::specta]
pub async fn get_customers(state: State<'_, AppState>) -> AppResult<Vec<Customer>> {
    let repo = CustomerRepository::new(state.pool());
    repo.find_all_active().await
}

/// Lista clientes com paginação e filtros
#[tauri::command]
#[specta::specta]
pub async fn get_customers_paginated(
    page: Option<i32>,
    per_page: Option<i32>,
    filters: Option<CustomerFilters>,
    state: State<'_, AppState>,
) -> AppResult<PaginatedResult<CustomerWithStats>> {
    let repo = CustomerRepository::new(state.pool());
    let pagination = Pagination {
        page: page.unwrap_or(1),
        per_page: per_page.unwrap_or(20),
    };
    let filters = filters.unwrap_or_default();
    repo.find_paginated(&pagination, &filters).await
}

/// Busca cliente por ID
#[tauri::command]
#[specta::specta]
pub async fn get_customer_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Customer>> {
    let repo = CustomerRepository::new(state.pool());
    repo.find_by_id(&id).await
}

/// Busca cliente por CPF
#[tauri::command]
#[specta::specta]
pub async fn get_customer_by_cpf(
    cpf: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Customer>> {
    let repo = CustomerRepository::new(state.pool());
    repo.find_by_cpf(&cpf).await
}

/// Busca clientes por termo (nome, CPF, telefone)
#[tauri::command]
#[specta::specta]
pub async fn search_customers(
    query: String,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> AppResult<Vec<Customer>> {
    let repo = CustomerRepository::new(state.pool());
    repo.search(&query, limit.unwrap_or(20)).await
}

/// Cria novo cliente
#[tauri::command]
#[specta::specta]
pub async fn create_customer(
    input: CreateCustomer,
    state: State<'_, AppState>,
) -> AppResult<Customer> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    let result = repo.create(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CustomerCreated,
        &employee.id,
        &employee.name,
        "Customer",
        &result.id,
        format!("Nome: {}", result.name)
    );

    Ok(result)
}

/// Atualiza cliente
#[tauri::command]
#[specta::specta]
pub async fn update_customer(
    id: String,
    input: UpdateCustomer,
    state: State<'_, AppState>,
) -> AppResult<Customer> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::CustomerUpdated,
        &employee.id,
        &employee.name,
        "Customer",
        &id,
        format!("Nome: {}", result.name)
    );

    Ok(result)
}

/// Desativa cliente (soft delete)
#[tauri::command]
#[specta::specta]
pub async fn deactivate_customer(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    repo.deactivate(&id).await
}

/// Reativa cliente
#[tauri::command]
#[specta::specta]
pub async fn reactivate_customer(id: String, state: State<'_, AppState>) -> AppResult<Customer> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    repo.reactivate(&id).await
}

// ═══════════════════════════════════════════════════════════════════════════
// VEÍCULOS DO CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

/// Lista veículos de um cliente
#[tauri::command]
#[specta::specta]
pub async fn get_customer_vehicles(
    customer_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<CustomerVehicleWithDetails>> {
    let repo = CustomerRepository::new(state.pool());
    repo.find_customer_vehicles(&customer_id).await
}

/// Busca veículo do cliente por ID
#[tauri::command]
#[specta::specta]
pub async fn get_customer_vehicle_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<CustomerVehicle>> {
    let repo = CustomerRepository::new(state.pool());
    repo.find_customer_vehicle_by_id(&id).await
}

/// Cria veículo do cliente
#[tauri::command]
#[specta::specta]
pub async fn create_customer_vehicle(
    input: CreateCustomerVehicle,
    state: State<'_, AppState>,
) -> AppResult<CustomerVehicle> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let _ = require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    repo.create_customer_vehicle(input).await
}

/// Atualiza veículo do cliente
#[tauri::command]
#[specta::specta]
pub async fn update_customer_vehicle(
    id: String,
    input: UpdateCustomerVehicle,
    state: State<'_, AppState>,
) -> AppResult<CustomerVehicle> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let _ = require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    repo.update_customer_vehicle(&id, input).await
}

/// Desativa veículo do cliente
#[tauri::command]
#[specta::specta]
pub async fn deactivate_customer_vehicle(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let _ = require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    repo.deactivate_customer_vehicle(&id).await
}

/// Atualiza quilometragem do veículo
#[tauri::command]
#[specta::specta]
pub async fn update_vehicle_km(id: String, km: i32, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let _ = require_permission!(state.pool(), &employee_id, Permission::ManageCustomers);
    let repo = CustomerRepository::new(state.pool());
    repo.update_vehicle_km(&id, km).await
}
