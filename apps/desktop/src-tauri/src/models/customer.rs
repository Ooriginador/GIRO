//! Modelos de Cliente - Motopeças
//!
//! Structs para clientes e seus veículos

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

/// Cliente do estabelecimento
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub phone2: Option<String>,
    pub email: Option<String>,
    pub zip_code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub complement: Option<String>,
    pub neighborhood: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Cliente com estatísticas
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CustomerWithStats {
    #[serde(flatten)]
    pub customer: Customer,
    #[specta(type = i32)]
    pub vehicle_count: i64,
    #[specta(type = i32)]
    pub order_count: i64,
    pub total_spent: f64,
    pub last_visit: Option<String>,
}

/// Para criar cliente
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomer {
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub phone2: Option<String>,
    pub email: Option<String>,
    pub zip_code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub complement: Option<String>,
    pub neighborhood: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
}

/// Para atualizar cliente
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCustomer {
    pub name: Option<String>,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub phone2: Option<String>,
    pub email: Option<String>,
    pub zip_code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub complement: Option<String>,
    pub neighborhood: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════
// VEÍCULO DO CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

/// Veículo cadastrado para um cliente
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct CustomerVehicle {
    pub id: String,
    pub customer_id: String,
    pub vehicle_year_id: String,
    pub plate: Option<String>,
    pub chassis: Option<String>,
    pub renavam: Option<String>,
    pub color: Option<String>,
    pub current_km: Option<i32>,
    pub nickname: Option<String>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Veículo do cliente com informações completas do veículo
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CustomerVehicleWithDetails {
    pub id: String,
    pub customer_id: String,
    pub vehicle_year_id: String,
    pub plate: Option<String>,
    pub chassis: Option<String>,
    pub renavam: Option<String>,
    pub color: Option<String>,
    pub current_km: Option<i32>,
    pub nickname: Option<String>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    // Dados do veículo
    pub brand_name: String,
    pub model_name: String,
    pub year: i32,
    pub year_label: String,
    pub category: Option<String>,
    pub engine_size: Option<i32>,
    pub display_name: String,
}

/// Para criar veículo do cliente
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomerVehicle {
    pub customer_id: String,
    pub vehicle_year_id: String,
    pub plate: Option<String>,
    pub chassis: Option<String>,
    pub renavam: Option<String>,
    pub color: Option<String>,
    pub current_km: Option<i32>,
    pub nickname: Option<String>,
    pub notes: Option<String>,
}

/// Para atualizar veículo do cliente
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCustomerVehicle {
    pub vehicle_year_id: Option<String>,
    pub plate: Option<String>,
    pub chassis: Option<String>,
    pub renavam: Option<String>,
    pub color: Option<String>,
    pub current_km: Option<i32>,
    pub nickname: Option<String>,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════════════════

/// Filtros para busca de clientes
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CustomerFilters {
    pub search: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub is_active: Option<bool>,
    pub has_vehicles: Option<bool>,
}
