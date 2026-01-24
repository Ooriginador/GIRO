use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct HeldSale {
    pub id: String,
    pub customer_id: Option<String>,
    pub discount_value: f64,
    pub discount_reason: Option<String>,
    pub subtotal: f64,
    pub total: f64,
    pub employee_id: String,
    pub created_at: String,
    #[sqlx(skip)]
    pub items: Vec<HeldSaleItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct HeldSaleItem {
    pub id: String,
    pub held_sale_id: String,
    pub product_id: String,
    pub product_name: String,
    pub barcode: Option<String>,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount: f64,
    pub unit: String,
    pub is_weighted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HeldSaleCartItem {
    pub product_id: String,
    pub product_name: String,
    pub barcode: Option<String>,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount: f64,
    pub unit: String,
    pub is_weighted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateHeldSale {
    pub id: Option<String>,
    pub customer_id: Option<String>,
    pub discount_value: f64,
    pub discount_reason: Option<String>,
    pub items: Vec<HeldSaleCartItem>,
}
