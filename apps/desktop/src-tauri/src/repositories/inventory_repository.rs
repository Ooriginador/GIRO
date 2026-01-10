//! Repositório de Inventário

use crate::models::{
    Inventory, InventoryItem, InventoryItemRow, InventoryProgress, InventoryRow, InventoryStatus,
    InventorySummary,
};
use sqlx::SqlitePool;

/// Repositório de inventário
pub struct InventoryRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> InventoryRepository<'a> {
    /// Cria novo repositório
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Cria novo inventário
    pub async fn create(&self, inventory: &Inventory) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO inventories (
                id, name, description, status, category_filter, section_filter,
                started_at, started_by, total_products, counted_products, 
                divergent_products, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&inventory.id)
        .bind(&inventory.name)
        .bind(&inventory.description)
        .bind(inventory.status.to_string())
        .bind(&inventory.category_filter)
        .bind(&inventory.section_filter)
        .bind(inventory.started_at.to_rfc3339())
        .bind(&inventory.started_by)
        .bind(inventory.total_products)
        .bind(inventory.counted_products)
        .bind(inventory.divergent_products)
        .bind(inventory.created_at.to_rfc3339())
        .bind(inventory.updated_at.to_rfc3339())
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Busca inventário por ID
    pub async fn get_by_id(&self, id: &str) -> Result<Option<Inventory>, sqlx::Error> {
        let row: Option<InventoryRow> = sqlx::query_as(
            r#"
            SELECT * FROM inventories WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(row.map(row_to_inventory))
    }

    /// Busca inventário em andamento
    pub async fn get_in_progress(&self) -> Result<Option<Inventory>, sqlx::Error> {
        let row: Option<InventoryRow> = sqlx::query_as(
            r#"
            SELECT * FROM inventories 
            WHERE status = 'in_progress' 
            ORDER BY started_at DESC 
            LIMIT 1
            "#,
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(row.map(row_to_inventory))
    }

    /// Lista inventários
    pub async fn list(&self, limit: i32, offset: i32) -> Result<Vec<Inventory>, sqlx::Error> {
        let rows: Vec<InventoryRow> = sqlx::query_as(
            r#"
            SELECT * FROM inventories 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        Ok(rows.into_iter().map(row_to_inventory).collect())
    }

    /// Adiciona contagem
    pub async fn add_count(&self, item: &InventoryItem) -> Result<(), sqlx::Error> {
        // Usar upsert para atualizar se já existir
        sqlx::query(
            r#"
            INSERT INTO inventory_items (
                id, inventory_id, product_id, lot_id, expected_quantity,
                counted_quantity, divergence, notes, counted_by, counted_at, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(inventory_id, product_id, COALESCE(lot_id, '')) DO UPDATE SET
                counted_quantity = excluded.counted_quantity,
                divergence = excluded.divergence,
                notes = excluded.notes,
                counted_by = excluded.counted_by,
                counted_at = excluded.counted_at
            "#,
        )
        .bind(&item.id)
        .bind(&item.inventory_id)
        .bind(&item.product_id)
        .bind(&item.lot_id)
        .bind(item.expected_quantity)
        .bind(item.counted_quantity)
        .bind(item.divergence)
        .bind(&item.notes)
        .bind(&item.counted_by)
        .bind(item.counted_at.to_rfc3339())
        .bind(item.created_at.to_rfc3339())
        .execute(self.pool)
        .await?;

        // Atualizar contadores do inventário
        sqlx::query(
            r#"
            UPDATE inventories SET
                counted_products = (
                    SELECT COUNT(DISTINCT product_id) FROM inventory_items WHERE inventory_id = ?
                ),
                divergent_products = (
                    SELECT COUNT(*) FROM inventory_items 
                    WHERE inventory_id = ? AND ABS(divergence) > 0.001
                ),
                updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(&item.inventory_id)
        .bind(&item.inventory_id)
        .bind(&item.inventory_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Busca estoque esperado de um produto
    pub async fn get_expected_stock(&self, product_id: &str) -> Result<f64, sqlx::Error> {
        let result: Option<(f64,)> = sqlx::query_as(
            r#"
            SELECT current_stock FROM products WHERE id = ?
            "#,
        )
        .bind(product_id)
        .fetch_optional(self.pool)
        .await?;

        Ok(result.map(|(stock,)| stock).unwrap_or(0.0))
    }

    /// Busca progresso do inventário
    pub async fn get_progress(&self, inventory_id: &str) -> Result<InventoryProgress, sqlx::Error> {
        let result: Option<(i32, i32, i32)> = sqlx::query_as(
            r#"
            SELECT 
                (SELECT COUNT(*) FROM products WHERE is_active = true) as total,
                COALESCE(counted_products, 0),
                COALESCE(divergent_products, 0)
            FROM inventories WHERE id = ?
            "#,
        )
        .bind(inventory_id)
        .fetch_optional(self.pool)
        .await?;

        if let Some((total, counted, divergent)) = result {
            let percent = if total > 0 {
                (counted as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            Ok(InventoryProgress {
                total,
                counted,
                divergent,
                percent,
            })
        } else {
            Ok(InventoryProgress::default())
        }
    }

    /// Finaliza inventário
    pub async fn finish(
        &self,
        inventory_id: &str,
        finished_by: &str,
        apply_adjustments: bool,
    ) -> Result<InventorySummary, sqlx::Error> {
        // Calcular resumo
        let summary = self.calculate_summary(inventory_id).await?;

        // Atualizar status
        sqlx::query(
            r#"
            UPDATE inventories SET
                status = 'finished',
                finished_at = datetime('now'),
                finished_by = ?,
                updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(finished_by)
        .bind(inventory_id)
        .execute(self.pool)
        .await?;

        // Aplicar ajustes se solicitado
        if apply_adjustments {
            self.apply_adjustments(inventory_id, finished_by).await?;
        }

        Ok(summary)
    }

    /// Cancela inventário
    pub async fn cancel(
        &self,
        inventory_id: &str,
        reason: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE inventories SET
                status = 'cancelled',
                finished_at = datetime('now'),
                description = CASE 
                    WHEN ? IS NOT NULL THEN COALESCE(description, '') || ' [Cancelado: ' || ? || ']'
                    ELSE description
                END,
                updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(reason)
        .bind(reason)
        .bind(inventory_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Calcula resumo do inventário
    async fn calculate_summary(&self, inventory_id: &str) -> Result<InventorySummary, sqlx::Error> {
        let result: Option<(i32, i32, i32, f64, f64, f64)> = sqlx::query_as(
            r#"
            SELECT
                (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
                (SELECT COUNT(DISTINCT product_id) FROM inventory_items WHERE inventory_id = ?) as counted,
                (SELECT COUNT(*) FROM inventory_items WHERE inventory_id = ? AND ABS(divergence) > 0.001) as divergent,
                COALESCE(SUM(CASE WHEN divergence != 0 THEN ABS(divergence * p.cost_price) ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN divergence > 0 THEN divergence * p.cost_price ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN divergence < 0 THEN ABS(divergence * p.cost_price) ELSE 0 END), 0)
            FROM inventory_items i
            LEFT JOIN products p ON i.product_id = p.id
            WHERE i.inventory_id = ?
            "#,
        )
        .bind(inventory_id)
        .bind(inventory_id)
        .bind(inventory_id)
        .fetch_optional(self.pool)
        .await?;

        if let Some((total, counted, divergent, total_value, positive, negative)) = result {
            Ok(InventorySummary {
                total_products: total,
                counted_products: counted,
                divergent_count: divergent,
                total_divergence_value: total_value,
                positive_divergence: positive,
                negative_divergence: negative,
            })
        } else {
            Ok(InventorySummary::default())
        }
    }

    /// Aplica ajustes de estoque
    async fn apply_adjustments(
        &self,
        inventory_id: &str,
        employee_id: &str,
    ) -> Result<(), sqlx::Error> {
        // Buscar itens com divergência
        let items: Vec<InventoryItemRow> = sqlx::query_as(
            r#"
            SELECT * FROM inventory_items 
            WHERE inventory_id = ? AND ABS(divergence) > 0.001
            "#,
        )
        .bind(inventory_id)
        .fetch_all(self.pool)
        .await?;

        for item in items {
            // Criar movimento de ajuste
            let movement_id = uuid::Uuid::new_v4().to_string();

            sqlx::query(
                r#"
                INSERT INTO stock_movements (
                    id, product_id, type, quantity, previous_stock, new_stock,
                    reason, reference_id, reference_type, employee_id, created_at
                )
                VALUES (?, ?, 'ADJUSTMENT', ?, 
                    (SELECT current_stock FROM products WHERE id = ?),
                    ?,
                    ?, ?, 'INVENTORY', ?, datetime('now'))
                "#,
            )
            .bind(&movement_id)
            .bind(&item.product_id)
            .bind(item.divergence)
            .bind(&item.product_id)
            .bind(item.counted_quantity)
            .bind(format!("Ajuste inventário: {}", inventory_id))
            .bind(inventory_id)
            .bind(employee_id)
            .execute(self.pool)
            .await?;

            // Atualizar estoque do produto
            sqlx::query(
                r#"
                UPDATE products SET
                    current_stock = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(item.counted_quantity)
            .bind(&item.product_id)
            .execute(self.pool)
            .await?;
        }

        Ok(())
    }
}

/// Converte row para modelo
fn row_to_inventory(row: InventoryRow) -> Inventory {
    let status = match row.status.as_str() {
        "in_progress" => InventoryStatus::InProgress,
        "finished" => InventoryStatus::Finished,
        "cancelled" => InventoryStatus::Cancelled,
        _ => InventoryStatus::InProgress,
    };

    Inventory {
        id: row.id,
        name: row.name,
        description: row.description,
        status,
        category_filter: row.category_filter,
        section_filter: row.section_filter,
        started_at: chrono::DateTime::parse_from_rfc3339(&row.started_at)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
        finished_at: row.finished_at.as_ref().and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .ok()
        }),
        started_by: row.started_by,
        finished_by: row.finished_by,
        total_products: row.total_products,
        counted_products: row.counted_products,
        divergent_products: row.divergent_products,
        created_at: chrono::DateTime::parse_from_rfc3339(&row.created_at)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
        updated_at: chrono::DateTime::parse_from_rfc3339(&row.updated_at)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
    }
}
