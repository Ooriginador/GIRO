//! Payment Model
//!
//! Payment records and subscription tracking.

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

/// Payment status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "payment_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PaymentStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Refunded,
}

impl Default for PaymentStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// Payment provider enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "payment_provider", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PaymentProvider {
    Stripe,
    MercadoPago,
    Pix,
    Manual,
}

/// Payment entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Payment {
    pub id: Uuid,
    pub admin_id: Uuid,

    // Values
    pub amount: Decimal,
    pub currency: String,

    // Provider
    pub provider: PaymentProvider,
    pub provider_id: Option<String>,

    // Status
    pub status: PaymentStatus,

    // Details
    pub licenses_count: i32,
    pub description: Option<String>,
    pub receipt_url: Option<String>,

    // Timestamps
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Payment summary for list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSummary {
    pub id: Uuid,
    pub amount: f64,
    pub currency: String,
    pub provider: PaymentProvider,
    pub status: PaymentStatus,
    pub created_at: DateTime<Utc>,
}
