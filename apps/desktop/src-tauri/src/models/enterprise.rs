//! Modelos do Módulo Enterprise - Almoxarifado Industrial
//!
//! Structs para contratos, frentes de trabalho, requisições e transferências.

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Status do Contrato
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ContractStatus {
    #[default]
    Planning,
    Active,
    Suspended,
    Completed,
    Cancelled,
}

impl ContractStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Planning => "PLANNING",
            Self::Active => "ACTIVE",
            Self::Suspended => "SUSPENDED",
            Self::Completed => "COMPLETED",
            Self::Cancelled => "CANCELLED",
        }
    }

    pub fn parse_status(s: &str) -> Option<Self> {
        match s {
            "PLANNING" => Some(Self::Planning),
            "ACTIVE" => Some(Self::Active),
            "SUSPENDED" => Some(Self::Suspended),
            "COMPLETED" => Some(Self::Completed),
            "CANCELLED" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

/// Status da Frente de Trabalho
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WorkFrontStatus {
    #[default]
    Active,
    Suspended,
    Completed,
}

impl WorkFrontStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "ACTIVE",
            Self::Suspended => "SUSPENDED",
            Self::Completed => "COMPLETED",
        }
    }
}

/// Status da Atividade
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ActivityStatus {
    #[default]
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl ActivityStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "PENDING",
            Self::InProgress => "IN_PROGRESS",
            Self::Completed => "COMPLETED",
            Self::Cancelled => "CANCELLED",
        }
    }
}

/// Tipo de Local de Estoque
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StockLocationType {
    Central,
    #[default]
    Warehouse,
    WorkFront,
    Transit,
}

impl StockLocationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Central => "CENTRAL",
            Self::Warehouse => "WAREHOUSE",
            Self::WorkFront => "WORK_FRONT",
            Self::Transit => "TRANSIT",
        }
    }
}

/// Status da Requisição de Material
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RequestStatus {
    #[default]
    Draft,
    Pending,
    Approved,
    PartiallyApproved,
    Rejected,
    Separating,
    Separated,
    Delivered,
    Cancelled,
}

impl RequestStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "DRAFT",
            Self::Pending => "PENDING",
            Self::Approved => "APPROVED",
            Self::PartiallyApproved => "PARTIALLY_APPROVED",
            Self::Rejected => "REJECTED",
            Self::Separating => "SEPARATING",
            Self::Separated => "SEPARATED",
            Self::Delivered => "DELIVERED",
            Self::Cancelled => "CANCELLED",
        }
    }
}

/// Prioridade da Requisição
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RequestPriority {
    Low,
    #[default]
    Normal,
    High,
    Urgent,
}

impl RequestPriority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "LOW",
            Self::Normal => "NORMAL",
            Self::High => "HIGH",
            Self::Urgent => "URGENT",
        }
    }
}

/// Status da Transferência
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TransferStatus {
    Draft, // Rascunho
    #[default]
    Pending,
    Approved,
    Rejected,
    InTransit,
    Completed,
    Received, // Alias para Completed (usado em alguns fluxos)
    Cancelled,
}

impl TransferStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "DRAFT",
            Self::Pending => "PENDING",
            Self::Approved => "APPROVED",
            Self::Rejected => "REJECTED",
            Self::InTransit => "IN_TRANSIT",
            Self::Completed => "COMPLETED",
            Self::Received => "RECEIVED",
            Self::Cancelled => "CANCELLED",
        }
    }
}

/// Tipo de Contagem de Inventário
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InventoryCountType {
    #[default]
    Full,
    Rotating,
    Spot,
}

/// Status da Contagem
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InventoryCountStatus {
    #[default]
    InProgress,
    Completed,
    Cancelled,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITIES
// ═══════════════════════════════════════════════════════════════════════════════

/// Contrato/Obra
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Contract {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub client_name: Option<String>,
    pub client_document: Option<String>,
    pub status: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: f64,
    pub manager_id: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// Contrato com informações do gerente
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ContractWithManager {
    #[serde(flatten)]
    pub contract: Contract,
    pub manager_name: Option<String>,
    pub work_fronts_count: i32,
    pub requests_count: i32,
}

/// DTO para criação de contrato
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateContract {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub client_name: Option<String>,
    pub client_document: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: Option<f64>,
    pub manager_id: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
}

/// DTO para atualização de contrato
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateContract {
    pub name: Option<String>,
    pub description: Option<String>,
    pub client_name: Option<String>,
    pub client_document: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: Option<f64>,
    pub manager_id: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
}

/// Frente de Trabalho
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkFront {
    pub id: String,
    pub contract_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub supervisor_id: Option<String>,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// DTO para criação de frente de trabalho
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkFront {
    pub contract_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub supervisor_id: Option<String>,
    pub location: Option<String>,
    pub notes: Option<String>,
}

/// DTO para atualização de frente de trabalho
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkFront {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub supervisor_id: Option<String>,
    pub location: Option<String>,
    pub notes: Option<String>,
}

/// Atividade
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: String,
    pub work_front_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub unit: String,
    pub planned_qty: f64,
    pub executed_qty: f64,
    pub unit_cost: f64,
    pub cost_center: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// DTO para criação de atividade
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateActivity {
    pub work_front_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub planned_qty: Option<f64>,
    pub unit_cost: Option<f64>,
    pub cost_center: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub notes: Option<String>,
}

/// DTO para atualização de atividade
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateActivity {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub unit: Option<String>,
    pub planned_qty: Option<f64>,
    pub executed_qty: Option<f64>,
    pub unit_cost: Option<f64>,
    pub cost_center: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub notes: Option<String>,
}

/// Local de Estoque
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct StockLocation {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub location_type: String,
    pub contract_id: Option<String>,
    pub work_front_id: Option<String>,
    pub address: Option<String>,
    pub responsible_id: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// DTO para criação de local de estoque
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateStockLocation {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub location_type: Option<String>,
    pub contract_id: Option<String>,
    pub work_front_id: Option<String>,
    pub address: Option<String>,
    pub responsible_id: Option<String>,
}

/// DTO para atualização de local de estoque
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStockLocation {
    pub name: Option<String>,
    pub description: Option<String>,
    pub location_type: Option<String>,
    pub address: Option<String>,
    pub responsible_id: Option<String>,
}

/// Saldo de Estoque por Local
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct StockBalance {
    pub id: String,
    pub location_id: String,
    pub product_id: String,
    pub quantity: f64,
    pub reserved_qty: f64,
    pub min_qty: f64,
    pub max_qty: Option<f64>,
    pub last_count_date: Option<String>,
    pub last_count_qty: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

/// Saldo com informações do produto
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StockBalanceWithProduct {
    #[serde(flatten)]
    pub balance: StockBalance,
    pub product_name: String,
    pub product_code: String,
    pub product_unit: String,
    pub available_qty: f64,
}

/// Requisição de Material
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct MaterialRequest {
    pub id: String,
    pub request_number: String,
    pub contract_id: String,
    pub work_front_id: Option<String>,
    pub activity_id: Option<String>,
    pub requester_id: String,
    pub approver_id: Option<String>,
    pub separator_id: Option<String>,
    pub status: String,
    pub priority: String,
    pub needed_date: Option<String>,
    pub approved_at: Option<String>,
    pub separated_at: Option<String>,
    pub delivered_at: Option<String>,
    pub rejection_reason: Option<String>,
    pub notes: Option<String>,
    pub source_location_id: Option<String>,
    pub destination_location_id: Option<String>,
    pub total_items: i32,
    pub total_value: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// DTO para criação de requisição
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateMaterialRequest {
    pub contract_id: String,
    pub work_front_id: Option<String>,
    pub activity_id: Option<String>,
    pub priority: Option<String>,
    pub needed_date: Option<String>,
    pub source_location_id: Option<String>,
    pub destination_location_id: Option<String>,
    pub notes: Option<String>,
}

/// DTO para atualização de requisição
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMaterialRequest {
    pub work_front_id: Option<String>,
    pub activity_id: Option<String>,
    pub priority: Option<String>,
    pub needed_date: Option<String>,
    pub destination_location_id: Option<String>,
    pub notes: Option<String>,
}

/// Item da Requisição de Material
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct MaterialRequestItem {
    pub id: String,
    pub request_id: String,
    pub product_id: String,
    pub requested_qty: f64,
    pub approved_qty: Option<f64>,
    pub separated_qty: Option<f64>,
    pub delivered_qty: Option<f64>,
    pub unit_price: f64,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO para adicionar item à requisição
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AddRequestItem {
    pub product_id: String,
    pub requested_qty: f64,
    pub notes: Option<String>,
}

/// Item com informações do produto
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MaterialRequestItemWithProduct {
    #[serde(flatten)]
    pub item: MaterialRequestItem,
    pub product_name: String,
    pub product_code: String,
    pub product_unit: String,
}

/// Transferência de Estoque
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct StockTransfer {
    pub id: String,
    pub transfer_number: String,
    pub source_location_id: String,
    pub destination_location_id: String,
    pub requester_id: String,
    pub approver_id: Option<String>,
    pub shipper_id: Option<String>,
    pub receiver_id: Option<String>,
    pub status: String,
    pub requested_at: String,
    pub approved_at: Option<String>,
    pub shipped_at: Option<String>,
    pub received_at: Option<String>,
    pub rejection_reason: Option<String>,
    pub notes: Option<String>,
    pub total_items: i32,
    pub total_value: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// DTO para criação de transferência
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateStockTransfer {
    pub source_location_id: String,
    pub destination_location_id: String,
    pub notes: Option<String>,
}

/// DTO para atualização de transferência
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStockTransfer {
    pub source_location_id: Option<String>,
    pub destination_location_id: Option<String>,
    pub notes: Option<String>,
}

/// Item da Transferência
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct StockTransferItem {
    pub id: String,
    pub transfer_id: String,
    pub product_id: String,
    pub requested_qty: f64,
    pub shipped_qty: Option<f64>,
    pub received_qty: Option<f64>,
    pub unit_price: f64,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO para adicionar item à transferência
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AddTransferItem {
    pub product_id: String,
    pub requested_qty: f64,
    pub notes: Option<String>,
}

/// Consumo de Material
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct MaterialConsumption {
    pub id: String,
    pub activity_id: String,
    pub product_id: String,
    pub request_id: Option<String>,
    pub request_item_id: Option<String>,
    pub quantity: f64,
    pub unit_cost: f64,
    pub total_cost: f64,
    pub consumed_at: String,
    pub consumed_by_id: String,
    pub notes: Option<String>,
    pub created_at: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Dashboard do Contrato
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ContractDashboard {
    pub contract: Contract,
    pub work_fronts_count: i32,
    pub activities_count: i32,
    pub requests_pending: i32,
    pub requests_approved: i32,
    pub requests_delivered: i32,
    pub total_consumption: f64,
    pub budget_used_percent: f64,
}

/// Filtros para listagem de contratos
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct ContractFilters {
    pub search: Option<String>,
    pub status: Option<String>,
    pub manager_id: Option<String>,
    pub is_active: Option<bool>,
}

/// Filtros para listagem de requisições
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestFilters {
    pub search: Option<String>,
    pub contract_id: Option<String>,
    pub work_front_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub requester_id: Option<String>,
    pub approver_id: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

/// Relatório de Consumo
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionReport {
    pub total_value: f64,
    pub items_count: i32,
    pub by_category: Vec<ConsumptionByCategory>,
    pub by_activity: Vec<ConsumptionByActivity>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionByCategory {
    pub category_id: String,
    pub category_name: String,
    pub total_value: f64,
    pub items_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionByActivity {
    pub activity_id: String,
    pub activity_name: String,
    pub activity_code: String,
    pub total_value: f64,
    pub items_count: i32,
}

/// Relatório de Posição de Estoque
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StockPositionReport {
    pub location_id: String,
    pub location_name: String,
    pub total_items: i32,
    pub total_value: f64,
    pub low_stock_items: i32,
    pub items: Vec<StockBalanceWithProduct>,
}
