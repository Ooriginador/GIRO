//! Comandos Tauri - Expõe backend ao frontend
//!
//! # Módulos de Comandos
//!
//! ## Core
//! - `products`, `sales`, `stock`, `cash` - Operações de PDV
//! - `customers`, `suppliers`, `employees` - Cadastros
//! - `categories`, `vehicles`, `warranties` - Auxiliares
//!
//! ## Network & Multi-PC
//! - `network` - Sincronização entre PCs
//! - `network_diagnostics` - Diagnóstico e gerenciamento multi-PC
//! - `mobile` - Servidor para app mobile
//! - `sync` - Sincronização com cloud
//!
//! ## Enterprise
//! - `inventory_enterprise` - Almoxarifado
//! - `contracts`, `work_fronts` - Gestão de contratos
//! - `material_requests`, `stock_transfers` - Movimentação

// ════════════════════════════════════════════════════════════════════════════
// CORE MODULES
// ════════════════════════════════════════════════════════════════════════════

pub mod alerts;
pub mod audit;
pub mod backup;
pub mod cash;
pub mod categories;
pub mod customers;
pub mod dispatcher;
pub mod employees;
pub mod hardware;
pub mod held_sales;
pub mod lgpd;
pub mod license;
pub mod price_history;
pub mod products;
pub mod reports;
pub mod sales;
#[cfg(debug_assertions)]
pub mod seed;
pub mod service_orders;
pub mod settings;
pub mod stock;
pub mod suppliers;
pub mod system;
pub mod vehicles;
pub mod warranties;

// ════════════════════════════════════════════════════════════════════════════
// NETWORK & MULTI-PC MODULES
// ════════════════════════════════════════════════════════════════════════════

pub mod mobile;
pub mod network;
pub mod network_diagnostics;
#[cfg(test)]
pub mod network_test;
pub mod sync;

// ════════════════════════════════════════════════════════════════════════════
// ENTERPRISE MODULE
// ════════════════════════════════════════════════════════════════════════════

pub mod activities;
pub mod catalog_import;
pub mod contracts;
pub mod enterprise_mobile;
pub mod inventory_enterprise;
pub mod material_requests;
pub mod stock_locations;
pub mod stock_transfers;
pub mod work_fronts;

// ════════════════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════════════════

pub mod reports_enterprise;
pub mod reports_motoparts;

// ════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS - CORE
// ════════════════════════════════════════════════════════════════════════════

pub use alerts::*;
pub use audit::*;
pub use backup::*;
pub use cash::*;
pub use categories::*;
pub use customers::*;
pub use dispatcher::*;
pub use employees::*;
pub use hardware::*;
pub use held_sales::*;
pub use lgpd::*;
pub use license::*;
pub use price_history::*;
pub use products::*;
pub use reports::*;
pub use reports_enterprise::*;
pub use reports_motoparts::*;
pub use sales::*;
pub use service_orders::*;
pub use settings::*;
pub use stock::*;
pub use suppliers::*;
pub use system::*;
pub use vehicles::*;
pub use warranties::*;

// ════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS - NETWORK & MULTI-PC
// ════════════════════════════════════════════════════════════════════════════

pub use mobile::*;
pub use network::*;
pub use network_diagnostics::*;
pub use sync::*;

// ════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS - ENTERPRISE
// ════════════════════════════════════════════════════════════════════════════

pub use activities::*;
pub use catalog_import::*;
pub use contracts::*;
pub use enterprise_mobile::*;
pub use inventory_enterprise::*;
pub use material_requests::*;
pub use stock_locations::*;
pub use stock_transfers::*;
pub use work_fronts::*;
