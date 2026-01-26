//! Repositório de Locais de Estoque - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{
    CreateStockLocation, StockBalance, StockBalanceWithProduct, StockLocation,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct StockLocationRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> StockLocationRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Busca local de estoque por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<StockLocation>> {
        let result = sqlx::query_as::<_, StockLocation>(
            r#"
            SELECT id, code, name, description, locationType as location_type,
                   contractId as contract_id, workFrontId as work_front_id,
                   address, responsibleId as responsible_id,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockLocation
            WHERE id = ? AND deletedAt IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Busca local por código
    pub async fn find_by_code(&self, code: &str) -> AppResult<Option<StockLocation>> {
        let result = sqlx::query_as::<_, StockLocation>(
            r#"
            SELECT id, code, name, description, locationType as location_type,
                   contractId as contract_id, workFrontId as work_front_id,
                   address, responsibleId as responsible_id,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockLocation
            WHERE code = ? AND deletedAt IS NULL
            "#,
        )
        .bind(code)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista locais por contrato
    pub async fn find_by_contract(&self, contract_id: &str) -> AppResult<Vec<StockLocation>> {
        let result = sqlx::query_as::<_, StockLocation>(
            r#"
            SELECT id, code, name, description, locationType as location_type,
                   contractId as contract_id, workFrontId as work_front_id,
                   address, responsibleId as responsible_id,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockLocation
            WHERE contractId = ? AND deletedAt IS NULL
            ORDER BY name
            "#,
        )
        .bind(contract_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista todos os locais ativos
    pub async fn find_all_active(&self) -> AppResult<Vec<StockLocation>> {
        let result = sqlx::query_as::<_, StockLocation>(
            r#"
            SELECT id, code, name, description, locationType as location_type,
                   contractId as contract_id, workFrontId as work_front_id,
                   address, responsibleId as responsible_id,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockLocation
            WHERE isActive = 1 AND deletedAt IS NULL
            ORDER BY name
            "#,
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista locais com paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        location_type: Option<&str>,
    ) -> AppResult<PaginatedResult<StockLocation>> {
        let (where_clause, bind_type) = match location_type {
            Some(lt) => (
                "locationType = ? AND deletedAt IS NULL".to_string(),
                Some(lt),
            ),
            None => ("deletedAt IS NULL".to_string(), None),
        };

        let count_sql = format!("SELECT COUNT(*) FROM StockLocation WHERE {}", where_clause);
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        if let Some(lt) = bind_type {
            count_query = count_query.bind(lt);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, code, name, description, locationType as location_type,
                   contractId as contract_id, workFrontId as work_front_id,
                   address, responsibleId as responsible_id,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockLocation
            WHERE {}
            ORDER BY name
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, StockLocation>(&data_sql);
        if let Some(lt) = bind_type {
            data_query = data_query.bind(lt);
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

    /// Cria novo local de estoque
    pub async fn create(&self, data: CreateStockLocation) -> AppResult<StockLocation> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let location_type = data
            .location_type
            .unwrap_or_else(|| "WAREHOUSE".to_string());

        sqlx::query(
            r#"
            INSERT INTO StockLocation (
                id, code, name, description, locationType, contractId, workFrontId,
                address, responsibleId, isActive, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&data.code)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&location_type)
        .bind(&data.contract_id)
        .bind(&data.work_front_id)
        .bind(&data.address)
        .bind(&data.responsible_id)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockLocation".into(),
                id,
            })
    }

    /// Soft delete de local
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let result =
            sqlx::query("UPDATE StockLocation SET deletedAt = ?, isActive = 0 WHERE id = ?")
                .bind(&now)
                .bind(id)
                .execute(self.pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound {
                entity: "StockLocation".into(),
                id: id.to_string(),
            });
        }
        Ok(())
    }

    // =========================================================================
    // SALDOS DE ESTOQUE
    // =========================================================================

    /// Busca saldo de um produto em um local
    pub async fn get_balance(
        &self,
        location_id: &str,
        product_id: &str,
    ) -> AppResult<Option<StockBalance>> {
        let result = sqlx::query_as::<_, StockBalance>(
            r#"
            SELECT id, locationId as location_id, productId as product_id,
                   quantity, reservedQty as reserved_qty, minQty as min_qty, 
                   maxQty as max_qty, lastCountDate as last_count_date, 
                   lastCountQty as last_count_qty,
                   createdAt as created_at, updatedAt as updated_at
            FROM StockBalance
            WHERE locationId = ? AND productId = ?
            "#,
        )
        .bind(location_id)
        .bind(product_id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista saldos de um local com informações do produto
    pub async fn get_balances_with_products(
        &self,
        location_id: &str,
    ) -> AppResult<Vec<StockBalanceWithProduct>> {
        let rows = sqlx::query_as::<
            _,
            (
                String,
                String,
                String,
                f64,
                f64,
                f64,
                Option<f64>,
                Option<String>,
                Option<f64>,
                String,
                String,
                String,
                String,
                String,
            ),
        >(
            r#"
            SELECT sb.id, sb.locationId, sb.productId, sb.quantity, sb.reservedQty, 
                   sb.minQty, sb.maxQty, sb.lastCountDate, sb.lastCountQty,
                   sb.createdAt, sb.updatedAt,
                   p.name as product_name, p.sku as product_code, p.unit as product_unit
            FROM StockBalance sb
            JOIN Product p ON sb.productId = p.id
            WHERE sb.locationId = ?
            ORDER BY p.name
            "#,
        )
        .bind(location_id)
        .fetch_all(self.pool)
        .await?;

        let result: Vec<StockBalanceWithProduct> = rows
            .into_iter()
            .map(|row| {
                let balance = StockBalance {
                    id: row.0,
                    location_id: row.1,
                    product_id: row.2,
                    quantity: row.3,
                    reserved_qty: row.4,
                    min_qty: row.5,
                    max_qty: row.6,
                    last_count_date: row.7,
                    last_count_qty: row.8,
                    created_at: row.9,
                    updated_at: row.10,
                };
                let available_qty = balance.quantity - balance.reserved_qty;
                StockBalanceWithProduct {
                    balance,
                    product_name: row.11,
                    product_code: row.12,
                    product_unit: row.13,
                    available_qty,
                }
            })
            .collect();

        Ok(result)
    }

    /// Atualiza ou cria saldo
    pub async fn upsert_balance(
        &self,
        location_id: &str,
        product_id: &str,
        quantity_delta: f64,
    ) -> AppResult<StockBalance> {
        let now = chrono::Utc::now().to_rfc3339();

        let existing = self.get_balance(location_id, product_id).await?;

        if let Some(balance) = existing {
            let new_qty = balance.quantity + quantity_delta;
            sqlx::query("UPDATE StockBalance SET quantity = ?, updatedAt = ? WHERE id = ?")
                .bind(new_qty)
                .bind(&now)
                .bind(&balance.id)
                .execute(self.pool)
                .await?;
        } else {
            let id = new_id();
            sqlx::query(
                r#"
                INSERT INTO StockBalance (
                    id, locationId, productId, quantity, reservedQty, minQty, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
                "#,
            )
            .bind(&id)
            .bind(location_id)
            .bind(product_id)
            .bind(quantity_delta)
            .bind(&now)
            .bind(&now)
            .execute(self.pool)
            .await?;
        }

        self.get_balance(location_id, product_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockBalance".into(),
                id: format!("{}/{}", location_id, product_id),
            })
    }

    /// Reserva quantidade
    pub async fn reserve_quantity(
        &self,
        location_id: &str,
        product_id: &str,
        quantity: f64,
    ) -> AppResult<StockBalance> {
        let now = chrono::Utc::now().to_rfc3339();
        let balance = self
            .get_balance(location_id, product_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockBalance".into(),
                id: format!("{}/{}", location_id, product_id),
            })?;

        let available = balance.quantity - balance.reserved_qty;
        if quantity > available {
            return Err(AppError::Validation(format!(
                "Quantidade insuficiente. Disponível: {}",
                available
            )));
        }

        let new_reserved = balance.reserved_qty + quantity;
        sqlx::query("UPDATE StockBalance SET reservedQty = ?, updatedAt = ? WHERE id = ?")
            .bind(new_reserved)
            .bind(&now)
            .bind(&balance.id)
            .execute(self.pool)
            .await?;

        self.get_balance(location_id, product_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockBalance".into(),
                id: format!("{}/{}", location_id, product_id),
            })
    }

    /// Libera reserva
    pub async fn release_reservation(
        &self,
        location_id: &str,
        product_id: &str,
        quantity: f64,
    ) -> AppResult<StockBalance> {
        let now = chrono::Utc::now().to_rfc3339();
        let balance = self
            .get_balance(location_id, product_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockBalance".into(),
                id: format!("{}/{}", location_id, product_id),
            })?;

        let new_reserved = (balance.reserved_qty - quantity).max(0.0);
        sqlx::query("UPDATE StockBalance SET reservedQty = ?, updatedAt = ? WHERE id = ?")
            .bind(new_reserved)
            .bind(&now)
            .bind(&balance.id)
            .execute(self.pool)
            .await?;

        self.get_balance(location_id, product_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockBalance".into(),
                id: format!("{}/{}", location_id, product_id),
            })
    }

    // =========================================================================
    // MÉTODOS ADICIONAIS PARA COMMANDS
    // =========================================================================

    /// Busca locais por tipo
    pub async fn find_by_type(&self, location_type: &str) -> AppResult<Vec<StockLocation>> {
        let result = sqlx::query_as::<_, StockLocation>(
            r#"
            SELECT id, code, name, description, locationType as location_type,
                   contractId as contract_id, workFrontId as work_front_id,
                   address, responsibleId as responsible_id,
                   isActive as is_active, createdAt as created_at, 
                   updatedAt as updated_at, deletedAt as deleted_at
            FROM StockLocation
            WHERE locationType = ? AND deletedAt IS NULL
            ORDER BY name
            "#,
        )
        .bind(location_type)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista todos os saldos de um local
    pub async fn get_balances(&self, location_id: &str) -> AppResult<Vec<StockBalanceWithProduct>> {
        self.get_balances_with_products(location_id).await
    }

    /// Ajusta saldo (alias para upsert_balance)
    pub async fn adjust_balance(
        &self,
        location_id: &str,
        product_id: &str,
        quantity_delta: f64,
    ) -> AppResult<StockBalance> {
        self.upsert_balance(location_id, product_id, quantity_delta)
            .await
    }
}
