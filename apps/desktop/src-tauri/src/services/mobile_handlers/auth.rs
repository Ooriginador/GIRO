//! Handler de autenticação
//!
//! Processa ações: auth.login, auth.logout, auth.validate

use crate::repositories::EmployeeRepository;
use crate::services::mobile_protocol::{
    AuthLoginPayload, AuthLoginResponse, EmployeeInfo, MobileErrorCode, MobileResponse,
};
use crate::services::mobile_session::SessionManager;
use sqlx::SqlitePool;
use std::sync::Arc;

/// Handler de autenticação
pub struct AuthHandler {
    pool: SqlitePool,
    session_manager: Arc<SessionManager>,
}

impl AuthHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool, session_manager: Arc<SessionManager>) -> Self {
        Self {
            pool,
            session_manager,
        }
    }

    /// Processa login por PIN
    pub async fn login(&self, id: u64, payload: AuthLoginPayload) -> MobileResponse {
        // Validar PIN
        if payload.pin.len() < 4 || payload.pin.len() > 6 {
            return MobileResponse::error(
                id,
                MobileErrorCode::ValidationError,
                "PIN deve ter entre 4 e 6 dígitos",
            );
        }

        // Buscar funcionário pelo PIN
        let repo = EmployeeRepository::new(&self.pool);

        let employee = match repo.authenticate_pin(&payload.pin).await {
            Ok(Some(emp)) => emp,
            Ok(None) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::AuthInvalid,
                    "PIN inválido ou usuário não encontrado",
                );
            }
            Err(e) => {
                tracing::error!("Erro ao autenticar: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao verificar credenciais",
                );
            }
        };

        // Verificar se funcionário está ativo
        if !employee.is_active {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Funcionário desativado",
            );
        }

        // Criar sessão
        let (token, expires_at) = match self
            .session_manager
            .create_session(
                employee.id.clone(),
                employee.name.clone(),
                employee.role.clone(),
                payload.device_id,
                payload.device_name,
            )
            .await
        {
            Ok((token, expires)) => (token, expires),
            Err(e) => {
                tracing::error!("Erro ao criar sessão: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao criar sessão",
                );
            }
        };

        // Mapear role para formato do mobile
        let role_mapped = map_role_to_mobile(&employee.role);

        let response = AuthLoginResponse {
            token,
            expires_at,
            employee: EmployeeInfo {
                id: employee.id,
                name: employee.name,
                role: role_mapped,
            },
        };

        tracing::info!(
            "Login mobile: {} ({})",
            response.employee.name,
            response.employee.role
        );

        MobileResponse::success(id, response)
    }

    /// Processa logout
    pub async fn logout(&self, id: u64, token: &str) -> MobileResponse {
        self.session_manager.invalidate_session(token).await;

        tracing::info!("Logout mobile");

        MobileResponse::success(
            id,
            serde_json::json!({
                "message": "Logout realizado com sucesso"
            }),
        )
    }

    /// Valida token
    pub async fn validate(&self, id: u64, token: &str) -> MobileResponse {
        match self.session_manager.validate_token(token).await {
            Ok(session) => {
                let role_mapped = map_role_to_mobile(&session.employee_role);

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "valid": true,
                        "employee": {
                            "id": session.employee_id,
                            "name": session.employee_name,
                            "role": role_mapped
                        }
                    }),
                )
            }
            Err(_) => MobileResponse::error(
                id,
                MobileErrorCode::AuthExpired,
                "Token inválido ou expirado",
            ),
        }
    }
}

/// Mapeia role do Desktop para Mobile
fn map_role_to_mobile(desktop_role: &str) -> String {
    match desktop_role.to_uppercase().as_str() {
        "ADMIN" => "admin".into(),
        "MANAGER" => "gerente".into(),
        "CASHIER" => "caixa".into(),
        "STOCKER" => "repositor".into(),
        "VIEWER" => "visualizador".into(),
        _ => "caixa".into(), // default
    }
}

/// Mapeia role do Mobile para Desktop
#[allow(dead_code)]
fn map_role_to_desktop(mobile_role: &str) -> String {
    match mobile_role.to_lowercase().as_str() {
        "admin" => "ADMIN".into(),
        "gerente" => "MANAGER".into(),
        "caixa" => "CASHIER".into(),
        "repositor" => "STOCKER".into(),
        "visualizador" => "VIEWER".into(),
        _ => "CASHIER".into(), // default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_mapping() {
        assert_eq!(map_role_to_mobile("ADMIN"), "admin");
        assert_eq!(map_role_to_mobile("MANAGER"), "gerente");
        assert_eq!(map_role_to_mobile("CASHIER"), "caixa");
        assert_eq!(map_role_to_mobile("STOCKER"), "repositor");
        assert_eq!(map_role_to_mobile("VIEWER"), "visualizador");
        assert_eq!(map_role_to_mobile("unknown"), "caixa");
    }
}
