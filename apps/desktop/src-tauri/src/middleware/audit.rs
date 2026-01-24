//! Sistema de Auditoria - Logging de Ações Sensíveis
//!
//! Registra todas as ações importantes para compliance e segurança.

use crate::repositories::new_id;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Pool, Sqlite};

/// Tipos de ações auditáveis
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuditAction {
    // Autenticação
    Login,
    Logout,
    LoginFailed,
    PasswordChanged,

    // Vendas
    SaleCreated,
    SaleCanceled,
    DiscountApplied,

    // Caixa
    CashSessionOpened,
    CashSessionClosed,
    CashWithdrawal,
    CashDeposit,
    CashSupply,
    CashMovement,

    // Produtos
    ProductCreated,
    ProductUpdated,
    ProductDeleted,
    PriceChanged,

    // Estoque
    StockEntry,
    StockAdjustment,
    StockTransfer,

    // Clientes
    CustomerCreated,
    CustomerUpdated,
    CustomerDeleted,

    // Funcionários
    EmployeeCreated,
    EmployeeUpdated,
    EmployeeDeactivated,
    RoleChanged,

    // Sistema
    SettingsChanged,
    BackupCreated,
    DataExported,

    // Ordens de Serviço (Motopeças)
    ServiceOrderCreated,
    ServiceOrderUpdated,
    ServiceOrderCanceled,
    ServiceOrderFinished,

    // Serviços
    ServiceCreated,
    ServiceUpdated,

    // Categorias
    CategoryCreated,
    CategoryUpdated,
    CategoryDeleted,

    // Fornecedores
    SupplierCreated,
    SupplierUpdated,
    SupplierDeleted,
}

impl std::fmt::Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// Registro de auditoria
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: String,
    pub action: String,
    pub employee_id: String,
    pub employee_name: String,
    #[serde(rename = "targetType")]
    pub target_type: Option<String>,
    #[serde(rename = "targetId")]
    pub target_id: Option<String>,
    pub details: Option<String>,
    #[serde(rename = "ipAddress")]
    pub ip_address: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// DTO para criar log de auditoria
#[derive(Debug, Clone)]
pub struct CreateAuditLog {
    pub action: AuditAction,
    pub employee_id: String,
    pub employee_name: String,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub details: Option<String>,
}

/// Serviço de auditoria
pub struct AuditService {
    pool: Pool<Sqlite>,
}

impl AuditService {
    /// Cria nova instância do serviço de auditoria
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    /// Registra uma ação de auditoria
    pub async fn log(&self, entry: CreateAuditLog) -> Result<AuditLog, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;
        self.log_conn(&mut conn, entry).await
    }

    /// Registra uma ação de auditoria dentro de uma transação
    pub async fn log_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        entry: CreateAuditLog,
    ) -> Result<AuditLog, sqlx::Error> {
        self.log_conn(tx, entry).await
    }

    #[allow(clippy::explicit_auto_deref)]
    async fn log_conn(
        &self,
        conn: &mut sqlx::SqliteConnection,
        entry: CreateAuditLog,
    ) -> Result<AuditLog, sqlx::Error> {
        let id = new_id();
        let action_str = entry.action.to_string();
        let created_at = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO audit_logs (id, action, employee_id, employee_name, target_type, target_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(&action_str)
        .bind(&entry.employee_id)
        .bind(&entry.employee_name)
        .bind(&entry.target_type)
        .bind(&entry.target_id)
        .bind(&entry.details)
        .bind(&created_at)
        .execute(&mut *conn)
        .await?;

        Ok(AuditLog {
            id,
            action: action_str,
            employee_id: entry.employee_id,
            employee_name: entry.employee_name,
            target_type: entry.target_type,
            target_id: entry.target_id,
            details: entry.details,
            ip_address: None,
            created_at,
        })
    }

    /// Busca logs de auditoria com filtros
    pub async fn find_logs(
        &self,
        action: Option<AuditAction>,
        employee_id: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLog>, sqlx::Error> {
        let mut query = String::from("SELECT * FROM audit_logs WHERE 1=1");

        if action.is_some() {
            query.push_str(" AND action = ?");
        }
        if employee_id.is_some() {
            query.push_str(" AND employee_id = ?");
        }
        if start_date.is_some() {
            query.push_str(" AND created_at >= ?");
        }
        if end_date.is_some() {
            query.push_str(" AND created_at <= ?");
        }

        query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");

        let mut db_query = sqlx::query_as::<_, AuditLog>(&query);

        if let Some(a) = action {
            db_query = db_query.bind(a.to_string());
        }
        if let Some(eid) = employee_id {
            db_query = db_query.bind(eid);
        }
        if let Some(sd) = start_date {
            db_query = db_query.bind(sd.to_rfc3339());
        }
        if let Some(ed) = end_date {
            db_query = db_query.bind(ed.to_rfc3339());
        }

        db_query = db_query.bind(limit).bind(offset);

        db_query.fetch_all(&self.pool).await
    }

    /// Conta logs por ação (para dashboard)
    pub async fn count_by_action(&self, days: i64) -> Result<Vec<(String, i64)>, sqlx::Error> {
        let since = Utc::now() - chrono::Duration::days(days);

        let rows: Vec<(String, i64)> = sqlx::query_as(
            r#"
            SELECT action, COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= ?
            GROUP BY action
            ORDER BY count DESC
            "#,
        )
        .bind(since.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }
}

/// Macro para facilitar logging de auditoria
#[macro_export]
macro_rules! audit_log {
    ($service:expr, $action:expr, $employee_id:expr, $employee_name:expr) => {
        $service
            .log($crate::middleware::audit::CreateAuditLog {
                action: $action,
                employee_id: $employee_id.to_string(),
                employee_name: $employee_name.to_string(),
                target_type: None,
                target_id: None,
                details: None,
            })
            .await
            .ok()
    };
    ($service:expr, $action:expr, $employee_id:expr, $employee_name:expr, $target_type:expr, $target_id:expr) => {
        $service
            .log($crate::middleware::audit::CreateAuditLog {
                action: $action,
                employee_id: $employee_id.to_string(),
                employee_name: $employee_name.to_string(),
                target_type: Some($target_type.to_string()),
                target_id: Some($target_id.to_string()),
                details: None,
            })
            .await
            .ok()
    };
    ($service:expr, $action:expr, $employee_id:expr, $employee_name:expr, $target_type:expr, $target_id:expr, $details:expr) => {
        $service
            .log($crate::middleware::audit::CreateAuditLog {
                action: $action,
                employee_id: $employee_id.to_string(),
                employee_name: $employee_name.to_string(),
                target_type: Some($target_type.to_string()),
                target_id: Some($target_id.to_string()),
                details: Some($details.to_string()),
            })
            .await
            .ok()
    };
}

/// Macro para facilitar logging de auditoria dentro de uma transação
#[macro_export]
macro_rules! audit_log_tx {
    ($service:expr, $tx:expr, $action:expr, $employee_id:expr, $employee_name:expr) => {
        $service
            .log_tx(
                $tx,
                $crate::middleware::audit::CreateAuditLog {
                    action: $action,
                    employee_id: $employee_id.to_string(),
                    employee_name: $employee_name.to_string(),
                    target_type: None,
                    target_id: None,
                    details: None,
                },
            )
            .await
            .ok()
    };
    ($service:expr, $tx:expr, $action:expr, $employee_id:expr, $employee_name:expr, $target_type:expr, $target_id:expr) => {
        $service
            .log_tx(
                $tx,
                $crate::middleware::audit::CreateAuditLog {
                    action: $action,
                    employee_id: $employee_id.to_string(),
                    employee_name: $employee_name.to_string(),
                    target_type: Some($target_type.to_string()),
                    target_id: Some($target_id.to_string()),
                    details: None,
                },
            )
            .await
            .ok()
    };
    ($service:expr, $tx:expr, $action:expr, $employee_id:expr, $employee_name:expr, $target_type:expr, $target_id:expr, $details:expr) => {
        $service
            .log_tx(
                $tx,
                $crate::middleware::audit::CreateAuditLog {
                    action: $action,
                    employee_id: $employee_id.to_string(),
                    employee_name: $employee_name.to_string(),
                    target_type: Some($target_type.to_string()),
                    target_id: Some($target_id.to_string()),
                    details: Some($details.to_string()),
                },
            )
            .await
            .ok()
    };
}
