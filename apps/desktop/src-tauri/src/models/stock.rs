//! Modelos de Estoque

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Tipo de movimentação de estoque
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StockMovementType {
    Entry,  // Entrada de mercadoria
    Exit,   // Saída genérica
    Sale,   // Venda
    Return, // Devolução
    #[default]
    Adjustment, // Ajuste de inventário
    Transfer, // Transferência
    Shrinkage, // Quebra/perda
    Expiration, // Baixa por vencimento
}

impl std::fmt::Display for StockMovementType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Entry => write!(f, "ENTRY"),
            Self::Exit => write!(f, "EXIT"),
            Self::Sale => write!(f, "SALE"),
            Self::Return => write!(f, "RETURN"),
            Self::Adjustment => write!(f, "ADJUSTMENT"),
            Self::Transfer => write!(f, "TRANSFER"),
            Self::Shrinkage => write!(f, "SHRINKAGE"),
            Self::Expiration => write!(f, "EXPIRATION"),
        }
    }
}

/// Movimentação de estoque (compatível com DB existente)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct StockMovementRow {
    pub id: String,
    pub product_id: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub movement_type: String,
    pub quantity: f64,
    pub previous_stock: f64,
    pub new_stock: f64,
    pub reason: Option<String>,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub employee_id: Option<String>,
    pub created_at: String,
}

/// Movimentação de estoque (tipada para uso interno)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockMovement {
    pub id: String,
    pub product_id: String,
    pub lot_id: Option<String>,
    pub movement_type: StockMovementType,
    pub quantity: f64,
    pub previous_stock: f64,
    pub new_stock: f64,
    pub reason: Option<String>,
    pub employee_id: String,
    pub created_at: DateTime<Utc>,
}

/// Para criar movimentação
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStockMovement {
    pub product_id: String,
    pub movement_type: String, // ENTRY, EXIT, ADJUSTMENT, etc.
    pub quantity: f64,
    pub reason: Option<String>,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub employee_id: Option<String>,
    // Campos para ENTRADA (opcionais para outros tipos)
    pub cost_price: Option<f64>,
    pub lot_number: Option<String>,
    pub expiration_date: Option<String>,
    pub manufacturing_date: Option<String>,
}

/// Lote de produto
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProductLot {
    pub id: String,
    pub product_id: String,
    pub supplier_id: Option<String>,
    pub lot_number: Option<String>,
    pub expiration_date: Option<String>,
    pub manufacturing_date: Option<String>,
    pub purchase_date: String,
    pub initial_quantity: f64,
    pub current_quantity: f64,
    pub cost_price: f64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Lote com informações adicionais (para mobile)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProductLotWithProduct {
    pub id: String,
    pub product_id: String,
    pub product_name: Option<String>,
    pub barcode: Option<String>,
    pub lot_number: Option<String>,
    pub expiration_date: Option<String>,
    pub manufacturing_date: Option<String>,
    pub quantity: f64,
    pub cost_price: f64,
}

/// Status de estoque
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockStatus {
    pub product_id: String,
    pub product_name: String,
    pub current_stock: f64,
    pub min_stock: f64,
    pub is_low: bool,
    pub is_out: bool,
}

/// Ação de validade
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExpirationAction {
    WriteOff, // Dar baixa
    Discount, // Aplicar desconto
    Transfer, // Transferir/doar
    Ignore,   // Ignorar/verificado
}

/// Status de expiração de lote
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExpirationStatus {
    Valid,     // Ainda válido
    Warning,   // Vencendo em breve
    Expired,   // Já venceu
    Processed, // Já processado (baixa/desconto)
}
