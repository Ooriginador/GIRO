//! Repositório de Atividades - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{Activity, CreateActivity, UpdateActivity};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct ActivityRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ActivityRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Busca atividade por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Activity>> {
        let result = sqlx::query_as::<_, Activity>(
            r#"
            SELECT id, work_front_id, code, name, description, status,
                   unit, planned_qty, executed_qty,
                   CAST(unit_cost AS REAL) as unit_cost, cost_center,
                   start_date, end_date, notes,
                   is_active, created_at, 
                   updated_at, deleted_at
            FROM activities
            WHERE id = ? AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista atividades por frente de trabalho
    pub async fn find_by_work_front(&self, work_front_id: &str) -> AppResult<Vec<Activity>> {
        let result = sqlx::query_as::<_, Activity>(
            r#"
            SELECT id, work_front_id, code, name, description, status,
                   unit, planned_qty, executed_qty,
                   CAST(unit_cost AS REAL) as unit_cost, cost_center,
                   start_date, end_date, notes,
                   is_active, created_at, 
                   updated_at, deleted_at
            FROM activities
            WHERE work_front_id = ? AND deleted_at IS NULL
            ORDER BY code
            "#,
        )
        .bind(work_front_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista atividades por contrato
    pub async fn find_by_contract(&self, contract_id: &str) -> AppResult<Vec<Activity>> {
        let result = sqlx::query_as::<_, Activity>(
            r#"
            SELECT a.id, a.work_front_id, a.code, a.name, a.description, a.status,
                   a.unit, a.planned_qty, a.executed_qty,
                   CAST(a.unit_cost AS REAL) as unit_cost, a.cost_center,
                   a.start_date, a.end_date, a.notes,
                   a.is_active, a.created_at, 
                   a.updated_at, a.deleted_at
            FROM activities a
            JOIN work_fronts wf ON a.work_front_id = wf.id
            WHERE wf.contract_id = ? AND a.deleted_at IS NULL
            ORDER BY a.code
            "#,
        )
        .bind(contract_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista atividades por centro de custo
    pub async fn find_by_cost_center(&self, cost_center: &str) -> AppResult<Vec<Activity>> {
        let result = sqlx::query_as::<_, Activity>(
            r#"
            SELECT id, work_front_id, code, name, description, status,
                   unit, planned_qty, executed_qty,
                   CAST(unit_cost AS REAL) as unit_cost, cost_center,
                   start_date, end_date, notes,
                   is_active, created_at, 
                   updated_at, deleted_at
            FROM activities
            WHERE cost_center = ? AND deleted_at IS NULL
            ORDER BY code
            "#,
        )
        .bind(cost_center)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista atividades com paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        work_front_id: Option<&str>,
    ) -> AppResult<PaginatedResult<Activity>> {
        let (where_clause, bind_wf) = match work_front_id {
            Some(wfid) => (
                "work_front_id = ? AND deleted_at IS NULL".to_string(),
                Some(wfid),
            ),
            None => ("deleted_at IS NULL".to_string(), None),
        };

        let count_sql = format!("SELECT COUNT(*) FROM activities WHERE {}", where_clause);
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        if let Some(wfid) = bind_wf {
            count_query = count_query.bind(wfid);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, work_front_id, code, name, description, status,
                   unit, planned_qty, executed_qty,
                   CAST(unit_cost AS REAL) as unit_cost, cost_center,
                   start_date, end_date, notes,
                   is_active, created_at, 
                   updated_at, deleted_at
            FROM activities
            WHERE {}
            ORDER BY code
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, Activity>(&data_sql);
        if let Some(wfid) = bind_wf {
            data_query = data_query.bind(wfid);
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

    /// Cria nova atividade
    pub async fn create(&self, data: CreateActivity) -> AppResult<Activity> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let unit = data.unit.unwrap_or_else(|| "UN".to_string());
        let planned_qty = data.planned_qty.unwrap_or(0.0);
        let unit_cost = data.unit_cost.unwrap_or(0.0);

        sqlx::query(
            r#"
            INSERT INTO activities (
                id, work_front_id, code, name, description, status, unit,
                planned_qty, executed_qty, unit_cost, cost_center,
                start_date, end_date, notes, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&data.work_front_id)
        .bind(&data.code)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&unit)
        .bind(planned_qty)
        .bind(unit_cost)
        .bind(&data.cost_center)
        .bind(&data.start_date)
        .bind(&data.end_date)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Activity".into(),
                id,
            })
    }

    /// Atualiza atividade
    pub async fn update(&self, id: &str, data: UpdateActivity) -> AppResult<Activity> {
        let _ = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Activity".into(),
                id: id.to_string(),
            })?;

        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE activities SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                unit = COALESCE(?, unit),
                planned_qty = COALESCE(?, planned_qty),
                executed_qty = COALESCE(?, executed_qty),
                unit_cost = COALESCE(?, unit_cost),
                cost_center = COALESCE(?, cost_center),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&data.name)
        .bind(&data.description)
        .bind(&data.status)
        .bind(&data.unit)
        .bind(data.planned_qty)
        .bind(data.executed_qty)
        .bind(data.unit_cost)
        .bind(&data.cost_center)
        .bind(&data.start_date)
        .bind(&data.end_date)
        .bind(&data.notes)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Activity".into(),
                id: id.to_string(),
            })
    }

    /// Soft delete de atividade
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let result =
            sqlx::query("UPDATE activities SET deleted_at = ?, is_active = 0 WHERE id = ?")
                .bind(&now)
                .bind(id)
                .execute(self.pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "Activity".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }

    /// Atualiza quantidade executada
    pub async fn update_executed_qty(&self, id: &str, executed_qty: f64) -> AppResult<Activity> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE activities SET executed_qty = ?, updated_at = ? WHERE id = ?")
            .bind(executed_qty)
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Activity".into(),
                id: id.to_string(),
            })
    }

    /// Atualiza progresso da atividade (alias para update_executed_qty)
    pub async fn update_progress(&self, id: &str, executed_qty: f64) -> AppResult<Activity> {
        self.update_executed_qty(id, executed_qty).await
    }

    /// Altera status
    pub async fn update_status(&self, id: &str, status: &str) -> AppResult<Activity> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE activities SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Activity".into(),
                id: id.to_string(),
            })
    }
}
