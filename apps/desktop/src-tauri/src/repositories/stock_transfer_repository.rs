//! Repositório de Transferências de Estoque - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{
    AddTransferItem, CreateStockTransfer, StockTransfer, StockTransferItem, UpdateStockTransfer,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct StockTransferRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> StockTransferRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Gera próximo número de transferência
    async fn next_transfer_number(&self) -> AppResult<String> {
        let year = chrono::Utc::now().format("%Y").to_string();
        let (count,): (i32,) = sqlx::query_as(
            "SELECT CAST(COUNT(*) AS INTEGER) + 1 FROM StockTransfer WHERE transferNumber LIKE ?",
        )
        .bind(format!("TR-{}-%", year))
        .fetch_one(self.pool)
        .await?;

        Ok(format!("TR-{}-{:04}", year, count))
    }

    /// Busca transferência por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<StockTransfer>> {
        let result = sqlx::query_as::<_, StockTransfer>(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE id = ? AND deletedAt IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista transferências com paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        status: Option<&str>,
        source_location_id: Option<&str>,
        destination_location_id: Option<&str>,
    ) -> AppResult<PaginatedResult<StockTransfer>> {
        let mut conditions = vec!["deletedAt IS NULL".to_string()];
        let mut params: Vec<String> = vec![];

        if let Some(s) = status {
            conditions.push("status = ?".to_string());
            params.push(s.to_string());
        }

        if let Some(src) = source_location_id {
            conditions.push("sourceLocationId = ?".to_string());
            params.push(src.to_string());
        }

        if let Some(dst) = destination_location_id {
            conditions.push("destinationLocationId = ?".to_string());
            params.push(dst.to_string());
        }

        let where_clause = conditions.join(" AND ");

        let count_sql = format!("SELECT COUNT(*) FROM StockTransfer WHERE {}", where_clause);
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE {}
            ORDER BY createdAt DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, StockTransfer>(&data_sql);
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

    /// Cria nova transferência
    pub async fn create(
        &self,
        data: CreateStockTransfer,
        requester_id: &str,
    ) -> AppResult<StockTransfer> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let transfer_number = self.next_transfer_number().await?;

        sqlx::query(
            r#"
            INSERT INTO StockTransfer (
                id, transferNumber, sourceLocationId, destinationLocationId,
                requesterId, status, requestedAt, notes,
                totalItems, totalValue, isActive, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, 0, 1, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&transfer_number)
        .bind(&data.source_location_id)
        .bind(&data.destination_location_id)
        .bind(requester_id)
        .bind(&now)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id,
            })
    }

    /// Atualiza transferência (somente status PENDING)
    pub async fn update(&self, id: &str, data: UpdateStockTransfer) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query(
            r#"
            UPDATE StockTransfer 
            SET sourceLocationId = COALESCE(?, sourceLocationId),
                destinationLocationId = COALESCE(?, destinationLocationId),
                notes = COALESCE(?, notes),
                updatedAt = ?
            WHERE id = ? AND status = 'PENDING' AND deletedAt IS NULL
            "#,
        )
        .bind(data.source_location_id)
        .bind(data.destination_location_id)
        .bind(data.notes)
        .bind(now)
        .bind(id)
        .execute(self.pool)
        .await?;

        if result.rows_affected() == 0 {
            let current = self.find_by_id(id).await?;
            if let Some(tr) = current {
                if tr.status != "PENDING" {
                    return Err(AppError::BusinessRule(
                        "Apenas transferências Pendentes podem ser editadas.".into(),
                    ));
                }
            } else {
                return Err(AppError::NotFound {
                    entity: "StockTransfer".into(),
                    id: id.to_string(),
                });
            }
        }

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })
    }

    /// Soft delete
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let result =
            sqlx::query("UPDATE StockTransfer SET deletedAt = ?, isActive = 0 WHERE id = ?")
                .bind(&now)
                .bind(id)
                .execute(self.pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }

    /// Aprova transferência
    pub async fn approve(&self, id: &str, approver_id: &str) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE StockTransfer SET status = 'APPROVED', approverId = ?, approvedAt = ?, updatedAt = ? WHERE id = ?",
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
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })
    }

    /// Rejeita transferência
    pub async fn reject(
        &self,
        id: &str,
        approver_id: &str,
        reason: &str,
    ) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE StockTransfer SET status = 'REJECTED', approverId = ?, rejectionReason = ?, updatedAt = ? WHERE id = ?",
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
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })
    }

    /// Marca como em trânsito
    pub async fn ship(&self, id: &str, shipper_id: &str) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE StockTransfer SET status = 'IN_TRANSIT', shipperId = ?, shippedAt = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(shipper_id)
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })
    }

    /// Recebe transferência
    pub async fn receive(&self, id: &str, receiver_id: &str) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE StockTransfer SET status = 'COMPLETED', receiverId = ?, receivedAt = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(receiver_id)
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })
    }

    /// Lista itens da transferência
    pub async fn get_items(&self, transfer_id: &str) -> AppResult<Vec<StockTransferItem>> {
        let result = sqlx::query_as::<_, StockTransferItem>(
            r#"
            SELECT id, transferId as transfer_id, productId as product_id,
                   requestedQty as requested_qty, shippedQty as shipped_qty,
                   receivedQty as received_qty, CAST(unitPrice AS REAL) as unit_price,
                   notes, createdAt as created_at, updatedAt as updated_at
            FROM StockTransferItem
            WHERE transferId = ?
            "#,
        )
        .bind(transfer_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Adiciona item à transferência
    pub async fn add_item(
        &self,
        transfer_id: &str,
        data: AddTransferItem,
    ) -> AppResult<StockTransferItem> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        let (unit_price,): (f64,) = sqlx::query_as(
            "SELECT CAST(COALESCE(costPrice, salePrice, 0) AS REAL) FROM Product WHERE id = ?",
        )
        .bind(&data.product_id)
        .fetch_one(self.pool)
        .await
        .unwrap_or((0.0,));

        sqlx::query(
            r#"
            INSERT INTO StockTransferItem (
                id, transferId, productId, requestedQty, unitPrice, notes, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(transfer_id)
        .bind(&data.product_id)
        .bind(data.requested_qty)
        .bind(unit_price)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.update_totals(transfer_id).await?;

        let item = sqlx::query_as::<_, StockTransferItem>(
            r#"
            SELECT id, transferId as transfer_id, productId as product_id,
                   requestedQty as requested_qty, shippedQty as shipped_qty,
                   receivedQty as received_qty, CAST(unitPrice AS REAL) as unit_price,
                   notes, createdAt as created_at, updatedAt as updated_at
            FROM StockTransferItem
            WHERE id = ?
            "#,
        )
        .bind(&id)
        .fetch_one(self.pool)
        .await?;

        Ok(item)
    }

    /// Remove item
    pub async fn remove_item(&self, transfer_id: &str, item_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM StockTransferItem WHERE id = ? AND transferId = ?")
            .bind(item_id)
            .bind(transfer_id)
            .execute(self.pool)
            .await?;

        self.update_totals(transfer_id).await?;
        Ok(())
    }

    /// Atualiza totais
    async fn update_totals(&self, transfer_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        let (total_items, total_value): (i32, f64) = sqlx::query_as(
            r#"
            SELECT CAST(COUNT(*) AS INTEGER), 
                   COALESCE(SUM(requestedQty * unitPrice), 0)
            FROM StockTransferItem 
            WHERE transferId = ?
            "#,
        )
        .bind(transfer_id)
        .fetch_one(self.pool)
        .await?;

        sqlx::query(
            "UPDATE StockTransfer SET totalItems = ?, totalValue = ?, updatedAt = ? WHERE id = ?",
        )
        .bind(total_items)
        .bind(total_value)
        .bind(&now)
        .bind(transfer_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    // =========================================================================
    // MÉTODOS ADICIONAIS PARA COMMANDS
    // =========================================================================

    /// Busca transferência por número
    pub async fn find_by_number(&self, transfer_number: &str) -> AppResult<Option<StockTransfer>> {
        let result = sqlx::query_as::<_, StockTransfer>(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE transferNumber = ? AND deletedAt IS NULL
            "#,
        )
        .bind(transfer_number)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca por local de origem
    pub async fn find_by_source(&self, location_id: &str) -> AppResult<Vec<StockTransfer>> {
        let result = sqlx::query_as::<_, StockTransfer>(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE sourceLocationId = ? AND deletedAt IS NULL
            ORDER BY createdAt DESC
            "#,
        )
        .bind(location_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca por local de destino
    pub async fn find_by_destination(&self, location_id: &str) -> AppResult<Vec<StockTransfer>> {
        let result = sqlx::query_as::<_, StockTransfer>(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE destinationLocationId = ? AND deletedAt IS NULL
            ORDER BY createdAt DESC
            "#,
        )
        .bind(location_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca pendentes de aprovação
    pub async fn find_pending(&self) -> AppResult<Vec<StockTransfer>> {
        let result = sqlx::query_as::<_, StockTransfer>(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE status = 'PENDING' AND deletedAt IS NULL
            ORDER BY createdAt DESC
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca em trânsito
    pub async fn find_in_transit(&self) -> AppResult<Vec<StockTransfer>> {
        let result = sqlx::query_as::<_, StockTransfer>(
            r#"
            SELECT id, transferNumber as transfer_number, 
                   sourceLocationId as source_location_id,
                   destinationLocationId as destination_location_id,
                   requesterId as requester_id, approverId as approver_id,
                   shipperId as shipper_id, receiverId as receiver_id,
                   status, requestedAt as requested_at, approvedAt as approved_at,
                   shippedAt as shipped_at, receivedAt as received_at,
                   rejectionReason as rejection_reason, notes,
                   totalItems as total_items, CAST(totalValue AS REAL) as total_value,
                   isActive as is_active, createdAt as created_at,
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockTransfer
            WHERE status = 'IN_TRANSIT' AND deletedAt IS NULL
            ORDER BY shippedAt DESC
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Cancela transferência
    pub async fn cancel(&self, id: &str) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE StockTransfer SET status = 'CANCELLED', updatedAt = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })
    }
}
