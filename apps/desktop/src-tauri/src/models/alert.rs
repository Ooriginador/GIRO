//! Modelos de Alerta

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Alerta
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub alert_type: String,
    pub severity: String,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub is_dismissed: bool,
    pub product_id: Option<String>,
    pub lot_id: Option<String>,
    pub created_at: String,
}

/// Para criar alerta
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateAlert {
    pub alert_type: String,
    pub severity: String,
    pub title: String,
    pub message: String,
    pub product_id: Option<String>,
    pub lot_id: Option<String>,
}

/// Tipos de alerta
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlertType {
    ExpirationCritical,
    ExpirationWarning,
    ExpirationNotice,
    LowStock,
    OutOfStock,
    NegativeMargin,
    SlowMoving,
}

/// Severidade
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlertSeverity {
    Critical,
    Warning,
    Info,
}
