//! Repositório de Requisições de Material - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{
    AddRequestItem, CreateMaterialRequest, MaterialRequest, MaterialRequestItem,
    MaterialRequestItemWithProduct, RequestFilters, UpdateMaterialRequest,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct MaterialRequestRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> MaterialRequestRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Gera próximo número de requisição
    async fn next_request_number(&self) -> AppResult<String> {
        let year = chrono::Utc::now().format("%Y").to_string();
        let (count,): (i32,) = sqlx::query_as(
            "SELECT CAST(COUNT(*) AS INTEGER) + 1 FROM MaterialRequest WHERE requestNumber LIKE ?",
        )
        .bind(format!("RM-{}-%", year))
        .fetch_one(self.pool)
        .await?;

        Ok(format!("RM-{}-{:04}", year, count))
    }

    /// Busca requisição por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<MaterialRequest>> {
        let result = sqlx::query_as::<_, MaterialRequest>(
            r#"
            SELECT id, requestNumber as request_number, contractId as contract_id,
                   workFrontId as work_front_id, activityId as activity_id,
                   requesterId as requester_id, approverId as approver_id,
                   separatorId as separator_id, status, priority,
                   neededDate as needed_date, approvedAt as approved_at,
                   separatedAt as separated_at, deliveredAt as delivered_at,
                   rejectionReason as rejection_reason, notes,
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM MaterialRequest
            WHERE id = ? AND deletedAt IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca requisição por número e contrato
    pub async fn find_by_number(
        &self,
        contract_id: &str,
        request_number: &str,
    ) -> AppResult<Option<MaterialRequest>> {
        let result = sqlx::query_as::<_, MaterialRequest>(
            r#"
            SELECT id, requestNumber as request_number, contractId as contract_id,
                   workFrontId as work_front_id, activityId as activity_id,
                   requesterId as requester_id, approverId as approver_id,
                   separatorId as separator_id, status, priority,
                   neededDate as needed_date, approvedAt as approved_at,
                   separatedAt as separated_at, deliveredAt as delivered_at,
                   rejectionReason as rejection_reason, notes,
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM MaterialRequest
            WHERE contractId = ? AND requestNumber = ? AND deletedAt IS NULL
            "#,
        )
        .bind(contract_id)
        .bind(request_number)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista requisições com filtros e paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        filters: &RequestFilters,
    ) -> AppResult<PaginatedResult<MaterialRequest>> {
        let mut conditions = vec!["deletedAt IS NULL".to_string()];
        let mut params: Vec<String> = vec![];

        if let Some(search) = &filters.search {
            conditions.push("(requestNumber LIKE ? OR notes LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(pattern.clone());
            params.push(pattern);
        }

        if let Some(contract_id) = &filters.contract_id {
            conditions.push("contractId = ?".to_string());
            params.push(contract_id.clone());
        }

        if let Some(work_front_id) = &filters.work_front_id {
            conditions.push("workFrontId = ?".to_string());
            params.push(work_front_id.clone());
        }

        if let Some(status) = &filters.status {
            conditions.push("status = ?".to_string());
            params.push(status.clone());
        }

        if let Some(priority) = &filters.priority {
            conditions.push("priority = ?".to_string());
            params.push(priority.clone());
        }

        if let Some(requester_id) = &filters.requester_id {
            conditions.push("requesterId = ?".to_string());
            params.push(requester_id.clone());
        }

        let where_clause = conditions.join(" AND ");

        let count_sql = format!(
            "SELECT COUNT(*) FROM MaterialRequest WHERE {}",
            where_clause
        );
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, requestNumber as request_number, contractId as contract_id,
                   workFrontId as work_front_id, activityId as activity_id,
                   requesterId as requester_id, approverId as approver_id,
                   separatorId as separator_id, status, priority,
                   neededDate as needed_date, approvedAt as approved_at,
                   separatedAt as separated_at, deliveredAt as delivered_at,
                   rejectionReason as rejection_reason, notes,
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM MaterialRequest
            WHERE {}
            ORDER BY createdAt DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, MaterialRequest>(&data_sql);
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

    /// Cria nova requisição
    pub async fn create(
        &self,
        data: CreateMaterialRequest,
        requester_id: &str,
    ) -> AppResult<MaterialRequest> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let request_number = self.next_request_number().await?;
        let priority = data.priority.unwrap_or_else(|| "NORMAL".to_string());

        sqlx::query(
            r#"
            INSERT INTO MaterialRequest (
                id, requestNumber, contractId, workFrontId, activityId,
                requesterId, status, priority, neededDate,
                sourceLocationId, destinationLocationId, notes,
                totalItems, totalValue, isActive, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, 0, 0, 1, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&request_number)
        .bind(&data.contract_id)
        .bind(&data.work_front_id)
        .bind(&data.activity_id)
        .bind(requester_id)
        .bind(&priority)
        .bind(&data.needed_date)
        .bind(&data.source_location_id)
        .bind(&data.destination_location_id)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id,
            })
    }

    /// Atualiza requisição existente (somente status DRAFT)
    pub async fn update(
        &self,
        id: &str,
        data: UpdateMaterialRequest,
    ) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query(
            r#"
            UPDATE MaterialRequest 
            SET workFrontId = COALESCE(?, workFrontId),
                activityId = COALESCE(?, activityId),
                priority = COALESCE(?, priority),
                neededDate = COALESCE(?, neededDate),
                destinationLocationId = COALESCE(?, destinationLocationId),
                notes = COALESCE(?, notes),
                updatedAt = ?
            WHERE id = ? AND status = 'DRAFT' AND deletedAt IS NULL
            "#,
        )
        .bind(data.work_front_id)
        .bind(data.activity_id)
        .bind(data.priority)
        .bind(data.needed_date)
        .bind(data.destination_location_id)
        .bind(data.notes)
        .bind(now)
        .bind(id)
        .execute(self.pool)
        .await?;

        if result.rows_affected() == 0 {
            // Check if it exists but status is wrong, or if it doesn't exist
            let current = self.find_by_id(id).await?;
            if let Some(req) = current {
                if req.status != "DRAFT" {
                    return Err(AppError::BusinessRule(
                        "Apenas requisições em Rascunho podem ser editadas.".into(),
                    ));
                }
            } else {
                return Err(AppError::NotFound {
                    entity: "MaterialRequest".into(),
                    id: id.to_string(),
                });
            }
        }

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Soft delete de requisição
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let result =
            sqlx::query("UPDATE MaterialRequest SET deletedAt = ?, isActive = 0 WHERE id = ?")
                .bind(&now)
                .bind(id)
                .execute(self.pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }

    // =========================================================================
    // STATUS WORKFLOW
    // =========================================================================

    /// Envia requisição para aprovação
    pub async fn submit(&self, id: &str) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE MaterialRequest SET status = 'PENDING', updatedAt = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Aprova requisição
    pub async fn approve(&self, id: &str, approver_id: &str) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE MaterialRequest SET status = 'APPROVED', approverId = ?, approvedAt = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(approver_id)
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Aprova requisição com quantidades parciais por item
    pub async fn approve_with_items(
        &self,
        id: &str,
        approver_id: &str,
        items: &[crate::commands::ApproveItemInput],
    ) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();

        // Atualiza approved_qty de cada item
        for item in items {
            sqlx::query(
                "UPDATE MaterialRequestItem SET approvedQty = ?, updatedAt = ? WHERE id = ? AND requestId = ?",
            )
            .bind(item.approved_qty)
            .bind(&now)
            .bind(&item.item_id)
            .bind(id)
            .execute(self.pool)
            .await?;
        }

        // Atualiza status da requisição
        sqlx::query(
            "UPDATE MaterialRequest SET status = 'APPROVED', approverId = ?, approvedAt = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(approver_id)
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Rejeita requisição
    pub async fn reject(
        &self,
        id: &str,
        approver_id: &str,
        reason: &str,
    ) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE MaterialRequest SET status = 'REJECTED', approverId = ?, rejectionReason = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(approver_id)
        .bind(reason)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Marca como entregue
    pub async fn deliver(&self, id: &str) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE MaterialRequest SET status = 'DELIVERED', deliveredAt = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    // =========================================================================
    // ITENS DA REQUISIÇÃO
    // =========================================================================

    /// Lista itens da requisição
    pub async fn get_items(&self, request_id: &str) -> AppResult<Vec<MaterialRequestItem>> {
        let result = sqlx::query_as::<_, MaterialRequestItem>(
            r#"
            SELECT id, requestId as request_id, productId as product_id,
                   requestedQty as requested_qty, approvedQty as approved_qty,
                   separatedQty as separated_qty, deliveredQty as delivered_qty,
                   CAST(unitPrice AS REAL) as unit_price, notes,
                   createdAt as created_at, updatedAt as updated_at
            FROM MaterialRequestItem
            WHERE requestId = ?
            "#,
        )
        .bind(request_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista itens com informações do produto
    pub async fn get_items_with_products(
        &self,
        request_id: &str,
    ) -> AppResult<Vec<MaterialRequestItemWithProduct>> {
        let rows = sqlx::query_as::<
            _,
            (
                String,
                String,
                String,
                f64,
                Option<f64>,
                Option<f64>,
                Option<f64>,
                f64,
                Option<String>,
                String,
                String,
                String,
                String,
                String,
            ),
        >(
            r#"
            SELECT i.id, i.requestId, i.productId, i.requestedQty, i.approvedQty,
                   i.separatedQty, i.deliveredQty, CAST(i.unitPrice AS REAL),
                   i.notes, i.createdAt, i.updatedAt,
                   p.name as product_name, p.sku as product_code, p.unit as product_unit
            FROM MaterialRequestItem i
            JOIN Product p ON i.productId = p.id
            WHERE i.requestId = ?
            ORDER BY p.name
            "#,
        )
        .bind(request_id)
        .fetch_all(self.pool)
        .await?;

        let result: Vec<MaterialRequestItemWithProduct> = rows
            .into_iter()
            .map(|row| MaterialRequestItemWithProduct {
                item: MaterialRequestItem {
                    id: row.0,
                    request_id: row.1,
                    product_id: row.2,
                    requested_qty: row.3,
                    approved_qty: row.4,
                    separated_qty: row.5,
                    delivered_qty: row.6,
                    unit_price: row.7,
                    notes: row.8,
                    created_at: row.9,
                    updated_at: row.10,
                },
                product_name: row.11,
                product_code: row.12,
                product_unit: row.13,
            })
            .collect();

        Ok(result)
    }

    /// Adiciona item à requisição
    pub async fn add_item(
        &self,
        request_id: &str,
        data: AddRequestItem,
    ) -> AppResult<MaterialRequestItem> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Get product price
        let (unit_price,): (f64,) = sqlx::query_as(
            "SELECT CAST(COALESCE(costPrice, salePrice, 0) AS REAL) FROM Product WHERE id = ?",
        )
        .bind(&data.product_id)
        .fetch_one(self.pool)
        .await
        .unwrap_or((0.0,));

        sqlx::query(
            r#"
            INSERT INTO MaterialRequestItem (
                id, requestId, productId, requestedQty, unitPrice, notes, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(request_id)
        .bind(&data.product_id)
        .bind(data.requested_qty)
        .bind(unit_price)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Update totals
        self.update_totals(request_id).await?;

        let item = sqlx::query_as::<_, MaterialRequestItem>(
            r#"
            SELECT id, requestId as request_id, productId as product_id,
                   requestedQty as requested_qty, approvedQty as approved_qty,
                   separatedQty as separated_qty, deliveredQty as delivered_qty,
                   CAST(unitPrice AS REAL) as unit_price, notes,
                   createdAt as created_at, updatedAt as updated_at
            FROM MaterialRequestItem
            WHERE id = ?
            "#,
        )
        .bind(&id)
        .fetch_one(self.pool)
        .await?;

        Ok(item)
    }

    /// Remove item da requisição
    pub async fn remove_item(&self, request_id: &str, item_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM MaterialRequestItem WHERE id = ? AND requestId = ?")
            .bind(item_id)
            .bind(request_id)
            .execute(self.pool)
            .await?;

        self.update_totals(request_id).await?;
        Ok(())
    }

    /// Atualiza totais da requisição
    async fn update_totals(&self, request_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        let (total_items, total_value): (i32, f64) = sqlx::query_as(
            r#"
            SELECT CAST(COUNT(*) AS INTEGER), 
                   COALESCE(SUM(requestedQty * unitPrice), 0)
            FROM MaterialRequestItem 
            WHERE requestId = ?
            "#,
        )
        .bind(request_id)
        .fetch_one(self.pool)
        .await?;

        sqlx::query(
            "UPDATE MaterialRequest SET totalItems = ?, totalValue = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(total_items)
        .bind(total_value)
        .bind(&now)
        .bind(request_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    // =========================================================================
    // MÉTODOS ADICIONAIS PARA COMMANDS
    // =========================================================================

    /// Busca requisições pendentes de aprovação
    pub async fn find_pending_approval(
        &self,
        _approver_id: Option<&str>,
    ) -> AppResult<Vec<MaterialRequest>> {
        let result = sqlx::query_as::<_, MaterialRequest>(
            r#"
            SELECT id, requestNumber as request_number, contractId as contract_id,
                   workFrontId as work_front_id, activityId as activity_id,
                   requesterId as requester_id, approverId as approver_id,
                   separatorId as separator_id, status, priority,
                   neededDate as needed_date, approvedAt as approved_at,
                   separatedAt as separated_at, deliveredAt as delivered_at,
                   rejectionReason as rejection_reason, notes,
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM MaterialRequest
            WHERE status = 'PENDING' AND deletedAt IS NULL
            ORDER BY priority DESC, createdAt ASC
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Inicia separação
    pub async fn start_separation(
        &self,
        id: &str,
        separator_id: &str,
    ) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE MaterialRequest SET status = 'SEPARATING', separatorId = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(separator_id)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Completa separação
    pub async fn complete_separation(&self, id: &str) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE MaterialRequest SET status = 'SEPARATED', separatedAt = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }

    /// Cancela requisição
    pub async fn cancel(&self, id: &str) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE MaterialRequest SET status = 'CANCELLED', updatedAt = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "MaterialRequest".into(),
                id: id.to_string(),
            })
    }
}
