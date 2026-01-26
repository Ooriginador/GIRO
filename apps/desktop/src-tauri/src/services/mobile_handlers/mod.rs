//! Handlers de ações mobile
//!
//! Cada módulo implementa handlers para um namespace de ações.

pub mod auth;
pub mod categories;
pub mod enterprise;
pub mod expiration;
pub mod inventory;
pub mod products;
pub mod stock;
pub mod system;

pub use auth::AuthHandler;
pub use categories::CategoriesHandler;
pub use enterprise::{
    EnterpriseContextHandler, EnterpriseInventoryHandler, EnterpriseRequestHandler,
    EnterpriseTransferHandler,
};
pub use expiration::ExpirationHandler;
pub use inventory::InventoryHandler;
pub use products::ProductsHandler;
pub use stock::StockHandler;
pub use system::SystemHandler;

pub mod sync;
pub use sync::SyncHandler;
