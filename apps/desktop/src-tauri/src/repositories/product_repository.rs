//! Repositório de Produtos

use crate::error::AppResult;
use crate::models::{CreateProduct, Product, ProductFilters, StockSummary, UpdateProduct};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct ProductRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ProductRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const PRODUCT_COLUMNS: &'static str = "id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Product>> {
        let query = format!("SELECT {} FROM products WHERE id = ?", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_barcode(&self, barcode: &str) -> AppResult<Option<Product>> {
        let query = format!("SELECT {} FROM products WHERE barcode = ? AND is_active = 1", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(barcode)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_internal_code(&self, code: &str) -> AppResult<Option<Product>> {
        let query = format!("SELECT {} FROM products WHERE internal_code = ? AND is_active = 1", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(code)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all_active(&self) -> AppResult<Vec<Product>> {
        let query = format!("SELECT {} FROM products WHERE is_active = 1 ORDER BY name", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_category(&self, category_id: &str) -> AppResult<Vec<Product>> {
        let query = format!("SELECT {} FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(category_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn search(&self, term: &str, limit: i32) -> AppResult<Vec<Product>> {
        let search_pattern = format!("%{}%", term);
        let query = format!("SELECT {} FROM products WHERE is_active = 1 AND (name LIKE ? OR barcode LIKE ? OR internal_code LIKE ?) ORDER BY name LIMIT ?", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(&search_pattern)
            .bind(&search_pattern)
            .bind(&search_pattern)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_with_filters(&self, filters: &ProductFilters) -> AppResult<Vec<Product>> {
        let mut query = format!("SELECT {} FROM products WHERE 1=1", Self::PRODUCT_COLUMNS);
        let mut binds = Vec::new();

        if let Some(ref search) = filters.search {
            query.push_str(" AND (name LIKE ? OR barcode LIKE ? OR internal_code LIKE ?)");
            let pattern = format!("%{}%", search);
            binds.push(pattern.clone());
            binds.push(pattern.clone());
            binds.push(pattern);
        }

        if let Some(ref cat_id) = filters.category_id {
            query.push_str(" AND category_id = ?");
            binds.push(cat_id.clone());
        }

        if filters.is_active.unwrap_or(true) {
            query.push_str(" AND is_active = 1");
        }

        if filters.low_stock.unwrap_or(false) {
            query.push_str(" AND current_stock <= min_stock AND current_stock > 0");
        }

        if filters.out_of_stock.unwrap_or(false) {
            query.push_str(" AND current_stock <= 0");
        }

        query.push_str(" ORDER BY name");

        if let Some(limit) = filters.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }
        if let Some(offset) = filters.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }

        let mut q = sqlx::query_as::<_, Product>(&query);
        for bind in &binds {
            q = q.bind(bind);
        }
        let result = q.fetch_all(self.pool).await?;
        Ok(result)
    }

    pub async fn find_low_stock(&self) -> AppResult<Vec<Product>> {
        let query = format!("SELECT {} FROM products WHERE is_active = 1 AND current_stock <= min_stock AND current_stock > 0 ORDER BY current_stock ASC", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_out_of_stock(&self) -> AppResult<Vec<Product>> {
        let query = format!("SELECT {} FROM products WHERE is_active = 1 AND current_stock <= 0 ORDER BY name", Self::PRODUCT_COLUMNS);
        let result = sqlx::query_as::<_, Product>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn get_next_internal_code(&self) -> AppResult<String> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM products")
            .fetch_one(self.pool)
            .await?;
        Ok(format!("MRC-{:05}", result.0 + 1))
    }

    pub async fn create(&self, data: CreateProduct) -> AppResult<Product> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let internal_code = match data.internal_code {
            Some(code) => code,
            None => self.get_next_internal_code().await?,
        };
        let unit = data.unit.map(|u| u.to_string()).unwrap_or_else(|| "UNIT".to_string());
        let is_weighted = data.is_weighted.unwrap_or(false);
        let cost_price = data.cost_price.unwrap_or(0.0);
        let current_stock = data.current_stock.unwrap_or(0.0);
        let min_stock = data.min_stock.unwrap_or(0.0);

        sqlx::query(
            "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, is_active, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.barcode)
        .bind(&internal_code)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&unit)
        .bind(is_weighted)
        .bind(data.sale_price)
        .bind(cost_price)
        .bind(current_stock)
        .bind(min_stock)
        .bind(&data.category_id)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Product".into(), id })
    }

    pub async fn update(&self, id: &str, data: UpdateProduct) -> AppResult<Product> {
        let existing = self.find_by_id(id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Product".into(), id: id.into() })?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = data.name.unwrap_or(existing.name);
        let barcode = data.barcode.or(existing.barcode);
        let description = data.description.or(existing.description);
        let unit = data.unit.map(|u| u.to_string()).unwrap_or(existing.unit);
        let is_weighted = data.is_weighted.unwrap_or(existing.is_weighted);
        let sale_price = data.sale_price.unwrap_or(existing.sale_price);
        let cost_price = data.cost_price.unwrap_or(existing.cost_price);
        let current_stock = data.current_stock.unwrap_or(existing.current_stock);
        let min_stock = data.min_stock.unwrap_or(existing.min_stock);
        let is_active = data.is_active.unwrap_or(existing.is_active);
        let category_id = data.category_id.unwrap_or(existing.category_id);

        sqlx::query(
            "UPDATE products SET name = ?, barcode = ?, description = ?, unit = ?, is_weighted = ?, sale_price = ?, cost_price = ?, current_stock = ?, min_stock = ?, is_active = ?, category_id = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&name)
        .bind(&barcode)
        .bind(&description)
        .bind(&unit)
        .bind(is_weighted)
        .bind(sale_price)
        .bind(cost_price)
        .bind(current_stock)
        .bind(min_stock)
        .bind(is_active)
        .bind(&category_id)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Product".into(), id: id.into() })
    }

    pub async fn update_stock(&self, id: &str, delta: f64) -> AppResult<Product> {
        let existing = self.find_by_id(id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Product".into(), id: id.into() })?;
        let new_stock = existing.current_stock + delta;
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?")
            .bind(new_stock)
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id).await?.ok_or_else(|| crate::error::AppError::NotFound { entity: "Product".into(), id: id.into() })
    }

    pub async fn soft_delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_stock_summary(&self) -> AppResult<Vec<StockSummary>> {
        let products = self.find_all_active().await?;
        let result: Vec<StockSummary> = products.into_iter().map(|p| {
            let is_low = p.current_stock <= p.min_stock && p.current_stock > 0.0;
            let is_out = p.current_stock <= 0.0;
            StockSummary {
                product_id: p.id,
                product_name: p.name,
                current_stock: p.current_stock,
                min_stock: p.min_stock,
                unit: p.unit,
                is_low,
                is_out,
            }
        }).collect();
        Ok(result)
    }
}

#[cfg(test)]
#[path = "product_repository_test.rs"]
mod product_repository_test;
