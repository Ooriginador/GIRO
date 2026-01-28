//! Módulo de Repositórios - Acesso a dados

pub mod alert_repository;
pub mod cash_repository;
pub mod category_repository;
pub mod customer_repository;
pub mod employee_repository;
pub mod fiscal_repository;
pub mod held_sale_repository;
pub mod inventory_repository;

#[cfg(test)]
pub mod inventory_repository_test;

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

// Sync Module
pub mod sync_pending;

// Enterprise Module
pub mod activity_repository;
pub mod contract_repository;
pub mod enterprise_inventory_repository;
pub mod material_consumption_repository;
pub mod material_request_repository;
pub mod stock_location_repository;
pub mod stock_transfer_repository;
pub mod work_front_repository;

#[cfg(test)]
mod activity_repository_test;
#[cfg(test)]
mod contract_repository_test;
#[cfg(test)]
mod customer_repository_test;
#[cfg(test)]
mod enterprise_inventory_repository_test;
#[cfg(test)]
mod material_request_repository_test;
#[cfg(test)]
mod product_lot_repository_test;
#[cfg(test)]
mod report_motoparts_repository_test;
#[cfg(test)]
mod service_order_repository_test;
#[cfg(test)]
mod settings_repository_test;
#[cfg(test)]
mod stock_location_repository_test;
#[cfg(test)]
mod stock_repository_test;
#[cfg(test)]
mod stock_transfer_repository_test;
#[cfg(test)]
mod work_front_repository_test;

pub use alert_repository::AlertRepository;
pub use cash_repository::CashRepository;
pub use category_repository::CategoryRepository;
pub use customer_repository::CustomerRepository;
pub use employee_repository::EmployeeRepository;
pub use fiscal_repository::FiscalRepository;
pub use held_sale_repository::HeldSaleRepository;
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

// Sync Module
pub use sync_pending::{SyncCursorRepository, SyncPendingRepository};

// Enterprise Module
pub use activity_repository::ActivityRepository;
pub use contract_repository::ContractRepository;
pub use enterprise_inventory_repository::EnterpriseInventoryRepository;
pub use material_consumption_repository::MaterialConsumptionRepository;
pub use material_request_repository::MaterialRequestRepository;
pub use stock_location_repository::StockLocationRepository;
pub use stock_transfer_repository::StockTransferRepository;
pub use work_front_repository::WorkFrontRepository;

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
