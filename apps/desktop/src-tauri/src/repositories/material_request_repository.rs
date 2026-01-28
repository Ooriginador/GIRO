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
            "SELECT CAST(COUNT(*) AS INTEGER) + 1 FROM material_requests WHERE request_number LIKE ?",
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
            SELECT id, request_number, contract_id,
                   work_front_id, activity_id,
                   requester_id, approver_id,
                   separator_id, status, priority,
                   needed_date, approved_at,
                   separated_at, delivered_at, delivered_by_signature,
                   rejection_reason, notes,
                   source_location_id,
                   destination_location_id,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM material_requests
            WHERE id = ? AND deleted_at IS NULL
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
            SELECT id, request_number, contract_id,
                   work_front_id, activity_id,
                   requester_id, approver_id,
                   separator_id, status, priority,
                   needed_date, approved_at,
                   separated_at, delivered_at, delivered_by_signature,
                   rejection_reason, notes,
                   source_location_id,
                   destination_location_id,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM material_requests
            WHERE contract_id = ? AND request_number = ? AND deleted_at IS NULL
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
            conditions.push("(request_number LIKE ? OR notes LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(pattern.clone());
            params.push(pattern);
        }

        if let Some(contract_id) = &filters.contract_id {
            conditions.push("contract_id = ?".to_string());
            params.push(contract_id.clone());
        }

        if let Some(work_front_id) = &filters.work_front_id {
            conditions.push("work_front_id = ?".to_string());
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
            conditions.push("requester_id = ?".to_string());
            params.push(requester_id.clone());
        }

        let where_clause = conditions.join(" AND ");

        let count_sql = format!(
            "SELECT COUNT(*) FROM material_requests WHERE {}",
            where_clause
        );
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, request_number, contract_id,
                   work_front_id, activity_id,
                   requester_id, approver_id,
                   separator_id, status, priority,
                   needed_date, approved_at,
                   separated_at, delivered_at, delivered_by_signature,
                   rejection_reason, notes,
                   source_location_id,
                   destination_location_id,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM material_requests
            WHERE {}
            ORDER BY created_at DESC
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
            INSERT INTO material_requests (
                id, request_number, contract_id, work_front_id, activity_id,
                requester_id, status, priority, needed_date,
                source_location_id, destination_location_id, notes,
                total_items, total_value, is_active, created_at, updated_at
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
            UPDATE material_requests 
            SET work_front_id = COALESCE(?, work_front_id),
                activity_id = COALESCE(?, activity_id),
                priority = COALESCE(?, priority),
                needed_date = COALESCE(?, needed_date),
                destination_location_id = COALESCE(?, destination_location_id),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ? AND status = 'DRAFT' AND deleted_at IS NULL
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
            sqlx::query("UPDATE material_requests SET deleted_at = ?, is_active = 0 WHERE id = ?")
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
        sqlx::query("UPDATE material_requests SET status = 'PENDING', updated_at = ? WHERE id = ?")
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
            "UPDATE material_requests SET status = 'APPROVED', approver_id = ?, approved_at = ?, updated_at = ? WHERE id = ?",
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
                "UPDATE material_request_items SET approved_qty = ?, updated_at = ? WHERE id = ? AND request_id = ?",
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
            "UPDATE material_requests SET status = 'APPROVED', approver_id = ?, approved_at = ?, updated_at = ? WHERE id = ?",
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
            "UPDATE material_requests SET status = 'REJECTED', approver_id = ?, rejection_reason = ?, updated_at = ? WHERE id = ?",
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
    pub async fn deliver(&self, id: &str, signature: Option<String>) -> AppResult<MaterialRequest> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE material_requests SET status = 'DELIVERED', delivered_at = ?, delivered_by_signature = ?, updated_at = ? WHERE id = ?",
        )
        .bind(&now)
        .bind(signature)
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
            SELECT id, request_id, product_id,
                   requested_qty, approved_qty,
                   separated_qty, delivered_qty,
                   CAST(unit_price AS REAL) as unit_price, notes,
                   created_at, updated_at
            FROM material_request_items
            WHERE request_id = ?
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
            SELECT i.id, i.request_id, i.product_id, i.requested_qty, i.approved_qty,
                   i.separated_qty, i.delivered_qty, CAST(i.unit_price AS REAL),
                   i.notes, i.created_at, i.updated_at,
                   p.name as product_name, p.internal_code as product_code, p.unit as product_unit
            FROM material_request_items i
            JOIN products p ON i.product_id = p.id
            WHERE i.request_id = ?
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
            "SELECT CAST(COALESCE(cost_price, sale_price, 0) AS REAL) FROM products WHERE id = ?",
        )
        .bind(&data.product_id)
        .fetch_one(self.pool)
        .await
        .unwrap_or((0.0,));

        sqlx::query(
            r#"
            INSERT INTO material_request_items (
                id, request_id, product_id, requested_qty, unit_price, notes, created_at, updated_at
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
            SELECT id, request_id, product_id,
                   requested_qty, approved_qty,
                   separated_qty, delivered_qty,
                   CAST(unit_price AS REAL) as unit_price, notes,
                   created_at, updated_at
            FROM material_request_items
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
        sqlx::query("DELETE FROM material_request_items WHERE id = ? AND request_id = ?")
            .bind(item_id)
            .bind(request_id)
            .execute(self.pool)
            .await?;

        self.update_totals(request_id).await?;
        Ok(())
    }

    /// Atualiza quantidade entregue do item
    pub async fn update_item_delivered(&self, item_id: &str, qty: f64) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE material_request_items SET delivered_qty = ?, updated_at = ? WHERE id = ?",
        )
        .bind(qty)
        .bind(&now)
        .bind(item_id)
        .execute(self.pool)
        .await?;
        Ok(())
    }

    /// Atualiza quantidade separada do item
    pub async fn update_item_separated_qty(&self, item_id: &str, qty: f64) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE material_request_items SET separated_qty = ?, updated_at = ? WHERE id = ?",
        )
        .bind(qty)
        .bind(&now)
        .bind(item_id)
        .execute(self.pool)
        .await?;
        Ok(())
    }

    /// Atualiza totais da requisição
    async fn update_totals(&self, request_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        let (total_items, total_value): (i32, f64) = sqlx::query_as(
            r#"
            SELECT CAST(COUNT(*) AS INTEGER), 
                   COALESCE(SUM(requested_qty * unit_price), 0)
            FROM material_request_items 
            WHERE request_id = ?
            "#,
        )
        .bind(request_id)
        .fetch_one(self.pool)
        .await?;

        sqlx::query(
            "UPDATE material_requests SET total_items = ?, total_value = ?, updated_at = ? WHERE id = ?",
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
            SELECT id, request_number, contract_id,
                   work_front_id, activity_id,
                   requester_id, approver_id,
                   separator_id, status, priority,
                   needed_date, approved_at,
                   separated_at, delivered_at, delivered_by_signature,
                   rejection_reason, notes,
                   source_location_id,
                   destination_location_id,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM material_requests
            WHERE status = 'PENDING' AND deleted_at IS NULL
            ORDER BY priority DESC, created_at ASC
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
            "UPDATE material_requests SET status = 'SEPARATING', separator_id = ?, updated_at = ? WHERE id = ?",
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
            "UPDATE material_requests SET status = 'SEPARATED', separated_at = ?, updated_at = ? WHERE id = ?",
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
        sqlx::query(
            "UPDATE material_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?",
        )
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
