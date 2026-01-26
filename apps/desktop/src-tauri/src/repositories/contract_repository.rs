//! Repositório de Contratos - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{
    Contract, ContractDashboard, ContractFilters, CreateContract, UpdateContract,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct ContractRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ContractRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Busca contrato por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Contract>> {
        let result = sqlx::query_as::<_, Contract>(
            r#"
            SELECT id, code, name, description, clientName as client_name, 
                   clientCNPJ as client_document, status,
                   startDate as start_date, endDate as end_date, 
                   CAST(budget AS REAL) as budget, managerId as manager_id, 
                   address, city, state, notes,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM Contract
            WHERE id = ? AND deletedAt IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca contrato por código
    pub async fn find_by_code(&self, code: &str) -> AppResult<Option<Contract>> {
        let result = sqlx::query_as::<_, Contract>(
            r#"
            SELECT id, code, name, description, clientName as client_name, 
                   clientCNPJ as client_document, status,
                   startDate as start_date, endDate as end_date, 
                   CAST(budget AS REAL) as budget, managerId as manager_id, 
                   address, city, state, notes,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM Contract
            WHERE code = ? AND deletedAt IS NULL
            "#,
        )
        .bind(code)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista contratos ativos
    pub async fn find_all_active(&self) -> AppResult<Vec<Contract>> {
        let result = sqlx::query_as::<_, Contract>(
            r#"
            SELECT id, code, name, description, clientName as client_name, 
                   clientCNPJ as client_document, status,
                   startDate as start_date, endDate as end_date, 
                   CAST(budget AS REAL) as budget, managerId as manager_id, 
                   address, city, state, notes,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM Contract
            WHERE isActive = 1 AND deletedAt IS NULL
            ORDER BY name
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista contratos com filtros e paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        filters: &ContractFilters,
    ) -> AppResult<PaginatedResult<Contract>> {
        let mut conditions = vec!["deletedAt IS NULL".to_string()];
        let mut params: Vec<String> = vec![];

        if let Some(search) = &filters.search {
            conditions.push("(code LIKE ? OR name LIKE ? OR clientName LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(pattern.clone());
            params.push(pattern.clone());
            params.push(pattern);
        }

        if let Some(status) = &filters.status {
            conditions.push("status = ?".to_string());
            params.push(status.clone());
        }

        if let Some(manager_id) = &filters.manager_id {
            conditions.push("managerId = ?".to_string());
            params.push(manager_id.clone());
        }

        if let Some(is_active) = filters.is_active {
            conditions.push("isActive = ?".to_string());
            params.push(if is_active { "1" } else { "0" }.to_string());
        }

        let where_clause = conditions.join(" AND ");

        // Count total
        let count_sql = format!("SELECT COUNT(*) FROM Contract WHERE {}", where_clause);
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        // Fetch data
        let data_sql = format!(
            r#"
            SELECT id, code, name, description, clientName as client_name, 
                   clientCNPJ as client_document, status,
                   startDate as start_date, endDate as end_date, 
                   CAST(budget AS REAL) as budget, managerId as manager_id, 
                   address, city, state, notes,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM Contract
            WHERE {}
            ORDER BY createdAt DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, Contract>(&data_sql);
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

    /// Cria novo contrato
    pub async fn create(&self, data: CreateContract) -> AppResult<Contract> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let budget = data.budget.unwrap_or(0.0);

        sqlx::query(
            r#"
            INSERT INTO Contract (
                id, code, name, description, clientName, clientCNPJ, status,
                startDate, endDate, budget, costCenter, managerId, address, city, state, notes,
                isActive, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, 'PLANNING', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&data.code)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&data.client_name)
        .bind(&data.client_document)
        .bind(&data.start_date)
        .bind(&data.end_date)
        .bind(budget)
        .bind("DEFAULT") // costCenter
        .bind(&data.manager_id)
        .bind(&data.address)
        .bind(&data.city)
        .bind(&data.state)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Contract".into(),
                id,
            })
    }

    /// Atualiza contrato existente
    pub async fn update(&self, id: &str, data: UpdateContract) -> AppResult<Contract> {
        let _ = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Contract".into(),
                id: id.to_string(),
            })?;

        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE Contract SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                clientName = COALESCE(?, clientName),
                clientCNPJ = COALESCE(?, clientCNPJ),
                status = COALESCE(?, status),
                startDate = COALESCE(?, startDate),
                endDate = COALESCE(?, endDate),
                budget = COALESCE(?, budget),
                managerId = COALESCE(?, managerId),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                notes = COALESCE(?, notes),
                updatedAt = ?
            WHERE id = ?
            "#,
        )
        .bind(&data.name)
        .bind(&data.description)
        .bind(&data.client_name)
        .bind(&data.client_document)
        .bind(&data.status)
        .bind(&data.start_date)
        .bind(&data.end_date)
        .bind(&data.budget)
        .bind(&data.manager_id)
        .bind(&data.address)
        .bind(&data.city)
        .bind(&data.state)
        .bind(&data.notes)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Contract".into(),
                id: id.to_string(),
            })
    }

    /// Soft delete de contrato
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let result = sqlx::query("UPDATE Contract SET deletedAt = ?, isActive = 0 WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "Contract".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }

    /// Altera status do contrato
    pub async fn update_status(&self, id: &str, status: &str) -> AppResult<Contract> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE Contract SET status = ?, updatedAt = ? WHERE id = ?")
            .bind(status)
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Contract".into(),
                id: id.to_string(),
            })
    }

    /// Dashboard do contrato
    pub async fn get_dashboard(&self, id: &str) -> AppResult<ContractDashboard> {
        let contract = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Contract".into(),
                id: id.to_string(),
            })?;

        // Contagem de frentes de trabalho
        let (work_fronts_count,): (i32,) = sqlx::query_as(
            "SELECT CAST(COUNT(*) AS INTEGER) FROM WorkFront WHERE contractId = ? AND deletedAt IS NULL",
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        // Contagem de atividades
        let (activities_count,): (i32,) = sqlx::query_as(
            r#"
            SELECT CAST(COUNT(*) AS INTEGER) FROM Activity a
            JOIN WorkFront wf ON a.workFrontId = wf.id
            WHERE wf.contractId = ? AND a.deletedAt IS NULL
            "#,
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        // Requisições por status
        let (requests_pending,): (i32,) = sqlx::query_as(
            "SELECT CAST(COUNT(*) AS INTEGER) FROM MaterialRequest WHERE contractId = ? AND status = 'PENDING' AND deletedAt IS NULL",
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        let (requests_approved,): (i32,) = sqlx::query_as(
            "SELECT CAST(COUNT(*) AS INTEGER) FROM MaterialRequest WHERE contractId = ? AND status = 'APPROVED' AND deletedAt IS NULL",
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        let (requests_delivered,): (i32,) = sqlx::query_as(
            "SELECT CAST(COUNT(*) AS INTEGER) FROM MaterialRequest WHERE contractId = ? AND status = 'DELIVERED' AND deletedAt IS NULL",
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        // Consumo total
        let (total_consumption,): (f64,) = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(mc.totalCost), 0.0) FROM MaterialConsumption mc
            JOIN Activity a ON mc.activityId = a.id
            JOIN WorkFront wf ON a.workFrontId = wf.id
            WHERE wf.contractId = ?
            "#,
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        let budget_used_percent = if contract.budget > 0.0 {
            (total_consumption / contract.budget) * 100.0
        } else {
            0.0
        };

        Ok(ContractDashboard {
            contract,
            work_fronts_count,
            activities_count,
            requests_pending,
            requests_approved,
            requests_delivered,
            total_consumption,
            budget_used_percent,
        })
    }
}
