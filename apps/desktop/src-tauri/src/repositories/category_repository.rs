//! Repositório de Categorias

use crate::error::AppResult;
use crate::models::{Category, CategoryWithCount, CreateCategory, UpdateCategory};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct CategoryRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> CategoryRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Category>> {
        let result = sqlx::query_as::<_, Category>(
            "SELECT id, name, description, color, icon, parent_id, sort_order, is_active as active, created_at, updated_at FROM categories WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    pub async fn find_all_active(&self) -> AppResult<Vec<Category>> {
        let result = sqlx::query_as::<_, Category>(
            "SELECT id, name, description, color, icon, parent_id, sort_order, is_active as active, created_at, updated_at FROM categories WHERE is_active = 1 ORDER BY sort_order, name"
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    pub async fn find_all_with_count(&self) -> AppResult<Vec<CategoryWithCount>> {
        let categories = self.find_all_active().await?;
        let mut result = Vec::with_capacity(categories.len());

        for cat in categories {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1",
            )
            .bind(&cat.id)
            .fetch_one(self.pool)
            .await?;

            result.push(CategoryWithCount {
                category: cat,
                product_count: count.0,
            });
        }
        Ok(result)
    }

    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
    ) -> AppResult<PaginatedResult<Category>> {
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM categories WHERE is_active = 1")
            .fetch_one(self.pool)
            .await?;

        let data = sqlx::query_as::<_, Category>(
            "SELECT id, name, description, color, icon, parent_id, sort_order, is_active as active, created_at, updated_at FROM categories WHERE is_active = 1 ORDER BY sort_order, name LIMIT ? OFFSET ?"
        )
        .bind(pagination.per_page)
        .bind(pagination.offset())
        .fetch_all(self.pool)
        .await?;

        Ok(PaginatedResult::new(data, total.0, pagination))
    }

    pub async fn find_children(&self, parent_id: &str) -> AppResult<Vec<Category>> {
        let result = sqlx::query_as::<_, Category>(
            "SELECT id, name, description, color, icon, parent_id, sort_order, is_active as active, created_at, updated_at FROM categories WHERE parent_id = ? AND is_active = 1 ORDER BY sort_order, name"
        )
        .bind(parent_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    pub async fn create(&self, data: CreateCategory) -> AppResult<Category> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let sort_order = data.sort_order.unwrap_or(0);
        let color = data.color.unwrap_or_else(|| "#6366f1".to_string());
        let icon = data.icon.unwrap_or_else(|| "package".to_string());

        sqlx::query(
            "INSERT INTO categories (id, name, description, color, icon, parent_id, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        )
        .bind(&id)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&color)
        .bind(&icon)
        .bind(&data.parent_id)
        .bind(sort_order)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Category".into(),
                id,
            })
    }

    pub async fn update(&self, id: &str, data: UpdateCategory) -> AppResult<Category> {
        let existing =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Category".into(),
                    id: id.into(),
                })?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = data.name.unwrap_or(existing.name);
        let description = data.description.or(existing.description);
        let color = data.color.or(existing.color);
        let icon = data.icon.or(existing.icon);
        let parent_id = data.parent_id.or(existing.parent_id);
        let sort_order = data.sort_order.unwrap_or(existing.sort_order);
        let active = data.active.unwrap_or(existing.active);

        sqlx::query(
            "UPDATE categories SET name = ?, description = ?, color = ?, icon = ?, parent_id = ?, sort_order = ?, is_active = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&name)
        .bind(&description)
        .bind(&color)
        .bind(&icon)
        .bind(&parent_id)
        .bind(sort_order)
        .bind(active)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Category".into(),
                id: id.into(),
            })
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    /// Reativa uma categoria desativada
    pub async fn reactivate(&self, id: &str) -> AppResult<Category> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE categories SET is_active = 1, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;
        self.find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Category".into(),
                id: id.into(),
            })
    }

    /// Retorna todas as categorias (ativas e inativas)
    pub async fn find_all(&self) -> AppResult<Vec<Category>> {
        let result = sqlx::query_as::<_, Category>(
            "SELECT id, name, description, color, icon, parent_id, sort_order, is_active as active, created_at, updated_at FROM categories ORDER BY sort_order, name"
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Retorna apenas categorias inativas
    pub async fn find_inactive(&self) -> AppResult<Vec<Category>> {
        let result = sqlx::query_as::<_, Category>(
            "SELECT id, name, description, color, icon, parent_id, sort_order, is_active as active, created_at, updated_at FROM categories WHERE is_active = 0 ORDER BY name"
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista todas as categorias com contagem (compatível com mobile)
    pub async fn list_all(&self) -> AppResult<Vec<crate::models::CategoryForMobile>> {
        let categories = self.find_all_with_count().await?;
        Ok(categories.into_iter().map(|c| c.into()).collect())
    }

    /// Busca categoria por ID (compatível com mobile)
    pub async fn get_by_id(&self, id: &str) -> AppResult<Option<crate::models::CategoryForMobile>> {
        let cat = self.find_by_id(id).await?;
        if let Some(cat) = cat {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1",
            )
            .bind(&cat.id)
            .fetch_one(self.pool)
            .await?;

            Ok(Some(crate::models::CategoryForMobile {
                id: cat.id,
                name: cat.name,
                description: cat.description,
                color: cat.color,
                icon: cat.icon,
                parent_id: cat.parent_id,
                product_count: count.0,
                is_active: cat.active,
            }))
        } else {
            Ok(None)
        }
    }

    /// Lista produtos de uma categoria (compatível com mobile)
    pub async fn list_products(
        &self,
        category_id: &str,
        limit: i32,
        offset: i32,
    ) -> AppResult<Vec<crate::models::Product>> {
        let result = sqlx::query_as::<_, crate::models::Product>(
            "SELECT id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name LIMIT ? OFFSET ?"
        )
        .bind(category_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }
}

#[path = "category_repository_test.rs"]
#[cfg(test)]
mod category_repository_test;
