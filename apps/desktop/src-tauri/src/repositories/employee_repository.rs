//! Repositório de Funcionários

use crate::error::AppResult;
use crate::models::{CreateEmployee, Employee, SafeEmployee, UpdateEmployee};
use crate::repositories::new_id;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

pub struct EmployeeRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> EmployeeRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const COLS: &'static str =
        "id, name, cpf, phone, email, pin, password, role, is_active, created_at, updated_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Employee>> {
        let query = format!("SELECT {} FROM employees WHERE id = ?", Self::COLS);
        let result = sqlx::query_as::<_, Employee>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_cpf(&self, cpf: &str) -> AppResult<Option<Employee>> {
        let query = format!("SELECT {} FROM employees WHERE cpf = ?", Self::COLS);
        let result = sqlx::query_as::<_, Employee>(&query)
            .bind(cpf)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_by_pin(&self, pin: &str) -> AppResult<Option<Employee>> {
        let query = format!(
            "SELECT {} FROM employees WHERE pin = ? AND is_active = 1",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Employee>(&query)
            .bind(pin)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all_active(&self) -> AppResult<Vec<Employee>> {
        let query = format!(
            "SELECT {} FROM employees WHERE is_active = 1 ORDER BY name",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Employee>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_all_safe(&self) -> AppResult<Vec<SafeEmployee>> {
        let employees = self.find_all_active().await?;
        Ok(employees.into_iter().map(SafeEmployee::from).collect())
    }

    pub async fn create(&self, data: CreateEmployee) -> AppResult<Employee> {
        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();
        let role = data
            .role
            .map(|r| format!("{:?}", r).to_uppercase())
            .unwrap_or_else(|| "CASHIER".to_string());

        // Compatível com o seed do Prisma (SHA256)
        let pin_hash = hash_pin(&data.pin);
        let password_hash = data.password.map(|password| hash_password(&password));

        sqlx::query(
            "INSERT INTO employees (id, name, cpf, phone, email, pin, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        )
        .bind(&id)
        .bind(&data.name)
        .bind(&data.cpf)
        .bind(&data.phone)
        .bind(&data.email)
        .bind(&pin_hash)
        .bind(&password_hash)
        .bind(&role)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        self.find_by_id(&id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Employee".into(),
                id,
            })
    }

    pub async fn update(&self, id: &str, data: UpdateEmployee) -> AppResult<Employee> {
        let existing =
            self.find_by_id(id)
                .await?
                .ok_or_else(|| crate::error::AppError::NotFound {
                    entity: "Employee".into(),
                    id: id.into(),
                })?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = data.name.unwrap_or(existing.name);
        let cpf = data.cpf.or(existing.cpf);
        let phone = data.phone.or(existing.phone);
        let email = data.email.or(existing.email);
        let pin = data.pin.map(|pin| hash_pin(&pin)).unwrap_or(existing.pin);
        let password = match data.password {
            Some(password) => Some(hash_password(&password)),
            None => existing.password,
        };
        let role = data
            .role
            .map(|r| format!("{:?}", r).to_uppercase())
            .unwrap_or(existing.role);
        let is_active = data.is_active.unwrap_or(existing.is_active);

        sqlx::query(
            "UPDATE employees SET name = ?, cpf = ?, phone = ?, email = ?, pin = ?, password = ?, role = ?, is_active = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&name)
        .bind(&cpf)
        .bind(&phone)
        .bind(&email)
        .bind(&pin)
        .bind(&password)
        .bind(&role)
        .bind(is_active)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Employee".into(),
                id: id.into(),
            })
    }

    pub async fn deactivate(&self, id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE employees SET is_active = 0, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    /// Reativa um funcionário desativado
    pub async fn reactivate(&self, id: &str) -> AppResult<Employee> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE employees SET is_active = 1, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(self.pool)
            .await?;
        self.find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Employee".into(),
                id: id.into(),
            })
    }

    /// Retorna apenas funcionários inativos
    pub async fn find_inactive(&self) -> AppResult<Vec<Employee>> {
        let query = format!(
            "SELECT {} FROM employees WHERE is_active = 0 ORDER BY name",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Employee>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn authenticate_pin(&self, pin: &str) -> AppResult<Option<Employee>> {
        // Hash PIN com SHA256 (compatível com seed)
        let pin_hash = hash_pin(pin);
        self.find_by_pin(&pin_hash).await
    }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/// Hash do PIN usando SHA256 (compatível com seed do Prisma)
fn hash_pin(pin: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(pin.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
#[path = "employee_repository_test.rs"]
mod employee_repository_test;
