//! Modelos de Ordem de Serviço - Motopeças
//!
//! Structs para ordens de serviço, itens e serviços pré-cadastrados

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

/// Status da ordem de serviço
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ServiceOrderStatus {
    #[default]
    Open, // Aberta (aguardando)
    InProgress,   // Em andamento
    WaitingParts, // Aguardando peças
    Completed,    // Serviço concluído
    Delivered,    // Entregue ao cliente
    Canceled,     // Cancelada
    Quote,        // Orçamento (não consome estoque)
}

impl std::fmt::Display for ServiceOrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Open => write!(f, "ABERTA"),
            Self::InProgress => write!(f, "EM ANDAMENTO"),
            Self::WaitingParts => write!(f, "AGUARDANDO PEÇAS"),
            Self::Completed => write!(f, "CONCLUÍDA"),
            Self::Delivered => write!(f, "ENTREGUE"),
            Self::Canceled => write!(f, "CANCELADA"),
            Self::Quote => write!(f, "ORÇAMENTO"),
        }
    }
}

impl From<String> for ServiceOrderStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "OPEN" => Self::Open,
            "IN_PROGRESS" => Self::InProgress,
            "WAITING_PARTS" => Self::WaitingParts,
            "COMPLETED" => Self::Completed,
            "DELIVERED" => Self::Delivered,
            "CANCELED" => Self::Canceled,
            "QUOTE" => Self::Quote,
            _ => Self::Open,
        }
    }
}

/// Tipo de item da OS
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ServiceItemType {
    Part, // Peça
    #[default]
    Service, // Serviço/Mão de obra
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDEM DE SERVIÇO
// ═══════════════════════════════════════════════════════════════════════════

/// Ordem de serviço
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrder {
    pub id: String,
    pub order_number: i32,
    pub customer_id: String,
    pub customer_vehicle_id: String,
    pub vehicle_year_id: String,
    pub employee_id: String,
    pub vehicle_km: Option<i32>,
    pub symptoms: Option<String>,
    pub diagnosis: Option<String>,
    pub status: String, // ServiceOrderStatus como string
    pub labor_cost: f64,
    pub parts_cost: f64,
    pub discount: f64,
    pub total: f64,
    pub warranty_days: i32,
    pub warranty_until: Option<String>,
    pub scheduled_date: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub payment_method: Option<String>,
    pub is_paid: bool,
    pub notes: Option<String>,
    pub internal_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Ordem de serviço com dados relacionados
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderWithDetails {
    #[serde(flatten)]
    pub order: ServiceOrder,
    // Cliente
    pub customer_name: String,
    pub customer_phone: Option<String>,
    // Veículo
    pub vehicle_display_name: String,
    pub vehicle_plate: Option<String>,
    pub vehicle_color: Option<String>,
    // Funcionário
    pub employee_name: String,
    // Itens
    pub items: Vec<ServiceOrderItem>,
}

/// Resumo da OS para listagens
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderSummary {
    pub id: String,
    pub order_number: i32,
    pub status: String,
    pub customer_name: String,
    pub vehicle_display_name: String,
    pub vehicle_plate: Option<String>,
    pub total: f64,
    pub is_paid: bool,
    pub created_at: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// ITENS DA ORDEM
// ═══════════════════════════════════════════════════════════════════════════

/// Item de ordem de serviço
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderItem {
    pub id: String,
    pub order_id: String,
    pub product_id: Option<String>,
    pub item_type: String, // "PART" or "SERVICE"
    pub description: String,
    pub employee_id: Option<String>,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount_percent: f64,
    pub discount_value: f64,
    pub subtotal: f64,
    pub total: f64,
    pub notes: Option<String>,
    // Adicionado para suporte a alertas de estoque no frontend
    pub current_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

/// Item com dados do produto
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderItemWithProduct {
    #[serde(flatten)]
    pub item: ServiceOrderItem,
    pub product_name: Option<String>,
    pub product_barcode: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇOS PRÉ-CADASTRADOS
// ═══════════════════════════════════════════════════════════════════════════

/// Serviço padrão (mão de obra)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub default_price: f64,
    pub estimated_time: Option<i32>, // Minutos
    pub default_warranty_days: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// DTOs DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════

/// Para criar ordem de serviço
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateServiceOrder {
    pub customer_id: String,
    pub customer_vehicle_id: String,
    pub vehicle_year_id: String,
    pub employee_id: String,
    pub vehicle_km: Option<i32>,
    pub symptoms: Option<String>,
    pub scheduled_date: Option<String>,
    pub notes: Option<String>,
    pub internal_notes: Option<String>,
    pub status: Option<String>,
}

/// Para atualizar ordem de serviço
#[derive(Debug, Clone, Serialize, Deserialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateServiceOrder {
    pub vehicle_km: Option<i32>,
    pub symptoms: Option<String>,
    pub diagnosis: Option<String>,
    pub status: Option<String>,
    pub labor_cost: Option<f64>,
    pub discount: Option<f64>,
    pub warranty_days: Option<i32>,
    pub scheduled_date: Option<String>,
    pub payment_method: Option<String>,
    pub is_paid: Option<bool>,
    pub notes: Option<String>,
    pub internal_notes: Option<String>,
}

/// Para adicionar item à OS
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AddServiceOrderItem {
    pub order_id: String,
    pub product_id: Option<String>,
    pub item_type: String,
    pub description: String,
    pub employee_id: Option<String>,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount: Option<f64>,
    pub notes: Option<String>,
}

/// Para atualizar item da OS (com delta de estoque)
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateServiceOrderItem {
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub discount: Option<f64>,
    pub notes: Option<String>,
    pub employee_id: Option<String>,
}

/// Para criar serviço padrão
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateService {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub default_price: f64,
    pub estimated_time: Option<i32>,
    pub default_warranty_days: Option<i32>,
}

/// Para atualizar serviço
#[derive(Debug, Clone, Serialize, Deserialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateService {
    pub code: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub default_price: Option<f64>,
    pub estimated_time: Option<i32>,
    pub default_warranty_days: Option<i32>,
    pub is_active: Option<bool>,
}

/// Para finalizar ordem de serviço (Gera venda)
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FinishServiceOrderInput {
    pub payments: Vec<crate::models::CreateSalePayment>,
    pub amount_paid: f64,
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════════════════

/// Filtros para busca de ordens
#[derive(Debug, Clone, Serialize, Deserialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderFilters {
    pub status: Option<String>,
    pub customer_id: Option<String>,
    pub vehicle_id: Option<String>,
    pub employee_id: Option<String>,
    pub is_paid: Option<bool>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}
