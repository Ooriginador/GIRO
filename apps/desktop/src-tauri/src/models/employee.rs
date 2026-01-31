//! Modelos de Funcionário

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

/// Papel do funcionário
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EmployeeRole {
    Admin,
    Manager,
    #[default]
    Cashier,
    Attendant, // Atendente/Balconista - motopeças (não finaliza pagamento)
    Stocker,   // Estoquista - novo role para mobile
    Viewer,
    // Enterprise roles
    ContractManager, // Gestor de Contratos
    Supervisor,      // Supervisor de Frente
    Warehouse,       // Almoxarife
    Requester,       // Solicitante
}

impl std::fmt::Display for EmployeeRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Admin => write!(f, "Administrador"),
            Self::Manager => write!(f, "Gerente"),
            Self::Cashier => write!(f, "Operador"),
            Self::Attendant => write!(f, "Atendente"),
            Self::Stocker => write!(f, "Estoquista"),
            Self::Viewer => write!(f, "Visualizador"),
            // Enterprise roles
            Self::ContractManager => write!(f, "Gestor de Contratos"),
            Self::Supervisor => write!(f, "Supervisor de Frente"),
            Self::Warehouse => write!(f, "Almoxarife"),
            Self::Requester => write!(f, "Solicitante"),
        }
    }
}

/// Funcionário completo (interno, com hash da senha)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Employee {
    pub id: String,
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub pin: String,              // Hash do PIN (HMAC-SHA256)
    pub password: Option<String>, // Hash da senha (Argon2id)
    
    // Campos de autenticação por senha
    pub username: Option<String>,
    pub password_changed_at: Option<String>,
    pub password_reset_token: Option<String>,
    pub password_reset_expires_at: Option<String>,
    
    // Segurança e lockout
    pub failed_login_attempts: i64,
    pub locked_until: Option<String>,
    pub last_login_at: Option<String>,
    pub last_login_ip: Option<String>,
    
    pub role: String, // Armazenado como String
    pub commission_rate: Option<f64>, // Taxa de comissão (0.0 a 1.0 ou percentual)
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Funcionário seguro (para retorno ao frontend, sem senhas)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SafeEmployee {
    pub id: String,
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub role: String,
    pub commission_rate: Option<f64>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Employee> for SafeEmployee {
    fn from(e: Employee) -> Self {
        Self {
            id: e.id,
            name: e.name,
            cpf: e.cpf,
            phone: e.phone,
            email: e.email,
            role: e.role,
            commission_rate: e.commission_rate,
            is_active: e.is_active,
            created_at: e.created_at,
            updated_at: e.updated_at,
        }
    }
}

/// Para criar funcionário
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateEmployee {
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub pin: String,              // PIN em texto plano, será hasheado
    pub password: Option<String>, // Senha em texto plano
    pub role: Option<EmployeeRole>,
    pub commission_rate: Option<f64>,
}

/// Para atualizar funcionário
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmployee {
    pub name: Option<String>,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub pin: Option<String>,
    pub password: Option<String>,
    pub role: Option<EmployeeRole>,
    pub commission_rate: Option<f64>,
    pub is_active: Option<bool>,
}

/// Resultado de autenticação
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthResult {
    pub employee: SafeEmployee,
    pub token: Option<String>, // JWT ou session token (futuro)
    pub expires_at: Option<DateTime<Utc>>,
}

/// Credenciais de login
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LoginCredentials {
    pub pin: Option<String>,
    pub password: Option<String>,
    pub cpf: Option<String>,
}
