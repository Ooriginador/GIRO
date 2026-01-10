//! Modelos de Veículos - Motopeças
//!
//! Structs para marcas, modelos e anos de veículos (integração FIPE)

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

/// Categoria do veículo
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "TEXT")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VehicleCategory {
    Street,
    Sport,
    Trail,
    Scooter,
    Custom,
    Touring,
    OffRoad,
    Naked,
    Adventure,
    Classic,
    Electric,
    Other,
}

impl Default for VehicleCategory {
    fn default() -> Self {
        Self::Street
    }
}

impl std::fmt::Display for VehicleCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Street => write!(f, "RUA"),
            Self::Sport => write!(f, "ESPORTIVA"),
            Self::Trail => write!(f, "TRAIL"),
            Self::Scooter => write!(f, "SCOOTER"),
            Self::Custom => write!(f, "CUSTOM"),
            Self::Touring => write!(f, "TOURING"),
            Self::OffRoad => write!(f, "OFF-ROAD"),
            Self::Naked => write!(f, "NAKED"),
            Self::Adventure => write!(f, "ADVENTURE"),
            Self::Classic => write!(f, "CLÁSSICA"),
            Self::Electric => write!(f, "ELÉTRICA"),
            Self::Other => write!(f, "OUTRA"),
        }
    }
}

/// Tipo de combustível
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "TEXT")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FuelType {
    Gasoline,
    Flex,
    Electric,
    Diesel,
}

impl Default for FuelType {
    fn default() -> Self {
        Self::Gasoline
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS BASE
// ═══════════════════════════════════════════════════════════════════════════

/// Marca de veículo
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VehicleBrand {
    pub id: String,
    pub name: String,
    pub logo_url: Option<String>,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Modelo de veículo
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VehicleModel {
    pub id: String,
    pub brand_id: String,
    pub name: String,
    pub category: Option<String>, // VehicleCategory como string
    pub engine_size: Option<String>,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Ano de veículo
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VehicleYear {
    pub id: String,
    pub model_id: String,
    pub year: i32,
    pub year_label: String,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS COMPOSTOS
// ═══════════════════════════════════════════════════════════════════════════

/// Veículo completo (marca + modelo + ano)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleComplete {
    pub brand_id: String,
    pub brand_name: String,
    pub model_id: String,
    pub model_name: String,
    pub year_id: String,
    pub year: i32,
    pub year_label: String,
    pub category: Option<String>,
    pub engine_size: Option<String>,
    pub fuel_type: Option<String>,
    pub display_name: String,
}

impl VehicleComplete {
    /// Cria o display name formatado
    pub fn build_display_name(brand: &str, model: &str, year_label: &str) -> String {
        format!("{} {} {}", brand, model, year_label)
    }
}

/// Resultado de busca de veículos
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VehicleSearchResult {
    pub year_id: String,
    pub brand_name: String,
    pub model_name: String,
    pub year: i32,
    pub year_label: String,
    pub category: Option<String>,
    pub engine_size: Option<String>,
}

impl From<VehicleSearchResult> for VehicleComplete {
    fn from(r: VehicleSearchResult) -> Self {
        let display_name =
            VehicleComplete::build_display_name(&r.brand_name, &r.model_name, &r.year_label);

        let engine_size = r.engine_size.as_deref().and_then(|s| s.parse().ok());

        Self {
            brand_id: String::new(), // Preenchido pela query se necessário
            brand_name: r.brand_name,
            model_id: String::new(),
            model_name: r.model_name,
            year_id: r.year_id,
            year: r.year,
            year_label: r.year_label,
            category: r.category,
            engine_size,
            fuel_type: None,
            display_name,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPATIBILIDADE DE PEÇAS
// ═══════════════════════════════════════════════════════════════════════════

/// Compatibilidade entre produto e veículo
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProductCompatibility {
    pub id: String,
    pub product_id: String,
    pub vehicle_year_id: String,
    pub is_verified: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Compatibilidade com dados do veículo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductCompatibilityWithVehicle {
    pub id: String,
    pub product_id: String,
    pub vehicle_year_id: String,
    pub is_verified: i32,
    pub created_at: String,
    pub updated_at: String,
    pub vehicle: VehicleComplete,
}

// ═══════════════════════════════════════════════════════════════════════════
// DTOs DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════

/// Para criar marca de veículo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVehicleBrand {
    pub name: String,
    pub logo_url: Option<String>,
}

/// Para criar modelo de veículo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVehicleModel {
    pub brand_id: String,
    pub name: String,
    pub category: Option<String>,
    pub engine_size: Option<String>,
}

/// Para criar ano de veículo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVehicleYear {
    pub model_id: String,
    pub year: i32,
    pub year_label: String,
}

/// Para salvar compatibilidades de um produto
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProductCompatibilities {
    pub product_id: String,
    pub vehicle_year_ids: Vec<String>,
}

/// Para adicionar/remover compatibilidade individual
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProductCompatibility {
    pub product_id: String,
    pub vehicle_year_id: String,
    pub is_verified: Option<i32>,
}
