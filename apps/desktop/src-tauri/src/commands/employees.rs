//! Comandos Tauri para Funcionários

use crate::audit_log;
use crate::commands::mobile::{MobileServerState, StartServerConfig};
use crate::commands::network::NetworkState;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{CreateEmployee, Employee, EmployeeRole, SafeEmployee, UpdateEmployee};
use crate::repositories::{EmployeeRepository, SettingsRepository};
use crate::require_permission;
use crate::AppState;
use serde::Deserialize;
use tauri::State;
use tokio::sync::RwLock;

#[tauri::command]
#[specta::specta]
pub async fn get_employees(state: State<'_, AppState>) -> AppResult<Vec<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    repo.find_all_safe().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_employee_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<Employee>> {
    let repo = EmployeeRepository::new(state.pool());
    repo.find_by_id(&id).await
}

#[tauri::command]
#[specta::specta]
pub async fn authenticate_by_pin(
    pin: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    _mobile_state: State<'_, RwLock<MobileServerState>>,
    _network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Option<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.authenticate_pin(&pin).await?;

    if let Some(ref e) = emp {
        state.session.set_employee(e);

        // Audit Log
        let audit_service = AuditService::new(state.pool().clone());
        audit_log!(
            audit_service,
            AuditAction::Login,
            &e.id,
            &e.name,
            "Employee",
            &e.id
        );

        // Tentar iniciar rede após login (se ainda não estiver rodando)
        // Usamos app_handle para acessar os estados
        let handle = app_handle.clone();
        tokio::spawn(async move {
            try_start_network_after_login(handle).await;
        });
    }

    Ok(emp.map(SafeEmployee::from))
}

/// Tenta iniciar serviços de rede após login bem-sucedido
async fn try_start_network_after_login(app_handle: tauri::AppHandle) {
    use tauri::Manager;

    let state = app_handle.state::<AppState>();
    let mobile_state = app_handle.state::<RwLock<MobileServerState>>();
    let network_state = app_handle.state::<RwLock<NetworkState>>();
    let pool = state.pool().clone();
    let app_handle_clone = app_handle.clone();

    let settings_repo = SettingsRepository::new(&pool);
    let role = settings_repo
        .get_value("network.role")
        .await
        .ok()
        .flatten()
        .unwrap_or_else(|| "STANDALONE".to_string());

    match role.as_str() {
        "MASTER" => {
            // Verificar se já está rodando
            if mobile_state.read().await.is_running {
                return;
            }
            tracing::info!("🔄 Retry: Tentando iniciar servidor Master após login...");
            let server_port = settings_repo
                .get_value("network.server_port")
                .await
                .ok()
                .flatten()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(3847);
            let config = StartServerConfig {
                port: server_port,
                max_connections: 10,
            };
            match crate::commands::mobile::start_mobile_server_internal(
                config,
                &state,
                &mobile_state,
            )
            .await
            {
                Ok(_) => tracing::info!("✅ Servidor Master iniciado após login"),
                Err(e) => tracing::error!("❌ Falha ao iniciar Master após login: {:?}", e),
            }
        }
        "SATELLITE" => {
            // Verificar se já está rodando
            if network_state.read().await.client.is_some() {
                return;
            }
            tracing::info!("🔄 Retry: Tentando iniciar cliente Satellite após login...");
            let terminal_name = settings_repo
                .get_value("terminal.name")
                .await
                .ok()
                .flatten()
                .unwrap_or_else(|| "Satellite Terminal".into());
            match crate::commands::network::start_network_client_internal(
                terminal_name,
                app_handle_clone,
                &pool,
                &network_state,
            )
            .await
            {
                Ok(_) => tracing::info!("✅ Cliente Satellite iniciado após login"),
                Err(e) => tracing::error!("❌ Falha ao iniciar Satellite após login: {:?}", e),
            }
        }
        _ => {}
    }
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn authenticate_employee(
    pin: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    mobile_state: State<'_, RwLock<MobileServerState>>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<Option<SafeEmployee>> {
    authenticate_by_pin(pin, app_handle, state, mobile_state, network_state).await
}

#[tauri::command]
#[specta::specta]
pub async fn has_admin(state: State<'_, AppState>) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());
    repo.has_admin().await
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateFirstAdminInput {
    pub name: String,
    pub email: Option<String>,
    pub pin: String,
}

#[tauri::command]
#[specta::specta]
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
        commission_rate: None,
    };

    let emp = repo.create(create).await?;
    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
#[specta::specta]
pub async fn has_any_employee(state: State<'_, AppState>) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());
    repo.has_any_employee().await
}

#[tauri::command]
#[specta::specta]
pub async fn create_employee(
    input: CreateEmployee,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
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
#[specta::specta]
pub async fn update_employee(
    id: String,
    input: UpdateEmployee,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
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
#[specta::specta]
pub async fn deactivate_employee(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
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
#[specta::specta]
pub async fn reactivate_employee(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<SafeEmployee> {
    let info = state.session.require_authenticated()?;
    let employee_id = info.employee_id;
    let employee = require_permission!(state.pool(), &employee_id, Permission::UpdateEmployees);
    let repo = EmployeeRepository::new(state.pool());
    let emp = repo.reactivate(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::EmployeeUpdated,
        &employee.id,
        &employee.name,
        "Employee",
        &id,
        "Reativado"
    );

    Ok(SafeEmployee::from(emp))
}

#[tauri::command]
#[specta::specta]
pub async fn logout(state: State<'_, AppState>) -> AppResult<()> {
    state.session.clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_user(state: State<'_, AppState>) -> AppResult<Option<SafeEmployee>> {
    let session = state.session.get_employee();
    if let Some(info) = session {
        let repo = EmployeeRepository::new(state.pool());
        let emp = repo.find_by_id(&info.employee_id).await?;
        Ok(emp.map(SafeEmployee::from))
    } else {
        Ok(None)
    }
}

/// Lista apenas funcionários inativos
#[tauri::command]
#[specta::specta]
pub async fn get_inactive_employees(state: State<'_, AppState>) -> AppResult<Vec<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    let employees = repo.find_inactive().await?;
    Ok(employees.into_iter().map(SafeEmployee::from).collect())
}
