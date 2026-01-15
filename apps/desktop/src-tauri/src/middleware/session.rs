//! Gerenciamento de Sessão de Usuário
//!
//! Armazena e valida o usuário atualmente autenticado.

use crate::error::{AppError, AppResult};
use crate::models::Employee;
use std::sync::RwLock;

/// Estado global da sessão de autenticação
pub struct SessionState {
    current_employee: RwLock<Option<SessionInfo>>,
}

/// Informações da sessão atual
#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub employee_id: String,
    pub employee_name: String,
    pub role: String,
    pub logged_in_at: chrono::DateTime<chrono::Utc>,
}

impl SessionState {
    /// Cria novo estado de sessão
    pub fn new() -> Self {
        Self {
            current_employee: RwLock::new(None),
        }
    }

    /// Define o funcionário logado
    pub fn set_employee(&self, employee: &Employee) {
        let info = SessionInfo {
            employee_id: employee.id.clone(),
            employee_name: employee.name.clone(),
            role: employee.role.clone(),
            logged_in_at: chrono::Utc::now(),
        };

        if let Ok(mut guard) = self.current_employee.write() {
            *guard = Some(info);
        }
    }

    /// Obtém o funcionário logado
    pub fn get_employee(&self) -> Option<SessionInfo> {
        self.current_employee.read().ok()?.clone()
    }

    /// Verifica se há alguém logado
    pub fn is_authenticated(&self) -> bool {
        self.current_employee
            .read()
            .ok()
            .map(|g| g.is_some())
            .unwrap_or(false)
    }

    /// Limpa a sessão (logout)
    pub fn clear(&self) {
        if let Ok(mut guard) = self.current_employee.write() {
            *guard = None;
        }
    }

    /// Obtém o ID do funcionário logado ou erro
    pub fn require_authenticated(&self) -> AppResult<SessionInfo> {
        self.get_employee()
            .ok_or_else(|| AppError::Unauthorized("Nenhum usuário autenticado".to_string()))
    }
}

impl Default for SessionState {
    fn default() -> Self {
        Self::new()
    }
}

/// Guard que valida se o usuário está autenticado antes de executar um command
#[macro_export]
macro_rules! require_auth {
    ($session:expr) => {
        $session.require_authenticated()?
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_lifecycle() {
        let state = SessionState::new();

        // Inicialmente não autenticado
        assert!(!state.is_authenticated());
        assert!(state.get_employee().is_none());

        // Após login
        let employee = Employee {
            id: "emp-001".to_string(),
            name: "Admin".to_string(),
            role: "ADMIN".to_string(),
            pin: "8899".to_string(),
            password: None,
            cpf: None,
            phone: None,
            email: None,
            is_active: true,

            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };
        state.set_employee(&employee);

        assert!(state.is_authenticated());
        let info = state.get_employee().unwrap();
        assert_eq!(info.employee_id, "emp-001");
        assert_eq!(info.role, "ADMIN");

        // Após logout
        state.clear();
        assert!(!state.is_authenticated());
    }
}
