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
pub mod held_sale;
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
pub use held_sale::*;
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

// Re-export Pagination types if needed or define them here?
// Ideally Pagination struct should also be in models or shared.
// For now, let's look at repositories/mod.rs again. Pagination implies specific behavior.
// Let's assume Pagination stays in repositories but we implementation uses it.
// Actually, Pagination is in repositories. Let's make sure we can access it.

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

impl<T> PaginatedResult<T> {
    pub fn new(data: Vec<T>, total: i64, page: i32, per_page: i32) -> Self {
        let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;
        Self {
            data,
            total,
            page,
            limit: per_page,
            total_pages,
        }
    }
}
