//! Repositório de Ordens de Serviço - Motopeças
//!
//! Acesso a dados para ordens de serviço, itens e serviços pré-cadastrados

use sqlx::{Pool, QueryBuilder, Sqlite};

use crate::error::{AppError, AppResult};
use crate::models::{
    AddServiceOrderItem, CreateService, CreateServiceOrder, Service, ServiceOrder,
    ServiceOrderFilters, ServiceOrderItem, ServiceOrderSummary, ServiceOrderWithDetails,
    UpdateService, UpdateServiceOrder, UpdateServiceOrderItem,
};
use crate::repositories::{new_id, PaginatedResult, Pagination, SaleRepository};

pub struct ServiceOrderRepository {
    pool: Pool<Sqlite>,
}

impl ServiceOrderRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ORDENS DE SERVIÇO
    // ═══════════════════════════════════════════════════════════════════════

    async fn next_order_number_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> AppResult<i32> {
        let next_number: i32 = sqlx::query_scalar(
            r#"
            UPDATE _service_order_sequence
            SET next_number = next_number + 1
            WHERE id = 1
            RETURNING next_number
            "#,
        )
        .fetch_one(&mut **tx)
        .await?;

        Ok(next_number - 1)
    }

    /// Lista ordens de serviço com paginação e filtros
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        filters: &ServiceOrderFilters,
    ) -> AppResult<PaginatedResult<ServiceOrderSummary>> {
        // 1. Contar total (usando QueryBuilder para segurança)
        let mut count_builder: QueryBuilder<Sqlite> =
            QueryBuilder::new("SELECT COUNT(*) FROM service_orders so WHERE 1=1 ");

        if let Some(ref status) = filters.status {
            count_builder.push(" AND so.status = ");
            count_builder.push_bind(status);
        }
        if let Some(ref customer_id) = filters.customer_id {
            count_builder.push(" AND so.customer_id = ");
            count_builder.push_bind(customer_id);
        }
        if let Some(ref vehicle_id) = filters.vehicle_id {
            count_builder.push(" AND so.customer_vehicle_id = ");
            count_builder.push_bind(vehicle_id);
        }
        if let Some(ref employee_id) = filters.employee_id {
            count_builder.push(" AND so.employee_id = ");
            count_builder.push_bind(employee_id);
        }
        if let Some(is_paid) = filters.is_paid {
            count_builder.push(" AND so.is_paid = ");
            count_builder.push_bind(is_paid);
        }
        if let Some(ref date_from) = filters.date_from {
            count_builder.push(" AND so.created_at >= ");
            count_builder.push_bind(date_from);
        }
        if let Some(ref date_to) = filters.date_to {
            count_builder.push(" AND so.created_at <= ");
            count_builder.push_bind(date_to);
        }

        let total: i64 = count_builder
            .build_query_as::<(i64,)>()
            .fetch_one(&self.pool)
            .await?
            .0;

        // 2. Buscar dados (usando QueryBuilder para segurança)
        let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
            r#"
            SELECT
                so.id,
                so.order_number,
                so.status,
                c.name as customer_name,
                vb.name || ' ' || vm.name || ' ' || vy.year_label as vehicle_display_name,
                cv.plate as vehicle_plate,
                so.total,
                so.is_paid,
                so.created_at
            FROM service_orders so
            INNER JOIN customers c ON c.id = so.customer_id
            INNER JOIN customer_vehicles cv ON cv.id = so.customer_vehicle_id
            INNER JOIN vehicle_years vy ON vy.id = so.vehicle_year_id
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE 1=1 
            "#,
        );

        if let Some(ref status) = filters.status {
            query_builder.push(" AND so.status = ");
            query_builder.push_bind(status);
        }
        if let Some(ref customer_id) = filters.customer_id {
            query_builder.push(" AND so.customer_id = ");
            query_builder.push_bind(customer_id);
        }
        if let Some(ref vehicle_id) = filters.vehicle_id {
            query_builder.push(" AND so.customer_vehicle_id = ");
            query_builder.push_bind(vehicle_id);
        }
        if let Some(ref employee_id) = filters.employee_id {
            query_builder.push(" AND so.employee_id = ");
            query_builder.push_bind(employee_id);
        }
        if let Some(is_paid) = filters.is_paid {
            query_builder.push(" AND so.is_paid = ");
            query_builder.push_bind(is_paid);
        }
        if let Some(ref date_from) = filters.date_from {
            query_builder.push(" AND so.created_at >= ");
            query_builder.push_bind(date_from);
        }
        if let Some(ref date_to) = filters.date_to {
            query_builder.push(" AND so.created_at <= ");
            query_builder.push_bind(date_to);
        }

        query_builder.push(" ORDER BY so.created_at DESC ");
        query_builder.push(" LIMIT ");
        query_builder.push_bind(pagination.per_page as i64);
        query_builder.push(" OFFSET ");
        query_builder.push_bind(pagination.offset() as i64);

        let rows = query_builder
            .build_query_as::<(
                String,
                i32,
                String,
                String,
                String,
                Option<String>,
                f64,
                bool,
                String,
            )>()
            .fetch_all(&self.pool)
            .await?;

        let data: Vec<ServiceOrderSummary> = rows
            .into_iter()
            .map(|r| ServiceOrderSummary {
                id: r.0,
                order_number: r.1,
                status: r.2,
                customer_name: r.3,
                vehicle_display_name: r.4,
                vehicle_plate: r.5,
                total: r.6,
                is_paid: r.7,
                created_at: r.8,
            })
            .collect();

        Ok(PaginatedResult::new(
            data,
            total,
            pagination.page,
            pagination.per_page,
        ))
    }

    /// Busca ordem por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<ServiceOrder>> {
        let mut tx = self.pool.begin().await?;
        let res = self.find_by_id_tx(&mut tx, id).await?;
        tx.commit().await?;
        Ok(res)
    }

    pub async fn find_by_id_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        id: &str,
    ) -> AppResult<Option<ServiceOrder>> {
        let order = sqlx::query_as!(
            ServiceOrder,
            r#"SELECT 
                id as "id!", order_number as "order_number!: i32", customer_id as "customer_id!", 
                customer_vehicle_id as "customer_vehicle_id!", vehicle_year_id as "vehicle_year_id!", 
                employee_id as "employee_id!",
                vehicle_km as "vehicle_km?: i32", symptoms as "symptoms?", diagnosis as "diagnosis?",
                status as "status!", labor_cost as "labor_cost!", parts_cost as "parts_cost!", 
                discount as "discount!", total as "total!", warranty_days as "warranty_days!: i32",
                warranty_until as "warranty_until?", scheduled_date as "scheduled_date?",
                started_at as "started_at?", completed_at as "completed_at?",
                payment_method as "payment_method?", is_paid as "is_paid!: bool",
                notes as "notes?", internal_notes as "internal_notes?",
                created_at as "created_at!", updated_at as "updated_at!"
            FROM service_orders WHERE id = ?"#,
            id
        )
        .fetch_optional(&mut **tx)
        .await?;

        Ok(order)
    }

    /// Busca ordem por número
    pub async fn find_by_number(&self, order_number: i32) -> AppResult<Option<ServiceOrder>> {
        let order = sqlx::query_as!(
            ServiceOrder,
            r#"SELECT 
                id as "id!", order_number as "order_number!: i32", customer_id as "customer_id!", 
                customer_vehicle_id as "customer_vehicle_id!", vehicle_year_id as "vehicle_year_id!", 
                employee_id as "employee_id!",
                vehicle_km as "vehicle_km?: i32", symptoms as "symptoms?", diagnosis as "diagnosis?",
                status as "status!", labor_cost as "labor_cost!", parts_cost as "parts_cost!", 
                discount as "discount!", total as "total!", warranty_days as "warranty_days!: i32",
                warranty_until as "warranty_until?", scheduled_date as "scheduled_date?",
                started_at as "started_at?", completed_at as "completed_at?",
                payment_method as "payment_method?", is_paid as "is_paid!: bool",
                notes as "notes?", internal_notes as "internal_notes?",
                created_at as "created_at!", updated_at as "updated_at!"
            FROM service_orders WHERE order_number = ?"#,
            order_number
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(order)
    }

    /// Busca ordem com detalhes completos
    pub async fn find_by_id_with_details(
        &self,
        id: &str,
    ) -> AppResult<Option<ServiceOrderWithDetails>> {
        let order = sqlx::query!(
            r#"
            SELECT
                so.id as "id!",
                so.order_number as "order_number: i32",
                so.customer_id as "customer_id!",
                so.customer_vehicle_id as "customer_vehicle_id!",
                so.vehicle_year_id as "vehicle_year_id!",
                so.employee_id as "employee_id!",
                so.vehicle_km as "vehicle_km?: i32",
                so.symptoms as "symptoms?",
                so.diagnosis as "diagnosis?",
                so.status as "status!",
                so.labor_cost as "labor_cost: f64",
                so.parts_cost as "parts_cost: f64",
                so.discount as "discount: f64",
                so.total as "total: f64",
                so.warranty_days as "warranty_days: i32",
                so.warranty_until as "warranty_until?",
                so.scheduled_date as "scheduled_date?",
                so.started_at as "started_at?",
                so.completed_at as "completed_at?",
                so.payment_method as "payment_method?",
                so.is_paid as "is_paid: bool",
                so.notes as "notes?",
                so.internal_notes as "internal_notes?",
                so.created_at as "created_at!",
                so.updated_at as "updated_at!",
                c.name as "customer_name!",
                c.phone as "customer_phone?",
                vb.name || ' ' || vm.name || ' ' || vy.year_label as "vehicle_display_name!: String",
                cv.plate as "vehicle_plate?",
                cv.color as "vehicle_color?",
                e.name as "employee_name!"
            FROM service_orders so
            INNER JOIN customers c ON c.id = so.customer_id
            INNER JOIN customer_vehicles cv ON cv.id = so.customer_vehicle_id
            INNER JOIN vehicle_years vy ON vy.id = so.vehicle_year_id
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            INNER JOIN employees e ON e.id = so.employee_id
            WHERE so.id = ?
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        match order {
            Some(o) => {
                let items = self.find_order_items(&o.id).await?;

                Ok(Some(ServiceOrderWithDetails {
                    order: ServiceOrder {
                        id: o.id,
                        order_number: o.order_number,
                        customer_id: o.customer_id,
                        customer_vehicle_id: o.customer_vehicle_id,
                        vehicle_year_id: o.vehicle_year_id,
                        employee_id: o.employee_id,
                        vehicle_km: o.vehicle_km,
                        symptoms: o.symptoms,
                        diagnosis: o.diagnosis,
                        status: o.status,
                        labor_cost: o.labor_cost,
                        parts_cost: o.parts_cost,
                        discount: o.discount,
                        total: o.total,
                        warranty_days: o.warranty_days,
                        warranty_until: o.warranty_until,
                        scheduled_date: o.scheduled_date,
                        started_at: o.started_at,
                        completed_at: o.completed_at,
                        payment_method: o.payment_method,
                        is_paid: o.is_paid,
                        notes: o.notes,
                        internal_notes: o.internal_notes,
                        created_at: o.created_at,
                        updated_at: o.updated_at,
                    },
                    customer_name: o.customer_name,
                    customer_phone: o.customer_phone,
                    vehicle_display_name: o.vehicle_display_name,
                    vehicle_plate: o.vehicle_plate,
                    vehicle_color: o.vehicle_color,
                    employee_name: o.employee_name,
                    items,
                }))
            }
            None => Ok(None),
        }
    }

    /// Cria nova ordem de serviço
    pub async fn create(&self, input: CreateServiceOrder) -> AppResult<ServiceOrder> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let order_number = self.next_order_number_tx(&mut tx).await?;
        let status = input.status.unwrap_or_else(|| "OPEN".to_string());

        sqlx::query!(
            r#"
            INSERT INTO service_orders (
                id, order_number, customer_id, customer_vehicle_id, vehicle_year_id,
                employee_id, vehicle_km, symptoms, status, labor_cost, parts_cost,
                discount, total, warranty_days, scheduled_date, notes, internal_notes,
                is_paid, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 30, ?, ?, ?, 0, ?, ?)
            "#,
            id,
            order_number,
            input.customer_id,
            input.customer_vehicle_id,
            input.vehicle_year_id,
            input.employee_id,
            input.vehicle_km,
            input.symptoms,
            status,
            input.scheduled_date,
            input.notes,
            input.internal_notes,
            now,
            now
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.clone(),
            })
    }

    /// Atualiza ordem de serviço
    pub async fn update(&self, id: &str, input: UpdateServiceOrder) -> AppResult<ServiceOrder> {
        let mut tx = self.pool.begin().await?;
        let now = chrono::Utc::now().to_rfc3339();

        // Buscar ordem atual usando a transação aberta
        let current = self
            .find_by_id_tx(&mut tx, id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.to_string(),
            })?;

        // Atualizar timestamps de status
        let mut started_at = current.started_at;
        let mut completed_at = current.completed_at;
        let mut warranty_until = current.warranty_until;

        if let Some(ref status) = input.status {
            if status == "IN_PROGRESS" && started_at.is_none() {
                started_at = Some(now.clone());
            }
            if (status == "COMPLETED" || status == "DELIVERED") && completed_at.is_none() {
                completed_at = Some(now.clone());
                // Calcular data fim da garantia
                let warranty_days = input.warranty_days.unwrap_or(current.warranty_days);
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&now) {
                    let end = dt + chrono::Duration::days(warranty_days as i64);
                    warranty_until = Some(end.to_rfc3339());
                }
            }
            // QUOTE -> OPEN: Consumir estoque de todos os itens
            if current.status == "QUOTE" && (status == "OPEN" || status == "IN_PROGRESS") {
                self.consume_stock_for_order_tx(&mut tx, id).await?;
            }
        }

        sqlx::query(
            r#"
            UPDATE service_orders SET
                vehicle_km = COALESCE(?, vehicle_km),
                symptoms = COALESCE(?, symptoms),
                diagnosis = COALESCE(?, diagnosis),
                status = COALESCE(?, status),
                labor_cost = COALESCE(?, labor_cost),
                discount = COALESCE(?, discount),
                warranty_days = COALESCE(?, warranty_days),
                warranty_until = ?,
                scheduled_date = COALESCE(?, scheduled_date),
                started_at = ?,
                completed_at = ?,
                payment_method = COALESCE(?, payment_method),
                is_paid = COALESCE(?, is_paid),
                notes = COALESCE(?, notes),
                internal_notes = COALESCE(?, internal_notes),
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(input.vehicle_km)
        .bind(&input.symptoms)
        .bind(&input.diagnosis)
        .bind(&input.status)
        .bind(input.labor_cost)
        .bind(input.discount)
        .bind(input.warranty_days)
        .bind(&warranty_until)
        .bind(&input.scheduled_date)
        .bind(&started_at)
        .bind(&completed_at)
        .bind(&input.payment_method)
        .bind(input.is_paid)
        .bind(&input.notes)
        .bind(&input.internal_notes)
        .bind(&now)
        .bind(id)
        .execute(&mut *tx)
        .await?;

        // Recalcular totais
        self.recalculate_totals_tx(&mut tx, id).await?;

        tx.commit().await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.to_string(),
            })
    }

    async fn recalculate_totals_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        order_id: &str,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        // Calcular totais de serviços
        let totals = sqlx::query!(
            r#"
            SELECT
                COALESCE(SUM(total), 0) as service_total
            FROM order_services
            WHERE order_id = ?
            "#,
            order_id
        )
        .fetch_one(&mut **tx)
        .await?;

        // Buscar desconto atual
        let order = self
            .find_by_id_tx(tx, order_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: order_id.to_string(),
            })?;

        // Calcular custo de peças (order_products)
        let parts_total: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(total), 0.0)
            FROM order_products
            WHERE order_id = ?
            "#,
        )
        .bind(order_id)
        .fetch_one(&mut **tx)
        .await?;

        let labor_cost = totals.service_total as f64;
        let parts_cost = parts_total;
        let total = labor_cost + parts_cost - order.discount;

        sqlx::query(
            r#"
            UPDATE service_orders SET
                labor_cost = ?,
                parts_cost = ?,
                total = ?,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(labor_cost)
        .bind(parts_cost)
        .bind(total)
        .bind(now)
        .bind(order_id)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    /// Lista ordens abertas
    pub async fn find_open_orders(&self) -> AppResult<Vec<ServiceOrderSummary>> {
        let orders = sqlx::query!(
            r#"
            SELECT
                so.id as "id!",
                so.order_number as "order_number: i32",
                so.status as "status!",
                c.name as "customer_name!",
                vb.name || ' ' || vm.name || ' ' || vy.year_label as "vehicle_display_name!",
                cv.plate as "vehicle_plate?",
                so.total as "total: f64",
                so.is_paid as "is_paid: bool",
                so.created_at as "created_at!"
            FROM service_orders so
            INNER JOIN customers c ON c.id = so.customer_id
            INNER JOIN customer_vehicles cv ON cv.id = so.customer_vehicle_id
            INNER JOIN vehicle_years vy ON vy.id = so.vehicle_year_id
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE so.status NOT IN ('DELIVERED', 'CANCELED')
            ORDER BY 
                CASE so.status 
                    WHEN 'IN_PROGRESS' THEN 1
                    WHEN 'WAITING_PARTS' THEN 2
                    WHEN 'COMPLETED' THEN 3
                    WHEN 'OPEN' THEN 4
                END,
                so.created_at ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(orders
            .into_iter()
            .map(|o| ServiceOrderSummary {
                id: o.id,
                order_number: o.order_number,
                status: o.status,
                customer_name: o.customer_name,
                vehicle_display_name: o.vehicle_display_name,
                vehicle_plate: o.vehicle_plate,
                total: o.total,
                is_paid: o.is_paid,
                created_at: o.created_at,
            })
            .collect())
    }

    /// Busca as últimas 3 ordens de serviço de um veículo
    pub async fn find_by_vehicle(&self, vehicle_id: &str) -> AppResult<Vec<ServiceOrderSummary>> {
        let sql = r#"
            SELECT
                so.id,
                so.order_number,
                so.status,
                c.name as customer_name,
                vb.name || ' ' || vm.name || ' ' || vy.year_label as vehicle_display_name,
                cv.plate as vehicle_plate,
                so.total,
                so.is_paid,
                so.created_at
            FROM service_orders so
            INNER JOIN customers c ON c.id = so.customer_id
            INNER JOIN customer_vehicles cv ON cv.id = so.customer_vehicle_id
            INNER JOIN vehicle_years vy ON vy.id = so.vehicle_year_id
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE so.customer_vehicle_id = ?
            ORDER BY so.created_at DESC
            LIMIT 3
        "#;

        let orders = sqlx::query_as::<_, ServiceOrderSummary>(sql)
            .bind(vehicle_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(orders)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ITENS DA ORDEM
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista itens de uma ordem
    pub async fn find_order_items(&self, order_id: &str) -> AppResult<Vec<ServiceOrderItem>> {
        let items = sqlx::query_as::<_, ServiceOrderItem>(
            r#"
            SELECT 
                id, 
                order_id, 
                product_id,
                item_type, 
                description,
                employee_id,
                quantity, 
                unit_price,
                discount_percent, 
                discount_value, 
                subtotal, 
                total,
                notes,
                current_stock,
                min_stock,
                created_at, 
                updated_at
            FROM (
                SELECT 
                    id, order_id, CAST(NULL AS TEXT) as product_id, 'SERVICE' as item_type, description, 
                    employee_id, quantity, unit_price, discount_percent, discount_value, 
                    subtotal, total, notes, 
                    CAST(NULL AS REAL) as current_stock, CAST(NULL AS REAL) as min_stock,
                    created_at, updated_at
                FROM order_services 
                WHERE order_id = ?
                
                UNION ALL
                
                SELECT 
                    op.id, op.order_id, op.product_id, 'PART' as item_type, p.name as description, 
                    op.employee_id, op.quantity, op.unit_price, op.discount_percent, op.discount_value, 
                    op.subtotal, op.total, CAST(NULL AS TEXT) as notes,
                    p.current_stock, p.min_stock,
                    op.created_at, op.updated_at
                FROM order_products op
                LEFT JOIN products p ON p.id = op.product_id
                WHERE op.order_id = ?
            ) AS items
            ORDER BY created_at ASC
            "#,
        )
        .bind(order_id)
        .bind(order_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    /// Adiciona item à ordem
    pub async fn add_item(&self, input: AddServiceOrderItem) -> AppResult<ServiceOrderItem> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        let discount_value = input.discount.unwrap_or(0.0);
        let subtotal = input.quantity * input.unit_price;
        let total = subtotal - discount_value;

        // Verificar status da ordem para saber se deve consumir estoque
        let order = self
            .find_by_id(&input.order_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".into(),
                id: input.order_id.clone(),
            })?;
        let is_quote = order.status == "QUOTE";

        let mut tx = self.pool.begin().await?;
        let mut linked_lot_id: Option<String> = None;

        if input.item_type == "PART" {
            let product_id = input
                .product_id
                .as_ref()
                .ok_or_else(|| AppError::Validation("Product ID required for parts".into()))?;

            // Verificar estoque mesmo para QUOTE (para feedback visual)
            let product = sqlx::query!(
                "SELECT current_stock FROM products WHERE id = ?",
                product_id
            )
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Product".into(),
                id: product_id.clone(),
            })?;

            // Validar estoque disponível (apenas se NÃO for orçamento)
            if !is_quote && product.current_stock < input.quantity {
                return Err(AppError::Validation(format!(
                    "Estoque insuficiente. Disponível: {:.2}, Solicitado: {:.2}",
                    product.current_stock, input.quantity
                )));
            }

            // Só consumir estoque se NÃO for orçamento
            if !is_quote {
                let new_stock = product.current_stock - input.quantity;
                sqlx::query!(
                    "UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?",
                    new_stock,
                    now,
                    product_id
                )
                .execute(&mut *tx)
                .await?;

                // Consume from lots (FIFO)
                let mut remaining_to_consume = input.quantity;
                let lots = sqlx::query!(
                    "SELECT id, current_quantity FROM product_lots WHERE product_id = ? AND current_quantity > 0 AND status = 'AVAILABLE' ORDER BY expiration_date ASC, purchase_date ASC",
                    product_id
                )
                .fetch_all(&mut *tx)
                .await?;

                for lot in lots {
                    if remaining_to_consume <= 0.0 {
                        break;
                    }

                    let consume = lot.current_quantity.min(remaining_to_consume);
                    sqlx::query!(
                        "UPDATE product_lots SET current_quantity = current_quantity - ?, updated_at = ? WHERE id = ?",
                        consume, now, lot.id
                    )
                    .execute(&mut *tx)
                    .await?;

                    remaining_to_consume -= consume;
                    if linked_lot_id.is_none() {
                        linked_lot_id = Some(lot.id);
                    }
                }

                // Record stock movement
                let movement_id = new_id();
                let movement_qty = -input.quantity;
                sqlx::query!(
                    "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, 'USAGE', ?, ?, ?, 'Uso em OS', ?, 'SERVICE_ORDER', ?, ?)",
                    movement_id, product_id, movement_qty, product.current_stock, new_stock, input.order_id, input.employee_id, now
                )
                .execute(&mut *tx)
                .await?;
            }

            // Insert into order_products
            sqlx::query(
                r#"
                INSERT INTO order_products (
                    id, order_id, product_id, employee_id, quantity, unit_price, 
                    discount_percent, discount_value, subtotal, total, 
                    lot_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&id)
            .bind(&input.order_id)
            .bind(product_id)
            .bind(&input.employee_id)
            .bind(input.quantity)
            .bind(input.unit_price)
            .bind(discount_value)
            .bind(subtotal)
            .bind(total)
            .bind(linked_lot_id)
            .bind(&now)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        } else {
            // Insert into order_services
            sqlx::query!(
                r#"
                INSERT INTO order_services (
                    id, order_id, description, employee_id,
                    quantity, unit_price, discount_percent, discount_value, subtotal, total,
                    notes, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
                "#,
                id,
                input.order_id,
                input.description,
                input.employee_id,
                input.quantity,
                input.unit_price,
                discount_value,
                subtotal,
                total,
                input.notes,
                now,
                now
            )
            .execute(&mut *tx)
            .await?;
        }

        // Recalcular totais da ordem
        self.recalculate_totals_tx(&mut tx, &input.order_id).await?;

        tx.commit().await?;

        // Retornar item adicionado (buscando do banco para ter todos os campos populados, incluindo estoque)
        let items = self.find_order_items(&input.order_id).await?;
        items
            .into_iter()
            .find(|i| i.id == id)
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrderItem".to_string(),
                id,
            })
    }

    /// Remove item da ordem
    pub async fn remove_item(&self, item_id: &str) -> AppResult<()> {
        let mut order_id = None;
        let now = chrono::Utc::now().to_rfc3339();

        let mut tx = self.pool.begin().await?;

        // Try finding in order_services
        if let Some(row) = sqlx::query!(
            r#"SELECT order_id FROM order_services WHERE id = ?"#,
            item_id
        )
        .fetch_optional(&mut *tx)
        .await?
        {
            order_id = Some(row.order_id);
            sqlx::query!(r#"DELETE FROM order_services WHERE id = ?"#, item_id)
                .execute(&mut *tx)
                .await?;
        }

        // If not found, try order_products
        if order_id.is_none() {
            if let Some(row) = sqlx::query!(
                r#"SELECT order_id, product_id, quantity, lot_id FROM order_products WHERE id = ?"#,
                item_id
            )
            .fetch_optional(&mut *tx)
            .await?
            {
                // clone fields to avoid moved-value when using row later
                let order_id_str = row.order_id.clone();
                let product_id = row.product_id.clone();
                let quantity = row.quantity;
                let lot_id = row.lot_id.clone();

                order_id = Some(order_id_str.clone());

                // Restore Stock
                // 1. Restore Product Stock
                let current_prod = sqlx::query!(
                    "SELECT current_stock FROM products WHERE id = ?",
                    product_id
                )
                .fetch_one(&mut *tx)
                .await?;

                let new_stock = current_prod.current_stock + quantity;

                sqlx::query!(
                    "UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?",
                    new_stock,
                    now,
                    product_id
                )
                .execute(&mut *tx)
                .await?;

                // 2. Restore Lot Stock (if linked)
                if let Some(lot_id_val) = lot_id {
                    sqlx::query!("UPDATE product_lots SET current_quantity = current_quantity + ?, updated_at = ? WHERE id = ?",
                        quantity, now, lot_id_val)
                        .execute(&mut *tx)
                        .await?;
                }

                // 3. Record Movement (RETURN)
                let movement_id = new_id();
                sqlx::query!(
                    "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, created_at) VALUES (?, ?, 'RETURN', ?, ?, ?, 'Remoção de OS', ?, 'SERVICE_ORDER', ?)",
                    movement_id, product_id, quantity, current_prod.current_stock, new_stock, order_id_str, now
                )
                .execute(&mut *tx)
                .await?;

                sqlx::query!(r#"DELETE FROM order_products WHERE id = ?"#, item_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }

        if let Some(oid) = order_id {
            // Recalcular totais
            self.recalculate_totals_tx(&mut tx, &oid).await?;
        }

        tx.commit().await?;

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FUNÇÕES AUXILIARES DE ESTOQUE
    // ═══════════════════════════════════════════════════════════════════════

    /// Consome estoque de todos os produtos de uma ordem
    pub async fn consume_stock_for_order(&self, order_id: &str) -> AppResult<()> {
        let mut tx = self.pool.begin().await?;
        self.consume_stock_for_order_tx(&mut tx, order_id).await?;
        tx.commit().await?;
        Ok(())
    }

    async fn consume_stock_for_order_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        order_id: &str,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        // Buscar todos os produtos da ordem
        let products = sqlx::query!(
            r#"SELECT id, product_id, quantity FROM order_products WHERE order_id = ?"#,
            order_id
        )
        .fetch_all(&mut **tx)
        .await?;

        for prod in products {
            let product_id = &prod.product_id;
            let quantity = prod.quantity;
            let product_item_id = prod.id;

            // Get current stock
            let product = sqlx::query!(
                "SELECT current_stock FROM products WHERE id = ?",
                product_id
            )
            .fetch_optional(&mut **tx)
            .await?;

            if let Some(p) = product {
                let new_stock = p.current_stock - quantity;

                // Update product stock
                sqlx::query!(
                    "UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?",
                    new_stock,
                    now,
                    product_id
                )
                .execute(&mut **tx)
                .await?;

                // Consume from lots (FIFO)
                let mut remaining = quantity;
                let mut linked_lot_id = None;

                let lots = sqlx::query!(
                    "SELECT id, current_quantity FROM product_lots WHERE product_id = ? AND current_quantity > 0 AND status = 'AVAILABLE' ORDER BY expiration_date ASC, purchase_date ASC",
                    product_id
                )
                .fetch_all(&mut **tx)
                .await?;

                for lot in lots {
                    if remaining <= 0.0 {
                        break;
                    }
                    let consume = lot.current_quantity.min(remaining);
                    sqlx::query!(
                        "UPDATE product_lots SET current_quantity = current_quantity - ?, updated_at = ? WHERE id = ?",
                        consume, now, lot.id
                    )
                    .execute(&mut **tx)
                    .await?;
                    remaining -= consume;

                    if linked_lot_id.is_none() {
                        linked_lot_id = Some(lot.id);
                    }
                }

                // Update order_product with lot_id
                if let Some(lot_id) = linked_lot_id {
                    sqlx::query("UPDATE order_products SET lot_id = ? WHERE id = ?")
                        .bind(lot_id)
                        .bind(product_item_id)
                        .execute(&mut **tx)
                        .await?;
                }

                // Record movement
                let movement_id = new_id();
                let movement_qty = -quantity;
                sqlx::query!(
                    "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, created_at) VALUES (?, ?, 'USAGE', ?, ?, ?, 'Consumo OS (Orçamento aprovado)', ?, 'SERVICE_ORDER', ?)",
                    movement_id, product_id, movement_qty, p.current_stock, new_stock, order_id, now
                )
                .execute(&mut **tx)
                .await?;
            }
        }

        Ok(())
    }

    /// Atualiza item da ordem com delta de estoque
    pub async fn update_item(
        &self,
        item_id: &str,
        input: UpdateServiceOrderItem,
    ) -> AppResult<ServiceOrderItem> {
        let now = chrono::Utc::now().to_rfc3339();
        let mut order_id: Option<String> = None;

        let mut tx = self.pool.begin().await?;

        // Tentar encontrar em order_services
        if let Some(svc) = sqlx::query!(
            r#"SELECT id, order_id, quantity, unit_price, discount_value, notes, employee_id FROM order_services WHERE id = ?"#,
            item_id
        )
        .fetch_optional(&mut *tx)
        .await?
        {
            order_id = Some(svc.order_id.clone());
            let new_qty = input.quantity.unwrap_or(svc.quantity);
            let new_price = input.unit_price.unwrap_or(svc.unit_price);
            let new_discount = input.discount.unwrap_or(svc.discount_value);
            let subtotal = new_qty * new_price;
            let total = subtotal - new_discount;

            sqlx::query!(
                r#"UPDATE order_services SET 
                    quantity = ?, unit_price = ?, discount_value = ?, subtotal = ?, total = ?,
                    notes = COALESCE(?, notes), employee_id = COALESCE(?, employee_id), updated_at = ?
                WHERE id = ?"#,
                new_qty, new_price, new_discount, subtotal, total,
                input.notes, input.employee_id, now, item_id
            )
            .execute(&mut *tx)
            .await?;
        }

        // Tentar encontrar em order_products (com delta de estoque)
        if order_id.is_none() {
            if let Some(prod) = sqlx::query!(
                r#"SELECT op.id, op.order_id, op.product_id, op.quantity, op.unit_price, op.discount_value, op.lot_id,
                    so.status as order_status
                FROM order_products op
                JOIN service_orders so ON so.id = op.order_id
                WHERE op.id = ?"#,
                item_id
            )
            .fetch_optional(&mut *tx)
            .await?
            {
                order_id = Some(prod.order_id.clone());
                let old_qty = prod.quantity;
                let new_qty = input.quantity.unwrap_or(old_qty);
                let delta = new_qty - old_qty;
                let new_price = input.unit_price.unwrap_or(prod.unit_price);
                let new_discount = input.discount.unwrap_or(prod.discount_value);
                let subtotal = new_qty * new_price;
                let total = subtotal - new_discount;

                // Só ajustar estoque se NÃO for QUOTE
                if prod.order_status != "QUOTE" && delta.abs() > 0.001 {
                    let product = sqlx::query!(
                        "SELECT current_stock FROM products WHERE id = ?",
                        prod.product_id
                    )
                    .fetch_one(&mut *tx)
                    .await?;

                    // delta > 0: consumir mais estoque
                    // delta < 0: devolver estoque
                    let new_stock = product.current_stock - delta;

                    // Validar estoque suficiente
                    if delta > 0.0 && new_stock < 0.0 {
                        return Err(AppError::Validation(format!(
                            "Estoque insuficiente. Disponível: {:.2}, Necessário adicional: {:.2}",
                            product.current_stock, delta
                        )));
                    }

                    sqlx::query!(
                        "UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?",
                        new_stock, now, prod.product_id
                    )
                    .execute(&mut *tx)
                    .await?;

                    // Ajustar lotes
                    if delta > 0.0 {
                        // Consumir mais (FIFO)
                        let mut remaining = delta;
                        let lots = sqlx::query!(
                            "SELECT id, current_quantity FROM product_lots WHERE product_id = ? AND current_quantity > 0 AND status = 'AVAILABLE' ORDER BY expiration_date ASC, purchase_date ASC",
                            prod.product_id
                        )
                        .fetch_all(&mut *tx)
                        .await?;
                        for lot in lots {
                            if remaining <= 0.0 { break; }
                            let consume = lot.current_quantity.min(remaining);
                            sqlx::query!(
                                "UPDATE product_lots SET current_quantity = current_quantity - ?, updated_at = ? WHERE id = ?",
                                consume, now, lot.id
                            )
                            .execute(&mut *tx)
                            .await?;
                            remaining -= consume;
                        }
                    } else if let Some(lot_id) = &prod.lot_id {
                        // Devolver ao lote original
                        let return_qty = -delta;
                        sqlx::query!(
                            "UPDATE product_lots SET current_quantity = current_quantity + ?, updated_at = ? WHERE id = ?",
                            return_qty, now, lot_id
                        )
                        .execute(&mut *tx)
                        .await?;
                    }

                    // Registrar movimento
                    let movement_id = new_id();
                    let movement_type = if delta > 0.0 { "USAGE" } else { "RETURN" };
                    let reason = if delta > 0.0 { "Aumento de quantidade em OS" } else { "Redução de quantidade em OS" };
                    sqlx::query!(
                        "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SERVICE_ORDER', ?)",
                        movement_id, prod.product_id, movement_type, delta, product.current_stock, new_stock, reason, prod.order_id, now
                    )
                    .execute(&mut *tx)
                    .await?;
                }

                sqlx::query(
                    r#"UPDATE order_products SET 
                        quantity = ?, unit_price = ?, discount_value = ?, subtotal = ?, total = ?, 
                        employee_id = COALESCE(?, employee_id), updated_at = ?
                    WHERE id = ?"#,
                )
                .bind(new_qty)
                .bind(new_price)
                .bind(new_discount)
                .bind(subtotal)
                .bind(total)
                .bind(&input.employee_id)
                .bind(&now)
                .bind(item_id)
                .execute(&mut *tx)
                .await?;
            }
        }

        if let Some(oid) = &order_id {
            self.recalculate_totals_tx(&mut tx, oid).await?;
        }

        tx.commit().await?;

        // Retornar item atualizado
        if let Some(oid) = order_id {
            let items = self.find_order_items(&oid).await?;
            if let Some(item) = items.into_iter().find(|i| i.id == item_id) {
                return Ok(item);
            }
        }

        Err(AppError::NotFound {
            entity: "ServiceOrderItem".to_string(),
            id: item_id.to_string(),
        })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SERVIÇOS PRÉ-CADASTRADOS
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista todos os serviços ativos
    pub async fn find_all_services(&self) -> AppResult<Vec<Service>> {
        let services = sqlx::query_as!(
            Service,
            r#"SELECT 
                id as "id!", code as "code!", name as "name!", 
                description as "description?",
                default_price as "default_price!",
                estimated_time as "estimated_time?: i32",
                default_warranty_days as "default_warranty_days!: i32",
                is_active as "is_active!: bool",
                created_at as "created_at!", updated_at as "updated_at!"
            FROM services WHERE is_active = 1 ORDER BY name ASC"#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(services)
    }

    /// Busca serviço por ID
    pub async fn find_service_by_id(&self, id: &str) -> AppResult<Option<Service>> {
        let service = sqlx::query_as!(
            Service,
            r#"SELECT 
                id as "id!", code as "code!", name as "name!", 
                description as "description?",
                default_price as "default_price!",
                estimated_time as "estimated_time?: i32",
                default_warranty_days as "default_warranty_days!: i32",
                is_active as "is_active!: bool",
                created_at as "created_at!", updated_at as "updated_at!"
            FROM services WHERE id = ?"#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(service)
    }

    /// Busca serviço por código
    pub async fn find_service_by_code(&self, code: &str) -> AppResult<Option<Service>> {
        let service = sqlx::query_as!(
            Service,
            r#"SELECT 
                id as "id!", code as "code!", name as "name!", 
                description as "description?",
                default_price as "default_price!",
                estimated_time as "estimated_time?: i32",
                default_warranty_days as "default_warranty_days!: i32",
                is_active as "is_active!: bool",
                created_at as "created_at!", updated_at as "updated_at!"
            FROM services WHERE code = ?"#,
            code
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(service)
    }

    /// Cria novo serviço
    pub async fn create_service(&self, input: CreateService) -> AppResult<Service> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Verificar código duplicado
        if self.find_service_by_code(&input.code).await?.is_some() {
            return Err(AppError::Validation("Código de serviço já existe".into()));
        }

        let warranty_days = input.default_warranty_days.unwrap_or(30);

        sqlx::query!(
            r#"
            INSERT INTO services (
                id, code, name, description, default_price,
                estimated_time, default_warranty_days, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            "#,
            id,
            input.code,
            input.name,
            input.description,
            input.default_price,
            input.estimated_time,
            warranty_days,
            now,
            now
        )
        .execute(&self.pool)
        .await?;

        self.find_service_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "OrderService".to_string(),
                id: id.clone(),
            })
    }

    /// Atualiza serviço
    pub async fn update_service(&self, id: &str, input: UpdateService) -> AppResult<Service> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            UPDATE services SET
                code = COALESCE(?, code),
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                default_price = COALESCE(?, default_price),
                estimated_time = COALESCE(?, estimated_time),
                default_warranty_days = COALESCE(?, default_warranty_days),
                is_active = COALESCE(?, is_active),
                updated_at = ?
            WHERE id = ?
            "#,
            input.code,
            input.name,
            input.description,
            input.default_price,
            input.estimated_time,
            input.default_warranty_days,
            input.is_active,
            now,
            id
        )
        .execute(&self.pool)
        .await?;

        self.find_service_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "OrderService".to_string(),
                id: id.to_string(),
            })
    }

    /// Finaliza uma OS, gerando venda e movimento financeiro
    pub async fn finish_order_transaction(
        &self,
        order_id: &str,
        payment_method: &str,
        amount_paid: f64,
        employee_id: &str,
        cash_session_id: &str,
    ) -> AppResult<String> {
        let mut tx = self.pool.begin().await?;

        // 1. Validar OS
        let order = sqlx::query_as::<_, ServiceOrder>("SELECT * FROM service_orders WHERE id = ?")
            .bind(order_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".into(),
                id: order_id.into(),
            })?;

        if order.status != "OPEN" && order.status != "IN_PROGRESS" {
            return Err(AppError::Validation(format!(
                "Ordem de serviço não pode ser finalizada com status {}",
                order.status
            )));
        }

        let total = order.total;
        let discount = order.discount;
        let subtotal = order.labor_cost + order.parts_cost;
        let change_val = amount_paid - total;
        let sale_id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // 2. Gerar número diário (simples)
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let daily_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM sales WHERE date(created_at) = ?")
                .bind(&today)
                .fetch_one(&mut *tx)
                .await?;
        let daily_number = daily_count.0 + 1;

        // 3. Criar Venda (Sale)
        // Nota: Colunas renomeadas na migration 003 (discount->discount_value, change_amount->change, session_id->cash_session_id)
        sqlx::query(
        "INSERT INTO sales (id, daily_number, subtotal, discount_value, total, payment_method, amount_paid, change, status, employee_id, cash_session_id, created_at, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)"
    )
    .bind(&sale_id)
    .bind(daily_number)
    .bind(subtotal)
    .bind(discount)
    .bind(total)
    .bind(payment_method)
    .bind(amount_paid)
    .bind(change_val)
    .bind(employee_id)
    .bind(cash_session_id)
    .bind(&now)
    .bind(&order.customer_id)
    .execute(&mut *tx)
    .await?;

        // 4. Criar Itens da Venda (SERVIÇOS + PRODUTOS)
        // 4.1 Serviços (Mão de obra)
        let services_rows = sqlx::query(
            "SELECT description, unit_price, quantity, discount_value, total, product_id FROM order_services WHERE order_id = ?"
        )
        .bind(order_id)
        .fetch_all(&mut *tx)
        .await?;

        use sqlx::Row;
        for row in services_rows {
            let desc: String = row.get("description");
            let price: f64 = row.get("unit_price");
            let qty: f64 = row.get("quantity");
            let disc: f64 = row.get("discount_value");
            let item_total: f64 = row.get("total");
            let service_pid: Option<String> = row.get("product_id");

            let item_id = new_id();
            sqlx::query(
                "INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount, total, product_name, product_unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SERV', ?)"
            )
            .bind(item_id)
            .bind(&sale_id)
            .bind(service_pid.unwrap_or_else(|| "SERVICE".to_string()))
            .bind(qty)
            .bind(price)
            .bind(disc)
            .bind(item_total)
            .bind(desc)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        // 4.2 Produtos (Peças)
        let parts_rows = sqlx::query(
            r#"
            SELECT 
                op.product_id, op.lot_id, op.quantity, op.unit_price, op.discount_value, op.total,
                p.name as product_name, p.barcode as product_barcode, p.unit as product_unit
            FROM order_products op
            JOIN products p ON p.id = op.product_id
            WHERE op.order_id = ?
            "#,
        )
        .bind(order_id)
        .fetch_all(&mut *tx)
        .await?;

        for row in parts_rows {
            let product_id: String = row.get("product_id");
            let lot_id: Option<String> = row.get("lot_id");
            let quantity: f64 = row.get("quantity");
            let unit_price: f64 = row.get("unit_price");
            let discount_value: f64 = row.get("discount_value");
            let total: f64 = row.get("total");
            let product_name: String = row.get("product_name");
            let product_barcode: Option<String> = row.try_get("product_barcode").ok();
            let product_unit: String = row.get("product_unit");

            let item_id = new_id();
            sqlx::query(
                "INSERT INTO sale_items (id, sale_id, product_id, lot_id, quantity, unit_price, discount, total, product_name, product_barcode, product_unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(item_id)
            .bind(&sale_id)
            .bind(product_id)
            .bind(lot_id)
            .bind(quantity)
            .bind(unit_price)
            .bind(discount_value)
            .bind(total)
            .bind(product_name)
            .bind(product_barcode)
            .bind(product_unit)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }

        // 5. Atualizar OS
        sqlx::query(
        "UPDATE service_orders SET status = 'DELIVERED', is_paid = 1, sale_id = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&sale_id)
    .bind(&now)
    .bind(order_id)
    .execute(&mut *tx)
    .await?;

        // 6. Calcular e Registrar Comissão (para o mecânico da OS, se houver taxa configurada)
        let sale_repo = SaleRepository::new(&self.pool);
        sale_repo
            .record_commission_tx(&mut tx, &sale_id, &order.employee_id, total, &now)
            .await?;

        tx.commit().await?;

        Ok(sale_id)
    }
    /// Cancela ordem e restaura estoque se necessário
    pub async fn cancel_with_stock_restoration(
        &self,
        id: &str,
        notes: Option<String>,
    ) -> AppResult<ServiceOrder> {
        let mut tx = self.pool.begin().await?;
        let now = chrono::Utc::now().to_rfc3339();

        // 1. Buscar ordem atual
        let order = self
            .find_by_id_tx(&mut tx, id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.to_string(),
            })?;

        if order.status == "CANCELED" || order.status == "DELIVERED" {
            return Err(AppError::Validation(format!(
                "Não é possível cancelar ordem com status {}",
                order.status
            )));
        }

        // Se a ordem já consumiu estoque (não é orçamento), restaurar
        // Orçamento (QUOTE) não consome estoque, então não precisa devolver
        if order.status != "QUOTE" {
            // Buscar itens que são produtos
            // Buscar itens que são produtos
            let products = sqlx::query_as::<_, (String, String, f64, Option<String>)>(
                r#"SELECT id, product_id, quantity, lot_id FROM order_products WHERE order_id = ?"#,
            )
            .bind(id)
            .fetch_all(&mut *tx)
            .await?;

            for prod in products {
                let product_id = prod.1;
                let quantity = prod.2;
                let lot_id = prod.3;

                // Restore Product Stock
                let current_prod: (f64,) =
                    sqlx::query_as("SELECT current_stock FROM products WHERE id = ?")
                        .bind(&product_id)
                        .fetch_one(&mut *tx)
                        .await?;

                let new_stock = current_prod.0 + quantity;

                sqlx::query("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?")
                    .bind(new_stock)
                    .bind(&now)
                    .bind(&product_id)
                    .execute(&mut *tx)
                    .await?;

                // Restore Lot Stock (if linked)
                if let Some(lot_id_val) = lot_id {
                    sqlx::query("UPDATE product_lots SET current_quantity = current_quantity + ?, updated_at = ? WHERE id = ?")
                        .bind(quantity)
                        .bind(&now)
                        .bind(lot_id_val)
                        .execute(&mut *tx)
                        .await?;
                }

                // Record Movement (RETURN)
                let movement_id = new_id();
                sqlx::query(
                    "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, created_at) VALUES (?, ?, 'RETURN', ?, ?, ?, 'Cancelamento de OS', ?, 'SERVICE_ORDER', ?)"
                )
                .bind(movement_id)
                .bind(product_id)
                .bind(quantity)
                .bind(current_prod.0)
                .bind(new_stock)
                .bind(id)
                .bind(&now)
                .execute(&mut *tx)
                .await?;
            }
        }

        // Atualizar status da ordem
        // Atualizar status da ordem
        sqlx::query(
            "UPDATE service_orders SET status = 'CANCELED', notes = COALESCE(?, notes), updated_at = ? WHERE id = ?"
        )
        .bind(notes)
        .bind(&now)
        .bind(id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.to_string(),
            })
    }
}
