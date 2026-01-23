//! License Repository
//!
//! Database operations for licenses.

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::{License, LicenseStatus, LicenseSummary, PlanType, LicenseHardware};

pub struct LicenseRepository {
    pool: PgPool,
}

impl LicenseRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find license by ID
    pub async fn find_by_id(&self, id: Uuid) -> AppResult<Option<License>> {
        let row = sqlx::query(
            r#"
            SELECT 
                id, license_key, admin_id, hardware_id,
                plan_type,
                status,
                activated_at, expires_at, last_validated,
                support_expires_at, 
                COALESCE(can_offline, false) as can_offline, 
                offline_activated_at,
                validation_count, 
                COALESCE(max_hardware, 1) as max_hardware,
                created_at, updated_at
            FROM licenses
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            use sqlx::Row;
            return Ok(Some(License {
                id: r.get("id"),
                license_key: r.get("license_key"),
                admin_id: r.get("admin_id"),
                hardware_id: r.get("hardware_id"),
                plan_type: r.get("plan_type"),
                status: r.get("status"),
                activated_at: r.get("activated_at"),
                expires_at: r.get("expires_at"),
                last_validated: r.get("last_validated"),
                support_expires_at: r.get("support_expires_at"),
                can_offline: Some(r.get("can_offline")),
                offline_activated_at: r.get("offline_activated_at"),
                validation_count: r.get("validation_count"),
                max_hardware: r.get("max_hardware"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                hardware: Vec::new(),
            }));
        }
        Ok(None)
    }

    /// Find license by key
    pub async fn find_by_key(&self, license_key: &str) -> AppResult<Option<License>> {
        let row = sqlx::query(
            r#"
            SELECT 
                id, license_key, admin_id, 
                hardware_id,
                plan_type,
                status,
                activated_at, expires_at, last_validated,
                support_expires_at, 
                COALESCE(can_offline, false) as can_offline, 
                offline_activated_at,
                validation_count, 
                COALESCE(max_hardware, 1) as max_hardware,
                created_at, updated_at
            FROM licenses
            WHERE license_key = $1
            "#,
        )
        .bind(license_key)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            use sqlx::Row;
            let mut license = License {
                id: r.get("id"),
                license_key: r.get("license_key"),
                admin_id: r.get("admin_id"),
                hardware_id: r.get("hardware_id"),
                plan_type: r.get("plan_type"),
                status: r.get("status"),
                activated_at: r.get("activated_at"),
                expires_at: r.get("expires_at"),
                last_validated: r.get("last_validated"),
                support_expires_at: r.get("support_expires_at"),
                can_offline: Some(r.get("can_offline")),
                offline_activated_at: r.get("offline_activated_at"),
                validation_count: r.get("validation_count"),
                max_hardware: r.get("max_hardware"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                hardware: Vec::new(),
            };
            // Load associated hardware
            license.hardware = self.get_license_hardware(license.id).await?;
            return Ok(Some(license));
        }

        Ok(None)
    }

    /// Get hardware associated with a license
    pub async fn get_license_hardware(&self, license_id: Uuid) -> AppResult<Vec<LicenseHardware>> {
        let hardware = sqlx::query_as::<_, LicenseHardware>(
            r#"
            SELECT 
                id, license_id, hardware_id, machine_name, os_version, cpu_info,
                activations_count,
                last_activated_at,
                created_at
            FROM license_hardware
            WHERE license_id = $1
            ORDER BY last_activated_at DESC
            "#,
        )
        .bind(license_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(hardware)
    }

    /// Find active license by hardware fingerprint using the new table
    pub async fn find_active_by_hardware(&self, fingerprint: &str) -> AppResult<Option<License>> {
        let row = sqlx::query(
            r#"
            SELECT 
                l.id, l.license_key, l.admin_id, 
                l.hardware_id,
                l.plan_type,
                l.status,
                l.activated_at, l.expires_at, l.last_validated,
                l.support_expires_at, 
                COALESCE(l.can_offline, false) as can_offline, 
                l.offline_activated_at,
                l.validation_count, 
                COALESCE(l.max_hardware, 1) as max_hardware,
                l.created_at, l.updated_at
            FROM licenses l
            INNER JOIN license_hardware lh ON l.id = lh.license_id
            WHERE lh.hardware_id = $1
            AND l.status = 'active'
            ORDER BY l.created_at DESC
            LIMIT 1
            "#,
        )
        .bind(fingerprint)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            use sqlx::Row;
            let mut l = License {
                id: r.get("id"),
                license_key: r.get("license_key"),
                admin_id: r.get("admin_id"),
                hardware_id: r.get("hardware_id"),
                plan_type: r.get("plan_type"),
                status: r.get("status"),
                activated_at: r.get("activated_at"),
                expires_at: r.get("expires_at"),
                last_validated: r.get("last_validated"),
                support_expires_at: r.get("support_expires_at"),
                can_offline: Some(r.get("can_offline")),
                offline_activated_at: r.get("offline_activated_at"),
                validation_count: r.get("validation_count"),
                max_hardware: r.get("max_hardware"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                hardware: Vec::new(),
            };
            l.hardware = self.get_license_hardware(l.id).await?;
            return Ok(Some(l));
        }

        Ok(None)
    }

    /// List licenses for admin with pagination
    pub async fn list_by_admin(
        &self,
        admin_id: Uuid,
        status: Option<LicenseStatus>,
        limit: i32,
        offset: i32,
    ) -> AppResult<Vec<LicenseSummary>> {
        let rows = sqlx::query_as::<_, LicenseSummary>(
            r#"
            SELECT 
                id, license_key,
                plan_type,
                status,
                activated_at, expires_at, last_validated, 
                support_expires_at,
                COALESCE(can_offline, false) as can_offline,
                COALESCE(max_hardware, 1) as max_hardware,
                (SELECT COUNT(*) FROM license_hardware WHERE license_id = licenses.id) as active_hardware_count,
                created_at
            FROM licenses
            WHERE admin_id = $1
            AND ($2::license_status IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(admin_id)
        .bind(status)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    /// Count licenses for admin
    pub async fn count_by_admin(&self, admin_id: Uuid, status: Option<LicenseStatus>) -> AppResult<i64> {
        let count = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM licenses
            WHERE admin_id = $1
            AND ($2::license_status IS NULL OR status = $2)
            "#,
        )
        .bind(admin_id)
        .bind(status)
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
        let r = sqlx::query(
            r#"
            INSERT INTO licenses (license_key, admin_id, plan_type)
            VALUES ($1, $2, $3)
            RETURNING 
                id, license_key, admin_id, hardware_id,
                plan_type,
                status,
                activated_at, expires_at, last_validated,
                support_expires_at,
                COALESCE(can_offline, false) as can_offline,
                offline_activated_at,
                validation_count, 
                COALESCE(max_hardware, 1) as max_hardware,
                created_at, updated_at
            "#,
        )
        .bind(license_key)
        .bind(admin_id)
        .bind(plan_type)
        .fetch_one(&self.pool)
        .await?;

        use sqlx::Row;
        Ok(License {
            id: r.get("id"),
            license_key: r.get("license_key"),
            admin_id: r.get("admin_id"),
            hardware_id: r.get("hardware_id"),
            plan_type: r.get("plan_type"),
            status: r.get("status"),
            activated_at: r.get("activated_at"),
            expires_at: r.get("expires_at"),
            last_validated: r.get("last_validated"),
            support_expires_at: r.get("support_expires_at"),
            can_offline: Some(r.get("can_offline")),
            offline_activated_at: r.get("offline_activated_at"),
            validation_count: r.get("validation_count"),
            max_hardware: r.get("max_hardware"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            hardware: Vec::new(),
        })
    }

    /// Activate license with hardware binding
    pub async fn activate(
        &self,
        id: Uuid,
        hardware_id: &str, // Changed to &str
        expires_at: DateTime<Utc>,
    ) -> AppResult<License> {
        self.activate_with_support(id, hardware_id, None, None, None, expires_at, None).await
    }

    /// Activate license with hardware binding and support expiration (for lifetime)
    pub async fn activate_with_support(
        &self,
        id: Uuid,
        hardware_id_str: &str, // Changed to string (fingerprint)
        machine_name: Option<&str>,
        os_version: Option<&str>,
        cpu_info: Option<&str>,
        expires_at: DateTime<Utc>,
        support_expires_at: Option<DateTime<Utc>>,
    ) -> AppResult<License> {
        let mut tx = self.pool.begin().await?;

        // 1. Upsert into license_hardware
        sqlx::query(
            r#"
            INSERT INTO license_hardware (license_id, hardware_id, machine_name, os_version, cpu_info)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (license_id, hardware_id) DO UPDATE
            SET 
                machine_name = EXCLUDED.machine_name,
                os_version = EXCLUDED.os_version,
                cpu_info = EXCLUDED.cpu_info,
                activations_count = license_hardware.activations_count + 1,
                last_activated_at = NOW()
            "#,
        )
        .bind(id)
        .bind(hardware_id_str)
        .bind(machine_name)
        .bind(os_version)
        .bind(cpu_info)
        .execute(&mut *tx)
        .await?;

        // 2. Update license status and dates
        let r = sqlx::query(
            r#"
            UPDATE licenses
            SET 
                status = 'active',
                activated_at = COALESCE(activated_at, NOW()),
                expires_at = $2,
                support_expires_at = $3,
                last_validated = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING 
                id, license_key, admin_id, 
                hardware_id,
                plan_type,
                status,
                activated_at, expires_at, last_validated,
                support_expires_at, 
                COALESCE(can_offline, false) as can_offline, 
                offline_activated_at,
                validation_count, 
                COALESCE(max_hardware, 1) as max_hardware,
                created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(expires_at)
        .bind(support_expires_at)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        use sqlx::Row;
        Ok(License {
            id: r.get("id"),
            license_key: r.get("license_key"),
            admin_id: r.get("admin_id"),
            hardware_id: r.get("hardware_id"),
            plan_type: r.get("plan_type"),
            status: r.get("status"),
            activated_at: r.get("activated_at"),
            expires_at: r.get("expires_at"),
            last_validated: r.get("last_validated"),
            support_expires_at: r.get("support_expires_at"),
            can_offline: Some(r.get("can_offline")),
            offline_activated_at: r.get("offline_activated_at"),
            validation_count: r.get("validation_count"),
            max_hardware: r.get("max_hardware"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            hardware: Vec::new(),
        })
    }

    /// Enable offline mode for a lifetime license
    pub async fn enable_offline_mode(&self, id: Uuid) -> AppResult<License> {
        let r = sqlx::query(
            r#"
            UPDATE licenses
            SET 
                can_offline = TRUE,
                offline_activated_at = NOW()
            WHERE id = $1
            RETURNING 
                id, license_key, admin_id, hardware_id,
                plan_type,
                status,
                activated_at, expires_at, last_validated,
                support_expires_at, 
                COALESCE(can_offline, false) as can_offline, 
                offline_activated_at,
                validation_count, 
                COALESCE(max_hardware, 1) as max_hardware,
                created_at, updated_at
            "#,
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        use sqlx::Row;
        Ok(License {
            id: r.get("id"),
            license_key: r.get("license_key"),
            admin_id: r.get("admin_id"),
            hardware_id: r.get("hardware_id"),
            plan_type: r.get("plan_type"),
            status: r.get("status"),
            activated_at: r.get("activated_at"),
            expires_at: r.get("expires_at"),
            last_validated: r.get("last_validated"),
            support_expires_at: r.get("support_expires_at"),
            can_offline: Some(r.get("can_offline")),
            offline_activated_at: r.get("offline_activated_at"),
            validation_count: r.get("validation_count"),
            max_hardware: r.get("max_hardware"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            hardware: Vec::new(),
        })
    }

    /// Update last validated timestamp and increment counter
    pub async fn update_validation(&self, id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE licenses
            SET 
                last_validated = NOW(),
                validation_count = validation_count + 1
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Clear hardware binding (for transfer)
    pub async fn clear_hardware(&self, id: Uuid) -> AppResult<License> {
        let r = sqlx::query(
            r#"
            UPDATE licenses
            SET 
                hardware_id = NULL,
                status = 'pending'
            WHERE id = $1
            RETURNING 
                id, license_key, admin_id, hardware_id,
                plan_type,
                status,
                activated_at, expires_at, last_validated,
                support_expires_at,
                COALESCE(can_offline, false) as can_offline,
                offline_activated_at,
                validation_count, 
                COALESCE(max_hardware, 1) as max_hardware,
                created_at, updated_at
            "#,
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        use sqlx::Row;
        Ok(License {
            id: r.get("id"),
            license_key: r.get("license_key"),
            admin_id: r.get("admin_id"),
            hardware_id: r.get("hardware_id"),
            plan_type: r.get("plan_type"),
            status: r.get("status"),
            activated_at: r.get("activated_at"),
            expires_at: r.get("expires_at"),
            last_validated: r.get("last_validated"),
            support_expires_at: r.get("support_expires_at"),
            can_offline: Some(r.get("can_offline")),
            offline_activated_at: r.get("offline_activated_at"),
            validation_count: r.get("validation_count"),
            max_hardware: r.get("max_hardware"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            hardware: Vec::new(),
        })
    }

    /// Update license status
    pub async fn update_status(&self, id: Uuid, status: LicenseStatus) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE licenses
            SET status = $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(status)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get license statistics for admin
    pub async fn get_stats(&self, admin_id: Uuid) -> AppResult<LicenseStats> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'expired') as expired,
                COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
                COUNT(*) as total
            FROM licenses
            WHERE admin_id = $1
            "#,
        )
        .bind(admin_id)
        .fetch_one(&self.pool)
        .await?;

        use sqlx::Row;
        Ok(LicenseStats {
            total: row.get("total"),
            active: row.get("active"),
            pending: row.get("pending"),
            expired: row.get("expired"),
            suspended: row.get("suspended"),
        })
    }

    /// Count licenses expiring before a given date
    pub async fn count_expiring(
        &self,
        admin_id: Uuid,
        before_date: NaiveDate,
    ) -> AppResult<i32> {
        let count = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)::integer
            FROM licenses
            WHERE admin_id = $1
            AND status = 'active'
            AND expires_at IS NOT NULL
            AND expires_at::date <= $2
            "#,
        )
        .bind(admin_id)
        .bind(before_date)
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

    /// Assign a license to an admin (used during registration with pre-generated key)
    pub async fn assign_to_admin(&self, license_id: Uuid, admin_id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE licenses
            SET admin_id = $1, updated_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(admin_id)
        .bind(license_id)
        .execute(&self.pool)
        .await?;

        Ok(())
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
