//! Comandos Tauri - Autenticação
//!
//! API de autenticação exposta para o frontend

use crate::error::AppResult;
use crate::models::auth::{
    AccountStatus, AuthResult, ChangePasswordRequest, LoginCredentials, PasswordPolicy,
    PasswordResetConfirm, PasswordResetRequest, PasswordResetResponse, PasswordStrength,
};
use crate::models::SafeEmployee;
use crate::repositories::EmployeeRepository;
use crate::utils::crypto::{calculate_password_strength, verify_password};
use crate::AppState;
use tauri::State;

// ════════════════════════════════════════════════════════════════════════════
// LOGIN COMMANDS
// ════════════════════════════════════════════════════════════════════════════

/// Autenticação com credenciais flexíveis (PIN ou Username/Password)
#[tauri::command]
#[specta::specta]
pub async fn login(
    credentials: LoginCredentials,
    state: State<'_, AppState>,
) -> AppResult<AuthResult> {
    let repo = EmployeeRepository::new(state.pool());
    repo.authenticate(credentials).await
}

/// Login rápido por PIN (mantém compatibilidade)
///
/// # Exemplo (Frontend)
/// ```typescript
/// const result = await login_with_pin("1234");
/// console.log(result.employee.name);
/// ```
#[tauri::command]
#[specta::specta]
pub async fn login_with_pin(
    pin: String,
    state: State<'_, AppState>,
) -> AppResult<AuthResult> {
    let credentials = LoginCredentials {
        pin: Some(pin),
        username: None,
        password: None,
        cpf: None,
    };

    let repo = EmployeeRepository::new(state.pool());
    repo.authenticate(credentials).await
}

/// Login administrativo com username + senha
///
/// # Exemplo (Frontend)
/// ```typescript
/// const result = await login_with_password("admin", "SenhaSegura123");
/// if (result.requires_password_change) {
///   navigate('/change-password');
/// }
/// ```
#[tauri::command]
#[specta::specta]
pub async fn login_with_password(
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> AppResult<AuthResult> {
    let credentials = LoginCredentials {
        pin: None,
        username: Some(username),
        password: Some(password),
        cpf: None,
    };

    let repo = EmployeeRepository::new(state.pool());
    repo.authenticate(credentials).await
}

/// Login alternativo com CPF + senha
#[tauri::command]
#[specta::specta]
pub async fn login_with_cpf(
    cpf: String,
    password: String,
    state: State<'_, AppState>,
) -> AppResult<AuthResult> {
    let credentials = LoginCredentials {
        pin: None,
        username: None,
        password: Some(password),
        cpf: Some(cpf),
    };

    let repo = EmployeeRepository::new(state.pool());
    repo.authenticate(credentials).await
}

/// Logout (limpa sessão local - implementação futura com JWT)
#[tauri::command]
#[specta::specta]
pub async fn logout(employee_id: String, _state: State<'_, AppState>) -> AppResult<()> {
    tracing::info!("Employee {} logged out", employee_id);
    // TODO: Invalidar token JWT quando implementado
    Ok(())
}

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT COMMANDS
// ════════════════════════════════════════════════════════════════════════════

/// Altera senha do funcionário logado
///
/// # Exemplo (Frontend)
/// ```typescript
/// await change_password({
///   employee_id: currentUser.id,
///   current_password: "SenhaAntiga123",
///   new_password: "NovaSenha456"
/// });
/// ```
#[tauri::command]
#[specta::specta]
pub async fn change_password(
    request: ChangePasswordRequest,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let repo = EmployeeRepository::new(state.pool());
    repo.change_password(
        &request.employee_id,
        request.current_password.as_deref(),
        &request.new_password,
    )
    .await
}

/// Solicita reset de senha por email
///
/// # Retorno
/// - Token gerado (para exibir na UI se email não estiver configurado)
/// - Email de destino (se configurado)
/// - Data de expiração
///
/// # Exemplo (Frontend)
/// ```typescript
/// const response = await request_password_reset({ email: "admin@empresa.com" });
/// if (response.sent_to) {
///   toast.success(`Email enviado para ${response.sent_to}`);
/// } else {
///   // Exibir token na tela (sistema sem email)
///   alert(`Seu token é: ${response.token}`);
/// }
/// ```
#[tauri::command]
#[specta::specta]
pub async fn request_password_reset(
    request: PasswordResetRequest,
    state: State<'_, AppState>,
) -> AppResult<PasswordResetResponse> {
    let repo = EmployeeRepository::new(state.pool());
    repo.request_password_reset(&request.email).await
}

/// Confirma reset de senha com token
///
/// # Exemplo (Frontend)
/// ```typescript
/// await reset_password_with_token({
///   token: "abc123...",
///   new_password: "NovaSenha789"
/// });
/// navigate('/login');
/// ```
#[tauri::command]
#[specta::specta]
pub async fn reset_password_with_token(
    request: PasswordResetConfirm,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let repo = EmployeeRepository::new(state.pool());
    repo.reset_password_with_token(&request.token, &request.new_password)
        .await
}

/// Valida força de senha em tempo real
///
/// # Exemplo (Frontend)
/// ```typescript
/// const strength = await validate_password("MinhaS3nh@");
/// console.log(strength.score); // 0-4
/// console.log(strength.feedback); // ["Use mais caracteres"]
/// ```
#[tauri::command]
#[specta::specta]
pub async fn validate_password(
    password: String,
    _state: State<'_, AppState>,
) -> AppResult<PasswordStrength> {
    Ok(calculate_password_strength(&password))
}

/// Obtém política de senha configurada
#[tauri::command]
#[specta::specta]
pub async fn get_password_policy(state: State<'_, AppState>) -> AppResult<PasswordPolicy> {
    let repo = EmployeeRepository::new(state.pool());
    // Usa método privado através de validação
    repo.validate_password_policy("Dummy1")
        .await
        .ok(); // Ignora erro, só queremos carregar policy

    // Por ora, retornar padrão (TODO: expor método público)
    Ok(PasswordPolicy::default())
}

/// Verifica se senha atual está correta (helper para troca de senha)
#[tauri::command]
#[specta::specta]
pub async fn verify_current_password(
    employee_id: String,
    password: String,
    state: State<'_, AppState>,
) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());

    let employee = repo
        .find_by_id(&employee_id)
        .await?
        .ok_or(crate::error::AppError::NotFound(
            "Funcionário não encontrado".to_string(),
        ))?;

    if let Some(hash) = employee.password {
        verify_password(&password, &hash)
    } else {
        Ok(false)
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SECURITY & ACCOUNT STATUS COMMANDS
// ════════════════════════════════════════════════════════════════════════════

/// Verifica se conta está bloqueada
///
/// # Exemplo (Frontend)
/// ```typescript
/// const locked = await is_account_locked(userId);
/// if (locked) {
///   const status = await get_account_status(userId);
///   alert(`Conta bloqueada. Tente em ${status.lockout_remaining_seconds}s`);
/// }
/// ```
#[tauri::command]
#[specta::specta]
pub async fn is_account_locked(
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());
    repo.is_account_locked(&employee_id).await
}

/// Obtém status completo da conta (tentativas falhadas, lockout, etc)
#[tauri::command]
#[specta::specta]
pub async fn get_account_status(
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<AccountStatus> {
    let repo = EmployeeRepository::new(state.pool());
    repo.get_account_status(&employee_id).await
}

/// Força desbloqueio de conta (apenas ADMIN)
#[tauri::command]
#[specta::specta]
pub async fn unlock_account(
    employee_id: String,
    admin_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    // Verificar se quem está executando é admin
    let repo = EmployeeRepository::new(state.pool());
    let admin = repo.find_by_id(&admin_id).await?.ok_or(
        crate::error::AppError::Unauthorized("Admin não encontrado".to_string()),
    )?;

    if admin.role != crate::models::EmployeeRole::ADMIN {
        return Err(crate::error::AppError::Unauthorized(
            "Apenas administradores podem desbloquear contas".to_string(),
        ));
    }

    // Limpar tentativas falhadas e desbloqu ear
    repo.clear_failed_attempts(&employee_id).await?;

    tracing::info!("Account {} unlocked by admin {}", employee_id, admin_id);

    Ok(())
}

/// Verifica se funcionário precisa trocar senha
///
/// # Exemplo (Frontend)
/// ```typescript
/// if (authResult.requires_password_change) {
///   navigate('/change-password');
/// }
/// ```
#[tauri::command]
#[specta::specta]
pub async fn requires_password_change(
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<bool> {
    let repo = EmployeeRepository::new(state.pool());

    // Buscar funcionário
    let employee = repo.find_by_id(&employee_id).await?.ok_or(
        crate::error::AppError::NotFound("Funcionário não encontrado".to_string()),
    )?;

    // Perfis operacionais não precisam de senha
    if matches!(
        employee.role,
        crate::models::EmployeeRole::CASHIER | crate::models::EmployeeRole::STOCKER
    ) {
        return Ok(false);
    }

    // Admin sem senha = precisa configurar
    if employee.password.is_none() {
        return Ok(true);
    }

    // Verificar expiração (lógica privada - TODO: expor)
    Ok(false) // Por ora, assumir que não expirou
}

/// Lista funcionários com acesso administrativo (para gestão de acessos)
#[tauri::command]
#[specta::specta]
pub async fn list_admin_employees(
    state: State<'_, AppState>,
) -> AppResult<Vec<SafeEmployee>> {
    let repo = EmployeeRepository::new(state.pool());
    let all = repo.find_all_active().await?;

    let admins = all
        .into_iter()
        .filter(|e| {
            matches!(
                e.role,
                crate::models::EmployeeRole::ADMIN
                    | crate::models::EmployeeRole::MANAGER
                    | crate::models::EmployeeRole::CONTRACT_MANAGER
            )
        })
        .map(SafeEmployee::from)
        .collect();

    Ok(admins)
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO PARA REGISTRO NO TAURI
// ════════════════════════════════════════════════════════════════════════════

/// Lista todos os comandos de autenticação para registro
pub fn auth_commands() -> Vec<&'static str> {
    vec![
        "login",
        "login_with_pin",
        "login_with_password",
        "login_with_cpf",
        "logout",
        "change_password",
        "request_password_reset",
        "reset_password_with_token",
        "validate_password",
        "get_password_policy",
        "verify_current_password",
        "is_account_locked",
        "get_account_status",
        "unlock_account",
        "requires_password_change",
        "list_admin_employees",
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    // TODO: Testes de integração
    // Requerem setup de DB em memória
}
