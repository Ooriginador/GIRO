//! Admin Repository
//!
//! Database operations for admin accounts.

use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::Admin;

pub struct AdminRepository {
    pool: PgPool,
}

impl AdminRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find admin by ID
    pub async fn find_by_id(&self, id: Uuid) -> AppResult<Option<Admin>> {
        let admin = sqlx::query_as::<_, Admin>(
            r#"
            SELECT 
                id, email, password_hash, name, role, phone, company_name,
                company_cnpj, company_address, company_address_city, company_address_state,
                is_verified, 
                verified_at, 
                totp_secret, 
                totp_enabled,
                is_active, 
                created_at, 
                updated_at, 
                deleted_at
            FROM admins
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(admin)
    }

    /// Find admin by email
    pub async fn find_by_email(&self, email: &str) -> AppResult<Option<Admin>> {
        let admin = sqlx::query_as::<_, Admin>(
            r#"
            SELECT 
                id, email, password_hash, name, role, phone, company_name,
                company_cnpj, company_address, company_address_city, company_address_state,
                is_verified, 
                verified_at, 
                totp_secret, 
                totp_enabled,
                is_active, 
                created_at, 
                updated_at, 
                deleted_at
            FROM admins
            WHERE email = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(admin)
    }

    /// Create new admin
    pub async fn create(
        &self,
        email: &str,
        password_hash: &str,
        name: &str,
        phone: Option<&str>,
        company_name: Option<&str>,
        company_cnpj: Option<&str>,
        company_address: Option<&str>,
        company_city: Option<&str>,
        company_state: Option<&str>,
    ) -> AppResult<Admin> {
        let admin = sqlx::query_as::<_, Admin>(
            r#"
            INSERT INTO admins (email, password_hash, name, role, phone, company_name, company_cnpj, company_address, company_address_city, company_address_state)
            VALUES ($1, $2, $3, 'customer', $4, $5, $6, $7, $8, $9)
            RETURNING 
                id, email, password_hash, name, role, phone, company_name,
                company_cnpj, company_address, company_address_city, company_address_state,
                is_verified, 
                verified_at, 
                totp_secret, 
                totp_enabled,
                is_active, 
                created_at, 
                updated_at, 
                deleted_at
            "#,
        )
        .bind(email)
        .bind(password_hash)
        .bind(name)
        .bind(phone)
        .bind(company_name)
        .bind(company_cnpj)
        .bind(company_address)
        .bind(company_city)
        .bind(company_state)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                AppError::Conflict("Email já cadastrado".to_string())
            }
            _ => e.into(),
        })?;

        Ok(admin)
    }

    /// Update admin verification status
    pub async fn set_verified(&self, id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE admins
            SET is_verified = TRUE, verified_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update admin password
    pub async fn update_password(&self, id: Uuid, password_hash: &str) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE admins
            SET password_hash = $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(password_hash)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update admin profile
    pub async fn update_profile(
        &self,
        id: Uuid,
        name: Option<&str>,
        phone: Option<&str>,
        company_name: Option<&str>,
        company_cnpj: Option<&str>,
        company_address: Option<&str>,
        company_city: Option<&str>,
        company_state: Option<&str>,
    ) -> AppResult<Admin> {
        let admin = sqlx::query_as::<_, Admin>(
            r#"
            UPDATE admins
            SET 
                name = COALESCE($2, name),
                phone = COALESCE($3, phone),
                company_name = COALESCE($4, company_name),
                company_cnpj = COALESCE($5, company_cnpj),
                company_address = COALESCE($6, company_address),
                company_address_city = COALESCE($7, company_address_city),
                company_address_state = COALESCE($8, company_address_state)
            WHERE id = $1
            RETURNING 
                id, email, password_hash, name, role, phone, company_name,
                company_cnpj, company_address, company_address_city, company_address_state,
                is_verified, 
                verified_at, 
                totp_secret, 
                totp_enabled,
                is_active, 
                created_at, 
                updated_at, 
                deleted_at
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(phone)
        .bind(company_name)
        .bind(company_cnpj)
        .bind(company_address)
        .bind(company_city)
        .bind(company_state)
        .fetch_one(&self.pool)
        .await?;

        Ok(admin)
    }

    /// Check if email exists
    pub async fn email_exists(&self, email: &str) -> AppResult<bool> {
        let exists: Option<bool> = sqlx::query_scalar(
            r#"
            SELECT EXISTS(SELECT 1 FROM admins WHERE email = $1 AND deleted_at IS NULL)
            "#
        )
        .bind(email)
        .fetch_one(&self.pool)
        .await?;

        Ok(exists.unwrap_or(false))
    }
}
