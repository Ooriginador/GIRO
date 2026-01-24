//! Repositório de Fornecedores

use crate::error::AppResult;
use crate::models::{CreateSupplier, Supplier, UpdateSupplier};
use crate::repositories::new_id;
use sqlx::SqlitePool;

pub struct SupplierRepository<'a> {
    pool: &'a SqlitePool,
    event_service: Option<&'a crate::services::mobile_events::MobileEventService>,
}

impl<'a> SupplierRepository<'a> {
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

    const COLS: &'static str = "id, name, trade_name, cnpj, phone, email, address, city, state, notes, is_active, created_at, updated_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Supplier>> {
        let query = format!("SELECT {} FROM suppliers WHERE id = ?", Self::COLS);
        let result = sqlx::query_as::<_, Supplier>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_cnpj(&self, cnpj: &str) -> AppResult<Option<Supplier>> {
        let query = format!("SELECT {} FROM suppliers WHERE cnpj = ?", Self::COLS);
        let result = sqlx::query_as::<_, Supplier>(&query)
            .bind(cnpj)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all_active(&self) -> AppResult<Vec<Supplier>> {
        let query = format!(
            "SELECT {} FROM suppliers WHERE is_active = 1 ORDER BY name",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Supplier>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn search(&self, term: &str) -> AppResult<Vec<Supplier>> {
        let pattern = format!("%{}%", term);
        let query = format!("SELECT {} FROM suppliers WHERE is_active = 1 AND (name LIKE ? OR trade_name LIKE ? OR cnpj LIKE ?) ORDER BY name", Self::COLS);
        let result = sqlx::query_as::<_, Supplier>(&query)
            .bind(&pattern)
            .bind(&pattern)
            .bind(&pattern)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn create(&self, data: CreateSupplier) -> AppResult<Supplier> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO suppliers (id, name, trade_name, cnpj, phone, email, address, city, state, notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        )
        .bind(&id)
        .bind(&data.name)
        .bind(&data.trade_name)
        .bind(&data.cnpj)
        .bind(&data.phone)
        .bind(&data.email)
        .bind(&data.address)
        .bind(&data.city)
        .bind(&data.state)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        let result =
            self.find_by_id(&id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Supplier".into(),
                    id,
                })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            service.emit_sync_push(
                "supplier",
                serde_json::to_value(&result).unwrap_or_default(),
            );
            service.emit_supplier_updated(&result.id, &result.name);
        }

        Ok(result)
    }

    pub async fn update(&self, id: &str, data: UpdateSupplier) -> AppResult<Supplier> {
        let existing =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Supplier".into(),
                    id: id.into(),
                })?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = data.name.unwrap_or(existing.name);
        let trade_name = data.trade_name.or(existing.trade_name);
        let cnpj = data.cnpj.or(existing.cnpj);
        let phone = data.phone.or(existing.phone);
        let email = data.email.or(existing.email);
        let address = data.address.or(existing.address);
        let city = data.city.or(existing.city);
        let state = data.state.or(existing.state);
        let notes = data.notes.or(existing.notes);
        let is_active = data.is_active.unwrap_or(existing.is_active);

        sqlx::query(
            "UPDATE suppliers SET name = ?, trade_name = ?, cnpj = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, notes = ?, is_active = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&name).bind(&trade_name).bind(&cnpj).bind(&phone).bind(&email)
        .bind(&address).bind(&city).bind(&state).bind(&notes).bind(is_active).bind(&now).bind(id)
        .execute(self.pool)
        .await?;

        let result =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Supplier".into(),
                    id: id.into(),
                })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            service.emit_sync_push(
                "supplier",
                serde_json::to_value(&result).unwrap_or_default(),
            );
            service.emit_supplier_updated(&result.id, &result.name);
        }

        Ok(result)
    }

    pub async fn delete(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE suppliers SET is_active = 0, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    /// Reativa um fornecedor desativado
    pub async fn reactivate(&self, id: &str) -> AppResult<Supplier> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE suppliers SET is_active = 1, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;

        let result =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Supplier".into(),
                    id: id.into(),
                })?;

        // Sincronização em tempo real (broadcast)
        if let Some(service) = self.event_service {
            service.emit_supplier_updated(&result.id, &result.name);
        }

        Ok(result)
    }

    /// Retorna todos os fornecedores (ativos e inativos)
    pub async fn find_all(&self) -> AppResult<Vec<Supplier>> {
        let query = format!("SELECT {} FROM suppliers ORDER BY name", Self::COLS);
        let result = sqlx::query_as::<_, Supplier>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    /// Retorna apenas fornecedores inativos
    pub async fn find_inactive(&self) -> AppResult<Vec<Supplier>> {
        let query = format!(
            "SELECT {} FROM suppliers WHERE is_active = 0 ORDER BY name",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Supplier>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_delta(&self, last_sync: i64) -> AppResult<Vec<Supplier>> {
        let query = format!(
            "SELECT {} FROM suppliers WHERE unixepoch(updated_at) > ? ORDER BY updated_at ASC",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Supplier>(&query)
            .bind(last_sync)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn upsert_from_sync(&self, supplier: Supplier) -> AppResult<()> {
        sqlx::query(
            r#"INSERT INTO suppliers (id, name, trade_name, cnpj, phone, email, address, city, state, notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                trade_name=excluded.trade_name,
                cnpj=excluded.cnpj,
                phone=excluded.phone,
                email=excluded.email,
                address=excluded.address,
                city=excluded.city,
                state=excluded.state,
                notes=excluded.notes,
                is_active=excluded.is_active,
                updated_at=excluded.updated_at"#
        )
        .bind(&supplier.id)
        .bind(&supplier.name)
        .bind(&supplier.trade_name)
        .bind(&supplier.cnpj)
        .bind(&supplier.phone)
        .bind(&supplier.email)
        .bind(&supplier.address)
        .bind(&supplier.city)
        .bind(&supplier.state)
        .bind(&supplier.notes)
        .bind(supplier.is_active)
        .bind(&supplier.created_at)
        .bind(&supplier.updated_at)
        .execute(self.pool)
        .await?;
        Ok(())
    }
}

#[cfg(test)]
#[path = "supplier_repository_test.rs"]
mod supplier_repository_test;
