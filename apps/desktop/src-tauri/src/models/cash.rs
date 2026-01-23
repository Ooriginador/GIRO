//! Modelos de Caixa (Sessão e Movimentações)

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

/// Sessão de caixa
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct CashSession {
    pub id: String,
    pub employee_id: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub opening_balance: f64,
    pub expected_balance: Option<f64>,
    pub actual_balance: Option<f64>,
    pub difference: Option<f64>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Movimentação de caixa
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
#[sqlx(rename_all = "snake_case")]
pub struct CashMovement {
    pub id: String,
    pub session_id: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub movement_type: String,
    pub amount: f64,
    pub description: Option<String>,
    pub created_at: String,
}

/// Para abrir sessão de caixa
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateCashSession {
    pub employee_id: String,
    pub opening_balance: f64,
    pub notes: Option<String>,
}

/// Para criar movimentação
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateCashMovement {
    pub session_id: String,
    pub employee_id: String,
    pub movement_type: String,
    pub amount: f64,
    pub description: Option<String>,
}

/// Resumo da sessão
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CashSessionSummary {
    pub session: CashSession,
    pub total_sales: f64,
    pub total_canceled: f64,
    pub total_withdrawals: f64,
    pub total_supplies: f64,
    #[specta(type = i32)]
    pub movement_count: i64,
    pub sales_by_method: Vec<crate::models::PaymentMethodSummary>,
    pub cash_in_drawer: f64, // Opening + Supply - Bleed + Cash Sales
}
