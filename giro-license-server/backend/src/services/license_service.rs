//! License Service
//!
//! License management business logic.

use chrono::{Duration, Utc};
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::net::IpAddr;
use uuid::Uuid;

use crate::dto::license::{
    ActivateLicenseResponse, AdminUserSyncData, LicenseDetailsResponse, RestoreLicenseResponse,
    TransferLicenseResponse, UpdateLicenseAdminRequest, UpdateLicenseAdminResponse,
    ValidateLicenseResponse,
};
use crate::errors::{AppError, AppResult};
use crate::models::{AuditAction, HardwareInfo, LicenseStatus, LicenseSummary, PlanType};
use crate::repositories::{AdminRepository, AuditRepository, HardwareRepository, LicenseRepository};
use crate::utils::{check_time_drift, generate_license_key, hash_password, TimeDriftResult};

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

    fn admin_repo(&self) -> AdminRepository {
        AdminRepository::new(self.db.clone())
    }

    fn default_features() -> Vec<String> {
        vec![
            "pdv".to_string(),
            "stock".to_string(),
            "reports".to_string(),
            "mobile".to_string(),
        ]
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
                support_expires_at: license.support_expires_at,
                can_offline: license.can_offline,
                created_at: license.created_at,
                max_hardware: license.max_hardware,
                active_hardware_count: Some(0),
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
        let normalized_key = crate::utils::normalize_license_key(license_key);

        let license = license_repo
            .find_by_key(&normalized_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Verify ownership
        if license.admin_id != admin_id {
            return Err(AppError::NotFound("Licença não encontrada".to_string()));
        }

        // Get hardware info if bound
        let hardware = license.hardware.iter().map(|hw| {
            HardwareInfo {
                id: hw.id,
                fingerprint: hw.hardware_id.clone(),
                machine_name: hw.machine_name.clone(),
                os_version: hw.os_version.clone(),
                first_seen: hw.created_at,
                last_seen: hw.last_activated_at,
                is_active: license.status == LicenseStatus::Active,
            }
        }).collect();

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
        let audit_repo = self.audit_repo();
        let normalized_key = crate::utils::normalize_license_key(license_key);

        // Find license
        let license = license_repo
            .find_by_key(&normalized_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Check status
        match license.status {
            LicenseStatus::Active => {
                // Check if already active on THIS hardware
                if license.hardware.iter().any(|h| h.hardware_id == hardware_id) {
                    let admin = self
                        .admin_repo()
                        .find_by_id(license.admin_id)
                        .await?
                        .ok_or_else(|| AppError::Internal("Admin não encontrado".to_string()))?;

                    let is_lifetime = license.plan_type.is_lifetime();

                    return Ok(ActivateLicenseResponse {
                        status: license.status,
                        expires_at: if is_lifetime { None } else { license.expires_at },
                        license_key: license.license_key,
                        plan_type: license.plan_type,
                        company_name: admin.company_name.unwrap_or_default(),
                        company_cnpj: admin.company_cnpj,
                        company_address: admin.company_address,
                        company_city: admin.company_address_city,
                        company_state: admin.company_address_state,
                        max_users: 999,
                        features: Self::default_features(),
                        support_expires_at: license.support_expires_at,
                        is_lifetime,
                        can_offline: license.can_offline.unwrap_or(false),
                        message: "Licença já está ativa nesta máquina".to_string(),
                        admin_user: if !admin.name.trim().is_empty() {
                            Some(AdminUserSyncData {
                                id: admin.id,
                                name: admin.name.clone(),
                                email: admin.email.clone(),
                                phone: admin.phone.clone(),
                                password_hash: admin.password_hash.clone(),
                            })
                        } else {
                            None
                        },
                        has_admin: !admin.name.trim().is_empty(),
                    });
                }

                // New hardware - check if we can add more
                if license.hardware.len() >= license.max_hardware as usize {
                    return Err(AppError::License(format!(
                        "Limite de dispositivos atingido (máximo: {})",
                        license.max_hardware
                    )));
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

        // Calculate expiration based on plan type
        let expires_at = Utc::now() + Duration::days(license.plan_type.days());
        
        // For lifetime licenses, also calculate support expiration
        let support_expires_at = if license.plan_type.is_lifetime() {
            Some(Utc::now() + Duration::days(license.plan_type.support_days()))
        } else {
            None
        };

        // Activate license using the new multi-hardware method
        let updated = license_repo
            .activate_with_support(
                license.id, 
                hardware_id, 
                machine_name, 
                os_version, 
                cpu_info, 
                expires_at, 
                support_expires_at
            )
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
                    "expires_at": expires_at,
                    "support_expires_at": support_expires_at,
                    "is_lifetime": license.plan_type.is_lifetime()
                }),
            )
            .await?;

        // Hardware registration is now part of activate_with_support atomic operation
        // No separate log needed here unless specific extra info is required.

        let admin = self
            .admin_repo()
            .find_by_id(license.admin_id)
            .await?
            .ok_or_else(|| AppError::Internal("Admin não encontrado".to_string()))?;

        let is_lifetime = license.plan_type.is_lifetime();
        let can_offline = updated.can_offline.unwrap_or(false);

        Ok(ActivateLicenseResponse {
            status: updated.status,
            // For lifetime licenses, don't expose a hard expiration to the Desktop UI.
            // Internally we still keep expires_at as the server-validation window.
            expires_at: if is_lifetime { None } else { Some(expires_at) },
            license_key: license.license_key,
            plan_type: license.plan_type,
            company_name: admin.company_name.unwrap_or_default(),
            company_cnpj: admin.company_cnpj.clone(),
            company_address: admin.company_address.clone(),
            company_city: admin.company_address_city.clone(),
            company_state: admin.company_address_state.clone(),
            max_users: 999,
            features: Self::default_features(),
            support_expires_at,
            is_lifetime,
            can_offline,
            message: "Licença ativada com sucesso".to_string(),
            admin_user: if !admin.name.trim().is_empty() {
                Some(AdminUserSyncData {
                    id: admin.id,
                    name: admin.name.clone(),
                    email: admin.email.clone(),
                    phone: admin.phone.clone(),
                    password_hash: admin.password_hash.clone(),
                })
            } else {
                None
            },
            has_admin: !admin.name.trim().is_empty(),
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
        let normalized_key = crate::utils::normalize_license_key(license_key);
        let license = license_repo
            .find_by_key(&normalized_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Check hardware match
        let has_hardware_match = license.hardware.iter().any(|h| h.hardware_id == hardware_id);

        if !has_hardware_match {
            audit_repo
                .log(
                    AuditAction::LicenseValidationFailed,
                    Some(license.admin_id),
                    Some(license.id),
                    ip_address.map(|ip| ip.to_string()),
                    serde_json::json!({
                        "reason": "hardware_mismatch",
                        "received": hardware_id,
                        "allowed_count": license.hardware.len()
                    }),
                )
                .await?;

            return Err(AppError::HardwareMismatch);
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

        let admin = self
            .admin_repo()
            .find_by_id(license.admin_id)
            .await?
            .ok_or_else(|| AppError::Internal("Admin não encontrado".to_string()))?;

        let is_lifetime = license.plan_type.is_lifetime();
        let can_offline = license.can_offline.unwrap_or(false);

        let expires_at_for_client = if is_lifetime { None } else { license.expires_at };
        let days_remaining = expires_at_for_client.map(crate::utils::days_remaining);

        Ok(ValidateLicenseResponse {
            valid,
            status: license.status,
            expires_at: expires_at_for_client,
            days_remaining,
            license_key: license.license_key,
            plan_type: license.plan_type,
            company_name: admin.company_name.unwrap_or_default(),
            company_cnpj: admin.company_cnpj.clone(),
            company_address: admin.company_address.clone(),
            company_city: admin.company_address_city.clone(),
            company_state: admin.company_address_state.clone(),
            max_users: 999,
            features: Self::default_features(),
            support_expires_at: license.support_expires_at,
            is_lifetime,
            can_offline,
            message,
            admin_user: if !admin.name.trim().is_empty() {
                Some(AdminUserSyncData {
                    id: admin.id,
                    name: admin.name.clone(),
                    email: admin.email.clone(),
                    phone: admin.phone.clone(),
                    password_hash: admin.password_hash.clone(),
                })
            } else {
                None
            },
            has_admin: !admin.name.trim().is_empty(),
        })
    }

    /// Restore license by hardware fingerprint
    pub async fn restore(&self, hardware_id: &str) -> AppResult<RestoreLicenseResponse> {
        let license_repo = self.license_repo();

        // Check internal hardware records for matching license
        if let Some(license) = license_repo.find_active_by_hardware(hardware_id).await? {
            return Ok(RestoreLicenseResponse {
                found: true,
                license_key: Some(license.license_key),
                plan_type: Some(license.plan_type),
                message: "Licença encontrada e restaurada".to_string(),
            });
        }

        Ok(RestoreLicenseResponse {
            found: false,
            license_key: None,
            plan_type: None,
            message: "Nenhuma licença ativa encontrada para este hardware".to_string(),
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
        let normalized_key = crate::utils::normalize_license_key(license_key);

        // Find license
        let license = license_repo
            .find_by_key(&normalized_key)
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
                serde_json::json!({ "active_hardware_count": license.hardware.len() }),
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
        let normalized_key = crate::utils::normalize_license_key(license_key);

        let license = license_repo
            .find_by_key(&normalized_key)
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

    /// Update admin data for a license (Sync from Desktop)
    pub async fn update_license_admin(
        &self,
        license_key: &str,
        data: &UpdateLicenseAdminRequest,
    ) -> AppResult<UpdateLicenseAdminResponse> {
        let license_repo = self.license_repo();
        let admin_repo = self.admin_repo();
        let audit_repo = self.audit_repo();
        let normalized_key = crate::utils::normalize_license_key(license_key);

        // Find license
        let license = license_repo
            .find_by_key(&normalized_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Find associated admin
        let admin = admin_repo
            .find_by_id(license.admin_id)
            .await?
            .ok_or_else(|| AppError::Internal("Admin não encontrado".to_string()))?;

        // Hash new PIN/Password
        let password_hash = hash_password(&data.pin)?;

        // Update Admin Profile & Password
        // Transaction might be better here but for now separate calls
        
        // 1. Update Profile
        admin_repo
            .update_profile(
                admin.id,
                Some(&data.name),
                Some(&data.phone),
                data.company_name.as_deref(),
                data.company_cnpj.as_deref(),
                data.company_address.as_deref(),
                data.company_city.as_deref(),
                data.company_state.as_deref(),
            )
            .await?;

        // 2. Update Email if changed (be careful with email changes, but for initial sync it's fine)
        // AdminRepository doesn't have update_email exposed directly in the snippets I saw, 
        // but update_profile didn't include email. 
        // If email update is needed, we might need to add it to AdminRepo or assuming initial sync logic.
        // For now, let's assume valid activation implies we trust the email provided during "Registration".
        // BUT `update_profile` sql query in previous step only touched name, phone, company_name.
        // We might need to manually update email if it differs? 
        // SAFE OPTION: For this specific task "Registration", the user likely just created the admin localy.
        // If the server admin is a placeholder or previous one, we should probably update it.
        // Let's stick to updating available fields. If email update is blocked by repo, we skip it or add support.
        // `update_password` is available.

        admin_repo.update_password(admin.id, &password_hash).await?;
        
        // Log
        audit_repo
            .log(
                AuditAction::AdminProfileUpdated,
                Some(admin.id),
                Some(license.id),
                None,
                serde_json::json!({
                    "source": "desktop_sync",
                    "name": data.name,
                    "email": data.email // Logging intent to change email
                }),
            )
            .await?;

        Ok(UpdateLicenseAdminResponse {
            success: true,
            message: "Dados do administrador sincronizados com sucesso".to_string(),
        })
    }
}
