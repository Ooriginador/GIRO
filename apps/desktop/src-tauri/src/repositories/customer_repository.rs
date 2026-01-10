//! Repositório de Clientes - Motopeças
//!
//! Acesso a dados para clientes e seus veículos

use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateCustomer, CreateCustomerVehicle, Customer, CustomerFilters, CustomerVehicle,
    CustomerVehicleWithDetails, CustomerWithStats, UpdateCustomer, UpdateCustomerVehicle,
};
use crate::repositories::{new_id, PaginatedResult, Pagination};

pub struct CustomerRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> CustomerRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CLIENTES
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista todos os clientes ativos
    pub async fn find_all_active(&self) -> AppResult<Vec<Customer>> {
        let customers = sqlx::query_as!(
            Customer,
            r#"
            SELECT 
                id as "id!", name as "name!",
                cpf as "cpf?", phone as "phone?", phone2 as "phone2?", email as "email?",
                zip_code as "zip_code?", street as "street?", number as "number?", 
                complement as "complement?", neighborhood as "neighborhood?",
                city as "city?", state as "state?",
                is_active as "is_active!: bool",
                notes as "notes?", 
                created_at as "created_at!", 
                updated_at as "updated_at!"
            FROM customers
            WHERE is_active = 1
            ORDER BY name ASC
            "#
        )
        .fetch_all(self.pool)
        .await?;

        Ok(customers)
    }

    /// Lista clientes com paginação e filtros
    pub async fn find_paginated(
        &self,
        pagination: &Pagination,
        filters: &CustomerFilters,
    ) -> AppResult<PaginatedResult<CustomerWithStats>> {
        // Construir condições WHERE
        let mut conditions = vec!["1=1".to_string()];

        if let Some(active) = filters.is_active {
            conditions.push(format!("c.is_active = {}", if active { 1 } else { 0 }));
        }

        if let Some(ref city) = filters.city {
            conditions.push(format!("c.city = '{}'", city));
        }

        if let Some(ref state) = filters.state {
            conditions.push(format!("c.state = '{}'", state));
        }

        if filters.search.is_some() {
            conditions.push(
                "(LOWER(c.name) LIKE '%' || LOWER(?) || '%' OR c.cpf LIKE '%' || ? || '%' OR c.phone LIKE '%' || ? || '%')".to_string()
            );
        }

        let where_clause = conditions.join(" AND ");

        // Contar total
        let search = filters.search.clone().unwrap_or_default();
        let count_query = format!(
            "SELECT COUNT(*) as count FROM customers c WHERE {}",
            where_clause
        );

        let total: i64 = if filters.search.is_some() {
            sqlx::query_scalar(&count_query)
                .bind(&search)
                .bind(&search)
                .bind(&search)
                .fetch_one(self.pool)
                .await?
        } else {
            sqlx::query_scalar(&count_query)
                .fetch_one(self.pool)
                .await?
        };

        // Buscar dados
        let offset = pagination.offset();
        let query = format!(
            r#"
            SELECT
                c.*,
                COALESCE(cv.vehicle_count, 0) as vehicle_count,
                COALESCE(so.order_count, 0) as order_count,
                COALESCE(so.total_spent, 0.0) as total_spent,
                so.last_visit
            FROM customers c
            LEFT JOIN (
                SELECT customer_id, COUNT(*) as vehicle_count
                FROM customer_vehicles
                WHERE is_active = 1
                GROUP BY customer_id
            ) cv ON cv.customer_id = c.id
            LEFT JOIN (
                SELECT 
                    customer_id,
                    COUNT(*) as order_count,
                    SUM(total) as total_spent,
                    MAX(created_at) as last_visit
                FROM service_orders
                GROUP BY customer_id
            ) so ON so.customer_id = c.id
            WHERE {}
            ORDER BY c.name ASC
            LIMIT {} OFFSET {}
            "#,
            where_clause, pagination.per_page, offset
        );

        // Executar query manualmente devido à complexidade
        let rows: Vec<Customer> = if filters.search.is_some() {
            sqlx::query_as(&query)
                .bind(&search)
                .bind(&search)
                .bind(&search)
                .fetch_all(self.pool)
                .await?
        } else {
            sqlx::query_as(&query).fetch_all(self.pool).await?
        };

        // Mapear para CustomerWithStats (simplificado por agora)
        let data: Vec<CustomerWithStats> = rows
            .into_iter()
            .map(|c| CustomerWithStats {
                customer: c,
                vehicle_count: 0,
                order_count: 0,
                total_spent: 0.0,
                last_visit: None,
            })
            .collect();

        Ok(PaginatedResult::new(data, total, pagination))
    }

    /// Busca cliente por ID
    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Customer>> {
        let customer = sqlx::query_as!(
            Customer,
            r#"SELECT 
                id as "id!", name as "name!",
                cpf as "cpf?", phone as "phone?", phone2 as "phone2?", email as "email?",
                zip_code as "zip_code?", street as "street?", number as "number?", 
                complement as "complement?", neighborhood as "neighborhood?",
                city as "city?", state as "state?",
                is_active as "is_active!: bool",
                notes as "notes?", 
                created_at as "created_at!", 
                updated_at as "updated_at!"
            FROM customers WHERE id = ?"#,
            id
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(customer)
    }

    /// Busca cliente por CPF
    pub async fn find_by_cpf(&self, cpf: &str) -> AppResult<Option<Customer>> {
        let customer = sqlx::query_as!(
            Customer,
            r#"SELECT 
                id as "id!", name as "name!",
                cpf as "cpf?", phone as "phone?", phone2 as "phone2?", email as "email?",
                zip_code as "zip_code?", street as "street?", number as "number?", 
                complement as "complement?", neighborhood as "neighborhood?",
                city as "city?", state as "state?",
                is_active as "is_active!: bool",
                notes as "notes?", 
                created_at as "created_at!", 
                updated_at as "updated_at!"
            FROM customers WHERE cpf = ?"#,
            cpf
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(customer)
    }

    /// Busca clientes por termo (nome, CPF, telefone)
    pub async fn search(&self, query: &str, limit: i32) -> AppResult<Vec<Customer>> {
        let search_term = format!("%{}%", query.to_lowercase());

        let customers = sqlx::query_as!(
            Customer,
            r#"
            SELECT 
                id as "id!", name as "name!",
                cpf as "cpf?", phone as "phone?", phone2 as "phone2?", email as "email?",
                zip_code as "zip_code?", street as "street?", number as "number?", 
                complement as "complement?", neighborhood as "neighborhood?",
                city as "city?", state as "state?",
                is_active as "is_active!: bool",
                notes as "notes?", 
                created_at as "created_at!", 
                updated_at as "updated_at!"
            FROM customers
            WHERE is_active = 1
              AND (
                LOWER(name) LIKE ?
                OR cpf LIKE ?
                OR phone LIKE ?
              )
            ORDER BY name ASC
            LIMIT ?
            "#,
            search_term,
            search_term,
            search_term,
            limit
        )
        .fetch_all(self.pool)
        .await?;

        Ok(customers)
    }

    /// Cria novo cliente
    pub async fn create(&self, input: CreateCustomer) -> AppResult<Customer> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Verificar CPF duplicado
        if let Some(ref cpf) = input.cpf {
            if self.find_by_cpf(cpf).await?.is_some() {
                return Err(AppError::Validation("CPF já cadastrado".into()));
            }
        }

        sqlx::query!(
            r#"
            INSERT INTO customers (
                id, name, cpf, phone, phone2, email,
                zip_code, street, number, complement, neighborhood, city, state,
                is_active, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            "#,
            id,
            input.name,
            input.cpf,
            input.phone,
            input.phone2,
            input.email,
            input.zip_code,
            input.street,
            input.number,
            input.complement,
            input.neighborhood,
            input.city,
            input.state,
            input.notes,
            now,
            now
        )
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Customer".to_string(),
                id: id.clone(),
            })
    }

    /// Atualiza cliente
    pub async fn update(&self, id: &str, input: UpdateCustomer) -> AppResult<Customer> {
        let now = chrono::Utc::now().to_rfc3339();

        let existing = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Customer".to_string(),
                id: id.to_string(),
            })?;

        // Verificar CPF duplicado (se estiver alterando)
        if let Some(ref cpf) = input.cpf {
            if Some(cpf.clone()) != existing.cpf && self.find_by_cpf(cpf).await?.is_some() {
                return Err(AppError::Validation("CPF já cadastrado".into()));
            }
        }

        sqlx::query!(
            r#"
            UPDATE customers SET
                name = COALESCE(?, name),
                cpf = COALESCE(?, cpf),
                phone = COALESCE(?, phone),
                phone2 = COALESCE(?, phone2),
                email = COALESCE(?, email),
                zip_code = COALESCE(?, zip_code),
                street = COALESCE(?, street),
                number = COALESCE(?, number),
                complement = COALESCE(?, complement),
                neighborhood = COALESCE(?, neighborhood),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                is_active = COALESCE(?, is_active),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
            "#,
            input.name,
            input.cpf,
            input.phone,
            input.phone2,
            input.email,
            input.zip_code,
            input.street,
            input.number,
            input.complement,
            input.neighborhood,
            input.city,
            input.state,
            input.is_active,
            input.notes,
            now,
            id
        )
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Customer".to_string(),
                id: id.to_string(),
            })
    }

    /// Desativa cliente (soft delete)
    pub async fn deactivate(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?"#,
            now,
            id
        )
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Reativa cliente
    pub async fn reactivate(&self, id: &str) -> AppResult<Customer> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"UPDATE customers SET is_active = 1, updated_at = ? WHERE id = ?"#,
            now,
            id
        )
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "Customer".to_string(),
                id: id.to_string(),
            })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VEÍCULOS DO CLIENTE
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista veículos de um cliente
    pub async fn find_customer_vehicles(
        &self,
        customer_id: &str,
    ) -> AppResult<Vec<CustomerVehicleWithDetails>> {
        let vehicles = sqlx::query!(
            r#"
            SELECT
                cv.id as "id!",
                cv.customer_id as "customer_id!",
                cv.vehicle_year_id as "vehicle_year_id!",
                cv.plate as "plate?",
                cv.chassis as "chassis?",
                cv.renavam as "renavam?",
                cv.color as "color?",
                cv.current_km as "current_km?: i32",
                cv.nickname as "nickname?",
                cv.is_active as "is_active!: bool",
                cv.notes as "notes?",
                cv.created_at as "created_at!",
                cv.updated_at as "updated_at!",
                vb.name as "brand_name!",
                vm.name as "model_name!",
                vy.year as "year!: i32",
                vy.year_label as "year_label!",
                vm.category as "category?",
                vm.engine_size as "engine_size?: i32"
            FROM customer_vehicles cv
            INNER JOIN vehicle_years vy ON vy.id = cv.vehicle_year_id
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE cv.customer_id = ? AND cv.is_active = 1
            ORDER BY cv.created_at DESC
            "#,
            customer_id
        )
        .fetch_all(self.pool)
        .await?;

        Ok(vehicles
            .into_iter()
            .map(|v| {
                let display_name = format!("{} {} {}", v.brand_name, v.model_name, v.year_label);
                CustomerVehicleWithDetails {
                    id: v.id,
                    customer_id: v.customer_id,
                    vehicle_year_id: v.vehicle_year_id,
                    plate: v.plate,
                    chassis: v.chassis,
                    renavam: v.renavam,
                    color: v.color,
                    current_km: v.current_km,
                    nickname: v.nickname,
                    is_active: v.is_active,
                    notes: v.notes,
                    created_at: v.created_at,
                    updated_at: v.updated_at,
                    brand_name: v.brand_name,
                    model_name: v.model_name,
                    year: v.year,
                    year_label: v.year_label,
                    category: v.category,
                    engine_size: v.engine_size,
                    display_name,
                }
            })
            .collect())
    }

    /// Busca veículo do cliente por ID
    pub async fn find_customer_vehicle_by_id(
        &self,
        id: &str,
    ) -> AppResult<Option<CustomerVehicle>> {
        let vehicle = sqlx::query_as!(
            CustomerVehicle,
            r#"SELECT 
                id as "id!", customer_id as "customer_id!", vehicle_year_id as "vehicle_year_id!",
                plate as "plate?", chassis as "chassis?", renavam as "renavam?",
                color as "color?", current_km as "current_km?: i32", nickname as "nickname?",
                is_active as "is_active!: bool",
                notes as "notes?", 
                created_at as "created_at!", 
                updated_at as "updated_at!"
            FROM customer_vehicles WHERE id = ?"#,
            id
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(vehicle)
    }

    /// Cria veículo do cliente
    pub async fn create_customer_vehicle(
        &self,
        input: CreateCustomerVehicle,
    ) -> AppResult<CustomerVehicle> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO customer_vehicles (
                id, customer_id, vehicle_year_id, plate, chassis, renavam,
                color, current_km, nickname, is_active, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            "#,
            id,
            input.customer_id,
            input.vehicle_year_id,
            input.plate,
            input.chassis,
            input.renavam,
            input.color,
            input.current_km,
            input.nickname,
            input.notes,
            now,
            now
        )
        .execute(self.pool)
        .await?;

        self.find_customer_vehicle_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "CustomerVehicle".to_string(),
                id: id.clone(),
            })
    }

    /// Atualiza veículo do cliente
    pub async fn update_customer_vehicle(
        &self,
        id: &str,
        input: UpdateCustomerVehicle,
    ) -> AppResult<CustomerVehicle> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            UPDATE customer_vehicles SET
                vehicle_year_id = COALESCE(?, vehicle_year_id),
                plate = COALESCE(?, plate),
                chassis = COALESCE(?, chassis),
                renavam = COALESCE(?, renavam),
                color = COALESCE(?, color),
                current_km = COALESCE(?, current_km),
                nickname = COALESCE(?, nickname),
                is_active = COALESCE(?, is_active),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
            "#,
            input.vehicle_year_id,
            input.plate,
            input.chassis,
            input.renavam,
            input.color,
            input.current_km,
            input.nickname,
            input.is_active,
            input.notes,
            now,
            id
        )
        .execute(self.pool)
        .await?;

        self.find_customer_vehicle_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "CustomerVehicle".to_string(),
                id: id.to_string(),
            })
    }

    /// Desativa veículo do cliente
    pub async fn deactivate_customer_vehicle(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"UPDATE customer_vehicles SET is_active = 0, updated_at = ? WHERE id = ?"#,
            now,
            id
        )
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Atualiza quilometragem do veículo
    pub async fn update_vehicle_km(&self, id: &str, km: i32) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"UPDATE customer_vehicles SET current_km = ?, updated_at = ? WHERE id = ?"#,
            km,
            now,
            id
        )
        .execute(self.pool)
        .await?;

        Ok(())
    }
}
