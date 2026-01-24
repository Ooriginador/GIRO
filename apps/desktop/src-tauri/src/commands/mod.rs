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
pub mod license;
pub mod mobile;
pub mod network;
#[cfg(test)]
pub mod network_test;
pub mod price_history;
pub mod products;
pub mod reports;
pub mod sales;
pub mod seed;
pub mod service_orders;
pub mod settings;
pub mod stock;
pub mod suppliers;
pub mod system;
pub mod vehicles;
pub mod warranties;

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
pub use license::*;
pub use mobile::*;
pub use price_history::*;
pub use products::*;
pub use reports::*;
pub use sales::*;
pub use service_orders::*;
pub use settings::*;
pub use stock::*;
pub use suppliers::*;
pub use system::*;
pub use vehicles::*;
pub use warranties::*;
pub mod reports_motoparts;
pub use reports_motoparts::*;
