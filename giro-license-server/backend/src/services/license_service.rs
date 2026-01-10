//! License Service
//!
//! License management business logic.

use chrono::{Duration, Utc};
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::net::IpAddr;
use uuid::Uuid;

use crate::dto::license::{
    ActivateLicenseResponse, LicenseDetailsResponse, TransferLicenseResponse,
    ValidateLicenseResponse,
};
use crate::errors::{AppError, AppResult};
use crate::models::{AuditAction, HardwareInfo, LicenseStatus, LicenseSummary, PlanType};
use crate::repositories::{AuditRepository, HardwareRepository, LicenseRepository};
use crate::utils::{check_time_drift, generate_license_key, TimeDriftResult};

pub struct LicenseService {
    db: PgPool,
    #[allow(dead_code)]
    redis: ConnectionManager,
}

impl LicenseService {
    pub fn new(db: PgPool, redis: ConnectionManager) -> Self {
        Self { db, redis }
    }

    fn license_repo(&self) -> LicenseRepository {
        LicenseRepository::new(self.db.clone())
    }

    fn hardware_repo(&self) -> HardwareRepository {
        HardwareRepository::new(self.db.clone())
    }

    fn audit_repo(&self) -> AuditRepository {
        AuditRepository::new(self.db.clone())
    }

    /// Create new license(s) for an admin
    pub async fn create_licenses(
        &self,
        admin_id: Uuid,
        plan_type: PlanType,
        quantity: i32,
    ) -> AppResult<Vec<LicenseSummary>> {
        let license_repo = self.license_repo();
        let audit_repo = self.audit_repo();
        let mut licenses = Vec::with_capacity(quantity as usize);

        for _ in 0..quantity {
            let license_key = generate_license_key();
            let license = license_repo
                .create(&license_key, admin_id, plan_type)
                .await?;

            // Log creation
            audit_repo
                .log(
                    AuditAction::LicenseCreated,
                    Some(admin_id),
                    Some(license.id),
                    None,
                    serde_json::json!({ "plan_type": plan_type }),
                )
                .await?;

            licenses.push(LicenseSummary {
                id: license.id,
                license_key: license.license_key,
                plan_type: license.plan_type,
                status: license.status,
                activated_at: license.activated_at,
                expires_at: license.expires_at,
                last_validated: license.last_validated,
                created_at: license.created_at,
            });
        }

        Ok(licenses)
    }

    /// Get license details with hardware info
    pub async fn get_license_details(
        &self,
        license_key: &str,
        admin_id: Uuid,
    ) -> AppResult<LicenseDetailsResponse> {
        let license_repo = self.license_repo();
        let hardware_repo = self.hardware_repo();

        let license = license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Verify ownership
        if license.admin_id != admin_id {
            return Err(AppError::NotFound("Licença não encontrada".to_string()));
        }

        // Get hardware info if bound
        let hardware = if let Some(hw_id) = license.hardware_id {
            hardware_repo
                .find_by_id(hw_id)
                .await?
                .map(HardwareInfo::from)
        } else {
            None
        };

        Ok(LicenseDetailsResponse {
            id: license.id,
            license_key: license.license_key,
            plan_type: license.plan_type,
            status: license.status,
            activated_at: license.activated_at,
            expires_at: license.expires_at,
            last_validated: license.last_validated,
            validation_count: license.validation_count,
            hardware,
            created_at: license.created_at,
        })
    }

    /// List licenses for admin
    pub async fn list_licenses(
        &self,
        admin_id: Uuid,
        status: Option<LicenseStatus>,
        page: i32,
        limit: i32,
    ) -> AppResult<(Vec<LicenseSummary>, i64)> {
        let license_repo = self.license_repo();
        let offset = (page - 1) * limit;
        let licenses = license_repo
            .list_by_admin(admin_id, status, limit, offset)
            .await?;
        let total = license_repo.count_by_admin(admin_id, status).await?;

        Ok((licenses, total))
    }

    /// Activate a license with hardware binding
    pub async fn activate(
        &self,
        license_key: &str,
        hardware_id: &str,
        machine_name: Option<&str>,
        os_version: Option<&str>,
        cpu_info: Option<&str>,
        ip_address: Option<IpAddr>,
    ) -> AppResult<ActivateLicenseResponse> {
        let license_repo = self.license_repo();
        let hardware_repo = self.hardware_repo();
        let audit_repo = self.audit_repo();

        // Find license
        let license = license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Check status
        match license.status {
            LicenseStatus::Active => {
                // Check if same hardware
                if let Some(hw_id) = license.hardware_id {
                    let existing = hardware_repo.find_by_id(hw_id).await?;
                    if let Some(hw) = existing {
                        if hw.fingerprint != hardware_id {
                            return Err(AppError::HardwareMismatch);
                        }
                        // Already activated on same hardware - just return success
                        return Ok(ActivateLicenseResponse {
                            status: license.status,
                            expires_at: license.expires_at.unwrap_or_else(Utc::now),
                            message: "Licença já está ativa nesta máquina".to_string(),
                        });
                    }
                }
            }
            LicenseStatus::Pending => {
                // Good to activate
            }
            LicenseStatus::Expired => {
                return Err(AppError::LicenseExpired);
            }
            LicenseStatus::Suspended | LicenseStatus::Revoked => {
                return Err(AppError::License("Licença suspensa ou revogada".to_string()));
            }
        }

        // Check if hardware is already used by another license
        if hardware_repo
            .check_conflict(hardware_id, license.id)
            .await?
        {
            audit_repo
                .log(
                    AuditAction::HardwareConflict,
                    Some(license.admin_id),
                    Some(license.id),
                    ip_address.map(|ip| ip.to_string()),
                    serde_json::json!({ "hardware_id": hardware_id }),
                )
                .await?;

            return Err(AppError::License(
                "Este hardware já está vinculado a outra licença".to_string(),
            ));
        }

        // Register/update hardware
        let hardware = hardware_repo
            .upsert(hardware_id, machine_name, os_version, cpu_info, ip_address)
            .await?;

        // Calculate expiration
        let expires_at = Utc::now() + Duration::days(license.plan_type.days());

        // Activate license
        let updated = license_repo
            .activate(license.id, hardware.id, expires_at)
            .await?;

        // Log activation
        audit_repo
            .log(
                AuditAction::LicenseActivated,
                Some(license.admin_id),
                Some(license.id),
                ip_address.map(|ip| ip.to_string()),
                serde_json::json!({
                    "hardware_id": hardware_id,
                    "machine_name": machine_name,
                    "expires_at": expires_at
                }),
            )
            .await?;

        // Log hardware registration
        audit_repo
            .log(
                AuditAction::HardwareRegistered,
                Some(license.admin_id),
                Some(license.id),
                ip_address.map(|ip| ip.to_string()),
                serde_json::json!({
                    "hardware_id": hardware.id,
                    "fingerprint": hardware_id
                }),
            )
            .await?;

        Ok(ActivateLicenseResponse {
            status: updated.status,
            expires_at,
            message: "Licença ativada com sucesso".to_string(),
        })
    }

    /// Validate a license (periodic check from desktop)
    pub async fn validate(
        &self,
        license_key: &str,
        hardware_id: &str,
        client_time: chrono::DateTime<Utc>,
        ip_address: Option<IpAddr>,
    ) -> AppResult<ValidateLicenseResponse> {
        let license_repo = self.license_repo();
        let hardware_repo = self.hardware_repo();
        let audit_repo = self.audit_repo();

        // Check time drift
        let drift = check_time_drift(client_time);
        if let TimeDriftResult::Drifted { drift_seconds, .. } = &drift {
            return Err(AppError::License(format!(
                "Relógio do sistema desincronizado ({} segundos)",
                drift_seconds
            )));
        }

        // Find license
        let license = license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Check hardware match
        if let Some(hw_id) = license.hardware_id {
            let hardware = hardware_repo.find_by_id(hw_id).await?;
            if let Some(hw) = hardware {
                if hw.fingerprint != hardware_id {
                    audit_repo
                        .log(
                            AuditAction::LicenseValidationFailed,
                            Some(license.admin_id),
                            Some(license.id),
                            ip_address.map(|ip| ip.to_string()),
                            serde_json::json!({
                                "reason": "hardware_mismatch",
                                "expected": hw.fingerprint,
                                "received": hardware_id
                            }),
                        )
                        .await?;

                    return Err(AppError::HardwareMismatch);
                }

                // Update last seen
                hardware_repo.update_last_seen(hw_id).await?;
            }
        } else {
            return Err(AppError::License("Licença não ativada".to_string()));
        }

        // Check status and expiration
        let (valid, message) = match license.status {
            LicenseStatus::Active => {
                if license.is_valid() {
                    (true, "Licença válida".to_string())
                } else {
                    (false, "Licença expirada".to_string())
                }
            }
            LicenseStatus::Expired => (false, "Licença expirada".to_string()),
            LicenseStatus::Suspended => (false, "Licença suspensa".to_string()),
            LicenseStatus::Revoked => (false, "Licença revogada".to_string()),
            LicenseStatus::Pending => (false, "Licença não ativada".to_string()),
        };

        // Update validation timestamp
        license_repo.update_validation(license.id).await?;

        // Log validation
        audit_repo
            .log(
                if valid {
                    AuditAction::LicenseValidated
                } else {
                    AuditAction::LicenseValidationFailed
                },
                Some(license.admin_id),
                Some(license.id),
                ip_address.map(|ip| ip.to_string()),
                serde_json::json!({ "valid": valid }),
            )
            .await?;

        let days_remaining = license
            .expires_at
            .map(|e| crate::utils::days_remaining(e));

        Ok(ValidateLicenseResponse {
            valid,
            status: license.status,
            expires_at: license.expires_at,
            days_remaining,
            message,
        })
    }

    /// Transfer license to new hardware
    pub async fn transfer(
        &self,
        license_key: &str,
        admin_id: Uuid,
        ip_address: Option<IpAddr>,
    ) -> AppResult<TransferLicenseResponse> {
        let license_repo = self.license_repo();
        let audit_repo = self.audit_repo();

        // Find license
        let license = license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Verify ownership
        if license.admin_id != admin_id {
            return Err(AppError::NotFound("Licença não encontrada".to_string()));
        }

        // Clear hardware binding
        let updated = license_repo.clear_hardware(license.id).await?;

        // Log transfer
        audit_repo
            .log(
                AuditAction::LicenseTransferred,
                Some(admin_id),
                Some(license.id),
                ip_address.map(|ip| ip.to_string()),
                serde_json::json!({ "previous_hardware_id": license.hardware_id }),
            )
            .await?;

        Ok(TransferLicenseResponse {
            status: updated.status,
            message: "Licença liberada. Pode ativar em nova máquina.".to_string(),
        })
    }

    /// Revoke a license
    pub async fn revoke(
        &self,
        license_key: &str,
        admin_id: Uuid,
        ip_address: Option<IpAddr>,
    ) -> AppResult<()> {
        let license_repo = self.license_repo();
        let audit_repo = self.audit_repo();

        let license = license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Verify ownership
        if license.admin_id != admin_id {
            return Err(AppError::NotFound("Licença não encontrada".to_string()));
        }

        // Update status
        license_repo
            .update_status(license.id, LicenseStatus::Revoked)
            .await?;

        // Log
        audit_repo
            .log(
                AuditAction::LicenseRevoked,
                Some(admin_id),
                Some(license.id),
                ip_address.map(|ip| ip.to_string()),
                serde_json::json!({}),
            )
            .await?;

        Ok(())
    }

    /// Get license statistics for admin
    pub async fn get_stats(
        &self,
        admin_id: Uuid,
    ) -> AppResult<crate::repositories::license_repo::LicenseStats> {
        self.license_repo().get_stats(admin_id).await
    }
}
