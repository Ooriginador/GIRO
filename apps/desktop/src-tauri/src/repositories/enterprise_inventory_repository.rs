//! Repositório de Inventário - Enterprise Module

use crate::error::{AppError, AppResult};
use crate::models::enterprise::{
    CreateEnterpriseInventoryCount, InventoryCount, InventoryCountItem,
    InventoryCountItemWithProduct, UpdateInventoryCount,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};
use sqlx::SqlitePool;

pub struct EnterpriseInventoryRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> EnterpriseInventoryRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Cria nova contagem de inventário
    pub async fn create(
        &self,
        data: CreateEnterpriseInventoryCount,
        started_by_id: &str,
    ) -> AppResult<InventoryCount> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO inventory_counts (
                id, location_id, count_type, status, started_at, started_by_id,
                total_items, items_counted, discrepancies, notes, created_at, updated_at
            ) VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?, 0, 0, 0, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&data.location_id)
        .bind(&data.count_type)
        .bind(&now)
        .bind(started_by_id)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Se for inventário total (FULL), cria itens para todos os produtos com saldo no local
        if data.count_type == "FULL" {
            let balances: Vec<(String, f64)> = sqlx::query_as(
                "SELECT product_id, quantity FROM stock_balances WHERE location_id = ?",
            )
            .bind(&data.location_id)
            .fetch_all(self.pool)
            .await?;

            for (product_id, qty) in balances {
                let item_id = new_id();
                sqlx::query(
                    r#"
                    INSERT INTO inventory_count_items (
                        id, count_id, product_id, system_qty, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    "#,
                )
                .bind(item_id)
                .bind(&id)
                .bind(product_id)
                .bind(qty)
                .bind(&now)
                .bind(&now)
                .execute(self.pool)
                .await?;
            }

            // Atualiza total de itens
            let total_items: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM inventory_count_items WHERE count_id = ?")
                    .bind(&id)
                    .fetch_one(self.pool)
                    .await?;

            sqlx::query("UPDATE inventory_counts SET total_items = ? WHERE id = ?")
                .bind(total_items)
                .bind(&id)
                .execute(self.pool)
                .await?;
        }

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "InventoryCount".into(),
                id,
            })
    }

    /// Busca contagem por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<InventoryCount>> {
        let result = sqlx::query_as::<_, InventoryCount>(
            r#"
            SELECT id, location_id, count_type, status, started_at, completed_at,
                   started_by_id, completed_by_id, total_items, items_counted,
                   discrepancies, notes, created_at, updated_at
            FROM inventory_counts
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista contagens por local
    pub async fn find_by_location(&self, location_id: &str) -> AppResult<Vec<InventoryCount>> {
        let result = sqlx::query_as::<_, InventoryCount>(
            r#"
            SELECT id, location_id, count_type, status, started_at, completed_at,
                   started_by_id, completed_by_id, total_items, items_counted,
                   discrepancies, notes, created_at, updated_at
            FROM inventory_counts
            WHERE location_id = ?
            ORDER BY started_at DESC
            "#,
        )
        .bind(location_id)
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Lista contagens com paginação
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        location_id: Option<&str>,
        status: Option<&str>,
    ) -> AppResult<PaginatedResult<InventoryCount>> {
        let mut conditions = vec![];
        let mut params: Vec<String> = vec![];

        if let Some(lid) = location_id {
            conditions.push("location_id = ?");
            params.push(lid.to_string());
        }

        if let Some(s) = status {
            conditions.push("status = ?");
            params.push(s.to_string());
        }

        let where_clause = if conditions.is_empty() {
            "1 = 1".to_string()
        } else {
            conditions.join(" AND ")
        };

        let count_sql = format!(
            "SELECT COUNT(*) FROM inventory_counts WHERE {}",
            where_clause
        );
        let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
        for p in &params {
            count_query = count_query.bind(p);
        }
        let (total,) = count_query.fetch_one(self.pool).await?;

        let data_sql = format!(
            r#"
            SELECT id, location_id, count_type, status, started_at, completed_at,
                   started_by_id, completed_by_id, total_items, items_counted,
                   discrepancies, notes, created_at, updated_at
            FROM inventory_counts
            WHERE {}
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut data_query = sqlx::query_as::<_, InventoryCount>(&data_sql);
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

    /// Atualiza contagem
    pub async fn update(&self, id: &str, data: UpdateInventoryCount) -> AppResult<InventoryCount> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            r#"
            UPDATE inventory_counts
            SET notes = COALESCE(?, notes), updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&data.notes)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "InventoryCount".into(),
                id: id.to_string(),
            })
    }

    /// Finaliza contagem
    pub async fn complete(
        &self,
        id: &str,
        completed_by_id: &str,
        apply_adjustments: bool,
    ) -> AppResult<InventoryCount> {
        let now = chrono::Utc::now().to_rfc3339();

        // 1. Calcular estatísticas finais
        let stats: (i64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*) as items_counted,
                SUM(CASE WHEN difference != 0 THEN 1 ELSE 0 END) as discrepancies
            FROM inventory_count_items
            WHERE count_id = ? AND counted_at IS NOT NULL
            "#,
        )
        .bind(id)
        .fetch_one(self.pool)
        .await?;

        // 2. Buscar localização para ajustes
        let location_id: String =
            sqlx::query_scalar("SELECT location_id FROM inventory_counts WHERE id = ?")
                .bind(id)
                .fetch_one(self.pool)
                .await?;

        // 3. Aplicar ajustes se solicitado
        if apply_adjustments {
            let items: Vec<(String, f64)> = sqlx::query_as(
                "SELECT product_id, difference FROM inventory_count_items WHERE count_id = ? AND difference != 0"
            )
            .bind(id)
            .fetch_all(self.pool)
            .await?;

            for (product_id, diff) in items {
                // Upsert balance via SQL direto para evitar dependência complexa
                // Tenta atualizar
                let result = sqlx::query(
                    "UPDATE stock_balances SET quantity = quantity + ?, updated_at = ? WHERE location_id = ? AND product_id = ?"
                )
                .bind(diff)
                .bind(&now)
                .bind(&location_id)
                .bind(&product_id)
                .execute(self.pool)
                .await?;

                // Se não atualizou nada, insere
                if result.rows_affected() == 0 {
                    sqlx::query(
                        r#"
                        INSERT INTO stock_balances (
                            id, location_id, product_id, quantity, reserved_qty, min_qty, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
                        "#,
                    )
                    .bind(new_id())
                    .bind(&location_id)
                    .bind(&product_id)
                    .bind(diff) // Quantidade inicial = diferença (já que antes era 0 ou inexistente)
                    .bind(&now)
                    .bind(&now)
                    .execute(self.pool)
                    .await?;
                }

                // Registrar StockMovement para auditoria
                let movement_type = if diff >= 0.0 {
                    "ADJUSTMENT_IN"
                } else {
                    "ADJUSTMENT_OUT"
                };
                sqlx::query(
                    r#"
                    INSERT INTO stock_movements (
                        id, location_id, product_id, movement_type, quantity, 
                        reference_type, reference_id, notes, user_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'INVENTORY_COUNT', ?, ?, ?, ?)
                    "#,
                )
                .bind(new_id())
                .bind(&location_id)
                .bind(&product_id)
                .bind(movement_type)
                .bind(diff.abs())
                .bind(id) // reference_id = inventory count ID
                .bind(format!("Ajuste de inventário - Contagem #{}", id))
                .bind(completed_by_id)
                .bind(&now)
                .execute(self.pool)
                .await?;
            }
        }

        // 4. Atualizar registro do inventário
        sqlx::query(
            r#"
            UPDATE inventory_counts
            SET status = 'COMPLETED', completed_at = ?, completed_by_id = ?,
                items_counted = ?, discrepancies = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&now)
        .bind(completed_by_id)
        .bind(stats.0)
        .bind(stats.1)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "InventoryCount".into(),
                id: id.to_string(),
            })
    }

    /// Busca itens de contagem
    pub async fn get_items(&self, count_id: &str) -> AppResult<Vec<InventoryCountItemWithProduct>> {
        let rows = sqlx::query_as::<
            _,
            (
                String,
                String,
                String,
                f64,
                Option<f64>,
                Option<f64>,
                Option<String>,
                Option<String>,
                Option<String>,
                String,
                String,
                String,
                String,
                String,
            ),
        >(
            r#"
            SELECT i.id, i.count_id, i.product_id, i.system_qty, i.counted_qty, i.difference,
                   i.counted_at, i.counted_by_id, i.notes, i.created_at, i.updated_at,
                   p.name, p.internal_code, p.unit
            FROM inventory_count_items i
            JOIN products p ON i.product_id = p.id
            WHERE i.count_id = ?
            ORDER BY p.name
            "#,
        )
        .bind(count_id)
        .fetch_all(self.pool)
        .await?;

        let result = rows
            .into_iter()
            .map(|row| InventoryCountItemWithProduct {
                item: InventoryCountItem {
                    id: row.0,
                    count_id: row.1,
                    product_id: row.2,
                    system_qty: row.3,
                    counted_qty: row.4,
                    difference: row.5,
                    counted_at: row.6,
                    counted_by_id: row.7,
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

    /// Registra contagem de item
    pub async fn count_item(
        &self,
        item_id: &str,
        counted_qty: f64,
        counted_by_id: &str,
        notes: Option<String>,
    ) -> AppResult<InventoryCountItem> {
        let now = chrono::Utc::now().to_rfc3339();

        let item: Option<InventoryCountItem> =
            sqlx::query_as("SELECT * FROM inventory_count_items WHERE id = ?")
                .bind(item_id)
                .fetch_optional(self.pool)
                .await?;

        let item = item.ok_or_else(|| AppError::NotFound {
            entity: "InventoryCountItem".into(),
            id: item_id.to_string(),
        })?;

        let difference = counted_qty - item.system_qty;

        sqlx::query(
            r#"
            UPDATE inventory_count_items
            SET counted_qty = ?, difference = ?, counted_at = ?, 
                counted_by_id = ?, notes = COALESCE(?, notes), updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(counted_qty)
        .bind(difference)
        .bind(&now)
        .bind(counted_by_id)
        .bind(notes)
        .bind(&now)
        .bind(item_id)
        .execute(self.pool)
        .await?;

        // Atualiza contadores do inventário pai
        let count_id = item.count_id;
        let stats: (i64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*) as items_counted,
                SUM(CASE WHEN difference != 0 THEN 1 ELSE 0 END) as discrepancies
            FROM inventory_count_items
            WHERE count_id = ? AND counted_at IS NOT NULL
            "#,
        )
        .bind(&count_id)
        .fetch_one(self.pool)
        .await?;

        sqlx::query(
            "UPDATE inventory_counts SET items_counted = ?, discrepancies = ?, updated_at = ? WHERE id = ?"
        )
        .bind(stats.0)
        .bind(stats.1)
        .bind(&now)
        .bind(&count_id)
        .execute(self.pool)
        .await?;

        let updated_item = sqlx::query_as::<_, InventoryCountItem>(
            "SELECT * FROM inventory_count_items WHERE id = ?",
        )
        .bind(item_id)
        .fetch_one(self.pool)
        .await?;

        Ok(updated_item)
    }
}
