//! License Repository
//!
//! Database operations for licenses.

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::{License, LicenseStatus, LicenseSummary, PlanType};

pub struct LicenseRepository {
    pool: PgPool,
}

impl LicenseRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find license by ID
    pub async fn find_by_id(&self, id: Uuid) -> AppResult<Option<License>> {
        let license = sqlx::query_as!(
            License,
            r#"
            SELECT 
                id, license_key, admin_id, hardware_id,
                plan_type as "plan_type: PlanType",
                status as "status: LicenseStatus",
                activated_at, expires_at, last_validated,
                validation_count as "validation_count!", created_at as "created_at!", updated_at as "updated_at!"
            FROM licenses
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(license)
    }

    /// Find license by key
    pub async fn find_by_key(&self, license_key: &str) -> AppResult<Option<License>> {
        let license = sqlx::query_as!(
            License,
            r#"
            SELECT 
                id, license_key, admin_id, hardware_id,
                plan_type as "plan_type: PlanType",
                status as "status: LicenseStatus",
                activated_at, expires_at, last_validated,
                validation_count as "validation_count!", created_at as "created_at!", updated_at as "updated_at!"
            FROM licenses
            WHERE license_key = $1
            "#,
            license_key
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(license)
    }

    /// List licenses for admin with pagination
    pub async fn list_by_admin(
        &self,
        admin_id: Uuid,
        status: Option<LicenseStatus>,
        limit: i32,
        offset: i32,
    ) -> AppResult<Vec<LicenseSummary>> {
        let licenses = sqlx::query_as!(
            LicenseSummary,
            r#"
            SELECT 
                id, license_key,
                plan_type as "plan_type: PlanType",
                status as "status: LicenseStatus",
                activated_at, expires_at, last_validated, created_at as "created_at!"
            FROM licenses
            WHERE admin_id = $1
            AND ($2::license_status IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
            admin_id,
            status as Option<LicenseStatus>,
            limit as i64,
            offset as i64
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(licenses)
    }

    /// Count licenses for admin
    pub async fn count_by_admin(&self, admin_id: Uuid, status: Option<LicenseStatus>) -> AppResult<i64> {
        let count = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as "count!"
            FROM licenses
            WHERE admin_id = $1
            AND ($2::license_status IS NULL OR status = $2)
            "#,
            admin_id,
            status as Option<LicenseStatus>
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(count)
    }

    /// Create new license
    pub async fn create(
        &self,
        license_key: &str,
        admin_id: Uuid,
        plan_type: PlanType,
    ) -> AppResult<License> {
        let license = sqlx::query_as!(
            License,
            r#"
            INSERT INTO licenses (license_key, admin_id, plan_type)
            VALUES ($1, $2, $3)
            RETURNING 
                id, license_key, admin_id, hardware_id,
                plan_type as "plan_type: PlanType",
                status as "status: LicenseStatus",
                activated_at, expires_at, last_validated,
                validation_count as "validation_count!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            license_key,
            admin_id,
            plan_type as PlanType
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(license)
    }

    /// Activate license with hardware binding
    pub async fn activate(
        &self,
        id: Uuid,
        hardware_id: Uuid,
        expires_at: DateTime<Utc>,
    ) -> AppResult<License> {
        let license = sqlx::query_as!(
            License,
            r#"
            UPDATE licenses
            SET 
                hardware_id = $2,
                status = 'active',
                activated_at = NOW(),
                expires_at = $3,
                last_validated = NOW()
            WHERE id = $1
            RETURNING 
                id, license_key, admin_id, hardware_id,
                plan_type as "plan_type: PlanType",
                status as "status: LicenseStatus",
                activated_at, expires_at, last_validated,
                validation_count as "validation_count!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            id,
            hardware_id,
            expires_at
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(license)
    }

    /// Update last validated timestamp and increment counter
    pub async fn update_validation(&self, id: Uuid) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE licenses
            SET 
                last_validated = NOW(),
                validation_count = validation_count + 1
            WHERE id = $1
            "#,
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Clear hardware binding (for transfer)
    pub async fn clear_hardware(&self, id: Uuid) -> AppResult<License> {
        let license = sqlx::query_as!(
            License,
            r#"
            UPDATE licenses
            SET 
                hardware_id = NULL,
                status = 'pending'
            WHERE id = $1
            RETURNING 
                id, license_key, admin_id, hardware_id,
                plan_type as "plan_type: PlanType",
                status as "status: LicenseStatus",
                activated_at, expires_at, last_validated,
                validation_count as "validation_count!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(license)
    }

    /// Update license status
    pub async fn update_status(&self, id: Uuid, status: LicenseStatus) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE licenses
            SET status = $2
            WHERE id = $1
            "#,
            id,
            status as LicenseStatus
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get license statistics for admin
    pub async fn get_stats(&self, admin_id: Uuid) -> AppResult<LicenseStats> {
        let stats = sqlx::query!(
            r#"
            SELECT
                COUNT(*) FILTER (WHERE status = 'active') as "active!",
                COUNT(*) FILTER (WHERE status = 'pending') as "pending!",
                COUNT(*) FILTER (WHERE status = 'expired') as "expired!",
                COUNT(*) FILTER (WHERE status = 'suspended') as "suspended!",
                COUNT(*) as "total!"
            FROM licenses
            WHERE admin_id = $1
            "#,
            admin_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(LicenseStats {
            total: stats.total,
            active: stats.active,
            pending: stats.pending,
            expired: stats.expired,
            suspended: stats.suspended,
        })
    }

    /// Count licenses expiring before a given date
    pub async fn count_expiring(
        &self,
        admin_id: Uuid,
        before_date: NaiveDate,
    ) -> AppResult<i32> {
        let count = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*)::integer as "count!"
            FROM licenses
            WHERE admin_id = $1
            AND status = 'active'
            AND expires_at IS NOT NULL
            AND expires_at::date <= $2
            "#,
            admin_id,
            before_date
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(count)
    }

    /// Count licenses (active vs total)
    pub async fn count_licenses(&self, admin_id: Uuid) -> AppResult<(i32, i32)> {
        let active = self.count_by_admin(admin_id, Some(LicenseStatus::Active)).await?;
        let total = self.count_by_admin(admin_id, None).await?;
        Ok((active as i32, total as i32))
    }
}

#[derive(Debug, Clone)]
pub struct LicenseStats {
    pub total: i64,
    pub active: i64,
    pub pending: i64,
    pub expired: i64,
    pub suspended: i64,
}
