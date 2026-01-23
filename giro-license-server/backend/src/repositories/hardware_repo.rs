//! Hardware Repository
//!
//! Database operations for hardware fingerprints.

use sqlx::PgPool;
use std::net::IpAddr;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::{Hardware, HardwareInfoWithLicense};

pub struct HardwareRepository {
    pool: PgPool,
}

impl HardwareRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find hardware by ID
    pub async fn find_by_id(&self, id: Uuid) -> AppResult<Option<Hardware>> {
        let hardware = sqlx::query_as::<_, Hardware>(
            r#"
            SELECT 
                id, fingerprint, machine_name, os_version, cpu_info,
                first_seen, last_seen, is_active, ip_address,
                created_at
            FROM hardware
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(hardware)
    }

    /// Find hardware by fingerprint
    pub async fn find_by_fingerprint(&self, fingerprint: &str) -> AppResult<Option<Hardware>> {
        let hardware = sqlx::query_as::<_, Hardware>(
            r#"
            SELECT 
                id, fingerprint, machine_name, os_version, cpu_info,
                first_seen, last_seen, is_active, ip_address,
                created_at
            FROM hardware
            WHERE fingerprint = $1
            "#,
        )
        .bind(fingerprint)
        .fetch_optional(&self.pool)
        .await?;

        Ok(hardware)
    }

    /// Register new hardware or update existing
    pub async fn upsert(
        &self,
        fingerprint: &str,
        machine_name: Option<&str>,
        os_version: Option<&str>,
        cpu_info: Option<&str>,
        ip_address: Option<IpAddr>,
    ) -> AppResult<Hardware> {
        let ip_str = ip_address.map(|ip| ip.to_string());
        
        let hardware = sqlx::query_as::<_, Hardware>(
            r#"
            INSERT INTO hardware (fingerprint, machine_name, os_version, cpu_info, ip_address)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (fingerprint) DO UPDATE
            SET 
                machine_name = COALESCE($2, hardware.machine_name),
                os_version = COALESCE($3, hardware.os_version),
                cpu_info = COALESCE($4, hardware.cpu_info),
                ip_address = COALESCE($5, hardware.ip_address),
                last_seen = NOW()
            RETURNING 
                id, fingerprint, machine_name, os_version, cpu_info,
                first_seen, last_seen, is_active, ip_address,
                created_at
            "#,
        )
        .bind(fingerprint)
        .bind(machine_name)
        .bind(os_version)
        .bind(cpu_info)
        .bind(ip_str)
        .fetch_one(&self.pool)
        .await?;

        Ok(hardware)
    }

    /// Update last seen timestamp
    pub async fn update_last_seen(&self, id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE hardware
            SET last_seen = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// List hardware for an admin - uses license_hardware table for proper N:M relationship
    pub async fn list_for_admin(&self, admin_id: Uuid) -> AppResult<Vec<HardwareInfoWithLicense>> {
        let result = sqlx::query_as::<_, HardwareInfoWithLicense>(
            r#"
            SELECT 
                lh.id,
                l.license_key,
                lh.hardware_id as fingerprint,
                lh.machine_name,
                lh.os_version,
                COALESCE(lh.last_activated_at, NOW())::timestamptz as activated_at,
                h.first_seen,
                h.last_seen,
                COALESCE(h.is_active, TRUE) as is_active
            FROM license_hardware lh
            INNER JOIN licenses l ON l.id = lh.license_id
            LEFT JOIN hardware h ON h.fingerprint = lh.hardware_id
            WHERE l.admin_id = $1
            ORDER BY last_seen DESC NULLS LAST, activated_at DESC
            "#,
        )
        .bind(admin_id)
        .fetch_all(&self.pool)
        .await;

        match result {
            Ok(hardware) => Ok(hardware),
            Err(e) => {
                tracing::error!("Database error in list_for_admin: {:?}", e);
                Err(e.into())
            }
        }
    }

    /// Deactivate hardware
    pub async fn deactivate(&self, id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE hardware
            SET is_active = FALSE
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Check if fingerprint is already associated with another license
    pub async fn check_conflict(&self, fingerprint: &str, license_id: Uuid) -> AppResult<Option<String>> {
        let conflict = sqlx::query_scalar(
            r#"
            SELECT l.license_key
            FROM licenses l
            INNER JOIN hardware h ON h.id = l.hardware_id
            WHERE h.fingerprint = $1
            AND l.id != $2
            AND l.status = 'active'
            LIMIT 1
            "#,
        )
        .bind(fingerprint)
        .bind(license_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(conflict)
    }

    /// Update hardware fingerprint (Used for stable ID migration)
    pub async fn update_fingerprint(&self, old_hw_id_row_id: Uuid, new_fingerprint: &str) -> AppResult<()> {
        let mut tx = self.pool.begin().await?;

        // 1. Update the record in license_hardware (this links to licenses)
        sqlx::query(
            "UPDATE license_hardware SET hardware_id = $1 WHERE id = $2"
        )
        .bind(new_fingerprint)
        .bind(old_hw_id_row_id)
        .execute(&mut *tx)
        .await?;

        // 2. We don't necessarily update the 'hardware' table because it's a global registry 
        // and fingerprints are unique keys there. If we just changed it there, it might collide.
        // For GIRO's transition, updating license_hardware is enough to satisfy the service match.

        tx.commit().await?;
        Ok(())
    }
}
