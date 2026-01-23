//! Models: Warranty Claims (Garantias)
//!
//! Gerenciamento de reivindicações de garantia para produtos vendidos
//! ou peças instaladas em ordens de serviço.

use serde::{Deserialize, Serialize};

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, specta::Type)]
#[sqlx(type_name = "TEXT")]
pub enum WarrantySourceType {
    #[serde(rename = "SALE")]
    Sale, // Garantia de produto vendido

    #[serde(rename = "SERVICE_ORDER")]
    ServiceOrder, // Garantia de peça/serviço em OS
}

impl std::fmt::Display for WarrantySourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Sale => write!(f, "SALE"),
            Self::ServiceOrder => write!(f, "SERVICE_ORDER"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, specta::Type)]
#[sqlx(type_name = "TEXT")]
pub enum WarrantyStatus {
    #[serde(rename = "OPEN")]
    Open, // Recém aberta, aguardando análise

    #[serde(rename = "IN_PROGRESS")]
    InProgress, // Em análise

    #[serde(rename = "APPROVED")]
    Approved, // Aprovada

    #[serde(rename = "DENIED")]
    Denied, // Negada

    #[serde(rename = "CLOSED")]
    Closed, // Resolvida e fechada
}

impl std::fmt::Display for WarrantyStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Open => write!(f, "OPEN"),
            Self::InProgress => write!(f, "IN_PROGRESS"),
            Self::Approved => write!(f, "APPROVED"),
            Self::Denied => write!(f, "DENIED"),
            Self::Closed => write!(f, "CLOSED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, specta::Type)]
#[sqlx(type_name = "TEXT")]
pub enum WarrantyResolutionType {
    #[serde(rename = "REFUND")]
    Refund, // Reembolso

    #[serde(rename = "REPLACEMENT")]
    Replacement, // Troca do produto

    #[serde(rename = "REPAIR")]
    Repair, // Reparo

    #[serde(rename = "CREDIT")]
    Credit, // Crédito na loja
}

impl std::fmt::Display for WarrantyResolutionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Refund => write!(f, "REFUND"),
            Self::Replacement => write!(f, "REPLACEMENT"),
            Self::Repair => write!(f, "REPAIR"),
            Self::Credit => write!(f, "CREDIT"),
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// STRUCTS
// ══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WarrantyClaim {
    pub id: String,
    pub customer_id: String,
    pub source_type: String, // WarrantySourceType
    pub sale_item_id: Option<String>,
    pub order_item_id: Option<String>,
    pub product_id: Option<String>,
    pub description: String,             // Descrição do problema
    pub reason: String,                  // Motivo da reclamação
    pub status: String,                  // WarrantyStatus
    pub resolution: Option<String>,      // Como foi resolvido
    pub resolution_type: Option<String>, // WarrantyResolutionType
    pub resolved_by_id: Option<String>,  // ID do funcionário
    pub resolved_at: Option<String>,
    pub refund_amount: Option<f64>,
    pub replacement_cost: Option<f64>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WarrantyClaimWithDetails {
    pub claim: WarrantyClaim,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub product_name: Option<String>,
    pub product_barcode: Option<String>,
    pub resolved_by_name: Option<String>,
    pub source_number: Option<String>, // Número da venda ou OS
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WarrantyClaimSummary {
    pub id: String,
    pub customer_name: String,
    pub product_name: Option<String>,
    pub source_type: String,
    pub source_number: Option<String>,
    pub status: String,
    pub description: String,
    pub created_at: String,
}

// ══════════════════════════════════════════════════════════════════════════════
// INPUT DTOs
// ══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateWarrantyClaim {
    pub customer_id: String,
    pub source_type: String, // "SALE" ou "SERVICE_ORDER"
    pub sale_item_id: Option<String>,
    pub order_item_id: Option<String>,
    pub product_id: Option<String>,
    pub description: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWarrantyClaim {
    pub description: Option<String>,
    pub reason: Option<String>,
    pub status: Option<String>,
    pub resolution: Option<String>,
    pub resolution_type: Option<String>,
    pub resolved_by_id: Option<String>,
    pub refund_amount: Option<f64>,
    pub replacement_cost: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolveWarrantyClaim {
    pub resolution_type: String, // WarrantyResolutionType
    pub resolution: String,      // Descrição da resolução
    pub resolved_by_id: String,
    pub refund_amount: Option<f64>,
    pub replacement_cost: Option<f64>,
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTERS
// ══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WarrantyClaimFilters {
    pub status: Option<String>,
    pub source_type: Option<String>,
    pub customer_id: Option<String>,
    pub product_id: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

// ══════════════════════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WarrantyStats {
    pub total_claims: f64,
    pub open_claims: f64,
    pub in_progress_claims: f64,
    pub approved_claims: f64,
    pub denied_claims: f64,
    pub closed_claims: f64,
    pub total_refund_amount: f64,
    pub total_replacement_cost: f64,
    pub avg_resolution_days: Option<f64>,
}
