//! Gerenciador de Sessões Mobile
//!
//! Gerencia autenticação JWT para dispositivos mobile conectados.

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Duração padrão do token em horas
const TOKEN_EXPIRY_HOURS: i64 = 8;

/// Máximo de sessões por operador
const MAX_SESSIONS_PER_OPERATOR: usize = 2;

/// Claims do JWT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileClaims {
    /// ID do funcionário
    pub sub: String,
    /// Nome do funcionário
    pub name: String,
    /// Role do funcionário
    pub role: String,
    /// ID do dispositivo
    pub device_id: String,
    /// Nome do dispositivo
    pub device_name: String,
    /// Timestamp de expiração (Unix timestamp)
    pub exp: i64,
    /// Timestamp de emissão
    pub iat: i64,
}

/// Sessão ativa
#[derive(Debug, Clone)]
pub struct MobileSession {
    pub employee_id: String,
    pub employee_name: String,
    pub employee_role: String,
    pub device_id: String,
    pub device_name: String,
    pub token: String,
    pub created_at: i64,
    pub expires_at: i64,
    pub last_activity: i64,
}

/// Gerenciador de sessões
pub struct SessionManager {
    /// Chave secreta para JWT
    secret: String,
    /// Sessões ativas por token
    sessions: RwLock<HashMap<String, MobileSession>>,
    /// Tokens por employee_id (para limitar sessões)
    employee_tokens: RwLock<HashMap<String, Vec<String>>>,
}

impl SessionManager {
    /// Cria novo gerenciador com chave secreta
    pub fn new(secret: impl Into<String>) -> Arc<Self> {
        Arc::new(Self {
            secret: secret.into(),
            sessions: RwLock::new(HashMap::new()),
            employee_tokens: RwLock::new(HashMap::new()),
        })
    }

    /// Cria novo gerenciador com chave aleatória
    pub fn with_random_secret() -> Arc<Self> {
        let secret: String = (0..32).map(|_| rand::random::<char>()).collect();
        Self::new(secret)
    }

    /// Cria uma nova sessão para o funcionário
    pub async fn create_session(
        &self,
        employee_id: String,
        employee_name: String,
        employee_role: String,
        device_id: String,
        device_name: String,
    ) -> Result<(String, String), SessionError> {
        // Verificar limite de sessões
        {
            let employee_tokens = self.employee_tokens.read().await;
            if let Some(tokens) = employee_tokens.get(&employee_id) {
                if tokens.len() >= MAX_SESSIONS_PER_OPERATOR {
                    // Remover sessão mais antiga
                    let oldest_token = tokens.first().cloned();
                    drop(employee_tokens);
                    if let Some(token) = oldest_token {
                        self.invalidate_session(&token).await;
                    }
                }
            }
        }

        let now = chrono::Utc::now().timestamp();
        let exp = now + (TOKEN_EXPIRY_HOURS * 3600);

        let claims = MobileClaims {
            sub: employee_id.clone(),
            name: employee_name.clone(),
            role: employee_role.clone(),
            device_id: device_id.clone(),
            device_name: device_name.clone(),
            exp,
            iat: now,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|e| SessionError::TokenCreation(e.to_string()))?;

        let expires_at_str = chrono::DateTime::from_timestamp(exp, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

        let session = MobileSession {
            employee_id: employee_id.clone(),
            employee_name,
            employee_role,
            device_id,
            device_name,
            token: token.clone(),
            created_at: now,
            expires_at: exp,
            last_activity: now,
        };

        // Salvar sessão
        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(token.clone(), session);
        }

        // Rastrear por employee
        {
            let mut employee_tokens = self.employee_tokens.write().await;
            employee_tokens
                .entry(employee_id)
                .or_insert_with(Vec::new)
                .push(token.clone());
        }

        Ok((token, expires_at_str))
    }

    /// Valida token e retorna sessão
    pub async fn validate_token(&self, token: &str) -> Result<MobileSession, SessionError> {
        // Verificar se sessão existe
        let session = {
            let sessions = self.sessions.read().await;
            sessions.get(token).cloned()
        };

        let session = session.ok_or(SessionError::NotFound)?;

        // Verificar expiração
        let now = chrono::Utc::now().timestamp();
        if session.expires_at < now {
            self.invalidate_session(token).await;
            return Err(SessionError::Expired);
        }

        // Validar JWT
        let _claims = decode::<MobileClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| SessionError::InvalidToken(e.to_string()))?;

        // Atualizar última atividade
        {
            let mut sessions = self.sessions.write().await;
            if let Some(s) = sessions.get_mut(token) {
                s.last_activity = now;
            }
        }

        Ok(session)
    }

    /// Invalida uma sessão
    pub async fn invalidate_session(&self, token: &str) {
        let session = {
            let mut sessions = self.sessions.write().await;
            sessions.remove(token)
        };

        if let Some(session) = session {
            let mut employee_tokens = self.employee_tokens.write().await;
            if let Some(tokens) = employee_tokens.get_mut(&session.employee_id) {
                tokens.retain(|t| t != token);
                if tokens.is_empty() {
                    employee_tokens.remove(&session.employee_id);
                }
            }
        }
    }

    /// Invalida todas as sessões de um funcionário
    pub async fn invalidate_employee_sessions(&self, employee_id: &str) {
        let tokens = {
            let employee_tokens = self.employee_tokens.read().await;
            employee_tokens
                .get(employee_id)
                .cloned()
                .unwrap_or_default()
        };

        for token in tokens {
            self.invalidate_session(&token).await;
        }
    }

    /// Lista sessões ativas
    pub async fn list_sessions(&self) -> Vec<MobileSession> {
        let sessions = self.sessions.read().await;
        sessions.values().cloned().collect()
    }

    /// Limpa sessões expiradas
    pub async fn cleanup_expired(&self) {
        let now = chrono::Utc::now().timestamp();
        let expired_tokens: Vec<String> = {
            let sessions = self.sessions.read().await;
            sessions
                .iter()
                .filter(|(_, s)| s.expires_at < now)
                .map(|(t, _)| t.clone())
                .collect()
        };

        for token in expired_tokens {
            self.invalidate_session(&token).await;
        }
    }

    /// Renova token (estende expiração)
    pub async fn renew_token(&self, token: &str) -> Result<(String, String), SessionError> {
        let session = self.validate_token(token).await?;

        // Invalidar token antigo
        self.invalidate_session(token).await;

        // Criar novo token
        self.create_session(
            session.employee_id,
            session.employee_name,
            session.employee_role,
            session.device_id,
            session.device_name,
        )
        .await
    }
}

/// Erros de sessão
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error("Token creation failed: {0}")]
    TokenCreation(String),

    #[error("Session not found")]
    NotFound,

    #[error("Session expired")]
    Expired,

    #[error("Invalid token: {0}")]
    InvalidToken(String),
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret";

    #[tokio::test]
    async fn test_create_session() {
        let manager = SessionManager::new(TEST_SECRET);

        let result = manager
            .create_session(
                "emp_1".into(),
                "João".into(),
                "CASHIER".into(),
                "device_1".into(),
                "iPhone de João".into(),
            )
            .await;

        assert!(result.is_ok());
        let (token, expires_at) = result.unwrap();
        assert!(!token.is_empty());
        assert!(!expires_at.is_empty());
    }

    #[tokio::test]
    async fn test_validate_token() {
        let manager = SessionManager::new(TEST_SECRET);

        let (token, _) = manager
            .create_session(
                "emp_1".into(),
                "João".into(),
                "CASHIER".into(),
                "device_1".into(),
                "iPhone".into(),
            )
            .await
            .unwrap();

        let session = manager.validate_token(&token).await;
        assert!(session.is_ok());

        let session = session.unwrap();
        assert_eq!(session.employee_id, "emp_1");
        assert_eq!(session.employee_name, "João");
    }

    #[tokio::test]
    async fn test_invalidate_session() {
        let manager = SessionManager::new(TEST_SECRET);

        let (token, _) = manager
            .create_session(
                "emp_1".into(),
                "João".into(),
                "CASHIER".into(),
                "device_1".into(),
                "iPhone".into(),
            )
            .await
            .unwrap();

        manager.invalidate_session(&token).await;

        let result = manager.validate_token(&token).await;
        assert!(matches!(result, Err(SessionError::NotFound)));
    }

    #[tokio::test]
    async fn test_max_sessions_per_operator() {
        let manager = SessionManager::new(TEST_SECRET);

        // Criar 3 sessões para mesmo operador
        let (token1, _) = manager
            .create_session(
                "emp_1".into(),
                "João".into(),
                "CASHIER".into(),
                "device_1".into(),
                "iPhone".into(),
            )
            .await
            .unwrap();

        let (_token2, _) = manager
            .create_session(
                "emp_1".into(),
                "João".into(),
                "CASHIER".into(),
                "device_2".into(),
                "Android".into(),
            )
            .await
            .unwrap();

        let (_token3, _) = manager
            .create_session(
                "emp_1".into(),
                "João".into(),
                "CASHIER".into(),
                "device_3".into(),
                "Tablet".into(),
            )
            .await
            .unwrap();

        // Primeira sessão deve ter sido removida
        let result = manager.validate_token(&token1).await;
        assert!(matches!(result, Err(SessionError::NotFound)));
    }
}
