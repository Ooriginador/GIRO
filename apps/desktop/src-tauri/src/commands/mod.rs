//! Comandos Tauri - Expõe backend ao frontend

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
pub mod mobile;
pub mod network;
#[cfg(test)]
pub mod network_test;
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
pub mod sync;
pub mod system;
pub mod vehicles;
pub mod warranties;

// Enterprise Module
pub mod activities;
pub mod catalog_import;
pub mod contracts;
pub mod enterprise_mobile;
pub mod material_requests;
pub mod stock_locations;
pub mod stock_transfers;
pub mod work_fronts;

// Re-export hardware commands (original)
pub use hardware::*;

// Re-export all commands
pub use alerts::*;
pub use audit::*;
pub use backup::*;
pub use cash::*;
pub use categories::*;
pub use customers::*;
pub use dispatcher::*;
pub use employees::*;
pub use held_sales::*;
pub use lgpd::*;
pub use license::*;
pub use mobile::*;
pub use network::*;
pub use price_history::*;
pub use products::*;
pub use reports::*;
pub use sales::*;
pub use service_orders::*;
pub use settings::*;
pub use stock::*;
pub use suppliers::*;
pub use sync::*;
pub use system::*;
pub use vehicles::*;
pub use warranties::*;
pub mod reports_motoparts;
pub use reports_motoparts::*;
pub mod reports_enterprise;
pub use reports_enterprise::*;

// Enterprise Module re-exports
pub use activities::*;
pub use catalog_import::*;
pub use contracts::*;
pub use enterprise_mobile::*;
pub use material_requests::*;
pub use stock_locations::*;
pub use stock_transfers::*;
pub use work_fronts::*;
