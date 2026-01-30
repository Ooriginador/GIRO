//! Repositório de Funcionários

use crate::error::AppResult;
use crate::license::AdminUserSyncData;
use crate::models::{CreateEmployee, Employee, SafeEmployee, UpdateEmployee};
use crate::repositories::new_id;
use crate::utils::pii;
use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, SaltString};
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use hex;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

pub struct EmployeeRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> EmployeeRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// Tenta autenticar com chaves HMAC armazenadas no banco (recovery)
    async fn try_authenticate_with_stored_keys(&self, pin: &str) -> AppResult<Option<Employee>> {
        // Busca chaves HMAC armazenadas no banco de configurações
        let stored_keys = self.get_stored_hmac_keys().await?;

        for key in stored_keys {
            let pin_hash = hash_pin_with_key(pin, &key);
            if let Some(emp) = self.find_by_pin(&pin_hash).await? {
                // Encontrou com chave antiga - migra para chave atual
                let new_pin_hash = hash_pin_with_current_key(pin);
                self.migrate_employee_pin(&emp.id, &new_pin_hash).await?;
                tracing::info!(
                    "Recovered and migrated employee {} PIN with stored HMAC key",
                    emp.id
                );
                return Ok(Some(emp));
            }
        }

        Ok(None)
    }

    /// Busca chaves HMAC histórias armazenadas no banco
    async fn get_stored_hmac_keys(&self) -> AppResult<Vec<String>> {
        let result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM settings WHERE key LIKE 'pin_hmac_key_%' ORDER BY key DESC",
        )
        .fetch_all(self.pool)
        .await?;
        Ok(result)
    }

    /// Migra PIN de funcionário para novo hash
    async fn migrate_employee_pin(&self, employee_id: &str, new_pin_hash: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE employees SET pin = ?, updated_at = ? WHERE id = ?")
            .bind(new_pin_hash)
            .bind(&now)
            .bind(employee_id)
            .execute(self.pool)
            .await?;
        Ok(())
    }

    const COLS: &'static str =
        "id, name, cpf, phone, email, pin, password, role, commission_rate, is_active, created_at, updated_at";

    pub async fn find_by_id(&self, id: &str) -> AppResult<Option<Employee>> {
        let query = format!("SELECT {} FROM employees WHERE id = ?", Self::COLS);
        let result = sqlx::query_as::<_, Employee>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result.map(Self::decrypt_employee))
    }

    pub async fn find_by_cpf(&self, cpf: &str) -> AppResult<Option<Employee>> {
        if pii::is_enabled() {
            let query = format!("SELECT {} FROM employees WHERE cpf IS NOT NULL", Self::COLS);
            let employees = sqlx::query_as::<_, Employee>(&query)
                .fetch_all(self.pool)
                .await?;

            let mut found: Option<Employee> = None;
            for mut employee in employees {
                let decrypted_cpf = pii::decrypt_optional_lossy(employee.cpf.clone());
                if decrypted_cpf.as_deref() == Some(cpf) {
                    employee.cpf = decrypted_cpf;
                    found = Some(employee);
                    break;
                }
            }

            return Ok(found.map(Self::decrypt_employee));
        }

        let query = format!("SELECT {} FROM employees WHERE cpf = ?", Self::COLS);
        let result = sqlx::query_as::<_, Employee>(&query)
            .bind(cpf)
            .fetch_optional(self.pool)
            .await?;
        Ok(result.map(Self::decrypt_employee))
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
        Ok(result.map(Self::decrypt_employee))
    }

    pub async fn find_all_active(&self) -> AppResult<Vec<Employee>> {
        let query = format!(
            "SELECT {} FROM employees WHERE is_active = 1 ORDER BY name",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Employee>(&query)
            .fetch_all(self.pool)
            .await?;
        Ok(result.into_iter().map(Self::decrypt_employee).collect())
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
        // ═══════════════════════════════════════════════════════════════════
        // VALIDAÇÕES
        // ═══════════════════════════════════════════════════════════════════

        // Nome obrigatório e não vazio
        let name = data.name.trim();
        if name.is_empty() {
            return Err(crate::error::AppError::Validation(
                "Nome do funcionário é obrigatório".into(),
            ));
        }
        if name.len() < 3 {
            return Err(crate::error::AppError::Validation(
                "Nome do funcionário deve ter pelo menos 3 caracteres".into(),
            ));
        }

        // PIN: 4-6 dígitos numéricos
        if data.pin.len() < 4 || data.pin.len() > 6 {
            return Err(crate::error::AppError::Validation(
                "PIN deve ter entre 4 e 6 dígitos".into(),
            ));
        }
        if !data.pin.chars().all(|c| c.is_ascii_digit()) {
            return Err(crate::error::AppError::Validation(
                "PIN deve conter apenas números".into(),
            ));
        }

        // Email: formato válido se presente
        if let Some(ref email) = data.email {
            if !email.is_empty() && !is_valid_email(email) {
                return Err(crate::error::AppError::Validation("E-mail inválido".into()));
            }
        }

        // CPF: validar formato e dígitos se presente
        if let Some(ref cpf) = data.cpf {
            if !cpf.is_empty() {
                if !is_valid_cpf(cpf) {
                    return Err(crate::error::AppError::Validation("CPF inválido".into()));
                }
                // Verificar duplicidade de CPF
                if let Some(existing) = self.find_by_cpf(cpf).await? {
                    if existing.is_active {
                        return Err(crate::error::AppError::Duplicate(format!(
                            "CPF '{}' já está cadastrado para outro funcionário",
                            mask_cpf(cpf)
                        )));
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CRIAÇÃO
        // ═══════════════════════════════════════════════════════════════════
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
        let cpf = pii::encrypt_optional(data.cpf)?;

        let result = sqlx::query(
            "INSERT INTO employees (id, name, cpf, phone, email, pin, password, role, commission_rate, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        )
        .bind(&id)
        .bind(&data.name)
        .bind(&cpf)
        .bind(&data.phone)
        .bind(&data.email)
        .bind(&pin_hash)
        .bind(&password_hash)
        .bind(&role)
        .bind(data.commission_rate.unwrap_or(0.0))
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

        // ═══════════════════════════════════════════════════════════════════
        // VALIDAÇÕES
        // ═══════════════════════════════════════════════════════════════════

        // Nome: se fornecido, validar
        let name = if let Some(ref new_name) = data.name {
            let trimmed = new_name.trim();
            if trimmed.is_empty() {
                return Err(crate::error::AppError::Validation(
                    "Nome do funcionário não pode ser vazio".into(),
                ));
            }
            if trimmed.len() < 3 {
                return Err(crate::error::AppError::Validation(
                    "Nome do funcionário deve ter pelo menos 3 caracteres".into(),
                ));
            }
            trimmed.to_string()
        } else {
            existing.name.clone()
        };

        // PIN: se fornecido, validar
        if let Some(ref new_pin) = data.pin {
            if new_pin.len() < 4 || new_pin.len() > 6 {
                return Err(crate::error::AppError::Validation(
                    "PIN deve ter entre 4 e 6 dígitos".into(),
                ));
            }
            if !new_pin.chars().all(|c| c.is_ascii_digit()) {
                return Err(crate::error::AppError::Validation(
                    "PIN deve conter apenas números".into(),
                ));
            }
        }

        // Email: se fornecido, validar formato
        if let Some(ref new_email) = data.email {
            if !new_email.is_empty() && !is_valid_email(new_email) {
                return Err(crate::error::AppError::Validation("E-mail inválido".into()));
            }
        }

        // CPF: se fornecido, validar e verificar duplicidade
        if let Some(ref new_cpf) = data.cpf {
            if !new_cpf.is_empty() {
                if !is_valid_cpf(new_cpf) {
                    return Err(crate::error::AppError::Validation("CPF inválido".into()));
                }
                // Verificar duplicidade (excluindo o próprio funcionário)
                if let Some(existing_with_cpf) = self.find_by_cpf(new_cpf).await? {
                    if existing_with_cpf.id != id && existing_with_cpf.is_active {
                        return Err(crate::error::AppError::Duplicate(format!(
                            "CPF '{}' já está cadastrado para outro funcionário",
                            mask_cpf(new_cpf)
                        )));
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // ATUALIZAÇÃO
        // ═══════════════════════════════════════════════════════════════════
        let cpf = pii::encrypt_optional(data.cpf.or(existing.cpf))?;
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

    /// Força reset do PIN de um funcionário (comando de emergência)
    /// Usado quando há problemas com HMAC key e usuários ficam bloqueados
    pub async fn force_reset_pin(&self, employee_id: &str, new_pin: &str) -> AppResult<()> {
        // Validar PIN
        if new_pin.len() < 4 || new_pin.len() > 6 {
            return Err(crate::error::AppError::Validation(
                "PIN deve ter entre 4 e 6 dígitos".into(),
            ));
        }
        if !new_pin.chars().all(|c| c.is_ascii_digit()) {
            return Err(crate::error::AppError::Validation(
                "PIN deve conter apenas números".into(),
            ));
        }

        // Hash com chave atual
        let pin_hash = hash_pin_with_current_key(new_pin);
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query(
            "UPDATE employees SET pin = ?, updated_at = ? WHERE id = ? AND is_active = 1",
        )
        .bind(&pin_hash)
        .bind(&now)
        .bind(employee_id)
        .execute(self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(crate::error::AppError::NotFound {
                entity: "Employee".into(),
                id: employee_id.into(),
            });
        }

        tracing::info!("Admin force reset PIN for employee {}", employee_id);
        Ok(())
    }

    fn decrypt_employee(mut employee: Employee) -> Employee {
        employee.cpf = pii::decrypt_optional_lossy(employee.cpf);
        employee
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
        Ok(result.into_iter().map(Self::decrypt_employee).collect())
    }

    pub async fn authenticate_pin(&self, pin: &str) -> AppResult<Option<Employee>> {
        // Primeiro tente o hash atual (HMAC-SHA256)
        let pin_hash = hash_pin_with_current_key(pin);
        if let Some(emp) = self.find_by_pin(&pin_hash).await? {
            return Ok(Some(emp));
        }

        // Fallback 1: Tente com HMAC keys armazenadas no banco (migração/recovery)
        if let Some(emp) = self.try_authenticate_with_stored_keys(pin).await? {
            return Ok(Some(emp));
        }

        // Fallback 2: Legacy SHA256 sem HMAC (versões antigas do seed)
        use sha2::Sha256 as LegacySha256;
        let mut hasher = LegacySha256::new();
        hasher.update(pin.as_bytes());
        let legacy_hash = format!("{:x}", hasher.finalize());

        if let Some(emp) = self.find_by_pin(&legacy_hash).await? {
            // Re-hash o PIN usando o novo método e atualize o registro
            let new_pin_hash = hash_pin_with_current_key(pin);
            self.migrate_employee_pin(&emp.id, &new_pin_hash).await?;
            tracing::info!(
                "Migrated employee {} from legacy SHA256 to HMAC-SHA256",
                emp.id
            );
            return Ok(Some(emp));
        }

        // Fallback 3: Tenta Argon2 (sincronizado do servidor)
        let employees = self.find_all_active().await?;
        for emp in employees {
            if let Some(stored_hash) = &emp.password {
                if let Ok(parsed) = PasswordHash::new(stored_hash) {
                    let argon2 = Argon2::default();
                    if argon2.verify_password(pin.as_bytes(), &parsed).is_ok() {
                        // Re-hash o PIN usando o novo método e atualize o registro
                        let new_pin_hash = hash_pin_with_current_key(pin);
                        self.migrate_employee_pin(&emp.id, &new_pin_hash).await?;
                        tracing::info!("Migrated employee {} from Argon2 to HMAC-SHA256", emp.id);
                        return Ok(Some(emp));
                    }
                }
            }
        }

        tracing::warn!("PIN authentication failed for all fallback methods");
        Ok(None)
    }

    /// Sincroniza dados do administrador vindos do servidor
    pub async fn sync_admin_from_server(&self, data: AdminUserSyncData) -> AppResult<Employee> {
        // No desktop App, o admin costuma ser identificado pelo Role.

        let admin = sqlx::query_as::<_, Employee>(
            "SELECT * FROM employees WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1",
        )
        .fetch_optional(self.pool)
        .await?;

        let now = chrono::Utc::now().to_rfc3339();

        if let Some(admin) = admin {
            // Update existing
            sqlx::query(
                "UPDATE employees SET name = ?, email = ?, phone = ?, password = ?, commission_rate = ?, updated_at = ? WHERE id = ?"
            )
            .bind(&data.name)
            .bind(&data.email)
            .bind(&data.phone)
            .bind(&data.password_hash)
            .bind(0.0) // Default for admin if not provided
            .bind(&now)
            .bind(&admin.id)
            .execute(self.pool)
            .await?;

            Ok(self.find_by_id(&admin.id).await?.unwrap())
        } else {
            // SAFEGUARD: Before creating a new admin from server sync,
            // ensure there really is NO admin at all to avoid duplicates/account mixing.
            let already_has_admin = self.has_admin().await?;
            if already_has_admin {
                return Err(crate::error::AppError::Duplicate(
                    "Tentativa de sincronizar admin do servidor mas já existe um admin local."
                        .into(),
                ));
            }

            // Create new admin
            let id = if data.id.len() == 36 {
                data.id.clone()
            } else {
                new_id()
            };

            // Set a default pin "0000" (hashed) so the user can login and change it
            let default_pin_hash = hash_pin("0000");

            sqlx::query(
                "INSERT INTO employees (id, name, email, phone, pin, password, role, commission_rate, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'ADMIN', ?, 1, ?, ?)"
            )
            .bind(&id)
            .bind(&data.name)
            .bind(&data.email)
            .bind(&data.phone)
            .bind(&default_pin_hash)
            .bind(&data.password_hash)
            .bind(0.0)
            .bind(&now)
            .bind(&now)
            .execute(self.pool)
            .await?;

            Ok(self.find_by_id(&id).await?.unwrap())
        }
    }

    /// Verifica uma senha para um funcionário e migra hash legacy para Argon2 se necessário
    pub async fn verify_password_and_migrate(
        &self,
        employee_id: &str,
        password: &str,
    ) -> AppResult<bool> {
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

    pub async fn find_delta(&self, last_sync: i64) -> AppResult<Vec<Employee>> {
        let query = format!(
            "SELECT {} FROM employees WHERE unixepoch(updated_at) > ? ORDER BY updated_at ASC",
            Self::COLS
        );
        let result = sqlx::query_as::<_, Employee>(&query)
            .bind(last_sync)
            .fetch_all(self.pool)
            .await?;
        Ok(result.into_iter().map(Self::decrypt_employee).collect())
    }

    pub async fn upsert_from_sync(&self, mut employee: Employee) -> AppResult<()> {
        // Encrypt CPF before saving if not already encrypted
        if let Some(cpf) = &employee.cpf {
            if !cpf.starts_with("enc:") {
                employee.cpf = pii::encrypt_optional(employee.cpf)?;
            }
        }

        tracing::info!(
            "Sync: upserting employee {} (has_pin: {}, has_password: {})",
            employee.name,
            !employee.pin.is_empty(),
            employee.password.is_some()
        );

        sqlx::query(
            r#"
            INSERT INTO employees (
                id, name, cpf, phone, email, pin, password, role, commission_rate, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                cpf = excluded.cpf,
                phone = excluded.phone,
                email = excluded.email,
                pin = excluded.pin,
                password = excluded.password,
                role = excluded.role,
                commission_rate = excluded.commission_rate,
                is_active = excluded.is_active,
                updated_at = excluded.updated_at
            "#
        )
        .bind(&employee.id)
        .bind(&employee.name)
        .bind(&employee.cpf)
        .bind(&employee.phone)
        .bind(&employee.email)
        .bind(&employee.pin)
        .bind(&employee.password)
        .bind(&employee.role)
        .bind(&employee.commission_rate)
        .bind(&employee.is_active)
        .bind(&employee.created_at)
        .bind(&employee.updated_at)
        .execute(self.pool)
        .await?;

        tracing::info!("Sync: employee {} upserted successfully", employee.name);

        Ok(())
    }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/// Hash do PIN usando HMAC-SHA256 com chave atual
fn hash_pin_with_current_key(pin: &str) -> String {
    hash_pin_with_key(pin, &get_or_create_hmac_key())
}

/// Hash do PIN usando HMAC-SHA256 com chave específica
fn hash_pin_with_key(pin: &str, key: &str) -> String {
    type HmacSha256 = Hmac<Sha256>;

    let mut mac =
        HmacSha256::new_from_slice(key.as_bytes()).expect("HMAC can take key of any size");
    mac.update(pin.as_bytes());
    let result = mac.finalize();
    let bytes = result.into_bytes();
    hex::encode(bytes)
}

/// Legacy compatibility - same as hash_pin_with_current_key
fn hash_pin(pin: &str) -> String {
    hash_pin_with_current_key(pin)
}

/// Obtém ou cria a chave HMAC para hash de PIN
/// Prioridade:
/// 1) Variável de ambiente PIN_HMAC_KEY
/// 2) Chave sincronizada do Master (setting security.master_hmac_key) - IMPORTANTE para multi-PC
/// 3) Arquivo de configuração local
/// 4) Backup no banco de dados local
/// 5) Gera nova chave (apenas se for Master ou standalone)
fn get_or_create_hmac_key() -> String {
    // 1. Tentar obter da variável de ambiente
    if let Ok(key) = std::env::var("PIN_HMAC_KEY") {
        if !key.is_empty() {
            return key;
        }
    }

    // 2. Tentar obter chave sincronizada do Master (CRITICAL para multi-PC sync)
    // Esta é a chave que garante que todos os PCs usem o mesmo hash de PIN
    if let Ok(key) = get_master_hmac_key_from_settings() {
        if !key.is_empty() {
            tracing::info!("PIN_HMAC_KEY obtida da sincronização com Master");
            // Salvar localmente para uso offline
            let _ = save_hmac_key_to_file(&key);
            return key;
        }
    }

    // 3. Tentar ler do arquivo de configuração local
    let key_file = get_hmac_key_path();
    if let Ok(key) = std::fs::read_to_string(&key_file) {
        let key = key.trim().to_string();
        if !key.is_empty() {
            tracing::info!("PIN_HMAC_KEY carregada do arquivo de configuração");
            // Salvar no banco como backup
            store_hmac_key_in_db(&key);
            // Se for Master, também salvar na setting sincronizável
            save_master_hmac_key_if_master(&key);
            return key;
        }
    }

    // 4. Tentar ler do banco de dados local (backup)
    if let Ok(key) = get_hmac_key_from_db() {
        if !key.is_empty() {
            tracing::info!("PIN_HMAC_KEY recuperada do banco de dados");
            // Tentar restaurar no arquivo
            let _ = save_hmac_key_to_file(&key);
            return key;
        }
    }

    // 5. Gerar nova chave e salvar em todos os locais
    tracing::warn!("PIN_HMAC_KEY não encontrada em nenhum local, gerando nova chave...");
    tracing::warn!("ATENÇÃO: PINs existentes podem ficar inválidos!");
    let new_key = generate_hmac_key();

    // Salvar no arquivo
    if let Err(e) = save_hmac_key_to_file(&new_key) {
        tracing::error!("Falha ao salvar PIN_HMAC_KEY no arquivo: {}", e);
    }

    // Salvar no banco como backup
    store_hmac_key_in_db(&new_key);

    // Se for Master, salvar na setting sincronizável para propagar aos Satellites
    save_master_hmac_key_if_master(&new_key);

    new_key
}

/// Obtém a chave HMAC do Master das settings sincronizadas
/// Esta chave é sincronizada do Master para os Satellites
fn get_master_hmac_key_from_settings() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:giro.db".to_string());

    // Usar runtime blocking para operação síncrona
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let pool = sqlx::SqlitePool::connect(&database_url).await?;
        let result: Option<String> =
            sqlx::query_scalar("SELECT value FROM settings WHERE key = 'security.master_hmac_key'")
                .fetch_optional(&pool)
                .await?;
        result.ok_or_else(|| "No master HMAC key found in settings".into())
    })
}

/// Salva a chave HMAC na setting sincronizável se este PC for Master
/// A setting security.master_hmac_key será propagada para todos os Satellites via sync
fn save_master_hmac_key_if_master(key: &str) {
    let key = key.to_string();
    tokio::spawn(async move {
        let database_url = std::env::var("DATABASE_URL").unwrap_or("sqlite:giro.db".to_string());
        if let Ok(pool) = sqlx::SqlitePool::connect(&database_url).await {
            // Verificar se é Master
            let mode: Option<String> = sqlx::query_scalar(
                "SELECT value FROM settings WHERE key = 'network.operation_mode'",
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

            if mode.as_deref() == Some("master") {
                let timestamp = chrono::Utc::now().to_rfc3339();
                let _ = sqlx::query(
                    r#"INSERT INTO settings (key, value, description, updated_at) 
                       VALUES ('security.master_hmac_key', ?, 'HMAC key for PIN hashing (synced from Master)', ?)
                       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"#
                )
                .bind(&key)
                .bind(&timestamp)
                .execute(&pool)
                .await;

                tracing::info!("Master HMAC key salva na setting sincronizável");
            }
        }
    });
}

/// Salva chave HMAC no arquivo
fn save_hmac_key_to_file(key: &str) -> Result<(), std::io::Error> {
    let key_file = get_hmac_key_path();
    if let Some(parent) = key_file.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&key_file, key)?;
    tracing::info!("PIN_HMAC_KEY salva em: {:?}", key_file);
    Ok(())
}

/// Armazena chave HMAC no banco como backup
fn store_hmac_key_in_db(key: &str) {
    // Criar uma conexão temporária para salvar a chave
    let key = key.to_string();
    tokio::spawn(async move {
        let database_url = std::env::var("DATABASE_URL").unwrap_or("sqlite:giro.db".to_string());
        if let Ok(pool) = sqlx::SqlitePool::connect(&database_url).await {
            let timestamp = chrono::Utc::now().to_rfc3339();
            let key_name = format!("pin_hmac_key_{}", chrono::Utc::now().timestamp());
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
            )
            .bind(&key_name)
            .bind(&key)
            .bind(&timestamp)
            .execute(&pool)
            .await;

            // Manter apenas as 5 chaves mais recentes
            let _ = sqlx::query(
                    "DELETE FROM settings WHERE key LIKE 'pin_hmac_key_%' AND key NOT IN (
                        SELECT key FROM settings WHERE key LIKE 'pin_hmac_key_%' ORDER BY key DESC LIMIT 5
                    )"
                ).execute(&pool).await;

            tracing::info!("PIN_HMAC_KEY salva no banco como backup");
        }
    });
}

/// Recupera chave HMAC do banco de dados
fn get_hmac_key_from_db() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:giro.db".to_string());

    // Usar runtime blocking para operação síncrona
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let pool = sqlx::SqlitePool::connect(&database_url).await?;
        let result: Option<String> = sqlx::query_scalar(
            "SELECT value FROM settings WHERE key LIKE 'pin_hmac_key_%' ORDER BY key DESC LIMIT 1",
        )
        .fetch_optional(&pool)
        .await?;
        result.ok_or_else(|| "No HMAC key found in database".into())
    })
}

/// Gera uma nova chave HMAC aleatória
fn generate_hmac_key() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let bytes: [u8; 32] = rng.random();
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

/// Retorna o caminho do arquivo de chave HMAC
fn get_hmac_key_path() -> std::path::PathBuf {
    // Usar diretório de dados do app
    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string()));
        std::path::PathBuf::from(local_app_data)
            .join("GIRO")
            .join(".hmac_key")
    }
    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        std::path::PathBuf::from(home)
            .join(".config")
            .join("giro")
            .join(".hmac_key")
    }
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

/// Valida formato de e-mail (regex simples)
fn is_valid_email(email: &str) -> bool {
    // Regex simplificado para e-mail
    let email = email.trim();
    if email.is_empty() {
        return true; // Vazio é válido (opcional)
    }
    // Deve ter @ e domínio com ponto
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    let local = parts[0];
    let domain = parts[1];

    !local.is_empty() && domain.contains('.') && domain.len() >= 3
}

/// Valida CPF brasileiro (algoritmo de dígitos verificadores)
fn is_valid_cpf(cpf: &str) -> bool {
    // Remove caracteres não numéricos
    let digits: Vec<u32> = cpf.chars().filter_map(|c| c.to_digit(10)).collect();

    // Deve ter 11 dígitos
    if digits.len() != 11 {
        return false;
    }

    // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
    if digits.iter().all(|&d| d == digits[0]) {
        return false;
    }

    // Validação do primeiro dígito verificador
    let mut sum: u32 = 0;
    for (i, &digit) in digits.iter().enumerate().take(9) {
        sum += digit * (10 - i as u32);
    }
    let mut remainder = (sum * 10) % 11;
    if remainder == 10 || remainder == 11 {
        remainder = 0;
    }
    if remainder != digits[9] {
        return false;
    }

    // Validação do segundo dígito verificador
    sum = 0;
    for (i, &digit) in digits.iter().enumerate().take(10) {
        sum += digit * (11 - i as u32);
    }
    remainder = (sum * 10) % 11;
    if remainder == 10 || remainder == 11 {
        remainder = 0;
    }
    if remainder != digits[10] {
        return false;
    }

    true
}

/// Mascara CPF para exibição (ex: 123.456.789-00 -> ***.***.789-00)
fn mask_cpf(cpf: &str) -> String {
    let digits: String = cpf.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() != 11 {
        return cpf.to_string();
    }
    format!("***.***{}-{}", &digits[6..9], &digits[9..11])
}

#[cfg(test)]
#[path = "employee_repository_test.rs"]
mod employee_repository_test;
