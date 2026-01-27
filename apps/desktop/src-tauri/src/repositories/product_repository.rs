use crate::database::decimal_config;
use crate::error::AppResult;
use crate::models::{CreateProduct, Product, ProductFilters, StockSummary, UpdateProduct};
use crate::repositories::new_id;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};

pub struct ProductRepository<'a> {
    pool: &'a SqlitePool,
    event_service: Option<&'a crate::services::mobile_events::MobileEventService>,
}

impl<'a> ProductRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self {
            pool,
            event_service: None,
        }
    }

    pub fn with_events(
        pool: &'a SqlitePool,
        event_service: &'a crate::services::mobile_events::MobileEventService,
    ) -> Self {
        Self {
            pool,
            event_service: Some(event_service),
        }
    }

    // Build column selection dynamically to support migrated *_decimal columns when enabled
    fn product_columns_string(&self) -> String {
        let mut cols: Vec<String> = vec![
            "id".to_string(),
            "barcode".to_string(),
            "internal_code".to_string(),
            "name".to_string(),
            "description".to_string(),
            "unit".to_string(),
            "is_weighted".to_string(),
        ];
        // monetary/quantity fields may have *_decimal counterparts
        cols.push(decimal_config::col("sale_price"));
        cols.push(decimal_config::col("cost_price"));
        cols.push(decimal_config::col("current_stock"));
        cols.push(decimal_config::col("min_stock"));
        cols.push(decimal_config::col("max_stock"));
        cols.extend(vec![
            "is_active".to_string(),
            "category_id".to_string(),
            "notes".to_string(),
            "created_at".to_string(),
            "updated_at".to_string(),
        ]);
        cols.join(", ")
    }

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE id = ?",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_id_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        id: &str,
    ) -> AppResult<Option<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE id = ?",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(id)
            .fetch_optional(&mut **tx)
            .await?;
        Ok(result)
    }

    pub async fn find_by_barcode(&self, barcode: &str) -> AppResult<Option<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE barcode = ? AND is_active = 1",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(barcode)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_internal_code(&self, code: &str) -> AppResult<Option<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE internal_code = ? AND is_active = 1",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(code)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all_active(&self, category_id: Option<String>) -> AppResult<Vec<Product>> {
        if let Some(cat_id) = category_id {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND category_id = ? ORDER BY name",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .bind(&cat_id)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        } else {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 ORDER BY name",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        }
    }

    pub async fn find_by_category(&self, category_id: &str) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(category_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn search(&self, term: &str, limit: i32) -> AppResult<Vec<Product>> {
        let search_pattern = format!("%{}%", term);
        let query = format!("SELECT {} FROM products WHERE is_active = 1 AND (name LIKE ? OR barcode LIKE ? OR internal_code LIKE ?) ORDER BY name LIMIT ?", self.product_columns_string());
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(&search_pattern)
            .bind(&search_pattern)
            .bind(&search_pattern)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_paginated(
        &self,
        pagination: &crate::repositories::Pagination,
        filters: &ProductFilters,
    ) -> AppResult<crate::repositories::PaginatedResult<Product>> {
        let mut count_builder = QueryBuilder::new("SELECT COUNT(*) FROM products WHERE 1=1");
        let mut query_builder = QueryBuilder::new(format!(
            "SELECT {} FROM products WHERE 1=1",
            self.product_columns_string()
        ));

        // Filtro de busca
        if let Some(ref search) = filters.search {
            let pattern = format!("%{}%", search);
            count_builder.push(" AND (name LIKE ");
            count_builder.push_bind(pattern.clone());
            count_builder.push(" OR barcode LIKE ");
            count_builder.push_bind(pattern.clone());
            count_builder.push(" OR internal_code LIKE ");
            count_builder.push_bind(pattern.clone());
            count_builder.push(")");

            query_builder.push(" AND (name LIKE ");
            query_builder.push_bind(pattern.clone());
            query_builder.push(" OR barcode LIKE ");
            query_builder.push_bind(pattern.clone());
            query_builder.push(" OR internal_code LIKE ");
            query_builder.push_bind(pattern.clone());
            query_builder.push(")");
        }

        // Filtro de categoria
        if let Some(ref cat_id) = filters.category_id {
            count_builder.push(" AND category_id = ");
            count_builder.push_bind(cat_id.clone());

            query_builder.push(" AND category_id = ");
            query_builder.push_bind(cat_id.clone());
        }

        // Filtro de status
        match filters.is_active {
            Some(true) => {
                count_builder.push(" AND is_active = 1");
                query_builder.push(" AND is_active = 1");
            }
            Some(false) => {
                count_builder.push(" AND is_active = 0");
                query_builder.push(" AND is_active = 0");
            }
            None => {
                // No filter - show all products (both active and inactive)
            }
        }

        // Ordenação e Paginação
        query_builder.push(" ORDER BY name LIMIT ");
        query_builder.push_bind(pagination.per_page as i64);
        query_builder.push(" OFFSET ");
        query_builder.push_bind(pagination.offset() as i64);

        // Executar Count
        let total: (i64,) = count_builder.build_query_as().fetch_one(self.pool).await?;

        // Executar Query Principal
        let products = query_builder
            .build_query_as::<Product>()
            .fetch_all(self.pool)
            .await?;

        Ok(crate::repositories::PaginatedResult::new(
            products,
            total.0,
            pagination.page,
            pagination.per_page,
        ))
    }

    pub async fn find_with_filters(&self, filters: &ProductFilters) -> AppResult<Vec<Product>> {
        let mut builder: QueryBuilder<Sqlite> = QueryBuilder::new(format!(
            "SELECT {} FROM products WHERE 1=1",
            self.product_columns_string()
        ));

        if let Some(ref search) = filters.search {
            builder.push(" AND (name LIKE ");
            builder.push_bind(format!("%{}%", search));
            builder.push(" OR barcode LIKE ");
            builder.push_bind(format!("%{}%", search));
            builder.push(" OR internal_code LIKE ");
            builder.push_bind(format!("%{}%", search));
            builder.push(")");
        }

        if let Some(ref cat_id) = filters.category_id {
            builder.push(" AND category_id = ");
            builder.push_bind(cat_id);
        }

        match filters.is_active {
            Some(true) => {
                builder.push(" AND is_active = 1");
            }
            Some(false) => {
                builder.push(" AND is_active = 0");
            }
            None => {
                // No filter - show all products
            }
        }

        if filters.low_stock.unwrap_or(false) {
            builder.push(" AND current_stock <= min_stock AND current_stock > 0");
        }

        if filters.out_of_stock.unwrap_or(false) {
            builder.push(" AND current_stock <= 0");
        }

        builder.push(" ORDER BY name");

        if let Some(limit) = filters.limit {
            builder.push(" LIMIT ");
            builder.push_bind(limit as i64);
        }
        if let Some(offset) = filters.offset {
            builder.push(" OFFSET ");
            builder.push_bind(offset as i64);
        }

        let result = builder
            .build_query_as::<Product>()
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_low_stock(&self, category_id: Option<String>) -> AppResult<Vec<Product>> {
        if let Some(cat_id) = category_id {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND current_stock <= min_stock AND current_stock > 0 AND category_id = ? ORDER BY current_stock ASC",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .bind(&cat_id)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        } else {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND current_stock <= min_stock AND current_stock > 0 ORDER BY current_stock ASC",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        }
    }

    pub async fn find_out_of_stock(&self, category_id: Option<String>) -> AppResult<Vec<Product>> {
        if let Some(cat_id) = category_id {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND current_stock <= 0 AND category_id = ? ORDER BY name",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .bind(&cat_id)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        } else {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND current_stock <= 0 ORDER BY name",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        }
    }

    pub async fn find_excess_stock(&self, category_id: Option<String>) -> AppResult<Vec<Product>> {
        if let Some(cat_id) = category_id {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND max_stock IS NOT NULL AND current_stock > max_stock AND category_id = ? ORDER BY current_stock DESC",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .bind(&cat_id)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        } else {
            let query = format!(
                "SELECT {} FROM products WHERE is_active = 1 AND max_stock IS NOT NULL AND current_stock > max_stock ORDER BY current_stock DESC",
                self.product_columns_string()
            );
            let result = sqlx::query_as::<_, Product>(&query)
                .fetch_all(self.pool)
                .await?;
            Ok(result)
        }
    }

    pub async fn get_next_internal_code(&self) -> AppResult<String> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM products")
            .fetch_one(self.pool)
            .await?;
        Ok(format!("MRC-{:05}", result.0 + 1))
    }

    /*
     * -------------------------------------------------------------------------
     * Auxiliary Validation
     * -------------------------------------------------------------------------
     */
    fn validate_product_logic(&self, name: &str, sale_price: f64, cost_price: f64) {
        if !crate::utils::validation::validate_prices(sale_price, cost_price) {
            tracing::warn!(
                "⚠️ [ProductValidation] Preço de custo ({}) maior que preço de venda ({}) para produto '{}'",
                cost_price, sale_price, name
            );
        }
    }

    pub async fn get_next_internal_code_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> AppResult<String> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM products")
            .fetch_one(&mut **tx)
            .await?;
        Ok(format!("MRC-{:05}", result.0 + 1))
    }

    pub async fn create(&self, data: CreateProduct) -> AppResult<Product> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let internal_code = match data.internal_code {
            Some(code) => code,
            None => self.get_next_internal_code_tx(&mut tx).await?,
        };
        let unit = data
            .unit
            .map(|u| u.as_db_str().to_string())
            .unwrap_or_else(|| "UNIT".to_string());
        let is_weighted = data.is_weighted.unwrap_or(false);
        let cost_price = data.cost_price.unwrap_or(0.0);
        let current_stock = data.current_stock.unwrap_or(0.0);
        let min_stock = data.min_stock.unwrap_or(0.0);
        let max_stock = data.max_stock;

        // Validation Warning
        self.validate_product_logic(&data.name, data.sale_price, cost_price);

        // Treat empty barcode as NULL to allow uniqueness constraint
        let barcode = data.barcode.filter(|s| !s.trim().is_empty());

        // Validate barcode uniqueness before insert
        if let Some(ref bc) = barcode {
            let existing = sqlx::query_scalar::<_, String>(
                "SELECT id FROM products WHERE barcode = ? AND is_active = 1",
            )
            .bind(bc)
            .fetch_optional(&mut *tx)
            .await?;

            if existing.is_some() {
                return Err(crate::error::AppError::Duplicate(format!(
                    "Código de barras '{}' já está cadastrado em outro produto",
                    bc
                )));
            }
        }

        // Validate name is not empty
        if data.name.trim().is_empty() {
            return Err(crate::error::AppError::Validation(
                "Nome do produto é obrigatório".into(),
            ));
        }

        // Validate sale price is positive
        if data.sale_price <= 0.0 {
            return Err(crate::error::AppError::Validation(
                "Preço de venda deve ser maior que zero".into(),
            ));
        }

        sqlx::query(
            "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, max_stock, is_active, category_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, (datetime('now')), (datetime('now')))"
        )
        .bind(&id)
        .bind(barcode)
        .bind(&internal_code)
        .bind(&data.name)
        .bind(&data.description)
        .bind(&unit)
        .bind(is_weighted)
        .bind(data.sale_price)
        .bind(cost_price)
        .bind(current_stock)
        .bind(min_stock)
        .bind(max_stock)
        .bind(&data.category_id)
        .bind(&data.notes)
        .execute(&mut *tx)
        .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // Record Initial Stock Movement
        // ═══════════════════════════════════════════════════════════════════════════
        if current_stock > 0.001 {
            let move_id = new_id();
            sqlx::query(
                "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, created_at) VALUES (?, ?, 'ADJUSTMENT', ?, 0, ?, 'Carga inicial de estoque', ?)"
            )
            .bind(&move_id)
            .bind(&id)
            .bind(current_stock)
            .bind(current_stock)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        // If decimal columns are enabled, populate them as well for parity
        if decimal_config::use_decimal_columns() {
            sqlx::query("UPDATE products SET sale_price_decimal = ROUND(?,2), cost_price_decimal = ROUND(?,2), current_stock_decimal = ROUND(?,3), min_stock_decimal = ROUND(?,3), max_stock_decimal = ROUND(COALESCE(?,0),3) WHERE id = ?")
                .bind(data.sale_price)
                .bind(cost_price)
                .bind(current_stock)
                .bind(min_stock)
                .bind(max_stock)
                .bind(&id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;

        let product =
            self.find_by_id(&id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Product".into(),
                    id: id.clone(),
                })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            service.emit_sync_push(
                "product",
                serde_json::to_value(&product).unwrap_or_default(),
            );
            service.emit_product_notification(&product.id, &product.name);
        }

        Ok(product)
    }

    pub async fn update(&self, id: &str, data: UpdateProduct) -> AppResult<Product> {
        let mut tx = self.pool.begin().await?;

        let existing = self.find_by_id_tx(&mut tx, id).await?.ok_or_else(|| {
            crate::error::AppError::NotFound {
                entity: "Product".into(),
                id: id.into(),
            }
        })?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = data.name.unwrap_or(existing.name);

        // Handle barcode update:
        // if data.barcode is Some(""), set to None (NULL)
        // if data.barcode is Some("val"), set to "val"
        // if data.barcode is None, keep existing
        let barcode = match data.barcode {
            Some(s) if s.trim().is_empty() => None,
            Some(s) => Some(s),
            None => existing.barcode.clone(),
        };

        // Validate barcode uniqueness on update (if changed)
        if let Some(ref bc) = barcode {
            if existing.barcode.as_ref() != Some(bc) {
                let conflict = sqlx::query_scalar::<_, String>(
                    "SELECT id FROM products WHERE barcode = ? AND id != ? AND is_active = 1",
                )
                .bind(bc)
                .bind(id)
                .fetch_optional(&mut *tx)
                .await?;

                if conflict.is_some() {
                    return Err(crate::error::AppError::Duplicate(format!(
                        "Código de barras '{}' já está cadastrado em outro produto",
                        bc
                    )));
                }
            }
        }

        let description = data.description.or(existing.description);
        let unit = data
            .unit
            .map(|u| u.as_db_str().to_string())
            .unwrap_or(existing.unit);
        let is_weighted = data.is_weighted.unwrap_or(existing.is_weighted);
        let sale_price = data.sale_price.unwrap_or(existing.sale_price);
        let cost_price = data.cost_price.unwrap_or(existing.cost_price);
        let current_stock = data.current_stock.unwrap_or(existing.current_stock);
        let min_stock = data.min_stock.unwrap_or(existing.min_stock);
        let max_stock = data.max_stock.or(existing.max_stock);
        let is_active = data.is_active.unwrap_or(existing.is_active);
        let category_id = data.category_id.unwrap_or(existing.category_id);

        let notes = data.notes.or(existing.notes);

        // Validation Warning
        self.validate_product_logic(&name, sale_price, cost_price);

        // Registrar histórico de preço se o preço de venda mudou
        if (sale_price - existing.sale_price).abs() > 0.001 {
            let nid = new_id();
            sqlx::query(
                "INSERT INTO price_history (id, product_id, old_price, new_price, reason, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&nid)
            .bind(id)
            .bind(existing.sale_price)
            .bind(sale_price)
            .bind(data.reason.as_deref().unwrap_or("Atualização de preço via edição de produto"))
            .bind(&data.employee_id)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        // Check if stock is changing
        if (current_stock - existing.current_stock).abs() > 0.001 {
            let diff = current_stock - existing.current_stock;
            let move_id = new_id();
            let move_type = "ADJUSTMENT";

            sqlx::query(
                "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_type, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?)"
            )
            .bind(&move_id)
            .bind(id)
            .bind(move_type)
            .bind(diff)
            .bind(existing.current_stock)
            .bind(current_stock)
            .bind(data.reason.as_deref().unwrap_or("Edição manual do produto"))
            .bind(data.employee_id.as_deref())
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        sqlx::query(
            "UPDATE products SET name = ?, barcode = ?, description = ?, unit = ?, is_weighted = ?, sale_price = ?, cost_price = ?, current_stock = ?, min_stock = ?, max_stock = ?, is_active = ?, category_id = ?, notes = ?, updated_at = (datetime('now')) WHERE id = ?"
        )
        .bind(&name)
        .bind(&barcode)
        .bind(&description)
        .bind(&unit)
        .bind(is_weighted)
        .bind(sale_price)
        .bind(cost_price)
        .bind(current_stock)
        .bind(min_stock)
        .bind(max_stock)
        .bind(is_active)
        .bind(&category_id)
        .bind(&notes)
        .bind(id)
        .execute(&mut *tx)
        .await?;

        if decimal_config::use_decimal_columns() {
            sqlx::query("UPDATE products SET sale_price_decimal = ROUND(?,2), cost_price_decimal = ROUND(?,2), current_stock_decimal = ROUND(?,3), min_stock_decimal = ROUND(?,3), max_stock_decimal = ROUND(COALESCE(?,0),3) WHERE id = ?")
                .bind(sale_price)
                .bind(cost_price)
                .bind(current_stock)
                .bind(min_stock)
                .bind(max_stock)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;

        let product =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Product".into(),
                    id: id.into(),
                })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            service.emit_sync_push(
                "product",
                serde_json::to_value(&product).unwrap_or_default(),
            );
            service.emit_product_notification(&product.id, &product.name);
            // Se houve mudança de estoque, notificar também
            if (product.current_stock - existing.current_stock).abs() > 0.001 {
                service.emit_stock_updated(
                    &product.id,
                    &product.name,
                    existing.current_stock,
                    product.current_stock,
                    "MANUAL",
                );
            }
        }

        Ok(product)
    }

    pub async fn update_stock(
        &self,
        id: &str,
        data: crate::models::UpdateStockData,
    ) -> AppResult<Product> {
        let mut tx = self.pool.begin().await?;

        let existing = self.find_by_id_tx(&mut tx, id).await?.ok_or_else(|| {
            crate::error::AppError::NotFound {
                entity: "Product".into(),
                id: id.into(),
            }
        })?;
        let new_stock = existing.current_stock + data.delta;
        let now = chrono::Utc::now().to_rfc3339();
        let movement_id = new_id();

        // 1. Create Stock Movement Record
        sqlx::query(
            "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&movement_id)
        .bind(id)
        .bind(&data.movement_type)
        .bind(data.delta)
        .bind(existing.current_stock)
        .bind(new_stock)
        .bind(&data.reason)
        .bind(&data.reference_id)
        .bind(&data.reference_type)
        .bind(&data.employee_id)
        .bind(&now)
        .execute(&mut *tx)
        .await?;

        // 2. Update Product Stock
        sqlx::query(
            "UPDATE products SET current_stock = ?, updated_at = (datetime('now')) WHERE id = ?",
        )
        .bind(new_stock)
        .bind(id)
        .execute(&mut *tx)
        .await?;

        if decimal_config::use_decimal_columns() {
            sqlx::query("UPDATE products SET current_stock_decimal = ROUND(?,3) WHERE id = ?")
                .bind(new_stock)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;

        let product =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Product".into(),
                    id: id.into(),
                })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            service.emit_stock_updated(
                &product.id,
                &product.name,
                existing.current_stock,
                product.current_stock,
                &data.movement_type,
            );
        }

        Ok(product)
    }

    pub async fn soft_delete(&self, id: &str) -> AppResult<()> {
        let _name = sqlx::query_scalar::<_, String>("SELECT name FROM products WHERE id = ?")
            .bind(id)
            .fetch_one(self.pool)
            .await
            .unwrap_or_else(|_| "Produto".to_string());

        sqlx::query(
            "UPDATE products SET is_active = 0, updated_at = (datetime('now')) WHERE id = ?",
        )
        .bind(id)
        .execute(self.pool)
        .await?;

        if let Some(service) = self.event_service {
            if let Ok(Some(product)) = self.find_by_id(id).await {
                service.emit_product_notification(&product.id, &product.name);
            }
        }

        Ok(())
    }

    /// Exclui um produto permanentemente (hard delete)
    /// ATENÇÃO: Esta ação é irreversível!
    pub async fn hard_delete(&self, id: &str) -> AppResult<String> {
        let mut tx = self.pool.begin().await?;

        // Buscar nome do produto antes de deletar
        let name = sqlx::query_scalar::<_, String>("SELECT name FROM products WHERE id = ?")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Product".into(),
                id: id.into(),
            })?;

        // Verificar se produto tem vendas associadas
        let sale_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM sale_items WHERE product_id = ?")
                .bind(id)
                .fetch_one(&mut *tx)
                .await?;

        if sale_count.0 > 0 {
            return Err(crate::error::AppError::Validation(format!(
                "Produto '{}' possui {} venda(s) associada(s). Desative o produto em vez de excluir.",
                name, sale_count.0
            )));
        }

        // Deletar registros relacionados em ordem
        // 1. Alertas
        sqlx::query("DELETE FROM alerts WHERE product_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // 2. Histórico de preços
        sqlx::query("DELETE FROM price_history WHERE product_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // 3. Movimentações de estoque
        sqlx::query("DELETE FROM stock_movements WHERE product_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // 4. Lotes
        sqlx::query("DELETE FROM product_lots WHERE product_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // 5. Compatibilidades (motopeças)
        sqlx::query("DELETE FROM product_compatibilities WHERE product_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // 6. Saldos de estoque (enterprise)
        sqlx::query("DELETE FROM stock_balances WHERE product_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // 7. Finalmente, deletar o produto
        sqlx::query("DELETE FROM products WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        // Notificar evento de exclusão
        if let Some(service) = self.event_service {
            service.emit_sync_push(
                "product_deleted",
                serde_json::json!({ "id": id, "name": name }),
            );
        }

        Ok(name)
    }

    /// Reativa um produto que foi desativado (soft deleted)
    pub async fn reactivate(&self, id: &str) -> AppResult<Product> {
        sqlx::query(
            "UPDATE products SET is_active = 1, updated_at = (datetime('now')) WHERE id = ?",
        )
        .bind(id)
        .execute(self.pool)
        .await?;
        self.find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Product".into(),
                id: id.into(),
            })
    }

    /// Retorna todos os produtos (ativos e inativos)
    pub async fn find_all(&self) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products ORDER BY name",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    /// Retorna apenas produtos inativos
    pub async fn find_inactive(&self) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE is_active = 0 ORDER BY name",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn get_stock_summary(&self) -> AppResult<Vec<StockSummary>> {
        let products = self.find_all_active(None).await?;
        let result: Vec<StockSummary> = products
            .into_iter()
            .map(|p| {
                let is_low = p.current_stock <= p.min_stock && p.current_stock > 0.0;
                let is_out = p.current_stock <= 0.0;
                StockSummary {
                    product_id: p.id,
                    product_name: p.name,
                    current_stock: p.current_stock,
                    min_stock: p.min_stock,
                    unit: p.unit,
                    is_low,
                    is_out,
                }
            })
            .collect();
        Ok(result)
    }

    /// Lista produtos com estoque baixo (compatível com mobile)
    pub async fn list_low_stock(&self, limit: i32, offset: i32) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE is_active = 1 AND current_stock <= min_stock AND current_stock > 0 ORDER BY current_stock ASC LIMIT ? OFFSET ?",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    /// Lista produtos com estoque zerado (compatível com mobile)
    pub async fn list_zero_stock(&self, limit: i32, offset: i32) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE is_active = 1 AND current_stock <= 0 ORDER BY name LIMIT ? OFFSET ?",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    /// Lista produtos com excesso de estoque (compatível com mobile)
    pub async fn list_excess_stock(&self, limit: i32, offset: i32) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE is_active = 1 AND ((max_stock IS NOT NULL AND current_stock > max_stock) OR (max_stock IS NULL AND current_stock > min_stock * 3)) ORDER BY current_stock DESC LIMIT ? OFFSET ?",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    /// Lista todos produtos ativos com paginação (compatível com mobile)
    pub async fn find_delta(&self, last_sync: i64) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE unixepoch(updated_at) > ? ORDER BY updated_at ASC",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(last_sync)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn list_all(&self, limit: i32, offset: i32) -> AppResult<Vec<Product>> {
        let query = format!(
            "SELECT {} FROM products WHERE is_active = 1 ORDER BY name LIMIT ? OFFSET ?",
            self.product_columns_string()
        );
        let result = sqlx::query_as::<_, Product>(&query)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }
    pub async fn upsert_from_sync(&self, product: Product) -> AppResult<()> {
        sqlx::query(
            "INSERT INTO products (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, current_stock, min_stock, max_stock, is_active, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                barcode=excluded.barcode,
                internal_code=excluded.internal_code,
                name=excluded.name,
                description=excluded.description,
                unit=excluded.unit,
                is_weighted=excluded.is_weighted,
                sale_price=excluded.sale_price,
                cost_price=excluded.cost_price,
                current_stock=excluded.current_stock,
                min_stock=excluded.min_stock,
                max_stock=excluded.max_stock,
                is_active=excluded.is_active,
                category_id=excluded.category_id,
                updated_at=excluded.updated_at"
        )
        .bind(&product.id)
        .bind(&product.barcode)
        .bind(&product.internal_code)
        .bind(&product.name)
        .bind(&product.description)
        .bind(&product.unit)
        .bind(product.is_weighted)
        .bind(product.sale_price)
        .bind(product.cost_price)
        .bind(product.current_stock)
        .bind(product.min_stock)
        .bind(product.max_stock)
        .bind(product.is_active)
        .bind(&product.category_id)
        .bind(&product.created_at)
        .bind(&product.updated_at)
        .execute(self.pool)
        .await?;
        // If decimal migration is enabled, mirror values into decimal columns for sync/upsert parity
        if decimal_config::use_decimal_columns() {
            sqlx::query("UPDATE products SET sale_price_decimal = ROUND(?,2), cost_price_decimal = ROUND(?,2), current_stock_decimal = ROUND(?,3), min_stock_decimal = ROUND(?,3), max_stock_decimal = ROUND(COALESCE(?,0),3) WHERE id = ?")
            .bind(product.sale_price)
            .bind(product.cost_price)
            .bind(product.current_stock)
            .bind(product.min_stock)
            .bind(product.max_stock)
            .bind(&product.id)
            .execute(self.pool)
            .await?;
        }
        Ok(())
    }
}

#[cfg(test)]
#[path = "product_repository_test.rs"]
mod product_repository_test;
