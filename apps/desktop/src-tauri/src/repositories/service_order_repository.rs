//! Repositório de Ordens de Serviço - Motopeças
//!
//! Acesso a dados para ordens de serviço, itens e serviços pré-cadastrados

use sqlx::{Pool, Sqlite};

use crate::error::{AppError, AppResult};
use crate::models::{
    AddServiceOrderItem, CreateService, CreateServiceOrder, Service, ServiceOrder,
    ServiceOrderFilters, ServiceOrderItem, ServiceOrderSummary, ServiceOrderWithDetails,
    UpdateService, UpdateServiceOrder, UpdateServiceOrderItem,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};

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

    /// Obtém próximo número de OS
    async fn next_order_number(&self) -> AppResult<i32> {
        let result = sqlx::query!(
            r#"
            UPDATE _service_order_sequence
            SET next_number = next_number + 1
            WHERE id = 1
            RETURNING next_number
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        Ok((result.next_number - 1) as i32)
    }

    /// Lista ordens de serviço com paginação e filtros
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        filters: &ServiceOrderFilters,
    ) -> AppResult<PaginatedResult<ServiceOrderSummary>> {
        // Construir condições WHERE
        let mut conditions = vec!["1=1".to_string()];

        if let Some(ref status) = filters.status {
            conditions.push(format!("so.status = '{}'", status));
        }

        if let Some(ref customer_id) = filters.customer_id {
            conditions.push(format!("so.customer_id = '{}'", customer_id));
        }

        if let Some(ref vehicle_id) = filters.vehicle_id {
            conditions.push(format!("so.customer_vehicle_id = '{}'", vehicle_id));
        }

        if let Some(ref employee_id) = filters.employee_id {
            conditions.push(format!("so.employee_id = '{}'", employee_id));
        }

        if let Some(is_paid) = filters.is_paid {
            conditions.push(format!("so.is_paid = {}", if is_paid { 1 } else { 0 }));
        }

        if let Some(ref date_from) = filters.date_from {
            conditions.push(format!("so.created_at >= '{}'", date_from));
        }

        if let Some(ref date_to) = filters.date_to {
            conditions.push(format!("so.created_at <= '{}'", date_to));
        }

        let where_clause = conditions.join(" AND ");

        // Contar total
        let count_query = format!(
            "SELECT COUNT(*) as count FROM service_orders so WHERE {}",
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
            WHERE {}
            ORDER BY so.created_at DESC
            LIMIT {} OFFSET {}
            "#,
            where_clause, pagination.per_page, offset
        );

        let rows = sqlx::query_as::<
            _,
            (
                String,
                i32,
                String,
                String,
                String,
                Option<String>,
                f64,
                bool,
                String,
            ),
        >(&query)
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

        Ok(PaginatedResult::new(data, total, pagination))
    }

    /// Busca ordem por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<ServiceOrder>> {
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
        .fetch_optional(&self.pool)
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
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let order_number = self.next_order_number().await?;

        sqlx::query!(
            r#"
            INSERT INTO service_orders (
                id, order_number, customer_id, customer_vehicle_id, vehicle_year_id,
                employee_id, vehicle_km, symptoms, status, labor_cost, parts_cost,
                discount, total, warranty_days, scheduled_date, notes, internal_notes,
                is_paid, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 0, 0, 0, 0, 30, ?, ?, ?, 0, ?, ?)
            "#,
            id,
            order_number,
            input.customer_id,
            input.customer_vehicle_id,
            input.vehicle_year_id,
            input.employee_id,
            input.vehicle_km,
            input.symptoms,
            input.scheduled_date,
            input.notes,
            input.internal_notes,
            now,
            now
        )
        .execute(&self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.clone(),
            })
    }

    /// Atualiza ordem de serviço
    pub async fn update(&self, id: &str, input: UpdateServiceOrder) -> AppResult<ServiceOrder> {
        let now = chrono::Utc::now().to_rfc3339();

        // Buscar ordem atual
        let current = self
            .find_by_id(id)
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
                self.consume_stock_for_order(id).await?;
            }
        }

        sqlx::query!(
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
            input.vehicle_km,
            input.symptoms,
            input.diagnosis,
            input.status,
            input.labor_cost,
            input.discount,
            input.warranty_days,
            warranty_until,
            input.scheduled_date,
            started_at,
            completed_at,
            input.payment_method,
            input.is_paid,
            input.notes,
            input.internal_notes,
            now,
            id
        )
        .execute(&self.pool)
        .await?;

        // Recalcular totais
        self.recalculate_totals(id).await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: id.to_string(),
            })
    }

    /// Recalcula totais da ordem
    async fn recalculate_totals(&self, order_id: &str) -> AppResult<()> {
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
        .fetch_one(&self.pool)
        .await?;

        // Buscar desconto atual
        let order = self
            .find_by_id(order_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "ServiceOrder".to_string(),
                id: order_id.to_string(),
            })?;

        // Calcular custo de peças (order_products)
        let parts_total = sqlx::query!(
            r#"
            SELECT COALESCE(SUM(total), 0) as total
            FROM order_products
            WHERE order_id = ?
            "#,
            order_id
        )
        .fetch_one(&self.pool)
        .await?;

        let labor_cost = totals.service_total as f64;
        let parts_cost = parts_total.total as f64;
        let total = labor_cost + parts_cost - order.discount;

        sqlx::query!(
            r#"
            UPDATE service_orders SET
                labor_cost = ?,
                parts_cost = ?,
                total = ?,
                updated_at = ?
            WHERE id = ?
            "#,
            labor_cost,
            parts_cost,
            total,
            now,
            order_id
        )
        .execute(&self.pool)
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

    // ═══════════════════════════════════════════════════════════════════════
    // ITENS DA ORDEM
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista itens de uma ordem
    pub async fn find_order_items(&self, order_id: &str) -> AppResult<Vec<ServiceOrderItem>> {
        let items = sqlx::query_as!(
            ServiceOrderItem,
            r#"
            SELECT 
                id as "id!", 
                order_id as "order_id!", 
                product_id as "product_id?",
                item_type as "item_type!", 
                description as "description!",
                employee_id as "employee_id?",
                quantity as "quantity!", 
                unit_price as "unit_price!",
                discount_percent as "discount_percent!", 
                discount_value as "discount_value!", 
                subtotal as "subtotal!", 
                total as "total!",
                notes as "notes?",
                created_at as "created_at!", 
                updated_at as "updated_at!"
            FROM (
                SELECT 
                    id, order_id, NULL as product_id, 'SERVICE' as item_type, description, 
                    employee_id, quantity, unit_price, discount_percent, discount_value, 
                    subtotal, total, notes, created_at, updated_at
                FROM order_services 
                WHERE order_id = ?
                
                UNION ALL
                
                SELECT 
                    op.id, op.order_id, op.product_id, 'PART' as item_type, p.name as description, 
                    NULL as employee_id, op.quantity, op.unit_price, op.discount_percent, op.discount_value, 
                    op.subtotal, op.total, NULL as notes, op.created_at, op.updated_at
                FROM order_products op
                LEFT JOIN products p ON p.id = op.product_id
                WHERE op.order_id = ?
            ) AS items
            ORDER BY created_at ASC
            "#,
            order_id, order_id
        )
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
        
        let mut final_description = input.description.clone();
        
        let mut tx = self.pool.begin().await?;

        if input.item_type == "PART" {
            let product_id = input.product_id.as_ref()
                .ok_or_else(|| AppError::Validation("Product ID required for parts".into()))?;

            // 1. Get product info to verify stock
            let product = sqlx::query!(
                "SELECT current_stock FROM products WHERE id = ?",
                product_id
            )
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| AppError::NotFound { entity: "Product".into(), id: product_id.clone() })?;

            // 2. Deduct stock from product
            let new_stock = product.current_stock - input.quantity;
            sqlx::query!(
                "UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?",
                new_stock, now, product_id
            )
            .execute(&mut *tx)
            .await?;

            // 3. Consume from lots (FIFO)
            let mut remaining_to_consume = input.quantity;
            let lots = sqlx::query!(
                "SELECT id, current_quantity FROM product_lots WHERE product_id = ? AND current_quantity > 0 AND status = 'AVAILABLE' ORDER BY expiration_date ASC, purchase_date ASC",
                product_id
            )
            .fetch_all(&mut *tx)
            .await?;

            let mut linked_lot_id: Option<String> = None;

            for lot in lots {
                if remaining_to_consume <= 0.0 { break; }
                
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

            // 4. Record stock movement (SALE/USAGE)
            let movement_id = new_id();
            let movement_qty = -input.quantity;
            sqlx::query!(
                "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, employee_id, created_at) VALUES (?, ?, 'USAGE', ?, ?, ?, 'Uso em OS', ?, 'SERVICE_ORDER', ?, ?)",
                movement_id, product_id, movement_qty, product.current_stock, new_stock, input.order_id, input.employee_id, now
            )
            .execute(&mut *tx)
            .await?;

            // 5. Insert into order_products
            sqlx::query!(
                r#"
                INSERT INTO order_products (
                    id, order_id, product_id, quantity, unit_price, 
                    discount_percent, discount_value, subtotal, total, 
                    lot_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
                "#,
                id,
                input.order_id,
                product_id,
                input.quantity,
                input.unit_price,
                discount_value,
                subtotal,
                total,
                linked_lot_id,
                now,
                now
            )
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

        tx.commit().await?;

        // Recalcular totais da ordem
        self.recalculate_totals(&input.order_id).await?;

        Ok(ServiceOrderItem {
            id,
            order_id: input.order_id,
            product_id: input.product_id,
            item_type: input.item_type,
            description: input.description,
            employee_id: input.employee_id,
            quantity: input.quantity,
            unit_price: input.unit_price,
            discount_percent: 0.0,
            discount_value,
            subtotal,
            total,
            notes: input.notes,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Remove item da ordem
    pub async fn remove_item(&self, item_id: &str) -> AppResult<()> {
        let mut order_id = None;
        let now = chrono::Utc::now().to_rfc3339();
        
        let mut tx = self.pool.begin().await?;

        // Try finding in order_services
        if let Some(row) = sqlx::query!(r#"SELECT order_id FROM order_services WHERE id = ?"#, item_id)
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
            if let Some(row) = sqlx::query!(r#"SELECT order_id, product_id, quantity, lot_id FROM order_products WHERE id = ?"#, item_id)
                .fetch_optional(&mut *tx)
                .await? 
            {
                order_id = Some(row.order_id);
                
                // Restore Stock
                // 1. Restore Product Stock
                let current_prod = sqlx::query!("SELECT current_stock FROM products WHERE id = ?", row.product_id)
                    .fetch_one(&mut *tx)
                    .await?;
                    
                let new_stock = current_prod.current_stock + row.quantity;
                
                sqlx::query!("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?", 
                    new_stock, now, row.product_id)
                    .execute(&mut *tx)
                    .await?;
                    
                // 2. Restore Lot Stock (if linked)
                if let Some(lot_id) = row.lot_id {
                    sqlx::query!("UPDATE product_lots SET current_quantity = current_quantity + ?, updated_at = ? WHERE id = ?",
                        row.quantity, now, lot_id)
                        .execute(&mut *tx)
                        .await?;
                }
                
                // 3. Record Movement (RETURN)
                let movement_id = new_id();
                sqlx::query!(
                    "INSERT INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, created_at) VALUES (?, ?, 'RETURN', ?, ?, ?, 'Remoção de OS', ?, 'SERVICE_ORDER', ?)",
                    movement_id, row.product_id, row.quantity, current_prod.current_stock, new_stock, row.order_id, now
                )
                .execute(&mut *tx)
                .await?;

                sqlx::query!(r#"DELETE FROM order_products WHERE id = ?"#, item_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }
        
        tx.commit().await?;

        if let Some(oid) = order_id {
            // Recalcular totais
            self.recalculate_totals(&oid).await?;
        }

        Ok(())
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
}
