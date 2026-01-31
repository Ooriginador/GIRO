//! Modelos de Autenticação
//!
//! Define tipos para o novo sistema de autenticação dual (PIN + Login/Senha)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::{EmployeeRole, SafeEmployee};

// ════════════════════════════════════════════════════════════════════════════
// CREDENCIAIS & AUTENTICAÇÃO
// ════════════════════════════════════════════════════════════════════════════

/// Credenciais de login - suporta múltiplos métodos
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LoginCredentials {
    /// Username (para login com senha)
    pub username: Option<String>,

    /// PIN (para login rápido - operadores)
    pub pin: Option<String>,

    /// Senha (para login administrativo)
    pub password: Option<String>,

    /// CPF (alternativa para username)
    pub cpf: Option<String>,
}

/// Resultado de autenticação bem-sucedida
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthResult {
    /// Dados do funcionário autenticado (sem dados sensíveis)
    pub employee: SafeEmployee,

    /// Token de sessão (JWT - futuro)
    pub token: Option<String>,

    /// Data de expiração da sessão
    pub expires_at: Option<DateTime<Utc>>,

    /// Método usado para autenticação
    pub auth_method: AuthMethod,

    /// Indica se precisa trocar senha
    pub requires_password_change: bool,
}

/// Método de autenticação utilizado
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum AuthMethod {
    Pin,
    Password,
}

// ════════════════════════════════════════════════════════════════════════════
// GESTÃO DE SENHA
// ════════════════════════════════════════════════════════════════════════════

/// Força/Qualidade da senha
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordStrength {
    /// Score de 0 a 4 (0 = muito fraca, 4 = muito forte)
    pub score: u8,

    /// Feedback para o usuário
    pub feedback: Vec<String>,

    /// Se a senha atende os requisitos mínimos
    pub is_valid: bool,

    /// Tempo estimado para quebrar a senha
    pub crack_time_display: String,
}

/// Requisitos de política de senha
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordPolicy {
    pub min_length: usize,
    pub require_uppercase: bool,
    pub require_lowercase: bool,
    pub require_numbers: bool,
    pub require_special: bool,
    pub expiry_days: u32,           // 0 = nunca expira
    pub prevent_reuse_count: usize, // quantas senhas antigas bloquear
}

impl Default for PasswordPolicy {
    fn default() -> Self {
        Self {
            min_length: 8,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_special: false,
            expiry_days: 90,
            prevent_reuse_count: 3,
        }
    }
}

/// Request de alteração de senha
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    pub employee_id: String,
    pub current_password: Option<String>, // None se admin resetando
    pub new_password: String,
}

// ════════════════════════════════════════════════════════════════════════════
// RECUPERAÇÃO DE SENHA
// ════════════════════════════════════════════════════════════════════════════

/// Solicitação de reset de senha
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordResetRequest {
    pub email: String,
}

/// Confirmação de reset com token
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordResetConfirm {
    pub token: String,
    pub new_password: String,
}

/// Resposta de solicitação de reset
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordResetResponse {
    /// Token gerado (exibido na UI se email não configurado)
    pub token: String,

    /// Email onde foi enviado (se configurado)
    pub sent_to: Option<String>,

    /// Tempo de expiração do token
    pub expires_at: DateTime<Utc>,
}

// ════════════════════════════════════════════════════════════════════════════
// SEGURANÇA & LOCKOUT
// ════════════════════════════════════════════════════════════════════════════

/// Status de conta (lockout)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountStatus {
    pub is_locked: bool,
    pub locked_until: Option<DateTime<Utc>>,
    pub failed_attempts: u32,
    pub max_attempts: u32,
    pub lockout_remaining_seconds: Option<i64>,
}

/// Evento de auditoria de autenticação
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthAuditEvent {
    pub event_type: AuthEventType,
    pub employee_id: Option<String>,
    pub username: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub success: bool,
    pub failure_reason: Option<String>,
    pub timestamp: DateTime<Utc>,
}

/// Tipos de eventos de autenticação
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuthEventType {
    LoginAttempt,
    LoginSuccess,
    LoginFailure,
    PasswordChanged,
    PasswordResetRequested,
    PasswordResetCompleted,
    AccountLocked,
    AccountUnlocked,
    SessionExpired,
    ForcedLogout,
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO
// ════════════════════════════════════════════════════════════════════════════

impl LoginCredentials {
    /// Valida se as credenciais têm dados suficientes
    pub fn validate(&self) -> Result<(), String> {
        // Deve ter PIN OU (username + password) OU (cpf + password)
        let has_pin = self.pin.as_ref().map(|p| !p.is_empty()).unwrap_or(false);
        let has_username = self
            .username
            .as_ref()
            .map(|u| !u.is_empty())
            .unwrap_or(false);
        let has_cpf = self.cpf.as_ref().map(|c| !c.is_empty()).unwrap_or(false);
        let has_password = self
            .password
            .as_ref()
            .map(|p| !p.is_empty())
            .unwrap_or(false);

        if has_pin {
            // Login por PIN
            if self.pin.as_ref().unwrap().len() < 4 {
                return Err("PIN deve ter pelo menos 4 dígitos".to_string());
            }
            Ok(())
        } else if (has_username || has_cpf) && has_password {
            // Login por senha
            Ok(())
        } else {
            Err("Credenciais incompletas. Forneça PIN ou (username/cpf + senha)".to_string())
        }
    }

    /// Retorna o método de autenticação que será usado
    pub fn auth_method(&self) -> AuthMethod {
        if self.pin.as_ref().map(|p| !p.is_empty()).unwrap_or(false) {
            AuthMethod::Pin
        } else {
            AuthMethod::Password
        }
    }
}

impl PasswordPolicy {
    /// Valida se uma senha atende à política
    pub fn validate(&self, password: &str) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if password.len() < self.min_length {
            errors.push(format!(
                "Senha deve ter pelo menos {} caracteres",
                self.min_length
            ));
        }

        if self.require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            errors.push("Senha deve conter pelo menos uma letra maiúscula".to_string());
        }

        if self.require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
            errors.push("Senha deve conter pelo menos uma letra minúscula".to_string());
        }

        if self.require_numbers && !password.chars().any(|c| c.is_numeric()) {
            errors.push("Senha deve conter pelo menos um número".to_string());
        }

        if self.require_special {
            let has_special = password
                .chars()
                .any(|c| !c.is_alphanumeric() && !c.is_whitespace());
            if !has_special {
                errors.push(
                    "Senha deve conter pelo menos um caractere especial (!@#$%^&*)".to_string(),
                );
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_login_credentials_validation() {
        // PIN válido
        let creds = LoginCredentials {
            pin: Some("1234".to_string()),
            username: None,
            password: None,
            cpf: None,
        };
        assert!(creds.validate().is_ok());

        // Username + senha
        let creds = LoginCredentials {
            pin: None,
            username: Some("admin".to_string()),
            password: Some("senha123".to_string()),
            cpf: None,
        };
        assert!(creds.validate().is_ok());

        // Inválido - sem credenciais
        let creds = LoginCredentials {
            pin: None,
            username: None,
            password: None,
            cpf: None,
        };
        assert!(creds.validate().is_err());
    }

    #[test]
    fn test_password_policy_validation() {
        let policy = PasswordPolicy::default();

        // Senha forte
        assert!(policy.validate("Senha123").is_ok());

        // Senha fraca - sem maiúscula
        assert!(policy.validate("senha123").is_err());

        // Senha fraca - curta
        assert!(policy.validate("Sen1").is_err());
    }
}
