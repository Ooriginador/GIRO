//! Modelos de Venda

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Forma de pagamento
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PaymentMethod {
    #[default]
    Cash,
    Pix,
    Credit,
    Debit,
    Voucher,
    Other,
}

impl std::fmt::Display for PaymentMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Cash => write!(f, "Dinheiro"),
            Self::Pix => write!(f, "PIX"),
            Self::Credit => write!(f, "Crédito"),
            Self::Debit => write!(f, "Débito"),
            Self::Voucher => write!(f, "Vale"),
            Self::Other => write!(f, "Outro"),
        }
    }
}

/// Tipo de desconto
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DiscountType {
    Percentage,
    Fixed,
}

/// Status da venda
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SaleStatus {
    #[default]
    Completed,
    Canceled,
}

/// Venda completa
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Sale {
    pub id: String,
    pub daily_number: i32,
    pub subtotal: f64,
    pub discount_type: Option<String>,
    pub discount_value: f64,
    pub discount_reason: Option<String>,
    pub total: f64,
    pub payment_method: String,
    pub amount_paid: f64,
    pub change: f64,
    pub status: String,
    pub canceled_at: Option<String>,
    pub canceled_by_id: Option<String>,
    pub cancel_reason: Option<String>,
    pub employee_id: String,
    pub cash_session_id: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Venda com informações relacionadas
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleWithDetails {
    #[serde(flatten)]
    pub sale: Sale,
    pub employee_name: Option<String>,
    pub items: Vec<SaleItem>,
    pub items_count: i32,
}

/// Item de venda
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SaleItem {
    pub id: String,
    pub sale_id: String,
    pub product_id: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount: f64,
    pub total: f64,
    pub product_name: String,
    pub product_barcode: Option<String>,
    pub product_unit: String,
    pub lot_id: Option<String>,
    pub created_at: String,
}

/// Para criar item de venda (do carrinho)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSaleItem {
    pub product_id: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount: Option<f64>,
}

/// Para criar venda
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSale {
    pub items: Vec<CreateSaleItem>,
    pub payment_method: PaymentMethod,
    pub amount_paid: f64,
    pub discount_type: Option<DiscountType>,
    pub discount_value: Option<f64>,
    pub discount_reason: Option<String>,
    pub employee_id: String,
    pub cash_session_id: String,
}

/// Resumo diário de vendas
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySalesSummary {
    pub date: String,
    pub total_sales: i64,
    pub total_amount: f64,
    pub total_items: i64,
    pub average_ticket: f64,
    pub by_payment_method: Vec<PaymentMethodSummary>,
}

/// Resumo mensal de vendas (totais do mês)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlySalesSummary {
    /// Formato: YYYY-MM
    pub year_month: String,
    pub total_sales: i64,
    pub total_amount: f64,
}

/// Resumo por forma de pagamento
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethodSummary {
    pub method: String,
    pub count: i64,
    pub amount: f64,
}

/// Filtros de busca de vendas
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SaleFilters {
    #[serde(alias = "startDate")]
    pub date_from: Option<String>,
    #[serde(alias = "endDate")]
    pub date_to: Option<String>,
    pub employee_id: Option<String>,
    pub cash_session_id: Option<String>,
    pub payment_method: Option<String>,
    pub status: Option<String>,
    pub min_total: Option<f64>,
    pub max_total: Option<f64>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub page: Option<i32>,
}
