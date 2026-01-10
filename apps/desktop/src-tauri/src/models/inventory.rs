//! Modelo de Inventário

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Status do inventário
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InventoryStatus {
    InProgress,
    Finished,
    Cancelled,
}

impl Default for InventoryStatus {
    fn default() -> Self {
        Self::InProgress
    }
}

impl std::fmt::Display for InventoryStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InProgress => write!(f, "in_progress"),
            Self::Finished => write!(f, "finished"),
            Self::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Inventário
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Inventory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: InventoryStatus,
    pub category_filter: Option<String>,
    pub section_filter: Option<String>,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub started_by: String,
    pub finished_by: Option<String>,
    pub total_products: i32,
    pub counted_products: i32,
    pub divergent_products: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Inventário do banco (formato SQLite)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct InventoryRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub category_filter: Option<String>,
    pub section_filter: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub started_by: String,
    pub finished_by: Option<String>,
    pub total_products: i32,
    pub counted_products: i32,
    pub divergent_products: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Item de contagem do inventário
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub id: String,
    pub inventory_id: String,
    pub product_id: String,
    pub lot_id: Option<String>,
    pub expected_quantity: f64,
    pub counted_quantity: f64,
    pub divergence: f64,
    pub notes: Option<String>,
    pub counted_by: String,
    pub counted_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Item de contagem do banco
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItemRow {
    pub id: String,
    pub inventory_id: String,
    pub product_id: String,
    pub lot_id: Option<String>,
    pub expected_quantity: f64,
    pub counted_quantity: f64,
    pub divergence: f64,
    pub notes: Option<String>,
    pub counted_by: String,
    pub counted_at: String,
    pub created_at: String,
}

/// Resumo do inventário
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InventorySummary {
    pub total_products: i32,
    pub counted_products: i32,
    pub divergent_count: i32,
    pub total_divergence_value: f64,
    pub positive_divergence: f64,
    pub negative_divergence: f64,
}

/// Progresso do inventário
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InventoryProgress {
    pub total: i32,
    pub counted: i32,
    pub divergent: i32,
    pub percent: f64,
}

/// Para criar inventário
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInventory {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category_filter: Option<String>,
    pub section_filter: Option<String>,
}

/// Para registrar contagem
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInventoryCount {
    pub inventory_id: String,
    pub product_id: String,
    pub lot_id: Option<String>,
    pub counted_quantity: f64,
    pub notes: Option<String>,
}
