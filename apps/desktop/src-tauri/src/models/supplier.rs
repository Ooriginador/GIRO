//! Modelo de Fornecedor

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

/// Fornecedor
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Supplier {
    pub id: String,
    pub name: String,
    pub trade_name: Option<String>,
    pub cnpj: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Para criar fornecedor
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateSupplier {
    pub name: String,
    pub trade_name: Option<String>,
    pub cnpj: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
}

/// Para atualizar fornecedor
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSupplier {
    pub name: Option<String>,
    pub trade_name: Option<String>,
    pub cnpj: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
    pub is_active: Option<bool>,
}
