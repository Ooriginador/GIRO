//! Repositório de Funcionários

use crate::error::AppResult;
use crate::models::{CreateEmployee, Employee, SafeEmployee, UpdateEmployee};
use crate::repositories::new_id;
use sha2::{Digest, Sha256};
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{SaltString, PasswordHash};
use argon2::password_hash::rand_core::OsRng;
use hmac::{Hmac, Mac};
use hex;
use sqlx::SqlitePool;

pub struct EmployeeRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> EmployeeRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const COLS: &'static str =
        "id, name, cpf, phone, email, pin, password, role, commission_rate, is_active, created_at, updated_at";

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

    /// Verifica se existe algum funcionário cadastrado
    pub async fn has_any_employee(&self) -> AppResult<bool> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM employees")
            .fetch_one(self.pool)
            .await?;
        Ok(result.0 > 0)
    }

    /// Verifica se existe algum admin cadastrado
    pub async fn has_admin(&self) -> AppResult<bool> {
        let result: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM employees WHERE role = 'ADMIN' AND is_active = 1")
                .fetch_one(self.pool)
                .await?;
        Ok(result.0 > 0)
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

        tracing::info!("Criando funcionário: {} (role: {})", data.name, role);
        let result = sqlx::query(
            "INSERT INTO employees (id, name, cpf, phone, email, pin, password, role, commission_rate, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        )
        .bind(&id)
        .bind(&data.name)
        .bind(&data.cpf)
        .bind(&data.phone)
        .bind(&data.email)
        .bind(&pin_hash)
        .bind(&password_hash)
        .bind(&role)
        .bind(data.commission_rate)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Erro ao criar funcionário no banco: {:?}", e);
            return Err(e.into());
        }

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
        let commission_rate = data.commission_rate.or(existing.commission_rate);

        let result = sqlx::query(
            "UPDATE employees SET name = ?, cpf = ?, phone = ?, email = ?, pin = ?, password = ?, role = ?, commission_rate = ?, is_active = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&name)
        .bind(&cpf)
        .bind(&phone)
        .bind(&email)
        .bind(&pin)
        .bind(&password)
        .bind(&role)
        .bind(commission_rate)
        .bind(is_active)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Erro ao atualizar funcionário {}: {:?}", id, e);
            return Err(e.into());
        }

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
        // Primeiro tente o hash atual (HMAC-SHA256)
        let pin_hash = hash_pin(pin);
        if let Some(emp) = self.find_by_pin(&pin_hash).await? {
            return Ok(Some(emp));
        }

        // Fallback legacy: SHA256 sem HMAC (versões antigas do seed)
        use sha2::Sha256 as LegacySha256;
        let mut hasher = LegacySha256::new();
        hasher.update(pin.as_bytes());
        let legacy_hash = format!("{:x}", hasher.finalize());

        if let Some(emp) = self.find_by_pin(&legacy_hash).await? {
            // Re-hash o PIN usando o novo método e atualize o registro
            let new_pin_hash = hash_pin(pin);
            let now = chrono::Utc::now().to_rfc3339();
            let _ = sqlx::query("UPDATE employees SET pin = ?, updated_at = ? WHERE id = ?")
                .bind(&new_pin_hash)
                .bind(&now)
                .bind(&emp.id)
                .execute(self.pool)
                .await;
            return Ok(Some(emp));
        }

        Ok(None)
    }

    /// Verifica uma senha para um funcionário e migra hash legacy para Argon2 se necessário
    pub async fn verify_password_and_migrate(&self, employee_id: &str, password: &str) -> AppResult<bool> {
        let existing = match self.find_by_id(employee_id).await? {
            Some(e) => e,
            None => return Ok(false),
        };

        let stored = match existing.password {
            Some(s) => s,
            None => return Ok(false),
        };

        // Tenta primeira verificar como Argon2 (hash moderno)
        if let Ok(parsed) = PasswordHash::new(&stored) {
            let argon2 = Argon2::default();
            if argon2.verify_password(password.as_bytes(), &parsed).is_ok() {
                return Ok(true);
            }
        }

        // Fallback legacy: SHA256 hex
        let mut legacy_hasher = Sha256::new();
        legacy_hasher.update(password.as_bytes());
        let legacy_hash = format!("{:x}", legacy_hasher.finalize());
        if legacy_hash == stored {
            // Re-hash com Argon2 e atualize

            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let password_hash = match argon2.hash_password(password.as_bytes(), &salt) {
                Ok(h) => h.to_string(),
                Err(e) => {
                    tracing::error!("Argon2 re-hash failed: {:?}", e);
                    return Err(crate::error::AppError::Internal(
                        "Erro interno ao gerar hash de senha".into(),
                    ));
                }
            };

            let now = chrono::Utc::now().to_rfc3339();
            let _ = sqlx::query("UPDATE employees SET password = ?, updated_at = ? WHERE id = ?")
                .bind(&password_hash)
                .bind(&now)
                .bind(employee_id)
                .execute(self.pool)
                .await;

            return Ok(true);
        }

        Ok(false)
    }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/// Hash do PIN usando SHA256 (compatível com seed do Prisma)
fn hash_pin(pin: &str) -> String {
    // Deterministic HMAC-SHA256 using PIN_HMAC_KEY env var for lookup-friendly PIN hashing
    type HmacSha256 = Hmac<Sha256>;
    let key = std::env::var("PIN_HMAC_KEY").unwrap_or_else(|_| "giro-default-pin-key".to_string());
    let mut mac = HmacSha256::new_from_slice(key.as_bytes()).expect("HMAC can take key of any size");
    mac.update(pin.as_bytes());
    let result = mac.finalize();
    let bytes = result.into_bytes();
    hex::encode(bytes)
}

fn hash_password(password: &str) -> String {
    // Use Argon2id with random salt
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .expect("Argon2 hashing failed")
        .to_string();
    password_hash
}

#[cfg(test)]
#[path = "employee_repository_test.rs"]
mod employee_repository_test;
