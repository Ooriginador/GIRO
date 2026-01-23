//! Modelo de Categoria

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;

/// Categoria de produtos
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, Type)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Categoria com campos adicionais para mobile
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryForMobile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
    pub product_count: i64,
    pub is_active: bool,
}

impl From<CategoryWithCount> for CategoryForMobile {
    fn from(c: CategoryWithCount) -> Self {
        Self {
            id: c.category.id,
            name: c.category.name,
            description: c.category.description,
            color: c.category.color,
            icon: c.category.icon,
            parent_id: c.category.parent_id,
            product_count: c.product_count,
            is_active: c.category.active,
        }
    }
}

/// Para criar categoria
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateCategory {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
}

/// Para atualizar categoria
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCategory {
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
    pub active: Option<bool>,
}

/// Categoria com contagem de produtos
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryWithCount {
    #[serde(flatten)]
    pub category: Category,
    #[specta(type = i32)]
    pub product_count: i64,
}
