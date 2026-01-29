//! Módulo de Serviços - Lógica de Negócio
//!
//! Este módulo contém a lógica de negócio da aplicação.
//!
//! # Serviços Disponíveis
//!
//! ## Core
//! - `backup_service` - Backup automático e manual do banco de dados
//! - `notification_service` - Sistema de notificações
//! - `setup_checks` - Verificações de configuração inicial
//!
//! ## Network & Multi-PC
//! - `network_client` - Cliente de sincronização PC-a-PC (modo Satellite)
//! - `network_diagnostics` - Diagnóstico completo de rede
//! - `connection_manager` - Gerenciador de conexões multi-PC
//! - `mdns_service` - Descoberta automática via mDNS/Zeroconf
//! - `sync_orchestrator` - Orquestrador de sincronização (Cloud + LAN)
//!
//! ## Mobile
//! - `mobile_server` - Servidor WebSocket para app mobile
//! - `mobile_events` - Sistema de eventos mobile
//! - `mobile_handlers` - Handlers de requisições mobile
//! - `mobile_protocol` - Protocolo de comunicação mobile
//! - `mobile_session` - Gerenciamento de sessões mobile

// ════════════════════════════════════════════════════════════════════════════
// CORE SERVICES
// ════════════════════════════════════════════════════════════════════════════

pub mod backup_service;
pub mod notification_service;
pub mod setup_checks;

// ════════════════════════════════════════════════════════════════════════════
// NETWORK & MULTI-PC SERVICES
// ════════════════════════════════════════════════════════════════════════════

pub mod connection_manager;
pub mod mdns_service;
pub mod network_client;
pub mod network_diagnostics;
pub mod sync_orchestrator;

// ════════════════════════════════════════════════════════════════════════════
// MOBILE SERVICES
// ════════════════════════════════════════════════════════════════════════════

pub mod mobile_events;
pub mod mobile_handlers;
pub mod mobile_protocol;
pub mod mobile_server;
pub mod mobile_session;

// ════════════════════════════════════════════════════════════════════════════
// ENTERPRISE MODULE
// ════════════════════════════════════════════════════════════════════════════

pub mod enterprise;

// ════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Core
pub use backup_service::*;
pub use notification_service::*;

// Network & Multi-PC
pub use connection_manager::{
    ConnectionEvent, ConnectionManager, ConnectionManagerConfig, ConnectionStats, OperationMode,
    PeerInfo, PeerStatus,
};
pub use mdns_service::*;
pub use mobile_events::*;
pub use mobile_protocol::*;
pub use mobile_server::*;
pub use mobile_session::*;
pub use network_client::*;
pub use network_diagnostics::{
    DiagnosticStatus, DiagnosticTest, NetworkDiagnosticsResult, NetworkDiagnosticsService,
    NetworkPeer, NetworkProblem, PortTestResult, SystemNetworkInfo,
};
pub use sync_orchestrator::{
    ConflictStrategy, SyncDirection, SyncOperationResult, SyncOrchestrator, SyncOrchestratorConfig,
    SyncOrchestratorStats, SyncSource, SyncStatus,
};
