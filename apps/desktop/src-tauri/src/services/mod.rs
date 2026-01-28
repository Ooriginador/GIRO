//! Módulo de Serviços - Lógica de Negócio
//!
//! Este módulo contém a lógica de negócio da aplicação.

pub mod backup_service;
pub mod enterprise;
pub mod mdns_service;
pub mod mobile_events;
pub mod mobile_handlers;
pub mod mobile_protocol;
pub mod mobile_server;
pub mod mobile_session;
pub mod network_client;
pub mod notification_service;
pub mod setup_checks;

pub use backup_service::*;
pub use mdns_service::*;
pub use mobile_events::*;
pub use mobile_protocol::*;
pub use mobile_server::*;
pub use mobile_session::*;
pub use network_client::*;
pub use notification_service::*;
