//! Auth Service
//!
//! Authentication and authorization business logic.

use chrono::{Duration, Utc};
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::net::IpAddr;
use std::sync::Arc;
use uuid::Uuid;

use crate::config::Settings;
use crate::dto::auth::{LoginResponse, RegisterResponse};
use crate::errors::{AppError, AppResult};
use crate::models::{Admin, AdminSummary, AuditAction};
use crate::repositories::{AdminRepository, AuditRepository, RefreshTokenRepository};
use crate::utils::{
    encode_access_token, generate_refresh_token, hash_password, hash_token, verify_password,
    AccessTokenClaims,
};

pub struct AuthService {
    db: PgPool,
    redis: ConnectionManager,
    settings: Arc<Settings>,
}

impl AuthService {
    pub fn new(db: PgPool, redis: ConnectionManager, settings: Arc<Settings>) -> Self {
        Self { db, redis, settings }
    }

    fn admin_repo(&self) -> AdminRepository {
        AdminRepository::new(self.db.clone())
    }

    fn token_repo(&self) -> RefreshTokenRepository {
        RefreshTokenRepository::new(self.db.clone())
    }

    fn audit_repo(&self) -> AuditRepository {
        AuditRepository::new(self.db.clone())
    }

    /// Register a new admin
    pub async fn register(
        &self,
        email: &str,
        password: &str,
        name: &str,
        phone: Option<&str>,
        company_name: Option<&str>,
        license_key: Option<&str>,
    ) -> AppResult<RegisterResponse> {
        let email = email.to_lowercase();
        let admin_repo = self.admin_repo();

        // Check if email exists
        if admin_repo.email_exists(&email).await? {
            return Err(AppError::Conflict("Email já cadastrado".to_string()));
        }

        // If license_key provided, validate it exists and is available for linking
        if let Some(key) = license_key {
            let license_repo = crate::repositories::LicenseRepository::new(self.db.clone());
            let license = license_repo
                .find_by_key(key)
                .await?
                .ok_or_else(|| AppError::BadRequest("Chave de licença inválida".to_string()))?;
            
            // Check if license is already activated (has hardware linked or is active)
            if license.status == crate::models::LicenseStatus::Active || !license.hardware.is_empty() {
                return Err(AppError::BadRequest("Esta chave de licença já está em uso".to_string()));
            }
        }

        // Hash password
        let password_hash = hash_password(password)?;

        // Create admin
        let admin = admin_repo
            .create(&email, &password_hash, name, phone, company_name, None, None, None, None)
            .await?;

        // If license_key provided, link it to the new admin
        if let Some(key) = license_key {
            let license_repo = crate::repositories::LicenseRepository::new(self.db.clone());
            if let Ok(Some(license)) = license_repo.find_by_key(key).await {
                // Link the license to the admin
                let _ = license_repo.assign_to_admin(license.id, admin.id).await;
                tracing::info!("🔑 License {} linked to new admin {}", key, admin.id);
            }
        }

        Ok(RegisterResponse {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            company_name: admin.company_name,
            created_at: admin.created_at.unwrap_or_else(chrono::Utc::now),
            message: if license_key.is_some() {
                "Conta criada com sucesso e licença vinculada".to_string()
            } else {
                "Conta criada com sucesso".to_string()
            },
        })
    }

    /// Login an admin
    pub async fn login(
        &self,
        email: &str,
        password: &str,
        ip_address: Option<IpAddr>,
        user_agent: Option<&str>,
    ) -> AppResult<LoginResponse> {
        let email = email.to_lowercase();
        let admin_repo = self.admin_repo();
        let token_repo = self.token_repo();
        let audit_repo = self.audit_repo();
        let jwt_secret = &self.settings.jwt.secret;
        let jwt_expiration = self.settings.jwt.expiration;

        // Find admin
        let admin = admin_repo
            .find_by_email(&email)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Credenciais inválidas".to_string()))?;

        // Check if active
        if !admin.is_active.unwrap_or(true) {
            return Err(AppError::Unauthorized("Conta desativada".to_string()));
        }

        // Verify password
        if !verify_password(password, &admin.password_hash)? {
            // Log failed attempt
            audit_repo
                .log(
                    AuditAction::LoginFailed,
                    Some(admin.id),
                    None,
                    ip_address.map(|ip| ip.to_string()),
                    serde_json::json!({ "email": &email }),
                )
                .await?;

            return Err(AppError::Unauthorized("Credenciais inválidas".to_string()));
        }

        // Generate tokens
        let access_claims = AccessTokenClaims::new(admin.id, &admin.email, jwt_expiration);
        let access_token = encode_access_token(&access_claims, jwt_secret)?;

        let refresh_token = generate_refresh_token();
        let refresh_token_hash = hash_token(&refresh_token);
        let refresh_expires = Utc::now() + Duration::days(30);

        // Convert IP to IpNetwork
        let ip_str = ip_address.map(|ip| ip.to_string());

        // Store refresh token
        token_repo
            .create(
                admin.id,
                &refresh_token_hash,
                refresh_expires,
                None,
                ip_str.as_deref(),
                user_agent,
            )
            .await?;

        // Log login
        audit_repo
            .log(
                AuditAction::Login,
                Some(admin.id),
                None,
                ip_str,
                serde_json::json!({}),
            )
            .await?;

        Ok(LoginResponse::new(
            access_token,
            refresh_token,
            jwt_expiration,
            AdminSummary::from(admin),
        ))
    }

    /// Refresh access token
    pub async fn refresh_token(&self, refresh_token: &str) -> AppResult<(String, i64)> {
        let token_repo = self.token_repo();
        let admin_repo = self.admin_repo();
        let jwt_secret = &self.settings.jwt.secret;
        let jwt_expiration = self.settings.jwt.expiration;

        let token_hash = hash_token(refresh_token);

        // Find and validate token
        let stored = token_repo
            .find_by_hash(&token_hash)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Token inválido ou expirado".to_string()))?;

        // Get admin
        let admin = admin_repo
            .find_by_id(stored.admin_id)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Admin não encontrado".to_string()))?;

        if !admin.is_active.unwrap_or(true) {
            return Err(AppError::Unauthorized("Conta desativada".to_string()));
        }

        // Generate new access token
        let claims = AccessTokenClaims::new(admin.id, &admin.email, jwt_expiration);
        let access_token = encode_access_token(&claims, jwt_secret)?;

        Ok((access_token, jwt_expiration))
    }

    /// Logout (revoke refresh token)
    pub async fn logout(&self, refresh_token: &str) -> AppResult<()> {
        let token_repo = self.token_repo();
        let token_hash = hash_token(refresh_token);
        token_repo.revoke_by_hash(&token_hash).await?;
        Ok(())
    }

    /// Logout from all devices
    pub async fn logout_all(&self, admin_id: Uuid) -> AppResult<u64> {
        self.token_repo().revoke_all_for_admin(admin_id).await
    }

    /// Validate access token and return claims
    pub fn validate_access_token(&self, token: &str) -> AppResult<AccessTokenClaims> {
        crate::utils::decode_access_token(token, &self.settings.jwt.secret)
    }

    /// Get admin by ID
    pub async fn get_admin(&self, id: Uuid) -> AppResult<Option<Admin>> {
        self.admin_repo().find_by_id(id).await
    }

    /// Request password reset - generates a token and stores it in Redis
    pub async fn forgot_password(&self, email: &str) -> AppResult<()> {
        use redis::AsyncCommands;
        
        let email = email.to_lowercase();
        let admin_repo = self.admin_repo();
        
        // Find admin (don't reveal if email exists or not for security)
        let admin = admin_repo.find_by_email(&email).await?;
        
        if let Some(admin) = admin {
            // Generate reset token
            let reset_token = generate_refresh_token(); // reuse the secure token generator
            let token_hash = hash_token(&reset_token);
            
            // Store in Redis with 1 hour expiration
            let key = format!("password_reset:{}", token_hash);
            let mut conn = self.redis.clone();
            let _: () = conn
                .set_ex(&key, admin.id.to_string(), 3600) // 1 hour
                .await
                .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;
            
            // Log the action
            self.audit_repo()
                .log(
                    AuditAction::PasswordReset,
                    Some(admin.id),
                    None,
                    None,
                    serde_json::json!({ "action": "requested" }),
                )
                .await?;
            
            // Note: Email is sent by the route handler using EmailService
            // Return the token for the handler to use
            tracing::info!(
                "🔐 Password reset requested for: {}",
                &email
            );
        }
        
        // Always return success to prevent email enumeration
        Ok(())
    }

    /// Generate password reset token and return it (for handler to send email)
    pub async fn generate_reset_token(&self, email: &str) -> AppResult<Option<(String, String)>> {
        use redis::AsyncCommands;
        
        let email = email.to_lowercase();
        let admin_repo = self.admin_repo();
        
        // Find admin
        let admin = admin_repo.find_by_email(&email).await?;
        
        if let Some(admin) = admin {
            // Generate reset token
            let reset_token = generate_refresh_token();
            let token_hash = hash_token(&reset_token);
            
            // Store in Redis with 1 hour expiration
            let key = format!("password_reset:{}", token_hash);
            let mut conn = self.redis.clone();
            let _: () = conn
                .set_ex(&key, admin.id.to_string(), 3600)
                .await
                .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;
            
            // Log the action
            self.audit_repo()
                .log(
                    AuditAction::PasswordReset,
                    Some(admin.id),
                    None,
                    None,
                    serde_json::json!({ "action": "token_generated" }),
                )
                .await?;
            
            return Ok(Some((reset_token, admin.name)));
        }
        
        Ok(None)
    }

    /// Reset password using the token
    pub async fn reset_password(&self, token: &str, new_password: &str) -> AppResult<()> {
        use redis::AsyncCommands;
        
        let admin_repo = self.admin_repo();
        let token_hash = hash_token(token);
        let key = format!("password_reset:{}", token_hash);
        
        // Get admin_id from Redis
        let mut conn = self.redis.clone();
        let admin_id_str: Option<String> = conn
            .get(&key)
            .await
            .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;
        
        let admin_id_str = admin_id_str
            .ok_or_else(|| AppError::BadRequest("Token inválido ou expirado".to_string()))?;
        
        let admin_id: Uuid = admin_id_str
            .parse()
            .map_err(|_| AppError::Internal("Invalid UUID in reset token".to_string()))?;
        
        // Update password
        let password_hash = hash_password(new_password)?;
        admin_repo.update_password(admin_id, &password_hash).await?;
        
        // Delete the token from Redis
        let _: () = conn
            .del(&key)
            .await
            .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;
        
        // Revoke all existing sessions for security
        self.token_repo().revoke_all_for_admin(admin_id).await?;
        
        // Log the action
        self.audit_repo()
            .log(
                AuditAction::PasswordReset,
                Some(admin_id),
                None,
                None,
                serde_json::json!({ "action": "completed" }),
            )
            .await?;
        
        tracing::info!("🔐 Password reset completed for admin {}", admin_id);
        
        Ok(())
    }

    /// Change password (for logged-in users)
    pub async fn change_password(
        &self,
        admin_id: Uuid,
        current_password: &str,
        new_password: &str,
    ) -> AppResult<()> {
        let admin_repo = self.admin_repo();
        
        // Get admin
        let admin = admin_repo
            .find_by_id(admin_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Admin não encontrado".to_string()))?;
        
        // Verify current password
        if !verify_password(current_password, &admin.password_hash)? {
            return Err(AppError::BadRequest("Senha atual incorreta".to_string()));
        }
        
        // Update password
        let password_hash = hash_password(new_password)?;
        admin_repo.update_password(admin_id, &password_hash).await?;
        
        // Optionally revoke other sessions
        // self.token_repo().revoke_all_for_admin(admin_id).await?;
        
        Ok(())
    }

    pub async fn update_profile(
        &self,
        admin_id: Uuid,
        name: Option<String>,
        phone: Option<String>,
        company_name: Option<String>,
        company_cnpj: Option<String>,
        company_address: Option<String>,
        company_city: Option<String>,
        company_state: Option<String>,
    ) -> AppResult<Admin> {
        let admin_repo = self.admin_repo();
        
        admin_repo
            .update_profile(
                admin_id, 
                name.as_deref(), 
                phone.as_deref(), 
                company_name.as_deref(),
                company_cnpj.as_deref(),
                company_address.as_deref(),
                company_city.as_deref(),
                company_state.as_deref(),
            )
            .await
    }
}
