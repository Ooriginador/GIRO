//! Hardware Service
//!
//! Hardware fingerprint management.

use sqlx::PgPool;
use std::net::IpAddr;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{AuditAction, HardwareInfo};
use crate::repositories::{AuditRepository, HardwareRepository};

pub struct HardwareService {
    db: PgPool,
}

impl HardwareService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    fn hardware_repo(&self) -> HardwareRepository {
        HardwareRepository::new(self.db.clone())
    }

    fn audit_repo(&self) -> AuditRepository {
        AuditRepository::new(self.db.clone())
    }

    /// List hardware for an admin
    pub async fn list_for_admin(&self, admin_id: Uuid) -> AppResult<Vec<HardwareInfo>> {
        self.hardware_repo().list_for_admin(admin_id).await
    }

    /// Get hardware by ID
    pub async fn get_by_id(&self, id: Uuid, admin_id: Uuid) -> AppResult<HardwareInfo> {
        let hardware_repo = self.hardware_repo();

        // First verify admin owns a license with this hardware
        let hardware = hardware_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Hardware não encontrado".to_string()))?;

        // Check ownership via licenses
        let admin_hardware = hardware_repo.list_for_admin(admin_id).await?;
        if !admin_hardware.iter().any(|h| h.id == id) {
            return Err(AppError::NotFound("Hardware não encontrado".to_string()));
        }

        Ok(HardwareInfo::from(hardware))
    }

    /// Clear hardware binding (deactivate)
    pub async fn clear(&self, id: Uuid, admin_id: Uuid, ip_address: Option<IpAddr>) -> AppResult<()> {
        let hardware_repo = self.hardware_repo();
        let audit_repo = self.audit_repo();

        // Verify ownership
        let admin_hardware = hardware_repo.list_for_admin(admin_id).await?;
        if !admin_hardware.iter().any(|h| h.id == id) {
            return Err(AppError::NotFound("Hardware não encontrado".to_string()));
        }

        // Deactivate hardware
        hardware_repo.deactivate(id).await?;

        // Log
        audit_repo
            .log(
                AuditAction::HardwareCleared,
                Some(admin_id),
                None,
                ip_address.map(|ip| ip.to_string()),
                serde_json::json!({ "hardware_id": id }),
            )
            .await?;

        Ok(())
    }

    /// Deactivate a hardware device
    pub async fn deactivate(&self, id: Uuid, admin_id: Uuid) -> AppResult<()> {
        let hardware_repo = self.hardware_repo();
        let audit_repo = self.audit_repo();

        // Verify ownership
        let admin_hardware = hardware_repo.list_for_admin(admin_id).await?;
        if !admin_hardware.iter().any(|h| h.id == id) {
            return Err(AppError::NotFound("Hardware não encontrado".to_string()));
        }

        // Deactivate hardware
        hardware_repo.deactivate(id).await?;

        // Log audit
        audit_repo
            .log(
                AuditAction::HardwareCleared,
                Some(admin_id),
                None,
                None,
                serde_json::json!({ 
                    "hardware_id": id,
                    "action": "deactivate"
                }),
            )
            .await?;

        Ok(())
    }

    /// Check if fingerprint is already in use
    pub async fn check_fingerprint(&self, fingerprint: &str) -> AppResult<Option<HardwareInfo>> {
        let hardware = self.hardware_repo().find_by_fingerprint(fingerprint).await?;
        Ok(hardware.map(HardwareInfo::from))
    }
}
