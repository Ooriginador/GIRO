//! Comandos Tauri para Funcionários

use crate::error::AppResult;
use crate::models::{CreateEmployee, Employee, SafeEmployee, UpdateEmployee};
use crate::repositories::EmployeeRepository;
use crate::AppState;
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
pub async fn create_employee(
    input: CreateEmployee,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.create(input).await?;
    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
pub async fn update_employee(
    id: String,
    input: UpdateEmployee,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.update(&id, input).await?;
    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
pub async fn deactivate_employee(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let repo = EmployeeRepository::new(state.pool());
    repo.deactivate(&id).await
}

/// Reativa um funcionário desativado
#[tauri::command]
pub async fn reactivate_employee(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
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
