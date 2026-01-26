//! Repositório de Frentes de Trabalho - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{CreateWorkFront, UpdateWorkFront, WorkFront};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct WorkFrontRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> WorkFrontRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Busca frente de trabalho por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<WorkFront>> {
        let result = sqlx::query_as::<_, WorkFront>(
            r#"
            SELECT id, contract_id, code, name, description, status, 
                   supervisor_id, location, notes, is_active, created_at, 
                   updated_at, deleted_at
            FROM work_fronts
            WHERE id = ? AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca frente de trabalho por código dentro do contrato
    pub async fn find_by_code(
        &self,
        contract_id: &str,
        code: &str,
    ) -> AppResult<Option<WorkFront>> {
        let result = sqlx::query_as::<_, WorkFront>(
            r#"
            SELECT id, contract_id, code, name, description, status, 
                   supervisor_id, location, notes, is_active, created_at, 
                   updated_at, deleted_at
            FROM work_fronts
            WHERE contract_id = ? AND code = ? AND deleted_at IS NULL
            "#,
        )
        .bind(contract_id)
        .bind(code)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista frentes de trabalho por contrato
    pub async fn find_by_contract(&self, contract_id: &str) -> AppResult<Vec<WorkFront>> {
        let result = sqlx::query_as::<_, WorkFront>(
            r#"
            SELECT id, contract_id, code, name, description, status, 
                   supervisor_id, location, notes, is_active, created_at, 
                   updated_at, deleted_at
            FROM work_fronts
            WHERE contract_id = ? AND deleted_at IS NULL
            ORDER BY code
            "#,
        )
        .bind(contract_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista frentes de trabalho por supervisor
    pub async fn find_by_supervisor(&self, supervisor_id: &str) -> AppResult<Vec<WorkFront>> {
        let result = sqlx::query_as::<_, WorkFront>(
            r#"
            SELECT id, contract_id, code, name, description, status, 
                   supervisor_id, location, notes, is_active, created_at, 
                   updated_at, deleted_at
            FROM work_fronts
            WHERE supervisor_id = ? AND deleted_at IS NULL
            ORDER BY code
            "#,
        )
        .bind(supervisor_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista frentes de trabalho com paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        contract_id: Option<&str>,
    ) -> AppResult<PaginatedResult<WorkFront>> {
        let (where_clause, bind_contract) = match contract_id {
            Some(cid) => (
                "contract_id = ? AND deleted_at IS NULL".to_string(),
                Some(cid),
            ),
            None => ("deleted_at IS NULL".to_string(), None),
        };

        let count_sql = format!("SELECT COUNT(*) FROM work_fronts WHERE {}", where_clause);
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        if let Some(cid) = bind_contract {
            count_query = count_query.bind(cid);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, contract_id, code, name, description, status, 
                   supervisor_id, location, notes, is_active, created_at, 
                   updated_at, deleted_at
            FROM work_fronts
            WHERE {}
            ORDER BY code
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, WorkFront>(&data_sql);
        if let Some(cid) = bind_contract {
            data_query = data_query.bind(cid);
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

    /// Lista todas as frentes de trabalho ativas
    pub async fn find_all_active(&self) -> AppResult<Vec<WorkFront>> {
        let result = sqlx::query_as::<_, WorkFront>(
            r#"
            SELECT id, contract_id, code, name, description, status, 
                   supervisor_id, location, notes, is_active, created_at, 
                   updated_at, deleted_at
            FROM work_fronts
            WHERE is_active = 1 AND deleted_at IS NULL
            ORDER BY name
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Cria nova frente de trabalho
    pub async fn create(&self, data: CreateWorkFront) -> AppResult<WorkFront> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO work_fronts (
                id, contract_id, code, name, description, status, supervisor_id,
                location, notes, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 1, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&data.contract_id)
        .bind(&data.code)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&data.supervisor_id)
        .bind(&data.location)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WorkFront".into(),
                id,
            })
    }

    /// Atualiza frente de trabalho
    pub async fn update(&self, id: &str, data: UpdateWorkFront) -> AppResult<WorkFront> {
        let _ = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WorkFront".into(),
                id: id.to_string(),
            })?;

        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE work_fronts SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                supervisor_id = COALESCE(?, supervisor_id),
                location = COALESCE(?, location),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&data.name)
        .bind(&data.description)
        .bind(&data.status)
        .bind(&data.supervisor_id)
        .bind(&data.location)
        .bind(&data.notes)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WorkFront".into(),
                id: id.to_string(),
            })
    }

    /// Soft delete de frente de trabalho
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let result =
            sqlx::query("UPDATE work_fronts SET deleted_at = ?, is_active = 0 WHERE id = ?")
                .bind(&now)
                .bind(id)
                .execute(self.pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "WorkFront".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }

    /// Atualiza status da frente de trabalho
    pub async fn update_status(&self, id: &str, status: &str) -> AppResult<WorkFront> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE work_fronts SET status = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WorkFront".into(),
                id: id.to_string(),
            })
    }
}
