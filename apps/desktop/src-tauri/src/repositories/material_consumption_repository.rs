//! Repositório de Consumo de Material - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::MaterialConsumption;
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct MaterialConsumptionRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> MaterialConsumptionRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Registra consumo de material
    pub async fn create(&self, data: MaterialConsumption) -> AppResult<MaterialConsumption> {
        let id = if data.id.is_empty() {
            new_id()
        } else {
            data.id.clone()
        };

        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO material_consumptions (
                id, activity_id, product_id, request_id, request_item_id,
                quantity, unit_cost, total_cost, consumed_at, consumed_by_id,
                notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&data.activity_id)
        .bind(&data.product_id)
        .bind(&data.request_id)
        .bind(&data.request_item_id)
        .bind(data.quantity)
        .bind(data.unit_cost)
        .bind(data.total_cost)
        .bind(&data.consumed_at)
        .bind(&data.consumed_by_id)
        .bind(&data.notes)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialConsumption".into(),
                id,
            })
    }

    /// Busca consumo por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<MaterialConsumption>> {
        let result = sqlx::query_as::<_, MaterialConsumption>(
            r#"
            SELECT id, activity_id, product_id, request_id, request_item_id,
                   quantity, unit_cost, total_cost, consumed_at, consumed_by_id,
                   notes, created_at
            FROM material_consumptions
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista consumos por atividade
    pub async fn find_by_activity(&self, activity_id: &str) -> AppResult<Vec<MaterialConsumption>> {
        let result = sqlx::query_as::<_, MaterialConsumption>(
            r#"
            SELECT id, activity_id, product_id, request_id, request_item_id,
                   quantity, unit_cost, total_cost, consumed_at, consumed_by_id,
                   notes, created_at
            FROM material_consumptions
            WHERE activity_id = ?
            ORDER BY consumed_at DESC
            "#,
        )
        .bind(activity_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista consumos por requisição
    pub async fn find_by_request(&self, request_id: &str) -> AppResult<Vec<MaterialConsumption>> {
        let result = sqlx::query_as::<_, MaterialConsumption>(
            r#"
            SELECT id, activity_id, product_id, request_id, request_item_id,
                   quantity, unit_cost, total_cost, consumed_at, consumed_by_id,
                   notes, created_at
            FROM material_consumptions
            WHERE request_id = ?
            ORDER BY consumed_at DESC
            "#,
        )
        .bind(request_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista consumos com paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        activity_id: Option<&str>,
        product_id: Option<&str>,
    ) -> AppResult<PaginatedResult<MaterialConsumption>> {
        let mut conditions = vec![];
        let mut params: Vec<String> = vec![];

        if let Some(aid) = activity_id {
            conditions.push("activity_id = ?");
            params.push(aid.to_string());
        }

        if let Some(pid) = product_id {
            conditions.push("product_id = ?");
            params.push(pid.to_string());
        }

        let where_clause = if conditions.is_empty() {
            "1 = 1".to_string()
        } else {
            conditions.join(" AND ")
        };

        let count_sql = format!(
            "SELECT COUNT(*) FROM material_consumptions WHERE {}",
            where_clause
        );
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, activity_id, product_id, request_id, request_item_id,
                   quantity, unit_cost, total_cost, consumed_at, consumed_by_id,
                   notes, created_at
            FROM material_consumptions
            WHERE {}
            ORDER BY consumed_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, MaterialConsumption>(&data_sql);
        for p in &params {
            data_query = data_query.bind(p);
        }
        data_query = data_query
            .bind(pagination.per_page)
            .bind(pagination.offset());

        let data = data_query.fetch_all(self.pool).await?;

        Ok(PaginatedResult::new(
            data,
            total,
            pagination.page,
            pagination.per_page,
        ))
    }

    /// Remove registro de consumo (estorno)
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM material_consumptions WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "MaterialConsumption".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }
}
