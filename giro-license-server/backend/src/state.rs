//! Application State
//!
//! Shared state across all handlers.

use std::sync::Arc;

use crate::config::Settings;
use crate::repositories::{LicenseRepository, MetricsRepository};
use crate::services::{
    AuthService, EmailService, HardwareService, LicenseService, MetricsService, S3Service,
};

/// Estado global da aplicação compartilhado entre handlers
#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub redis: redis::aio::ConnectionManager,
    pub settings: Arc<Settings>,
    pub s3: Option<S3Service>,
}

impl AppState {
    /// Create auth service
    pub fn auth_service(&self) -> AuthService {
        AuthService::new(self.db.clone(), self.redis.clone(), self.settings.clone())
    }

    /// Create license service
    pub fn license_service(&self) -> LicenseService {
        LicenseService::new(self.db.clone(), self.redis.clone())
    }

    /// Create hardware service
    pub fn hardware_service(&self) -> HardwareService {
        HardwareService::new(self.db.clone())
    }

    /// Create metrics service
    pub fn metrics_service(&self) -> MetricsService {
        MetricsService::new(
            MetricsRepository::new(self.db.clone()),
            LicenseRepository::new(self.db.clone()),
        )
    }

    /// Get email service
    pub fn email_service(&self) -> EmailService {
        EmailService::new(
            self.settings.email.resend_api_key.clone(),
            self.settings.email.from_email.clone(),
            self.settings.email.from_name.clone(),
        )
    }

    /// Get S3 service
    pub fn s3_service(&self) -> crate::errors::AppResult<S3Service> {
        self.s3.clone().ok_or_else(|| {
            crate::errors::AppError::BadRequest("Serviço de backup em nuvem não configurado".into())
        })
    }

    /// Get frontend URL for password reset links
    pub fn password_reset_url(&self) -> String {
        format!("{}/reset-password", self.settings.app.frontend_url)
    }
}
