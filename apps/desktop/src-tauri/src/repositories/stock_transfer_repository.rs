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
            "SELECT CAST(COUNT(*) AS INTEGER) + 1 FROM stock_transfers WHERE transfer_number LIKE ?",
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
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE id = ? AND deleted_at IS NULL
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
        let mut conditions = vec!["deleted_at IS NULL".to_string()];
        let mut params: Vec<String> = vec![];

        if let Some(s) = status {
            conditions.push("status = ?".to_string());
            params.push(s.to_string());
        }

        if let Some(src) = source_location_id {
            conditions.push("source_location_id = ?".to_string());
            params.push(src.to_string());
        }

        if let Some(dst) = destination_location_id {
            conditions.push("destination_location_id = ?".to_string());
            params.push(dst.to_string());
        }

        let where_clause = conditions.join(" AND ");

        let count_sql = format!(
            "SELECT COUNT(*) FROM stock_transfers WHERE {}",
            where_clause
        );
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE {}
            ORDER BY created_at DESC
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
            INSERT INTO stock_transfers (
                id, transfer_number, source_location_id, destination_location_id,
                requester_id, status, requested_at, notes,
                total_items, total_value, is_active, created_at, updated_at
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
            UPDATE stock_transfers 
            SET source_location_id = COALESCE(?, source_location_id),
                destination_location_id = COALESCE(?, destination_location_id),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ? AND status = 'PENDING' AND deleted_at IS NULL
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
            sqlx::query("UPDATE stock_transfers SET deleted_at = ?, is_active = 0 WHERE id = ?")
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
            "UPDATE stock_transfers SET status = 'APPROVED', approver_id = ?, approved_at = ?, updated_at = ? WHERE id = ?",
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
            "UPDATE stock_transfers SET status = 'REJECTED', approver_id = ?, rejection_reason = ?, updated_at = ? WHERE id = ?",
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

        // Buscar transferência
        let transfer = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })?;

        // Buscar itens
        let items = self.get_items(id).await?;

        // Deduzir do estoque de origem
        let loc_repo = crate::repositories::StockLocationRepository::new(self.pool);
        for item in &items {
            // Atualiza saldo (negativo)
            loc_repo
                .upsert_balance(
                    &transfer.source_location_id,
                    &item.product_id,
                    -item.requested_qty,
                )
                .await?;

            // Define shipped_qty = requested_qty se null
            if item.shipped_qty.is_none() {
                sqlx::query("UPDATE stock_transfer_items SET shipped_qty = ? WHERE id = ?")
                    .bind(item.requested_qty)
                    .bind(&item.id)
                    .execute(self.pool)
                    .await?;
            }
        }

        sqlx::query(
            "UPDATE stock_transfers SET status = 'IN_TRANSIT', shipper_id = ?, shipped_at = ?, updated_at = ? WHERE id = ?",
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

        // Buscar transferência
        let transfer = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockTransfer".into(),
                id: id.to_string(),
            })?;

        // Buscar itens
        let items = self.get_items(id).await?;

        // Adicionar ao estoque de destino
        let loc_repo = crate::repositories::StockLocationRepository::new(self.pool);
        for item in &items {
            // Se received_qty não foi setado (recebimento total automático), usa shipped_qty ou requested
            let qty_to_receive = item
                .received_qty
                .unwrap_or(item.shipped_qty.unwrap_or(item.requested_qty));

            // Atualiza saldo (positivo)
            loc_repo
                .upsert_balance(
                    &transfer.destination_location_id,
                    &item.product_id,
                    qty_to_receive,
                )
                .await?;

            // Atualiza o item se necessário
            if item.received_qty.is_none() {
                sqlx::query("UPDATE stock_transfer_items SET received_qty = ? WHERE id = ?")
                    .bind(qty_to_receive)
                    .bind(&item.id)
                    .execute(self.pool)
                    .await?;
            }
        }

        sqlx::query(
            "UPDATE stock_transfers SET status = 'COMPLETED', receiver_id = ?, received_at = ?, updated_at = ? WHERE id = ?",
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
            SELECT id, transfer_id, product_id,
                   requested_qty, shipped_qty,
                   received_qty, CAST(unit_price AS REAL) as unit_price,
                   notes, created_at, updated_at
            FROM stock_transfer_items
            WHERE transfer_id = ?
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
            "SELECT CAST(COALESCE(cost_price, sale_price, 0) AS REAL) FROM products WHERE id = ?",
        )
        .bind(&data.product_id)
        .fetch_one(self.pool)
        .await
        .unwrap_or((0.0,));

        sqlx::query(
            r#"
            INSERT INTO stock_transfer_items (
                id, transfer_id, product_id, requested_qty, unit_price, notes, created_at, updated_at
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
            SELECT id, transfer_id, product_id,
                   requested_qty, shipped_qty,
                   received_qty, CAST(unit_price AS REAL) as unit_price,
                   notes, created_at, updated_at
            FROM stock_transfer_items
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
        sqlx::query("DELETE FROM stock_transfer_items WHERE id = ? AND transfer_id = ?")
            .bind(item_id)
            .bind(transfer_id)
            .execute(self.pool)
            .await?;

        self.update_totals(transfer_id).await?;
        Ok(())
    }

    /// Atualiza quantidade despachada do item
    pub async fn update_item_shipped_qty(&self, item_id: &str, quantity: f64) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE stock_transfer_items SET shipped_qty = ?, updated_at = ? WHERE id = ?")
            .bind(quantity)
            .bind(&now)
            .bind(item_id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    /// Atualiza quantidade recebida do item
    pub async fn update_item_received_qty(&self, item_id: &str, quantity: f64) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE stock_transfer_items SET received_qty = ?, updated_at = ? WHERE id = ?",
        )
        .bind(quantity)
        .bind(&now)
        .bind(item_id)
        .execute(self.pool)
        .await?;
        Ok(())
    }

    /// Atualiza totais
    async fn update_totals(&self, transfer_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        let (total_items, total_value): (i32, f64) = sqlx::query_as(
            r#"
            SELECT CAST(COUNT(*) AS INTEGER), 
                   COALESCE(SUM(requested_qty * unit_price), 0)
            FROM stock_transfer_items 
            WHERE transfer_id = ?
            "#,
        )
        .bind(transfer_id)
        .fetch_one(self.pool)
        .await?;

        sqlx::query(
            "UPDATE stock_transfers SET total_items = ?, total_value = ?, updated_at = ? WHERE id = ?",
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
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE transfer_number = ? AND deleted_at IS NULL
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
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE source_location_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC
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
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE destination_location_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC
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
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE status = 'PENDING' AND deleted_at IS NULL
            ORDER BY created_at DESC
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
            SELECT id, transfer_number, 
                   source_location_id,
                   destination_location_id,
                   requester_id, approver_id,
                   shipper_id, receiver_id,
                   status, requested_at, approved_at,
                   shipped_at, received_at,
                   rejection_reason, notes,
                   total_items, CAST(total_value AS REAL) as total_value,
                   is_active, created_at,
                   updated_at, deleted_at
            FROM stock_transfers
            WHERE status = 'IN_TRANSIT' AND deleted_at IS NULL
            ORDER BY shipped_at DESC
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Cancela transferência
    pub async fn cancel(&self, id: &str) -> AppResult<StockTransfer> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE stock_transfers SET status = 'CANCELLED', updated_at = ? WHERE id = ?")
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
