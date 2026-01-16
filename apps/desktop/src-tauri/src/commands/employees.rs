//! Comandos Tauri para Funcionários

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{CreateEmployee, Employee, EmployeeRole, SafeEmployee, UpdateEmployee};
use crate::repositories::EmployeeRepository;
use crate::require_permission;
use crate::AppState;
use serde::Deserialize;
use tauri::State;

#[tauri::command]
pub async fn get_employees(state: State<'_, AppState>) -> AppResult<Vec<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    repo.find_all_safe().await
}

#[tauri::command]
pub async fn get_employee_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Employee>> {
    let repo = EmployeeRepository::new(state.pool());
    repo.find_by_id(&id).await
}

#[tauri::command]
pub async fn authenticate_by_pin(
    pin: String,
    state: State<'_, AppState>,
) -> AppResult<Option<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.authenticate_pin(&pin).await?;
    Ok(emp.map(SafeEmployee::from))
}

// Alias para compatibilidade com frontend
#[tauri::command]
pub async fn authenticate_employee(
    pin: String,
    state: State<'_, AppState>,
) -> AppResult<Option<SafeEmployee>> {
    authenticate_by_pin(pin, state).await
}

#[tauri::command]
pub async fn has_admin(state: State<'_, AppState>) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());
    
    // DEBUG: FORCE FALSE TO TEST FRONTEND/BACKEND CONNECTION
    tracing::error!("🚨 [DEBUG] has_admin FORCED to FALSE by Developer!");
    
    // Check real state just for logging
    let real_result = repo.has_admin().await?;
    tracing::warn!("🔍 [DEBUG] Real DB has_admin result would be: {}", real_result);
    
    Ok(false)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFirstAdminInput {
    pub name: String,
    pub email: Option<String>,
    pub pin: String,
}

#[tauri::command]
pub async fn create_first_admin(
    input: CreateFirstAdminInput,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let repo = EmployeeRepository::new(state.pool());

    // Verifica se já existe admin
    let has_admin = repo.has_admin().await?;
    if has_admin {
        return Err(crate::error::AppError::Duplicate(
            "Já existe um administrador cadastrado".into(),
        ));
    }

    // Valida PIN: 4-6 dígitos numéricos
    if input.pin.len() < 4 || input.pin.len() > 6 {
        return Err(crate::error::AppError::Validation(
            "PIN deve ter entre 4 e 6 dígitos".into(),
        ));
    }

    if !input.pin.chars().all(|c| c.is_ascii_digit()) {
        return Err(crate::error::AppError::Validation(
            "PIN deve conter apenas números".into(),
        ));
    }

    let create = CreateEmployee {
        name: input.name,
        cpf: None,
        phone: None,
        email: input.email,
        pin: input.pin,
        password: None,
        role: Some(EmployeeRole::Admin),
    };

    let emp = repo.create(create).await?;
    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
pub async fn has_any_employee(state: State<'_, AppState>) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());
    repo.has_any_employee().await
}

#[tauri::command]
pub async fn create_employee(
    input: CreateEmployee,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let employee = require_permission!(state.pool(), &employee_id, Permission::CreateEmployees);
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.create(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::EmployeeCreated,
        &employee.id,
        &employee.name,
        "Employee",
        &emp.id,
        format!("Nome: {}, Cargo: {:?}", emp.name, emp.role)
    );

    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
pub async fn update_employee(
    id: String,
    input: UpdateEmployee,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let employee = require_permission!(state.pool(), &employee_id, Permission::UpdateEmployees);
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::EmployeeUpdated,
        &employee.id,
        &employee.name,
        "Employee",
        &id
    );

    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
pub async fn deactivate_employee(
    id: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let employee = require_permission!(state.pool(), &employee_id, Permission::DeleteEmployees);
    let repo = EmployeeRepository::new(state.pool());
    repo.deactivate(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::EmployeeDeactivated,
        &employee.id,
        &employee.name,
        "Employee",
        &id
    );

    Ok(())
}

/// Reativa um funcionário desativado
#[tauri::command]
pub async fn reactivate_employee(
    id: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    require_permission!(state.pool(), &employee_id, Permission::UpdateEmployees);
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.reactivate(&id).await?;
    Ok(SafeEmployee::from(emp))
}

/// Lista apenas funcionários inativos
#[tauri::command]
pub async fn get_inactive_employees(state: State<'_, AppState>) -> AppResult<Vec<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    let employees = repo.find_inactive().await?;
    Ok(employees.into_iter().map(SafeEmployee::from).collect())
}
