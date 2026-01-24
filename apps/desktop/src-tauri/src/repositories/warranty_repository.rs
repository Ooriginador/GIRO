//! Repositório de Garantias
//!
//! Gerenciamento de reivindicações de garantia

use sqlx::{Pool, Sqlite};

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateWarrantyClaim, ResolveWarrantyClaim, UpdateWarrantyClaim, WarrantyClaim,
    WarrantyClaimFilters, WarrantyClaimSummary, WarrantyClaimWithDetails, WarrantyStats,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};

pub struct WarrantyRepository {
    pool: Pool<Sqlite>,
}

impl WarrantyRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD BÁSICO
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista todas as garantias ativas (não fechadas)
    pub async fn find_active(&self) -> AppResult<Vec<WarrantyClaimSummary>> {
        let claims = sqlx::query!(
            r#"
            SELECT
                wc.id,
                c.name as customer_name,
                p.name as "product_name?: String",
                wc.source_type,
                CASE 
                    WHEN wc.source_type = 'SALE' THEN 'Venda #' || CAST((SELECT daily_number FROM sales WHERE id IN (SELECT sale_id FROM sale_items WHERE id = wc.sale_item_id)) AS TEXT)
                    WHEN wc.source_type = 'SERVICE_ORDER' THEN 'OS #' || CAST((SELECT order_number FROM service_orders WHERE id IN (SELECT order_id FROM order_products WHERE id = wc.order_item_id)) AS TEXT)
                END as "source_number?: String",
                wc.status,
                wc.description,
                wc.created_at as "created_at!: String"
            FROM warranty_claims wc
            INNER JOIN customers c ON c.id = wc.customer_id
            LEFT JOIN products p ON p.id = wc.product_id
            WHERE wc.status NOT IN ('CLOSED', 'DENIED')
            ORDER BY wc.created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(claims
            .into_iter()
            .map(|c| WarrantyClaimSummary {
                id: c.id,
                customer_name: c.customer_name,
                product_name: c.product_name,
                source_type: c.source_type,
                source_number: c.source_number,
                status: c.status,
                description: c.description,
                created_at: c.created_at,
            })
            .collect())
    }

    /// Lista garantias com paginação e filtros
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        filters: &WarrantyClaimFilters,
    ) -> AppResult<PaginatedResult<WarrantyClaimSummary>> {
        let mut conditions = vec!["1=1".to_string()];

        if let Some(ref status) = filters.status {
            conditions.push(format!("wc.status = '{}'", status));
        }

        if let Some(ref source_type) = filters.source_type {
            conditions.push(format!("wc.source_type = '{}'", source_type));
        }

        if let Some(ref customer_id) = filters.customer_id {
            conditions.push(format!("wc.customer_id = '{}'", customer_id));
        }

        if let Some(ref product_id) = filters.product_id {
            conditions.push(format!("wc.product_id = '{}'", product_id));
        }

        if let Some(ref date_from) = filters.date_from {
            conditions.push(format!("wc.created_at >= '{}'", date_from));
        }

        if let Some(ref date_to) = filters.date_to {
            conditions.push(format!("wc.created_at <= '{}'", date_to));
        }

        let where_clause = conditions.join(" AND ");

        // Contar total
        let count_query = format!(
            "SELECT COUNT(*) as count FROM warranty_claims wc WHERE {}",
            where_clause
        );

        let total: i64 = sqlx::query_scalar(&count_query)
            .fetch_one(&self.pool)
            .await?;

        // Buscar dados
        let offset = pagination.offset();
        let query = format!(
            r#"
            SELECT
                wc.id,
                c.name as customer_name,
                p.name as product_name,
                wc.source_type,
                CASE 
                    WHEN wc.source_type = 'SALE' THEN 'Venda #' || (SELECT daily_number FROM sales WHERE id IN (SELECT sale_id FROM sale_items WHERE id = wc.sale_item_id))
                    WHEN wc.source_type = 'SERVICE_ORDER' THEN 'OS #' || (SELECT order_number FROM service_orders WHERE id IN (SELECT order_id FROM order_products WHERE id = wc.order_item_id))
                END as source_number,
                wc.status,
                wc.description,
                wc.created_at
            FROM warranty_claims wc
            INNER JOIN customers c ON c.id = wc.customer_id
            LEFT JOIN products p ON p.id = wc.product_id
            WHERE {}
            ORDER BY wc.created_at DESC
            LIMIT {} OFFSET {}
            "#,
            where_clause, pagination.per_page, offset
        );

        let rows = sqlx::query_as::<
            _,
            (
                String,
                String,
                Option<String>,
                String,
                Option<String>,
                String,
                String,
                String,
            ),
        >(&query)
        .fetch_all(&self.pool)
        .await?;

        let data: Vec<WarrantyClaimSummary> = rows
            .into_iter()
            .map(|r| WarrantyClaimSummary {
                id: r.0,
                customer_name: r.1,
                product_name: r.2,
                source_type: r.3,
                source_number: r.4,
                status: r.5,
                description: r.6,
                created_at: r.7,
            })
            .collect();

        Ok(PaginatedResult::new(
            data,
            total,
            pagination.page,
            pagination.per_page,
        ))
    }

    /// Busca garantia por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<WarrantyClaim>> {
        let result = sqlx::query!(
            r#"SELECT 
                id, customer_id, source_type,
                sale_item_id,
                order_item_id,
                product_id,
                description, reason, status,
                resolution,
                resolution_type,
                resolved_by_id,
                resolved_at as "resolved_at?: String",
                refund_amount,
                replacement_cost,
                notes,
                created_at as "created_at!: String",
                updated_at as "updated_at!: String"
            FROM warranty_claims WHERE id = ?"#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|r| WarrantyClaim {
            id: r.id,
            customer_id: r.customer_id,
            source_type: r.source_type,
            sale_item_id: r.sale_item_id,
            order_item_id: r.order_item_id,
            product_id: r.product_id,
            description: r.description,
            reason: r.reason,
            status: r.status,
            resolution: r.resolution,
            resolution_type: r.resolution_type,
            resolved_by_id: r.resolved_by_id,
            resolved_at: r.resolved_at,
            refund_amount: r.refund_amount,
            replacement_cost: r.replacement_cost,
            notes: r.notes,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))
    }

    /// Busca garantia com detalhes
    pub async fn find_by_id_with_details(
        &self,
        id: &str,
    ) -> AppResult<Option<WarrantyClaimWithDetails>> {
        let claim = sqlx::query!(
            r#"
            SELECT
                wc.id, wc.customer_id, wc.source_type, wc.sale_item_id, wc.order_item_id,
                wc.product_id, wc.description, wc.reason, wc.status, wc.resolution,
                wc.resolution_type, wc.resolved_by_id, 
                wc.resolved_at as "resolved_at?: String",
                wc.refund_amount, wc.replacement_cost, wc.notes, 
                wc.created_at as "created_at!: String", 
                wc.updated_at as "updated_at!: String",
                c.name as customer_name,
                c.phone as "customer_phone?: String",
                p.name as "product_name?: String",
                p.barcode as "product_barcode?: String",
                e.name as "resolved_by_name?: String",
                CASE 
                    WHEN wc.source_type = 'SALE' THEN CAST((SELECT daily_number FROM sales WHERE id IN (SELECT sale_id FROM sale_items WHERE id = wc.sale_item_id)) AS TEXT)
                    WHEN wc.source_type = 'SERVICE_ORDER' THEN CAST((SELECT order_number FROM service_orders WHERE id IN (SELECT order_id FROM order_products WHERE id = wc.order_item_id)) AS TEXT)
                END as "source_number?: String"
            FROM warranty_claims wc
            INNER JOIN customers c ON c.id = wc.customer_id
            LEFT JOIN products p ON p.id = wc.product_id
            LEFT JOIN employees e ON e.id = wc.resolved_by_id
            WHERE wc.id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        match claim {
            Some(c) => Ok(Some(WarrantyClaimWithDetails {
                claim: WarrantyClaim {
                    id: c.id.clone(),
                    customer_id: c.customer_id,
                    source_type: c.source_type,
                    sale_item_id: c.sale_item_id,
                    order_item_id: c.order_item_id,
                    product_id: c.product_id,
                    description: c.description,
                    reason: c.reason,
                    status: c.status,
                    resolution: c.resolution,
                    resolution_type: c.resolution_type,
                    resolved_by_id: c.resolved_by_id,
                    resolved_at: c.resolved_at,
                    refund_amount: c.refund_amount,
                    replacement_cost: c.replacement_cost,
                    notes: c.notes,
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                },
                customer_name: c.customer_name,
                customer_phone: c.customer_phone,
                product_name: c.product_name,
                product_barcode: c.product_barcode,
                resolved_by_name: c.resolved_by_name,
                source_number: c.source_number,
            })),
            None => Ok(None),
        }
    }

    /// Cria nova garantia
    pub async fn create(&self, input: CreateWarrantyClaim) -> AppResult<WarrantyClaim> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Validar source
        if input.source_type == "SALE" && input.sale_item_id.is_none() {
            return Err(AppError::Validation(
                "sale_item_id é obrigatório para garantia de venda".into(),
            ));
        }

        if input.source_type == "SERVICE_ORDER" && input.order_item_id.is_none() {
            return Err(AppError::Validation(
                "order_item_id é obrigatório para garantia de OS".into(),
            ));
        }

        sqlx::query!(
            r#"
            INSERT INTO warranty_claims (
                id, customer_id, source_type, sale_item_id, order_item_id,
                product_id, description, reason, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
            "#,
            id,
            input.customer_id,
            input.source_type,
            input.sale_item_id,
            input.order_item_id,
            input.product_id,
            input.description,
            input.reason,
            now,
            now
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WarrantyClaim".to_string(),
                id: id.clone(),
            })
    }

    /// Atualiza garantia
    pub async fn update(&self, id: &str, input: UpdateWarrantyClaim) -> AppResult<WarrantyClaim> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            UPDATE warranty_claims SET
                description = COALESCE(?, description),
                reason = COALESCE(?, reason),
                status = COALESCE(?, status),
                resolution = COALESCE(?, resolution),
                resolution_type = COALESCE(?, resolution_type),
                resolved_by_id = COALESCE(?, resolved_by_id),
                refund_amount = COALESCE(?, refund_amount),
                replacement_cost = COALESCE(?, replacement_cost),
                updated_at = ?
            WHERE id = ?
            "#,
            input.description,
            input.reason,
            input.status,
            input.resolution,
            input.resolution_type,
            input.resolved_by_id,
            input.refund_amount,
            input.replacement_cost,
            now,
            id
        )
        .execute(&self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WarrantyClaim".to_string(),
                id: id.to_string(),
            })
    }

    /// Aprova garantia
    pub async fn approve(&self, id: &str, employee_id: &str) -> AppResult<WarrantyClaim> {
        let input = UpdateWarrantyClaim {
            status: Some("APPROVED".to_string()),
            resolved_by_id: Some(employee_id.to_string()),
            ..Default::default()
        };

        self.update(id, input).await
    }

    /// Nega garantia
    pub async fn deny(
        &self,
        id: &str,
        employee_id: &str,
        reason: String,
    ) -> AppResult<WarrantyClaim> {
        let input = UpdateWarrantyClaim {
            status: Some("DENIED".to_string()),
            resolution: Some(reason),
            resolved_by_id: Some(employee_id.to_string()),
            ..Default::default()
        };

        self.update(id, input).await
    }

    /// Resolve garantia
    pub async fn resolve(&self, id: &str, input: ResolveWarrantyClaim) -> AppResult<WarrantyClaim> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            UPDATE warranty_claims SET
                status = 'CLOSED',
                resolution_type = ?,
                resolution = ?,
                resolved_by_id = ?,
                refund_amount = ?,
                replacement_cost = ?,
                resolved_at = ?,
                updated_at = ?
            WHERE id = ?
            "#,
            input.resolution_type,
            input.resolution,
            input.resolved_by_id,
            input.refund_amount,
            input.replacement_cost,
            now,
            now,
            id
        )
        .execute(&self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "WarrantyClaim".to_string(),
                id: id.to_string(),
            })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUERIES ESPECIALIZADAS
    // ═══════════════════════════════════════════════════════════════════════

    /// Busca garantias por cliente
    pub async fn find_by_customer(
        &self,
        customer_id: &str,
    ) -> AppResult<Vec<WarrantyClaimSummary>> {
        let filters = WarrantyClaimFilters {
            customer_id: Some(customer_id.to_string()),
            ..Default::default()
        };

        let pagination = Pagination::new(1, 100);
        let result = self.find_paginated(&pagination, &filters).await?;

        Ok(result.data)
    }

    /// Busca garantias por produto
    pub async fn find_by_product(&self, product_id: &str) -> AppResult<Vec<WarrantyClaimSummary>> {
        let filters = WarrantyClaimFilters {
            product_id: Some(product_id.to_string()),
            ..Default::default()
        };

        let pagination = Pagination::new(1, 100);
        let result = self.find_paginated(&pagination, &filters).await?;

        Ok(result.data)
    }

    /// Estatísticas de garantias
    pub async fn get_stats(
        &self,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> AppResult<WarrantyStats> {
        let mut where_conditions = vec!["1=1".to_string()];

        if let Some(ref from) = date_from {
            where_conditions.push(format!("created_at >= '{}'", from));
        }

        if let Some(ref to) = date_to {
            where_conditions.push(format!("created_at <= '{}'", to));
        }

        let where_clause = where_conditions.join(" AND ");

        let query = format!(
            r#"
            SELECT
                COUNT(*) as total_claims,
                COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_claims,
                COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_claims,
                COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_claims,
                COUNT(CASE WHEN status = 'DENIED' THEN 1 END) as denied_claims,
                COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_claims,
                COALESCE(SUM(refund_amount), 0) as total_refund_amount,
                COALESCE(SUM(replacement_cost), 0) as total_replacement_cost,
                AVG(
                    CASE 
                        WHEN resolved_at IS NOT NULL 
                        THEN julianday(resolved_at) - julianday(created_at)
                    END
                ) as avg_resolution_days
            FROM warranty_claims
            WHERE {}
            "#,
            where_clause
        );

        let stats =
            sqlx::query_as::<_, (i64, i64, i64, i64, i64, i64, f64, f64, Option<f64>)>(&query)
                .fetch_one(&self.pool)
                .await?;

        Ok(WarrantyStats {
            total_claims: stats.0 as f64,
            open_claims: stats.1 as f64,
            in_progress_claims: stats.2 as f64,
            approved_claims: stats.3 as f64,
            denied_claims: stats.4 as f64,
            closed_claims: stats.5 as f64,
            total_refund_amount: stats.6,
            total_replacement_cost: stats.7,
            avg_resolution_days: stats.8,
        })
    }
}
