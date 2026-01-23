//! Modelos de Configuração

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

/// Configuração
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Setting {
    pub id: String,
    pub key: String,
    pub value: String,
    #[sqlx(rename = "type")]
    pub setting_type: String,
    pub group_name: String,
    pub description: Option<String>,
    pub updated_by_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Para definir configuração
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SetSetting {
    pub key: String,
    pub value: String,
    pub value_type: Option<String>,
    pub group_name: Option<String>,
    pub description: Option<String>,
}

/// Tipos de configuração
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SettingType {
    #[default]
    String,
    Number,
    Boolean,
    Json,
}
