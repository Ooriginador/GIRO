//! Extensões de Autenticação para EmployeeRepository
//!
//! Implementa funções de autenticação dual (PIN + Senha) e gestão de segurança

use super::EmployeeRepository;
use crate::error::{AppError, AppResult};
use crate::models::auth::{
    AccountStatus, AuthMethod, AuthResult, LoginCredentials, PasswordPolicy, PasswordResetResponse,
    SafeEmployee,
};
use crate::models::Employee;
use crate::utils::crypto::{generate_reset_token, hash_password, verify_password};
use chrono::{DateTime, Duration, Utc};

// ════════════════════════════════════════════════════════════════════════════
// AUTENTICAÇÃO DUAL
// ════════════════════════════════════════════════════════════════════════════

impl<'a> EmployeeRepository<'a> {
    /// Autentica funcionário com credenciais flexíveis
    ///
    /// Suporta 3 métodos:
    /// 1. PIN apenas (operadores)
    /// 2. Username + Senha (admins)
    /// 3. CPF + Senha (fallback)
    pub async fn authenticate(&self, credentials: LoginCredentials) -> AppResult<AuthResult> {
        // Validar credenciais
        credentials.validate().map_err(|e| AppError::ValidationError(e))?;

        let auth_method = credentials.auth_method();

        // Tentar autenticação conforme método
        let employee = match auth_method {
            AuthMethod::Pin => self.authenticate_pin(credentials.pin.unwrap().as_str()).await?,
            AuthMethod::Password => {
                if let Some(username) = credentials.username {
                    self.authenticate_password(&username, credentials.password.unwrap().as_str())
                        .await?
                } else if let Some(cpf) = credentials.cpf {
                    self.authenticate_password_by_cpf(&cpf, credentials.password.unwrap().as_str())
                        .await?
                } else {
                    return Err(AppError::ValidationError(
                        "Username ou CPF obrigatório para login com senha".to_string(),
                    ));
                }
            }
        };

        let employee = employee.ok_or(AppError::Unauthorized(
            "Credenciais inválidas".to_string(),
        ))?;

        // Verificar se conta está bloqueada
        if self.is_account_locked(&employee.id).await? {
            let status = self.get_account_status(&employee.id).await?;
            return Err(AppError::Unauthorized(format!(
                "Conta bloqueada por {} tentativas falhadas. Tente novamente em {} segundos",
                status.failed_attempts,
                status.lockout_remaining_seconds.unwrap_or(0)
            )));
        }

        // Verificar se senha expirou (apenas para login com senha)
        let requires_password_change = if auth_method == AuthMethod::Password {
            self.password_expired(&employee.id).await?
        } else {
            false
        };

        // Limpar tentativas falhadas
        self.clear_failed_attempts(&employee.id).await?;

        // Atualizar último login
        self.update_last_login(&employee.id, None).await?;

        Ok(AuthResult {
            employee: SafeEmployee::from(employee),
            token: None, // JWT futuro
            expires_at: Some(Utc::now() + Duration::hours(8)), // Session timeout
            auth_method,
            requires_password_change,
        })
    }

    /// Autenticação por username + senha
    pub async fn authenticate_password(
        &self,
        username: &str,
        password: &str,
    ) -> AppResult<Option<Employee>> {
        let query = format!(
            "SELECT {} FROM employees WHERE username = ? AND is_active = 1",
            Self::COLS
        );

        let employee = sqlx::query_as::<_, Employee>(&query)
            .bind(username.to_lowercase())
            .fetch_optional(self.pool)
            .await?;

        if let Some(emp) = employee {
            // Verificar se tem senha configurada
            let password_hash = emp
                .password
                .as_ref()
                .ok_or(AppError::Unauthorized("Senha não configurada".to_string()))?;

            // Verificar senha
            let valid = verify_password(password, password_hash)?;

            if valid {
                Ok(Some(Self::decrypt_employee(emp)))
            } else {
                // Registrar tentativa falhada
                self.record_failed_attempt(username).await?;
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    /// Autenticação por CPF + senha (fallback)
    pub async fn authenticate_password_by_cpf(
        &self,
        cpf: &str,
        password: &str,
    ) -> AppResult<Option<Employee>> {
        // Buscar por CPF (já tem suporte a PII)
        let employee = self.find_by_cpf(cpf).await?;

        if let Some(emp) = employee {
            // Verificar se tem senha configurada
            let password_hash = emp
                .password
                .as_ref()
                .ok_or(AppError::Unauthorized("Senha não configurada".to_string()))?;

            // Verificar senha
            let valid = verify_password(password, password_hash)?;

            if valid {
                Ok(Some(emp))
            } else {
                // Registrar tentativa falhada
                self.record_failed_attempt(cpf).await?;
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// GESTÃO DE SENHA
// ════════════════════════════════════════════════════════════════════════════

impl<'a> EmployeeRepository<'a> {
    /// Valida senha conforme política configurada
    pub async fn validate_password_policy(&self, password: &str) -> AppResult<()> {
        let policy = self.get_password_policy().await?;
        policy
            .validate(password)
            .map_err(|errors| AppError::ValidationError(errors.join("; ")))?;
        Ok(())
    }

    /// Carrega política de senha das configurações
    async fn get_password_policy(&self) -> AppResult<PasswordPolicy> {
        let min_length = self
            .get_setting_or_default("auth.password_min_length", "8")
            .await?
            .parse()
            .unwrap_or(8);

        let require_uppercase = self
            .get_setting_or_default("auth.password_require_uppercase", "true")
            .await?
            == "true";

        let require_lowercase = self
            .get_setting_or_default("auth.password_require_lowercase", "true")
            .await?
            == "true";

        let require_numbers = self
            .get_setting_or_default("auth.password_require_numbers", "true")
            .await?
            == "true";

        let require_special = self
            .get_setting_or_default("auth.password_require_special", "false")
            .await?
            == "true";

        let expiry_days = self
            .get_setting_or_default("auth.password_expiry_days", "90")
            .await?
            .parse()
            .unwrap_or(90);

        Ok(PasswordPolicy {
            min_length,
            require_uppercase,
            require_lowercase,
            require_numbers,
            require_special,
            expiry_days,
            prevent_reuse_count: 3,
        })
    }

    /// Helper para buscar setting com default
    async fn get_setting_or_default(&self, key: &str, default: &str) -> AppResult<String> {
        let result = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(self.pool)
            .await?;

        Ok(result.unwrap_or_else(|| default.to_string()))
    }

    /// Altera senha de funcionário
    pub async fn change_password(
        &self,
        employee_id: &str,
        current_password: Option<&str>,
        new_password: &str,
    ) -> AppResult<()> {
        // Validar nova senha
        self.validate_password_policy(new_password).await?;

        // Buscar funcionário
        let employee = self
            .find_by_id(employee_id)
            .await?
            .ok_or(AppError::NotFound("Funcionário não encontrado".to_string()))?;

        // Se forneceu senha atual, verificar
        if let Some(current) = current_password {
            let current_hash = employee
                .password
                .as_ref()
                .ok_or(AppError::Unauthorized("Senha não configurada".to_string()))?;

            let valid = verify_password(current, current_hash)?;
            if !valid {
                return Err(AppError::Unauthorized("Senha atual incorreta".to_string()));
            }
        }

        // Gerar novo hash
        let new_hash = hash_password(new_password)?;
        let now = Utc::now().to_rfc3339();

        // Atualizar banco
        sqlx::query(
            "UPDATE employees 
             SET password = ?, password_changed_at = ?, updated_at = ?
             WHERE id = ?",
        )
        .bind(&new_hash)
        .bind(&now)
        .bind(&now)
        .bind(employee_id)
        .execute(self.pool)
        .await?;

        tracing::info!("Password changed for employee {}", employee_id);

        Ok(())
    }

    /// Solicita reset de senha (gera token)
    pub async fn request_password_reset(&self, email: &str) -> AppResult<PasswordResetResponse> {
        // Buscar funcionário por email
        let query = format!(
            "SELECT {} FROM employees WHERE email = ? AND is_active = 1",
            Self::COLS
        );

        let employee = sqlx::query_as::<_, Employee>(&query)
            .bind(email.to_lowercase())
            .fetch_optional(self.pool)
            .await?
            .ok_or(AppError::NotFound("Email não encontrado".to_string()))?;

        // Gerar token único
        let token = generate_reset_token();
        let expires_at = Utc::now() + Duration::hours(1); // Token válido por 1 hora

        // Salvar token no banco
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE employees 
             SET password_reset_token = ?, 
                 password_reset_expires = ?, 
                 updated_at = ?
             WHERE id = ?",
        )
        .bind(&token)
        .bind(expires_at.to_rfc3339())
        .bind(&now)
        .bind(&employee.id)
        .execute(self.pool)
        .await?;

        tracing::info!(
            "Password reset requested for employee {} ({})",
            employee.id,
            email
        );

        Ok(PasswordResetResponse {
            token,
            sent_to: Some(email.to_string()),
            expires_at,
        })
    }

    /// Confirma reset de senha com token
    pub async fn reset_password_with_token(
        &self,
        token: &str,
        new_password: &str,
    ) -> AppResult<()> {
        // Validar nova senha
        self.validate_password_policy(new_password).await?;

        // Buscar funcionário pelo token
        let query = format!(
            "SELECT {} FROM employees 
             WHERE password_reset_token = ? 
               AND is_active = 1",
            Self::COLS
        );

        let employee = sqlx::query_as::<_, Employee>(&query)
            .bind(token)
            .fetch_optional(self.pool)
            .await?
            .ok_or(AppError::Unauthorized("Token inválido".to_string()))?;

        // Verificar se token expirou
        if let Some(expires) = employee.password_reset_expires {
            let expires_dt = DateTime::parse_from_rfc3339(&expires)
                .map_err(|e| AppError::Internal(format!("Data inválida: {}", e)))?
                .with_timezone(&Utc);

            if Utc::now() > expires_dt {
                return Err(AppError::Unauthorized("Token expirado".to_string()));
            }
        }

        // Gerar novo hash
        let new_hash = hash_password(new_password)?;
        let now = Utc::now().to_rfc3339();

        // Atualizar senha e limpar token
        sqlx::query(
            "UPDATE employees 
             SET password = ?, 
                 password_changed_at = ?,
                 password_reset_token = NULL,
                 password_reset_expires = NULL,
                 failed_login_attempts = 0,
                 locked_until = NULL,
                 updated_at = ?
             WHERE id = ?",
        )
        .bind(&new_hash)
        .bind(&now)
        .bind(&now)
        .bind(&employee.id)
        .execute(self.pool)
        .await?;

        tracing::info!("Password reset completed for employee {}", employee.id);

        Ok(())
    }

    /// Verifica se senha expirou
    async fn password_expired(&self, employee_id: &str) -> AppResult<bool> {
        let policy = self.get_password_policy().await?;

        if policy.expiry_days == 0 {
            return Ok(false); // Senha nunca expira
        }

        let query = "SELECT password_changed_at FROM employees WHERE id = ?";
        let changed_at = sqlx::query_scalar::<_, Option<String>>(query)
            .bind(employee_id)
            .fetch_one(self.pool)
            .await?;

        if let Some(changed) = changed_at {
            let changed_dt = DateTime::parse_from_rfc3339(&changed)
                .map_err(|e| AppError::Internal(format!("Data inválida: {}", e)))?
                .with_timezone(&Utc);

            let expiry_date = changed_dt + Duration::days(policy.expiry_days as i64);

            Ok(Utc::now() > expiry_date)
        } else {
            Ok(true) // Nunca trocou senha = expirado
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SEGURANÇA & LOCKOUT
// ════════════════════════════════════════════════════════════════════════════

impl<'a> EmployeeRepository<'a> {
    /// Registra tentativa de login falhada
    pub async fn record_failed_attempt(&self, identifier: &str) -> AppResult<()> {
        // Buscar por username ou CPF
        let query = format!(
            "SELECT id, failed_login_attempts FROM employees 
             WHERE (username = ? OR cpf = ?) AND is_active = 1"
        );

        let result: Option<(String, i32)> = sqlx::query_as(&query)
            .bind(identifier)
            .bind(identifier)
            .fetch_optional(self.pool)
            .await?;

        if let Some((id, current_attempts)) = result {
            let new_attempts = current_attempts + 1;
            let now = Utc::now().to_rfc3339();

            // Buscar limite de tentativas
            let max_attempts = self
                .get_setting_or_default("auth.max_failed_attempts", "5")
                .await?
                .parse()
                .unwrap_or(5);

            // Se atingiu limite, bloquear conta
            let locked_until = if new_attempts >= max_attempts {
                let lockout_minutes = self
                    .get_setting_or_default("auth.lockout_duration_minutes", "15")
                    .await?
                    .parse()
                    .unwrap_or(15);

                Some((Utc::now() + Duration::minutes(lockout_minutes)).to_rfc3339())
            } else {
                None
            };

            // Atualizar banco
            sqlx::query(
                "UPDATE employees 
                 SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
                 WHERE id = ?",
            )
            .bind(new_attempts)
            .bind(&locked_until)
            .bind(&now)
            .bind(&id)
            .execute(self.pool)
            .await?;

            if locked_until.is_some() {
                tracing::warn!(
                    "Account {} locked due to {} failed attempts",
                    id,
                    new_attempts
                );
            }
        }

        Ok(())
    }

    /// Limpa tentativas falhadas após login bem-sucedido
    pub async fn clear_failed_attempts(&self, employee_id: &str) -> AppResult<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE employees 
             SET failed_login_attempts = 0, locked_until = NULL, updated_at = ?
             WHERE id = ?",
        )
        .bind(&now)
        .bind(employee_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }

    /// Verifica se conta está bloqueada
    pub async fn is_account_locked(&self, employee_id: &str) -> AppResult<bool> {
        let query = "SELECT locked_until FROM employees WHERE id = ?";
        let locked_until = sqlx::query_scalar::<_, Option<String>>(query)
            .bind(employee_id)
            .fetch_one(self.pool)
            .await?;

        if let Some(locked) = locked_until {
            let locked_dt = DateTime::parse_from_rfc3339(&locked)
                .map_err(|e| AppError::Internal(format!("Data inválida: {}", e)))?
                .with_timezone(&Utc);

            Ok(Utc::now() < locked_dt)
        } else {
            Ok(false)
        }
    }

    /// Retorna status da conta (para UI)
    pub async fn get_account_status(&self, employee_id: &str) -> AppResult<AccountStatus> {
        let query = "SELECT failed_login_attempts, locked_until FROM employees WHERE id = ?";
        let result: Option<(i32, Option<String>)> = sqlx::query_as(query)
            .bind(employee_id)
            .fetch_optional(self.pool)
            .await?;

        let max_attempts = self
            .get_setting_or_default("auth.max_failed_attempts", "5")
            .await?
            .parse()
            .unwrap_or(5);

        if let Some((failed_attempts, locked_until)) = result {
            let (is_locked, locked_until_dt, remaining) = if let Some(locked) = locked_until {
                let locked_dt = DateTime::parse_from_rfc3339(&locked)
                    .map_err(|e| AppError::Internal(format!("Data inválida: {}", e)))?
                    .with_timezone(&Utc);

                let now = Utc::now();
                let is_locked = now < locked_dt;
                let remaining = if is_locked {
                    Some((locked_dt - now).num_seconds())
                } else {
                    None
                };

                (is_locked, Some(locked_dt), remaining)
            } else {
                (false, None, None)
            };

            Ok(AccountStatus {
                is_locked,
                locked_until: locked_until_dt,
                failed_attempts: failed_attempts as u32,
                max_attempts: max_attempts as u32,
                lockout_remaining_seconds: remaining,
            })
        } else {
            Err(AppError::NotFound("Funcionário não encontrado".to_string()))
        }
    }

    /// Atualiza timestamp de último login
    pub async fn update_last_login(
        &self,
        employee_id: &str,
        ip_address: Option<&str>,
    ) -> AppResult<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE employees 
             SET last_login_at = ?, last_login_ip = ?, updated_at = ?
             WHERE id = ?",
        )
        .bind(&now)
        .bind(ip_address)
        .bind(&now)
        .bind(employee_id)
        .execute(self.pool)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Testes serão adicionados após integração completa
    // TODO: test_authenticate_pin
    // TODO: test_authenticate_password
    // TODO: test_account_lockout
    // TODO: test_password_reset_flow
    // TODO: test_password_policy_validation
}
