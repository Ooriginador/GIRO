//! Repositório de Veículos - Motopeças
//!
//! Acesso a dados para marcas, modelos, anos e compatibilidades

use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{
    AddProductCompatibility, CreateVehicleBrand, CreateVehicleModel, CreateVehicleYear,
    ProductCompatibility, ProductCompatibilityWithVehicle, SaveProductCompatibilities,
    VehicleBrand, VehicleComplete, VehicleModel, VehicleYear,
};
use crate::repositories::new_id;

pub struct VehicleRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> VehicleRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MARCAS
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista todas as marcas ativas
    pub async fn find_all_brands(&self) -> AppResult<Vec<VehicleBrand>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                id as "id!",
                name as "name!",
                logo_url,
                is_active as "is_active!: i32",
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM vehicle_brands
            WHERE is_active = 1
            ORDER BY name ASC
            "#
        )
        .fetch_all(self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| VehicleBrand {
                id: r.id,
                name: r.name,
                logo_url: r.logo_url,
                is_active: r.is_active,
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
            .collect())
    }

    /// Busca marca por ID
    pub async fn find_brand_by_id(&self, id: &str) -> AppResult<Option<VehicleBrand>> {
        let row = sqlx::query!(
            r#"
            SELECT
                id as "id!",
                name as "name!",
                logo_url,
                is_active as "is_active!: i32",
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM vehicle_brands
            WHERE id = ?
            "#,
            id
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(row.map(|r| VehicleBrand {
            id: r.id,
            name: r.name,
            logo_url: r.logo_url,
            is_active: r.is_active,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))
    }

    /// Cria nova marca
    pub async fn create_brand(&self, input: CreateVehicleBrand) -> AppResult<VehicleBrand> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO vehicle_brands (id, name, logo_url, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?)
            "#,
            id,
            input.name,
            input.logo_url,
            now,
            now
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.find_brand_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "VehicleBrand".to_string(),
                id: id.clone(),
            })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODELOS
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista modelos de uma marca
    pub async fn find_models_by_brand(&self, brand_id: &str) -> AppResult<Vec<VehicleModel>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                id as "id!",
                brand_id as "brand_id!",
                name as "name!",
                category,
                engine_size,
                is_active as "is_active!: i32",
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM vehicle_models
            WHERE brand_id = ? AND is_active = 1
            ORDER BY name ASC
            "#,
            brand_id
        )
        .fetch_all(self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| VehicleModel {
                id: r.id,
                brand_id: r.brand_id,
                name: r.name,
                category: r.category,
                engine_size: r.engine_size,
                is_active: r.is_active,
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
            .collect())
    }

    /// Busca modelo por ID
    pub async fn find_model_by_id(&self, id: &str) -> AppResult<Option<VehicleModel>> {
        let row = sqlx::query!(
            r#"
            SELECT
                id as "id!",
                brand_id as "brand_id!",
                name as "name!",
                category,
                engine_size,
                is_active as "is_active!: i32",
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM vehicle_models
            WHERE id = ?
            "#,
            id
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(row.map(|r| VehicleModel {
            id: r.id,
            brand_id: r.brand_id,
            name: r.name,
            category: r.category,
            engine_size: r.engine_size,
            is_active: r.is_active,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))
    }

    /// Cria novo modelo
    pub async fn create_model(&self, input: CreateVehicleModel) -> AppResult<VehicleModel> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO vehicle_models (id, brand_id, name, category, engine_size, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            "#,
            id,
            input.brand_id,
            input.name,
            input.category,
            input.engine_size,
            now,
            now
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.find_model_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "VehicleModel".to_string(),
                id: id.clone(),
            })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ANOS
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista anos de um modelo
    pub async fn find_years_by_model(&self, model_id: &str) -> AppResult<Vec<VehicleYear>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                id as "id!",
                model_id as "model_id!",
                year as "year!: i32",
                year_label as "year_label!",
                is_active as "is_active!: i32",
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM vehicle_years
            WHERE model_id = ? AND is_active = 1
            ORDER BY year DESC
            "#,
            model_id
        )
        .fetch_all(self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| VehicleYear {
                id: r.id,
                model_id: r.model_id,
                year: r.year,
                year_label: r.year_label,
                is_active: r.is_active,
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
            .collect())
    }

    /// Busca ano por ID
    pub async fn find_year_by_id(&self, id: &str) -> AppResult<Option<VehicleYear>> {
        let row = sqlx::query!(
            r#"
            SELECT
                id as "id!",
                model_id as "model_id!",
                year as "year!: i32",
                year_label as "year_label!",
                is_active as "is_active!: i32",
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM vehicle_years
            WHERE id = ?
            "#,
            id
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(row.map(|r| VehicleYear {
            id: r.id,
            model_id: r.model_id,
            year: r.year,
            year_label: r.year_label,
            is_active: r.is_active,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))
    }

    /// Cria novo ano
    pub async fn create_year(&self, input: CreateVehicleYear) -> AppResult<VehicleYear> {
        let mut tx = self.pool.begin().await?;
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO vehicle_years (id, model_id, year, year_label, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
            "#,
            id,
            input.model_id,
            input.year,
            input.year_label,
            now,
            now
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.find_year_by_id(&id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "VehicleYear".to_string(),
                id: id.clone(),
            })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUSCA DE VEÍCULOS
    // ═══════════════════════════════════════════════════════════════════════

    /// Busca veículos por texto (marca, modelo ou ano)
    pub async fn search_vehicles(
        &self,
        query: &str,
        limit: i32,
    ) -> AppResult<Vec<VehicleComplete>> {
        let search_term = format!("%{}%", query.to_lowercase());

        let rows = sqlx::query!(
            r#"
            SELECT
                vy.id as "year_id!",
                vb.id as "brand_id!",
                vb.name as "brand_name!",
                vm.id as "model_id!",
                vm.name as "model_name!",
                vy.year as "year!: i32",
                vy.year_label as "year_label!",
                vm.category,
                vm.engine_size
            FROM vehicle_years vy
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE vy.is_active = 1
              AND vm.is_active = 1
              AND vb.is_active = 1
              AND (
                LOWER(vb.name) LIKE ?
                OR LOWER(vm.name) LIKE ?
                OR CAST(vy.year AS TEXT) LIKE ?
                OR LOWER(vb.name || ' ' || vm.name) LIKE ?
              )
            ORDER BY vb.name, vm.name, vy.year DESC
            LIMIT ?
            "#,
            search_term,
            search_term,
            search_term,
            search_term,
            limit
        )
        .fetch_all(self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                let brand_name = r.brand_name;
                let model_name = r.model_name;
                let year_label = r.year_label;

                VehicleComplete {
                    brand_id: r.brand_id,
                    brand_name: brand_name.clone(),
                    model_id: r.model_id,
                    model_name: model_name.clone(),
                    year_id: r.year_id,
                    year: r.year,
                    year_label: year_label.clone(),
                    category: r.category,
                    engine_size: r.engine_size,
                    fuel_type: None,
                    display_name: VehicleComplete::build_display_name(
                        &brand_name,
                        &model_name,
                        &year_label,
                    ),
                }
            })
            .collect())
    }

    /// Obtém veículo completo por ID do ano
    pub async fn get_complete_vehicle(&self, year_id: &str) -> AppResult<Option<VehicleComplete>> {
        let result = sqlx::query!(
            r#"
            SELECT
                vb.id as "brand_id!",
                vb.name as "brand_name!",
                vm.id as "model_id!",
                vm.name as "model_name!",
                vy.id as "year_id!",
                vy.year as "year!: i32",
                vy.year_label as "year_label!",
                vm.category,
                vm.engine_size
            FROM vehicle_years vy
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE vy.id = ?
            "#,
            year_id
        )
        .fetch_optional(self.pool)
        .await?;

        Ok(result.map(|r| {
            let display_name =
                VehicleComplete::build_display_name(&r.brand_name, &r.model_name, &r.year_label);

            VehicleComplete {
                brand_id: r.brand_id,
                brand_name: r.brand_name,
                model_id: r.model_id,
                model_name: r.model_name,
                year_id: r.year_id,
                year: r.year,
                year_label: r.year_label,
                category: r.category,
                engine_size: r.engine_size,
                fuel_type: None,
                display_name,
            }
        }))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMPATIBILIDADES
    // ═══════════════════════════════════════════════════════════════════════

    /// Lista compatibilidades de um produto
    pub async fn find_product_compatibilities(
        &self,
        product_id: &str,
    ) -> AppResult<Vec<ProductCompatibilityWithVehicle>> {
        let compatibilities = sqlx::query!(
            r#"
            SELECT
                pc.id as "id!",
                pc.product_id as "product_id!",
                pc.vehicle_year_id as "vehicle_year_id!",
                pc.is_verified as "is_verified!: i32",
                COALESCE(CAST(pc.created_at AS TEXT), '') as "created_at!: String",
                COALESCE(CAST(pc.updated_at AS TEXT), '') as "updated_at!: String",
                vb.id as "brand_id!",
                vb.name as "brand_name!",
                vm.id as "model_id!",
                vm.name as "model_name!",
                vy.year as "year!: i32",
                vy.year_label as "year_label!",
                vm.category,
                vm.engine_size
            FROM product_compatibility pc
            INNER JOIN vehicle_years vy ON vy.id = pc.vehicle_year_id
            INNER JOIN vehicle_models vm ON vm.id = vy.model_id
            INNER JOIN vehicle_brands vb ON vb.id = vm.brand_id
            WHERE pc.product_id = ?
            ORDER BY vb.name, vm.name, vy.year DESC
            "#,
            product_id
        )
        .fetch_all(self.pool)
        .await?;

        Ok(compatibilities
            .into_iter()
            .map(|r| {
                let display_name = VehicleComplete::build_display_name(
                    &r.brand_name,
                    &r.model_name,
                    &r.year_label,
                );

                let vehicle_year_id = r.vehicle_year_id;

                ProductCompatibilityWithVehicle {
                    id: r.id,
                    product_id: r.product_id,
                    vehicle_year_id: vehicle_year_id.clone(),
                    is_verified: r.is_verified,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    vehicle: VehicleComplete {
                        brand_id: r.brand_id,
                        brand_name: r.brand_name,
                        model_id: r.model_id,
                        model_name: r.model_name,
                        year_id: vehicle_year_id,
                        year: r.year,
                        year_label: r.year_label,
                        category: r.category,
                        engine_size: r.engine_size.as_deref().and_then(|s| s.parse().ok()),
                        fuel_type: None,
                        display_name,
                    },
                }
            })
            .collect())
    }

    /// Adiciona uma compatibilidade
    pub async fn add_compatibility(
        &self,
        input: AddProductCompatibility,
    ) -> AppResult<ProductCompatibility> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        // Verificar se já existe
        let exists = sqlx::query!(
            r#"
            SELECT id FROM product_compatibility
            WHERE product_id = ? AND vehicle_year_id = ?
            "#,
            input.product_id,
            input.vehicle_year_id
        )
        .fetch_optional(self.pool)
        .await?;

        if exists.is_some() {
            return Err(AppError::Validation(
                "Compatibilidade já existe para este veículo".into(),
            ));
        }

        let is_verified = input.is_verified.unwrap_or(0);

        sqlx::query!(
            r#"
            INSERT INTO product_compatibility (id, product_id, vehicle_year_id, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)"#,
            id,
            input.product_id,
            input.vehicle_year_id,
            is_verified,
            now,
            now
        )
        .execute(self.pool)
        .await?;

        let compatibility = sqlx::query_as!(
            ProductCompatibility,
            r#"
            SELECT
                id as "id!",
                product_id as "product_id!",
                vehicle_year_id as "vehicle_year_id!",
                is_verified as "is_verified!: i32",
                COALESCE(CAST(created_at AS TEXT), '') as "created_at!: String",
                COALESCE(CAST(updated_at AS TEXT), '') as "updated_at!: String"
            FROM product_compatibility
            WHERE id = ?
            "#,
            id
        )
        .fetch_one(self.pool)
        .await?;

        Ok(compatibility)
    }

    /// Remove uma compatibilidade
    pub async fn remove_compatibility(
        &self,
        product_id: &str,
        vehicle_year_id: &str,
    ) -> AppResult<()> {
        sqlx::query!(
            r#"
            DELETE FROM product_compatibility
            WHERE product_id = ? AND vehicle_year_id = ?
            "#,
            product_id,
            vehicle_year_id
        )
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Salva todas as compatibilidades de um produto (substitui as existentes)
    pub async fn save_product_compatibilities(
        &self,
        input: SaveProductCompatibilities,
    ) -> AppResult<Vec<ProductCompatibilityWithVehicle>> {
        let now = chrono::Utc::now().to_rfc3339();

        // Iniciar transação
        let mut tx = self.pool.begin().await?;

        // Remover compatibilidades existentes
        sqlx::query!(
            r#"DELETE FROM product_compatibility WHERE product_id = ?"#,
            input.product_id
        )
        .execute(&mut *tx)
        .await?;

        // Inserir novas compatibilidades
        for vehicle_year_id in &input.vehicle_year_ids {
            let id = new_id();
            sqlx::query!(
                r#"
                INSERT INTO product_compatibility (id, product_id, vehicle_year_id, is_verified, created_at, updated_at)
                VALUES (?, ?, ?, 0, ?, ?)"#,
                id,
                input.product_id,
                vehicle_year_id,
                now,
                now
            )
            .execute(&mut *tx)
            .await?;
        }

        // Commit
        tx.commit().await?;

        // Retornar compatibilidades atualizadas
        self.find_product_compatibilities(&input.product_id).await
    }

    /// Lista produtos compatíveis com um veículo
    pub async fn find_products_by_vehicle(&self, vehicle_year_id: &str) -> AppResult<Vec<String>> {
        let product_ids = sqlx::query!(
            r#"
            SELECT DISTINCT product_id as "product_id!"
            FROM product_compatibility
            WHERE vehicle_year_id = ?
            "#,
            vehicle_year_id
        )
        .fetch_all(self.pool)
        .await?;

        Ok(product_ids.into_iter().map(|r| r.product_id).collect())
    }
}
