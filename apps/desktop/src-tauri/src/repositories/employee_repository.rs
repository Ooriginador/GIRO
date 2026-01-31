//! Repositório de Funcionários

use crate::error::AppResult;
use crate::license::AdminUserSyncData;
use crate::models::{
    AuditAction, CreateAuditLog, CreateEmployee, Employee, SafeEmployee, UpdateEmployee,
};
use crate::repositories::{new_id, AuditLogRepository};
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
        "id, name, cpf, phone, email, pin, password, username, password_changed_at, \
         password_reset_token, password_reset_expires_at, failed_login_attempts, \
         locked_until, last_login_at, last_login_ip, role, commission_rate, is_active, \
         created_at, updated_at";

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

        // Username checagem de duplicidade
        if let Some(ref username) = data.username {
            let u = username.trim();
            if !u.is_empty() {
                if u.len() < 3 {
                    return Err(crate::error::AppError::Validation(
                        "Username deve ter pelo menos 3 caracteres".into(),
                    ));
                }

                let count: (i64,) =
                    sqlx::query_as("SELECT COUNT(*) FROM employees WHERE username = ?")
                        .bind(u)
                        .fetch_one(self.pool)
                        .await?;

                if count.0 > 0 {
                    return Err(crate::error::AppError::Duplicate(format!(
                        "Username '{}' já está em uso",
                        u
                    )));
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
        let username = data.username.as_ref().map(|u| u.trim());

        let result = sqlx::query(
            "INSERT INTO employees (id, name, cpf, phone, email, username, pin, password, role, commission_rate, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        )
        .bind(&id)
        .bind(&data.name)
        .bind(&cpf)
        .bind(&data.phone)
        .bind(&data.email)
        .bind(username)
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

        // Username
        if let Some(ref new_username) = data.username {
            let u = new_username.trim();
            if !u.is_empty() {
                if u.len() < 3 {
                    return Err(crate::error::AppError::Validation(
                        "Username deve ter pelo menos 3 caracteres".into(),
                    ));
                }
                // Verificar duplicidade (excluindo o próprio funcionário)
                let existing_user: Option<(String,)> =
                    sqlx::query_as("SELECT id FROM employees WHERE username = ?")
                        .bind(u)
                        .fetch_optional(self.pool)
                        .await?;

                if let Some((existing_id,)) = existing_user {
                    if existing_id != id {
                        return Err(crate::error::AppError::Duplicate(format!(
                            "Username '{}' já está em uso",
                            u
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
        let username = data.username.or(existing.username);
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
            "UPDATE employees SET name = ?, cpf = ?, phone = ?, email = ?, username = ?, pin = ?, password = ?, role = ?, commission_rate = ?, is_active = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&name)
        .bind(&cpf)
        .bind(&phone)
        .bind(&email)
        .bind(&username)
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

            self.find_by_id(&admin.id).await?.ok_or_else(|| {
                crate::error::AppError::NotFoundSimple("Admin atualizado não encontrado".into())
            })
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

            self.find_by_id(&id).await?.ok_or_else(|| {
                crate::error::AppError::NotFoundSimple("Admin criado não encontrado".into())
            })
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
                id, name, cpf, phone, email, pin, password, username, 
                password_changed_at, failed_login_attempts, locked_until, 
                role, commission_rate, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                cpf = excluded.cpf,
                phone = excluded.phone,
                email = excluded.email,
                pin = excluded.pin,
                password = excluded.password,
                username = excluded.username,
                password_changed_at = excluded.password_changed_at,
                failed_login_attempts = excluded.failed_login_attempts,
                locked_until = excluded.locked_until,
                role = excluded.role,
                commission_rate = excluded.commission_rate,
                is_active = excluded.is_active,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&employee.id)
        .bind(&employee.name)
        .bind(&employee.cpf)
        .bind(&employee.phone)
        .bind(&employee.email)
        .bind(&employee.pin)
        .bind(&employee.password)
        .bind(&employee.username)
        .bind(&employee.password_changed_at)
        .bind(employee.failed_login_attempts)
        .bind(&employee.locked_until)
        .bind(&employee.role)
        .bind(employee.commission_rate)
        .bind(employee.is_active)
        .bind(&employee.created_at)
        .bind(&employee.updated_at)
        .execute(self.pool)
        .await?;

        tracing::info!("Sync: employee {} upserted successfully", employee.name);

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // AUTENTICAÇÃO POR USERNAME/PASSWORD (ADMIN/MANAGER)
    // ════════════════════════════════════════════════════════════════════════

    /// Autenticação por username + senha (para perfis ADMIN/MANAGER)
    ///
    /// Implementa verificação de:
    /// - Senha correta (Argon2id)
    /// - Conta ativa
    /// - Bloqueio por tentativas falhas
    /// - Expiração de senha
    ///
    /// # Exemplo
    /// ```rust
    /// let result = repo.authenticate_password("admin", "SenhaSegura123!").await?;
    /// if let Some(employee) = result {
    ///     println!("Login bem-sucedido: {}", employee.name);
    /// }
    /// ```
    pub async fn authenticate_password(
        &self,
        username: &str,
        password: &str,
    ) -> AppResult<Option<Employee>> {
        use crate::utils::crypto::verify_password;

        // Buscar funcionário por username, email ou CPF (para login unificado)
        let query = format!(
            "SELECT {} FROM employees WHERE (username = ? OR email = ? OR cpf = ?) AND deleted_at IS NULL",
            Self::COLS
        );
        let employee = sqlx::query_as::<_, Employee>(&query)
            .bind(username)
            .bind(username)
            .bind(username) // Tenta buscar CPF também se o input for um CPF
            .fetch_optional(self.pool)
            .await?;

        let employee = match employee {
            Some(emp) => emp,
            None => {
                tracing::warn!("Tentativa de login com username inexistente: {}", username);
                return Ok(None);
            }
        };

        // Verificar se conta está bloqueada
        if let Some(ref locked_until_str) = employee.locked_until {
            if let Ok(locked_until) = chrono::DateTime::parse_from_rfc3339(locked_until_str) {
                let now = chrono::Utc::now();
                if locked_until > now {
                    tracing::warn!(
                        "Tentativa de login em conta bloqueada: {} (bloqueada até: {})",
                        employee.name,
                        locked_until_str
                    );
                    return Err(crate::error::AppError::AccountLocked {
                        locked_until: locked_until_str.clone(),
                    });
                }
                // Bloqueio expirou, limpar
                self.clear_lockout(&employee.id).await?;
            }
        }

        // Verificar se conta está ativa
        if !employee.is_active {
            tracing::warn!("Tentativa de login em conta inativa: {}", employee.name);
            return Ok(None);
        }

        // Verificar senha
        let stored_hash = match &employee.password {
            Some(hash) => hash,
            None => {
                tracing::warn!(
                    "Funcionário {} não tem senha configurada (usar PIN)",
                    employee.name
                );
                return Ok(None);
            }
        };

        let is_valid = verify_password(password, stored_hash)?;

        if !is_valid {
            // Senha incorreta - registrar tentativa falha
            self.record_failed_attempt(&employee.id).await?;
            tracing::warn!("Senha incorreta para: {}", employee.name);
            return Ok(None);
        }

        // Autenticação bem-sucedida - limpar tentativas falhas
        self.clear_failed_attempts(&employee.id).await?;

        // Atualizar último login
        self.update_last_login(&employee.id, None).await?;

        tracing::info!("Autenticação por senha bem-sucedida: {}", employee.name);

        Ok(Some(Self::decrypt_employee(employee)))
    }

    /// Registra tentativa de login falhada e bloqueia se exceder limite
    pub async fn record_failed_attempt(&self, employee_id: &str) -> AppResult<()> {
        // Buscar configurações
        let max_attempts: i64 = self
            .get_setting("auth.max_failed_attempts")
            .await?
            .unwrap_or(5);
        let lockout_minutes: i64 = self
            .get_setting("auth.lockout_duration_minutes")
            .await?
            .unwrap_or(15);

        // Incrementar contador
        let now = chrono::Utc::now().to_rfc3339();
        let query = r#"
            UPDATE employees 
            SET failed_login_attempts = failed_login_attempts + 1,
                updated_at = ?
            WHERE id = ?
            RETURNING failed_login_attempts
        "#;

        let attempts: i64 = sqlx::query_scalar(query)
            .bind(&now)
            .bind(employee_id)
            .fetch_one(self.pool)
            .await?;

        tracing::warn!(
            "Tentativa falha registrada para {}: {}/{}",
            employee_id,
            attempts,
            max_attempts
        );

        // Bloquear se exceder limite
        if attempts >= max_attempts {
            let locked_until = chrono::Utc::now() + chrono::Duration::minutes(lockout_minutes);

            sqlx::query("UPDATE employees SET locked_until = ?, updated_at = ? WHERE id = ?")
                .bind(locked_until.to_rfc3339())
                .bind(&now)
                .bind(employee_id)
                .execute(self.pool)
                .await?;

            tracing::warn!(
                "Conta {} bloqueada até {}",
                employee_id,
                locked_until.to_rfc3339()
            );

            // Registrar bloqueio em audit_log
            if let Ok(employee) = self.find_by_id(employee_id).await {
                if let Some(emp) = employee {
                    let audit_repo = AuditLogRepository::new(self.pool);
                    let _ = audit_repo
                        .create(CreateAuditLog {
                            action: AuditAction::AccountLocked,
                            employee_id: emp.id.clone(),
                            employee_name: emp.name.clone(),
                            target_type: None,
                            target_id: None,
                            details: Some(format!(
                                "Conta bloqueada até {} após {} tentativas falhas",
                                locked_until.to_rfc3339(),
                                attempts
                            )),
                            ip_address: None,
                        })
                        .await;
                }
            }
        }

        Ok(())
    }

    /// Limpa contador de tentativas falhas após login bem-sucedido
    pub async fn clear_failed_attempts(&self, employee_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query("UPDATE employees SET failed_login_attempts = 0, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(employee_id)
            .execute(self.pool)
            .await?;

        Ok(())
    }

    /// Limpa bloqueio de conta (manual ou expiração)
    pub async fn clear_lockout(&self, employee_id: &str) -> AppResult<()> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE employees SET locked_until = NULL, failed_login_attempts = 0, updated_at = ? WHERE id = ?",
        )
        .bind(&now)
        .bind(employee_id)
        .execute(self.pool)
        .await?;

        tracing::info!("Bloqueio removido para: {}", employee_id);
        Ok(())
    }

    /// Atualiza timestamp de último login
    pub async fn update_last_login(
        &self,
        employee_id: &str,
        ip_address: Option<&str>,
    ) -> AppResult<()> {
        let now = chrono::Utc::now();
        let query = r#"
            UPDATE employees 
            SET last_login_at = ?,
                last_login_ip = ?,
                updated_at = ?
            WHERE id = ?
        "#;

        sqlx::query(query)
            .bind(now.to_rfc3339())
            .bind(ip_address)
            .bind(now.to_rfc3339())
            .bind(employee_id)
            .execute(self.pool)
            .await?;

        Ok(())
    }

    /// Busca configuração do sistema
    async fn get_setting<T>(&self, key: &str) -> AppResult<Option<T>>
    where
        T: std::str::FromStr,
    {
        let value: Option<String> = sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(self.pool)
            .await?;

        Ok(value.and_then(|v| v.parse().ok()))
    }

    /// Verifica se conta está bloqueada
    pub async fn is_account_locked(&self, employee_id: &str) -> AppResult<bool> {
        let locked_until: Option<String> =
            sqlx::query_scalar("SELECT locked_until FROM employees WHERE id = ?")
                .bind(employee_id)
                .fetch_optional(self.pool)
                .await?;

        if let Some(locked_until_str) = locked_until {
            if let Ok(locked_until) = chrono::DateTime::parse_from_rfc3339(&locked_until_str) {
                let now = chrono::Utc::now();
                return Ok(locked_until.with_timezone(&chrono::Utc) > now);
            }
        }

        Ok(false)
    }

    // ════════════════════════════════════════════════════════════════════════
    // GESTÃO DE SENHA
    // ════════════════════════════════════════════════════════════════════════

    /// Altera senha de um funcionário
    ///
    /// Valida:
    /// - Senha antiga correta (se fornecida)
    /// - Nova senha atende política
    /// - Atualiza timestamp de mudança
    pub async fn change_password(
        &self,
        employee_id: &str,
        old_password: Option<&str>,
        new_password: &str,
    ) -> AppResult<()> {
        use crate::utils::crypto::{hash_password, verify_password};

        // Buscar funcionário
        let employee =
            self.find_by_id(employee_id)
                .await?
                .ok_or(crate::error::AppError::NotFoundSimple(
                    "Funcionário não encontrado".to_string(),
                ))?;

        // Verificar senha antiga (se fornecida)
        if let Some(old_pwd) = old_password {
            if let Some(stored_hash) = &employee.password {
                if !verify_password(old_pwd, stored_hash)? {
                    return Err(crate::error::AppError::Validation(
                        "Senha atual incorreta".to_string(),
                    ));
                }
            }
        }

        // Validar nova senha
        self.validate_password_policy(new_password).await?;

        // Gerar hash da nova senha
        let password_hash = hash_password(new_password)?;

        // Atualizar no banco
        let now = chrono::Utc::now();
        sqlx::query(
            r#"
            UPDATE employees 
            SET password = ?,
                password_changed_at = ?,
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(password_hash)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(employee_id)
        .execute(self.pool)
        .await?;

        tracing::info!("Senha alterada para funcionário: {}", employee.name);

        // Registrar mudança de senha em audit_log
        let audit_repo = AuditLogRepository::new(self.pool);
        let _ = audit_repo
            .create(CreateAuditLog {
                action: AuditAction::PasswordChanged,
                employee_id: employee.id.clone(),
                employee_name: employee.name.clone(),
                target_type: None,
                target_id: None,
                details: old_password.map(|_| "Senha alterada pelo usuário".to_string()),
                ip_address: None,
            })
            .await;

        Ok(())
    }

    /// Valida senha contra política configurada
    pub async fn validate_password_policy(&self, password: &str) -> AppResult<()> {
        // Buscar política das configurações
        let min_length: usize = self
            .get_setting("auth.password_min_length")
            .await?
            .unwrap_or(8);
        let require_uppercase: bool = self
            .get_setting::<String>("auth.password_require_uppercase")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let require_lowercase: bool = self
            .get_setting::<String>("auth.password_require_lowercase")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let require_numbers: bool = self
            .get_setting::<String>("auth.password_require_numbers")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let require_special: bool = self
            .get_setting::<String>("auth.password_require_special")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);

        // Validações
        if password.len() < min_length {
            return Err(crate::error::AppError::Validation(format!(
                "Senha deve ter no mínimo {} caracteres",
                min_length
            )));
        }

        if require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            return Err(crate::error::AppError::Validation(
                "Senha deve conter pelo menos uma letra maiúscula".to_string(),
            ));
        }

        if require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
            return Err(crate::error::AppError::Validation(
                "Senha deve conter pelo menos uma letra minúscula".to_string(),
            ));
        }

        if require_numbers && !password.chars().any(|c| c.is_numeric()) {
            return Err(crate::error::AppError::Validation(
                "Senha deve conter pelo menos um número".to_string(),
            ));
        }

        if require_special && !password.chars().any(|c| !c.is_alphanumeric()) {
            return Err(crate::error::AppError::Validation(
                "Senha deve conter pelo menos um caractere especial".to_string(),
            ));
        }

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION DISPATCHER
    // ════════════════════════════════════════════════════════════════════════

    /// Autentica usuário usando as credenciais fornecidas (PIN ou Senha)
    pub async fn authenticate(
        &self,
        credentials: crate::models::auth::LoginCredentials,
    ) -> AppResult<crate::models::auth::AuthResult> {
        use crate::models::auth::{AuthMethod, AuthResult};

        let employee = if let Some(pin) = credentials.pin {
            // Login por PIN
            let emp = self.authenticate_pin(&pin).await?;
            if let Some(e) = emp {
                (e, AuthMethod::Pin)
            } else {
                return Err(crate::error::AppError::InvalidCredentials);
            }
        } else if let Some(password) = credentials.password {
            // Login por Senha
            let username = credentials.username.or(credentials.cpf).ok_or(
                crate::error::AppError::BadRequest(
                    "Username ou CPF é obrigatório para login com senha".to_string(),
                ),
            )?;

            let emp = self.authenticate_password(&username, &password).await?;
            if let Some(e) = emp {
                (e, AuthMethod::Password)
            } else {
                return Err(crate::error::AppError::InvalidCredentials);
            }
        } else {
            return Err(crate::error::AppError::BadRequest(
                "Nenhuma credencial fornecida".to_string(),
            ));
        };

        let (emp_data, method) = employee;

        // Verificar validade de senha se logou com senha
        let requires_change = if method == AuthMethod::Password {
            // Verifica se está marcado para troca
            // TODO: Adicionar campo force_password_change no DB ou deduzir de password_changed_at

            // Verifica expiração
            if let Some(changed_at_str) = &emp_data.password_changed_at {
                if let Ok(changed_at) = chrono::DateTime::parse_from_rfc3339(changed_at_str) {
                    let expiry_days: i64 = self
                        .get_setting("auth.password_expiry_days")
                        .await?
                        .unwrap_or(90);

                    if expiry_days > 0 {
                        let expires_at = changed_at + chrono::Duration::days(expiry_days);
                        expires_at < chrono::Utc::now().fixed_offset()
                    } else {
                        false
                    }
                } else {
                    false
                }
            } else {
                // Nunca trocou -> requer troca (primeiro acesso)
                true
            }
        } else {
            false
        };

        // Gerar token de sessão (placeholder por enquanto)
        let token = None;

        // Timeout de sessão
        let timeout_minutes: i64 = self
            .get_setting("auth.session_timeout_minutes")
            .await?
            .unwrap_or(480);
        let expires_at = Some(chrono::Utc::now() + chrono::Duration::minutes(timeout_minutes));

        Ok(AuthResult {
            employee: Self::decrypt_employee(emp_data).into(),
            token,
            expires_at,
            auth_method: method,
            requires_password_change: requires_change,
        })
    }

    /// Retorna status da conta (verificação se precisa mudar senha)
    pub async fn get_account_status(&self, id: &str) -> AppResult<crate::models::AuthResult> {
        let employee = self.find_by_id(id).await?.ok_or_else(|| {
            crate::error::AppError::NotFoundSimple("Funcionário não encontrado".to_string())
        })?;

        let role_enum = employee
            .role
            .parse::<crate::models::EmployeeRole>()
            .unwrap_or_default();

        let requires_password_change = if matches!(
            role_enum,
            crate::models::EmployeeRole::Admin
                | crate::models::EmployeeRole::Manager
                | crate::models::EmployeeRole::ContractManager
        ) {
            employee.password.is_none()
        } else {
            false
        };

        Ok(crate::models::AuthResult {
            employee: employee.into(),
            token: None,
            expires_at: None,
            auth_method: crate::models::AuthMethod::Pin, // Dummy value
            requires_password_change,
        })
    }

    /// Solicita reset de senha (gera token)
    pub async fn request_password_reset(
        &self,
        email: &str,
    ) -> AppResult<crate::models::auth::PasswordResetResponse> {
        use crate::utils::crypto::generate_reset_token;

        // Buscar funcionário por email
        let query = format!(
            "SELECT {} FROM employees WHERE email = ? AND deleted_at IS NULL",
            Self::COLS
        );
        let employee = sqlx::query_as::<_, Employee>(&query)
            .bind(email)
            .fetch_optional(self.pool)
            .await?
            .ok_or(crate::error::AppError::BadRequest(
                "Funcionário com este email não encontrado".to_string(),
            ))?;

        // Gerar token único
        let token = generate_reset_token();

        // Definir expiração (1 hora padrão)
        let expiry_hours: i64 = self
            .get_setting("auth.reset_token_expiry_hours")
            .await?
            .unwrap_or(1);
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(expiry_hours);

        // Salvar token no banco
        let now = chrono::Utc::now();
        sqlx::query(
            r#"
            UPDATE employees 
            SET password_reset_token = ?,
                password_reset_expires_at = ?,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&token)
        .bind(expires_at.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(&employee.id)
        .execute(self.pool)
        .await?;

        tracing::info!(
            "Token de reset gerado para: {} (expira: {})",
            employee.name,
            expires_at
        );

        // Retornar resposta completa
        Ok(crate::models::auth::PasswordResetResponse {
            token,
            sent_to: Some(email.to_string()), // TODO: Null se email service falhar
            expires_at,
        })
    }

    /// Confirma reset de senha com token
    pub async fn reset_password_with_token(
        &self,
        token: &str,
        new_password: &str,
    ) -> AppResult<()> {
        use crate::utils::crypto::hash_password;

        // Buscar funcionário por token
        let query = format!(
            "SELECT {} FROM employees WHERE password_reset_token = ? AND deleted_at IS NULL",
            Self::COLS
        );
        let employee = sqlx::query_as::<_, Employee>(&query)
            .bind(token)
            .fetch_optional(self.pool)
            .await?
            .ok_or(crate::error::AppError::BadRequest(
                "Token de reset inválido ou expirado".to_string(),
            ))?;

        // Verificar expiração do token
        if let Some(expires_at_str) = employee.password_reset_expires_at {
            if let Ok(expires_at) = chrono::DateTime::parse_from_rfc3339(&expires_at_str) {
                let now = chrono::Utc::now();
                if expires_at.with_timezone(&chrono::Utc) < now {
                    return Err(crate::error::AppError::BadRequest(
                        "Token de reset expirado".to_string(),
                    ));
                }
            }
        }

        // Validar nova senha
        self.validate_password_policy(new_password).await?;

        // Gerar hash
        let password_hash = hash_password(new_password)?;

        // Atualizar senha e limpar token
        let now = chrono::Utc::now();
        sqlx::query(
            r#"
            UPDATE employees 
            SET password = ?,
                password_changed_at = ?,
                password_reset_token = NULL,
                password_reset_expires_at = NULL,
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(password_hash)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(&employee.id)
        .execute(self.pool)
        .await?;

        tracing::info!("Senha resetada via token para: {}", employee.name);

        // Registrar reset de senha em audit_log
        let audit_repo = AuditLogRepository::new(self.pool);
        let _ = audit_repo
            .create(CreateAuditLog {
                action: AuditAction::PasswordResetCompleted,
                employee_id: employee.id.clone(),
                employee_name: employee.name.clone(),
                target_type: None,
                target_id: None,
                details: Some("Senha resetada via token de recuperação".to_string()),
                ip_address: None,
            })
            .await;

        Ok(())
    }

    /// Data Migration: Garante que todos os admins tenham username
    pub async fn migrate_ensure_usernames(&self) -> AppResult<()> {
        // ⚠️ SAFEGUARD: Verificar se a coluna username existe antes de migrar
        // Isso previne crash se a migração Prisma ainda não foi aplicada
        let column_check: Result<Option<i64>, _> = sqlx::query_scalar(
            "SELECT COUNT(*) FROM pragma_table_info('employees') WHERE name = 'username'",
        )
        .fetch_optional(self.pool)
        .await;

        match column_check {
            Ok(Some(1)) => {
                tracing::debug!("Coluna 'username' existe, prosseguindo com migração...");
            }
            Ok(Some(0)) | Ok(None) => {
                tracing::warn!("⚠️ Coluna 'username' não existe ainda. Pulando migração (será executada após aplicar migrations Prisma)");
                return Ok(());
            }
            Ok(Some(_)) => {
                // Valor inesperado, assumir que coluna existe
                tracing::debug!("Valor inesperado para contagem de coluna, prosseguindo...");
            }
            Err(e) => {
                tracing::error!("Erro ao verificar existência da coluna 'username': {:?}", e);
                return Ok(()); // Retorna Ok() para não crashar o app
            }
        }

        // Encontrar admins sem user
        let query = format!(
            "SELECT {} FROM employees WHERE (role = 'ADMIN' OR role = 'MANAGER') AND username IS NULL AND is_active = 1",
            Self::COLS
        );
        let admins = sqlx::query_as::<_, Employee>(&query)
            .fetch_all(self.pool)
            .await?;

        if admins.is_empty() {
            return Ok(());
        }

        tracing::info!(
            "Iniciando migração de usernames para {} admins...",
            admins.len()
        );

        for admin in admins {
            let admin = Self::decrypt_employee(admin);
            let base_user = admin
                .name
                .split_whitespace()
                .next()
                .unwrap_or("admin")
                .to_lowercase();

            // Try formatting username
            let mut username = base_user.clone();
            let mut suffix = 1;

            // Check existence loop
            loop {
                let count: (i64,) =
                    sqlx::query_as("SELECT COUNT(*) FROM employees WHERE username = ?")
                        .bind(&username)
                        .fetch_one(self.pool)
                        .await?;

                if count.0 == 0 {
                    break;
                }

                username = format!("{}{}", base_user, suffix);
                suffix += 1;
            }

            sqlx::query("UPDATE employees SET username = ? WHERE id = ?")
                .bind(&username)
                .bind(&admin.id)
                .execute(self.pool)
                .await?;

            tracing::info!("Admin migrado: {} -> username: {}", admin.name, username);
        }

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

impl<'a> EmployeeRepository<'a> {
    /// Retorna política de senha configurada (método público)
    pub async fn get_password_policy_public(
        &self,
    ) -> AppResult<crate::models::auth::PasswordPolicy> {
        use crate::models::auth::PasswordPolicy;

        let min_length: usize = self
            .get_setting("auth.password_min_length")
            .await?
            .unwrap_or(8);
        let require_uppercase: bool = self
            .get_setting::<String>("auth.password_require_uppercase")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let require_lowercase: bool = self
            .get_setting::<String>("auth.password_require_lowercase")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let require_numbers: bool = self
            .get_setting::<String>("auth.password_require_numbers")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let require_special: bool = self
            .get_setting::<String>("auth.password_require_special")
            .await?
            .map(|v| v == "true")
            .unwrap_or(true);
        let max_age_days: u32 = self
            .get_setting("auth.password_expiry_days")
            .await?
            .unwrap_or(90);
        let prevent_reuse: usize = self
            .get_setting("auth.password_prevent_reuse")
            .await?
            .unwrap_or(3);

        Ok(PasswordPolicy {
            min_length,
            require_uppercase,
            require_lowercase,
            require_numbers,
            require_special,
            expiry_days: max_age_days,
            prevent_reuse_count: prevent_reuse,
        })
    }

    /// Verifica se senha está expirada (método público)
    pub async fn is_password_expired(&self, employee: &Employee) -> AppResult<bool> {
        if let Some(changed_at_str) = &employee.password_changed_at {
            if let Ok(changed_at) = chrono::DateTime::parse_from_rfc3339(changed_at_str) {
                let expiry_days: i64 = self
                    .get_setting("auth.password_expiry_days")
                    .await?
                    .unwrap_or(90);

                if expiry_days > 0 {
                    let expires_at = changed_at + chrono::Duration::days(expiry_days);
                    return Ok(expires_at < chrono::Utc::now().fixed_offset());
                }
            }
        }
        Ok(false)
    }
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
