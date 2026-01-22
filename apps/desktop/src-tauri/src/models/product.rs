//! Modelos de Produto

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Unidade de medida do produto
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProductUnit {
    #[default]
    Unit,
    Kilogram,
    Gram,
    Liter,
    Milliliter,
    Meter,
    Centimeter, // Novo - compatibilidade com Mobile
    Box,
    Pack,
    Dozen,
}

impl std::fmt::Display for ProductUnit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unit => write!(f, "un"),
            Self::Kilogram => write!(f, "kg"),
            Self::Gram => write!(f, "g"),
            Self::Liter => write!(f, "L"),
            Self::Milliliter => write!(f, "ml"),
            Self::Meter => write!(f, "m"),
            Self::Centimeter => write!(f, "cm"),
            Self::Box => write!(f, "cx"),
            Self::Pack => write!(f, "pct"),
            Self::Dozen => write!(f, "dz"),
        }
    }
}

impl ProductUnit {
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Unit => "UNIT",
            Self::Kilogram => "KILOGRAM",
            Self::Gram => "GRAM",
            Self::Liter => "LITER",
            Self::Milliliter => "MILLILITER",
            Self::Meter => "METER",
            Self::Centimeter => "CENTIMETER",
            Self::Box => "BOX",
            Self::Pack => "PACK",
            Self::Dozen => "DOZEN",
        }
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s {
            "UNIT" => Some(Self::Unit),
            "KILOGRAM" => Some(Self::Kilogram),
            "GRAM" => Some(Self::Gram),
            "LITER" => Some(Self::Liter),
            "MILLILITER" => Some(Self::Milliliter),
            "METER" => Some(Self::Meter),
            "CENTIMETER" => Some(Self::Centimeter),
            "BOX" => Some(Self::Box),
            "PACK" => Some(Self::Pack),
            "DOZEN" => Some(Self::Dozen),
            _ => None,
        }
    }
}

/// Produto do catálogo
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: String,
    pub barcode: Option<String>,
    pub internal_code: String,
    pub name: String,
    pub description: Option<String>,
    pub unit: String, // Armazenado como String no SQLite
    pub is_weighted: bool,
    pub sale_price: f64,
    pub cost_price: f64,
    pub current_stock: f64,
    pub min_stock: f64,
    pub max_stock: Option<f64>, // Added for schema sync
    pub is_active: bool,
    pub category_id: String,
    pub created_at: String, // SQLite armazena como TEXT
    pub updated_at: String,
}

/// Produto com informações da categoria
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductWithCategory {
    #[serde(flatten)]
    pub product: Product,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
}

/// Para criar produto
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProduct {
    pub barcode: Option<String>,
    pub internal_code: Option<String>, // Será gerado se não fornecido
    pub name: String,
    pub description: Option<String>,
    pub unit: Option<ProductUnit>,
    pub is_weighted: Option<bool>,
    pub sale_price: f64,
    pub cost_price: Option<f64>,
    pub current_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub category_id: String,
}

/// Para atualizar produto
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProduct {
    pub barcode: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub unit: Option<ProductUnit>,
    pub is_weighted: Option<bool>,
    pub sale_price: Option<f64>,
    pub cost_price: Option<f64>,
    pub current_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub is_active: Option<bool>,
    pub category_id: Option<String>,
    pub reason: Option<String>,
    /// ID do funcionário que está fazendo a alteração (para auditoria)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub employee_id: Option<String>,
}

/// Filtros de busca de produtos
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProductFilters {
    pub search: Option<String>, // Busca por nome, código ou barcode
    pub category_id: Option<String>,
    pub is_active: Option<bool>,
    pub is_weighted: Option<bool>,
    pub low_stock: Option<bool>,    // Estoque abaixo do mínimo
    pub out_of_stock: Option<bool>, // Estoque zerado
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// Resumo de estoque
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockSummary {
    pub product_id: String,
    pub product_name: String,
    pub current_stock: f64,
    pub min_stock: f64,
    pub unit: String,
    pub is_low: bool,
    pub is_out: bool,
}
