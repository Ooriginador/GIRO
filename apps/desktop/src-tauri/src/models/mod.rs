//! Modelos de Domínio - GIRO
//!
//! Structs Rust correspondentes ao schema Prisma.

use specta::Type;

pub mod alert;
pub mod cash;
pub mod category;
pub mod customer;
pub mod employee;
pub mod fiscal;
pub mod inventory;
pub mod price_history;
pub mod product;
pub mod sale;
pub mod service_order;
pub mod settings;
pub mod stock;
pub mod supplier;
pub mod vehicle;
pub mod warranty;

pub use alert::*;
pub use cash::*;
pub use category::*;
pub use customer::*;
pub use employee::*;
pub use fiscal::*;
pub use inventory::*;
pub use price_history::*;
pub use product::*;
pub use sale::*;
pub use service_order::*;
pub use settings::*;
pub use stock::*;
pub use supplier::*;
pub use vehicle::*;
pub use warranty::*;
pub mod report_motoparts;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    #[specta(type = i32)]
    pub total: i64,
    pub page: i32,
    pub limit: i32,
    pub total_pages: i32,
}
