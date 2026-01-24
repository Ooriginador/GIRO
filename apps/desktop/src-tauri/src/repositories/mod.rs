//! Módulo de Repositórios - Acesso a dados

pub mod alert_repository;
pub mod cash_repository;
pub mod category_repository;
pub mod customer_repository;
pub mod employee_repository;
pub mod fiscal_repository;
pub mod inventory_repository;
pub mod price_history_repository;
pub mod product_lot_repository;
pub mod product_repository;
pub mod sale_repository;
pub mod service_order_repository;
pub mod settings_repository;
pub mod stock_repository;
pub mod supplier_repository;
pub mod vehicle_repository;
pub mod warranty_repository;

#[cfg(test)]
mod service_order_repository_test;
#[cfg(test)]
mod stock_repository_test;

pub use alert_repository::AlertRepository;
pub use cash_repository::CashRepository;
pub use category_repository::CategoryRepository;
pub use customer_repository::CustomerRepository;
pub use employee_repository::EmployeeRepository;
pub use fiscal_repository::FiscalRepository;
pub use inventory_repository::InventoryRepository;
pub use price_history_repository::PriceHistoryRepository;
pub use product_lot_repository::ProductLotRepository;
pub use product_repository::ProductRepository;
pub use sale_repository::SaleRepository;
pub use service_order_repository::ServiceOrderRepository;
pub use settings_repository::SettingsRepository;
pub use stock_repository::StockRepository;
pub use supplier_repository::SupplierRepository;
pub use vehicle_repository::VehicleRepository;
pub use warranty_repository::WarrantyRepository;

/// Gera um novo UUID
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

use specta::Type;

/// Paginação
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Type)]
pub struct Pagination {
    pub page: i32,
    pub per_page: i32,
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
        }
    }
}

impl Pagination {
    pub fn new(page: i32, per_page: i32) -> Self {
        Self { page, per_page }
    }

    pub fn offset(&self) -> i32 {
        (self.page - 1) * self.per_page
    }
}

pub use crate::models::PaginatedResult;
pub mod report_motoparts_repository;
pub use report_motoparts_repository::ReportMotopartsRepository;
