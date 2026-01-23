//! Modelos de Histórico de Preços

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Histórico de alteração de preço
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PriceHistory {
    pub id: String,
    pub product_id: String,
    pub old_price: f64,
    pub new_price: f64,
    pub reason: Option<String>,
    pub employee_id: Option<String>,
    pub created_at: String,
}

/// Para criar registro de histórico de preço
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreatePriceHistory {
    pub product_id: String,
    pub old_price: f64,
    pub new_price: f64,
    pub reason: Option<String>,
    pub employee_id: Option<String>,
}

/// Histórico de preço com nome do produto (para listagens)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PriceHistoryWithProduct {
    pub id: String,
    pub product_id: String,
    pub old_price: f64,
    pub new_price: f64,
    pub reason: Option<String>,
    pub employee_id: Option<String>,
    pub created_at: String,
    pub product_name: Option<String>,
    pub employee_name: Option<String>,
}
