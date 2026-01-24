//! GIRO Desktop - Sistema de Gestão para Varejos
//!
//! Módulos principais:
//! - `commands`: Tauri commands para o frontend
//! - `database`: Conexão e pool SQLite
//! - `error`: Tipos de erro unificados
//! - `hardware`: Integração com periféricos
//! - `models`: Modelos de domínio
//! - `repositories`: Acesso a dados
//! - `services`: Lógica de negócio

// Módulos core
pub mod commands;
pub mod database;
pub mod error;
pub mod hardware;
pub mod ipc_contract;
pub mod license;
pub mod middleware;
pub mod models;
pub mod nfce;
pub mod repositories;
pub mod services;

// Re-exports for commands and main
pub use commands::hardware::HardwareState;
pub use database::DatabaseManager;
pub use error::{AppError, AppResult};
pub use license::{LicenseClient, LicenseClientConfig};

use crate::middleware::session::SessionState;
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

/// Estado global da aplicação compartilhado entre comandos
#[derive(Clone)]
pub struct AppState {
    pub db_pool: Arc<SqlitePool>,
    pub db_path: PathBuf,
    pub backup_dir: PathBuf,
    pub license_client: LicenseClient,
    pub hardware_id: String,
    pub session: Arc<SessionState>,
    pub event_service: Arc<crate::services::mobile_events::MobileEventService>,
}

impl AppState {
    pub fn new(
        pool: SqlitePool,
        db_path: PathBuf,
        backup_dir: PathBuf,
        license_server_url: String,
        api_key: String,
        hardware_id: String,
        event_service: Arc<crate::services::mobile_events::MobileEventService>,
    ) -> Self {
        let config = LicenseClientConfig {
            server_url: license_server_url,
            api_key,
            timeout: Duration::from_secs(10),
        };

        Self {
            db_pool: Arc::new(pool),
            db_path,
            backup_dir,
            license_client: LicenseClient::new(config),
            hardware_id,
            session: Arc::new(SessionState::default()),
            event_service,
        }
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.db_pool
    }
}
