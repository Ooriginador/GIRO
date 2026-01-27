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
                return Err(crate::error::AppError::Validation(
                    "E-mail inválido".into(),
                ));
            }
        }

        // CPF: se fornecido, validar e verificar duplicidade
        if let Some(ref new_cpf) = data.cpf {
            if !new_cpf.is_empty() {
                if !is_valid_cpf(new_cpf) {
                    return Err(crate::error::AppError::Validation(
                        "CPF inválido".into(),
                    ));
                }
                // Verificar duplicidade (excluindo o próprio funcionário)
                if let Some(existing_with_cpf) = self.find_by_cpf(new_cpf).await? {
                    if existing_with_cpf.id != id && existing_with_cpf.is_active {
                        return Err(crate::error::AppError::Duplicate(
                            format!("CPF '{}' já está cadastrado para outro funcionário", mask_cpf(new_cpf)),
                        ));
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

        // Tenta Argon2 (sincronizado do servidor)
        let employees = self.find_all_active().await?;
        for emp in employees {
            if let Some(stored_hash) = &emp.password {
                if let Ok(parsed) = PasswordHash::new(stored_hash) {
                    let argon2 = Argon2::default();
                    if argon2.verify_password(pin.as_bytes(), &parsed).is_ok() {
                        // Re-hash o PIN usando o novo método e atualize o registro
                        let new_pin_hash = hash_pin(pin);
                        let now = chrono::Utc::now().to_rfc3339();
                        let _ = sqlx::query(
                            "UPDATE employees SET pin = ?, updated_at = ? WHERE id = ?",
                        )
                        .bind(&new_pin_hash)
                        .bind(&now)
                        .bind(&emp.id)
                        .execute(self.pool)
                        .await;
                        return Ok(Some(emp));
                    }
                }
            }
        }

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
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/// Hash do PIN usando SHA256 (compatível com seed do Prisma)
fn hash_pin(pin: &str) -> String {
    // Deterministic HMAC-SHA256 using PIN_HMAC_KEY env var for lookup-friendly PIN hashing
    type HmacSha256 = Hmac<Sha256>;

    let key = get_or_create_hmac_key();

    let mut mac =
        HmacSha256::new_from_slice(key.as_bytes()).expect("HMAC can take key of any size");
    mac.update(pin.as_bytes());
    let result = mac.finalize();
    let bytes = result.into_bytes();
    hex::encode(bytes)
}

/// Obtém ou cria a chave HMAC para hash de PIN
/// Prioridade: 1) variável de ambiente, 2) arquivo de configuração, 3) gera nova chave
fn get_or_create_hmac_key() -> String {
    // 1. Tentar obter da variável de ambiente
    if let Ok(key) = std::env::var("PIN_HMAC_KEY") {
        if !key.is_empty() {
            return key;
        }
    }

    // 2. Tentar ler do arquivo de configuração
    let key_file = get_hmac_key_path();
    if let Ok(key) = std::fs::read_to_string(&key_file) {
        let key = key.trim().to_string();
        if !key.is_empty() {
            tracing::info!("PIN_HMAC_KEY carregada do arquivo de configuração");
            return key;
        }
    }

    // 3. Gerar nova chave e salvar
    tracing::warn!("PIN_HMAC_KEY não encontrada, gerando nova chave...");
    let new_key = generate_hmac_key();

    // Tentar salvar no arquivo
    if let Some(parent) = key_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Err(e) = std::fs::write(&key_file, &new_key) {
        tracing::error!(
            "Falha ao salvar PIN_HMAC_KEY: {}. Os PINs podem ser invalidados!",
            e
        );
    } else {
        tracing::info!("PIN_HMAC_KEY gerada e salva em: {:?}", key_file);
    }

    new_key
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
    for i in 0..9 {
        sum += digits[i] * (10 - i as u32);
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
    for i in 0..10 {
        sum += digits[i] * (11 - i as u32);
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
