//! Handler de sincronização PC-to-PC
//!
//! Processa ações: sync.full, sync.delta, sync.push, sale.remote_create

use crate::models::{
    Category, CreateSale, Customer, Employee, Product, ServiceOrder, Setting, Supplier,
};
use crate::repositories::{
    CategoryRepository, CustomerRepository, EmployeeRepository, ProductRepository, SaleRepository,
    ServiceOrderRepository, SettingsRepository, SupplierRepository,
};
use crate::services::mobile_protocol::{
    MobileErrorCode, MobileResponse, SaleRemoteCreatePayload, SyncDeltaPayload, SyncFullPayload,
    SyncPushPayload,
};
use sqlx::SqlitePool;

use std::collections::HashMap;

/// Handler de sincronização
pub struct SyncHandler {
    pool: SqlitePool,
    event_service: Option<std::sync::Arc<crate::services::mobile_events::MobileEventService>>,
}

impl SyncHandler {
    /// Cria novo handler
    pub fn new(
        pool: SqlitePool,
        event_service: Option<std::sync::Arc<crate::services::mobile_events::MobileEventService>>,
    ) -> Self {
        Self {
            pool,
            event_service,
        }
    }

    /// Processa sincronização completa
    pub async fn full(&self, id: u64, payload: SyncFullPayload) -> MobileResponse {
        let mut data: HashMap<String, serde_json::Value> = HashMap::new();

        for table in payload.tables {
            match table.as_str() {
                "products" => {
                    let repo = ProductRepository::new(&self.pool);
                    if let Ok(items) = repo.find_all().await {
                        data.insert(
                            "products".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "customers" => {
                    let repo = CustomerRepository::new(&self.pool);
                    if let Ok(items) = repo.find_all_active().await {
                        data.insert(
                            "customers".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "settings" => {
                    let repo = SettingsRepository::new(&self.pool);
                    if let Ok(items) = repo.find_all().await {
                        data.insert(
                            "settings".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "categories" => {
                    let repo = CategoryRepository::new(&self.pool);
                    if let Ok(items) = repo.find_all().await {
                        data.insert(
                            "categories".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "suppliers" => {
                    let repo = SupplierRepository::new(&self.pool);
                    if let Ok(items) = repo.find_all().await {
                        data.insert(
                            "suppliers".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "service_orders" => {
                    let repo = ServiceOrderRepository::new(self.pool.clone());
                    if let Ok(items) = repo.find_open_orders().await {
                        // Full sync for OS usually only returns open/recent ones for performance
                        data.insert(
                            "service_orders".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "employees" => {
                    let repo = EmployeeRepository::new(&self.pool);
                    if let Ok(items) = repo.find_all_active().await {
                        data.insert(
                            "employees".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                _ => {}
            }
        }

        MobileResponse::success(id, data)
    }

    /// Processa sincronização delta
    pub async fn delta(&self, id: u64, payload: SyncDeltaPayload) -> MobileResponse {
        let mut data: HashMap<String, serde_json::Value> = HashMap::new();
        let last_sync = payload.last_sync;
        let requested_tables = payload.tables.unwrap_or_else(|| {
            vec![
                "products".into(),
                "customers".into(),
                "settings".into(),
                "categories".into(),
                "suppliers".into(),
                "service_orders".into(),
            ]
        });

        for table in requested_tables {
            match table.as_str() {
                "products" => {
                    let repo = ProductRepository::new(&self.pool);
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "products".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "customers" => {
                    let repo = CustomerRepository::new(&self.pool);
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "customers".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "settings" => {
                    let repo = SettingsRepository::new(&self.pool);
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "settings".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "categories" => {
                    let repo = CategoryRepository::new(&self.pool);
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "categories".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "suppliers" => {
                    let repo = SupplierRepository::new(&self.pool);
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "suppliers".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "service_orders" => {
                    let repo = ServiceOrderRepository::new(self.pool.clone());
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "service_orders".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                "employees" => {
                    let repo = EmployeeRepository::new(&self.pool);

                    // last_sync comes as i64 timestamp directly in this context due to strict typing in parent
                    if let Ok(items) = repo.find_delta(last_sync).await {
                        data.insert(
                            "employees".into(),
                            serde_json::to_value(items).unwrap_or_default(),
                        );
                    }
                }
                _ => {}
            }
        }

        MobileResponse::success(id, data)
    }

    /// Processa Push de Sincronização (Master recebe de Satélite)
    pub async fn push(&self, id: u64, payload: SyncPushPayload) -> MobileResponse {
        tracing::info!("Recebendo Push de Sincronia: entity={}", payload.entity);

        let result = match payload.entity.as_str() {
            "product" => {
                if let Ok(item) = serde_json::from_value::<Product>(payload.data.clone()) {
                    let repo = ProductRepository::new(&self.pool);
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid product data".into(),
                    ))
                }
            }
            "customer" => {
                if let Ok(item) = serde_json::from_value::<Customer>(payload.data.clone()) {
                    let repo = CustomerRepository::new(&self.pool);
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid customer data".into(),
                    ))
                }
            }
            "setting" => {
                if let Ok(item) = serde_json::from_value::<Setting>(payload.data.clone()) {
                    let repo = SettingsRepository::new(&self.pool);
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid setting data".into(),
                    ))
                }
            }
            "category" => {
                if let Ok(item) = serde_json::from_value::<Category>(payload.data.clone()) {
                    let repo = CategoryRepository::new(&self.pool);
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid category data".into(),
                    ))
                }
            }
            "supplier" => {
                if let Ok(item) = serde_json::from_value::<Supplier>(payload.data.clone()) {
                    let repo = SupplierRepository::new(&self.pool);
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid supplier data".into(),
                    ))
                }
            }
            "employee" => {
                if let Ok(item) = serde_json::from_value::<Employee>(payload.data.clone()) {
                    let repo = EmployeeRepository::new(&self.pool);
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid employee data".into(),
                    ))
                }
            }
            "service_order" => {
                if let Ok(item) = serde_json::from_value::<ServiceOrder>(payload.data.clone()) {
                    let repo = ServiceOrderRepository::new(self.pool.clone());
                    repo.upsert_from_sync(item).await
                } else {
                    Err(crate::error::AppError::Validation(
                        "Invalid service order data".into(),
                    ))
                }
            }
            _ => Err(crate::error::AppError::Validation("Unknown entity".into())),
        };

        match result {
            Ok(_) => {
                // Notificar todos os clientes (Master -> Satélites) sobre a mudança vinda de outro Satélite
                if let Some(event_service) = self.event_service.as_ref() {
                    match payload.entity.as_str() {
                        "customer" => {
                            event_service.emit_sync_push("customer", payload.data.clone());
                        }
                        "product" => {
                            event_service.emit_sync_push("product", payload.data.clone());
                        }
                        "setting" => {
                            event_service.emit_sync_push("setting", payload.data.clone());
                        }
                        "service_order" => {
                            event_service.emit_sync_push("service_order", payload.data.clone());
                        }
                        "category" => {
                            event_service.emit_sync_push("category", payload.data.clone());
                        }
                        "supplier" => {
                            event_service.emit_sync_push("supplier", payload.data.clone());
                        }
                        "employee" => {
                            event_service.emit_sync_push("employee", payload.data.clone());
                        }
                        _ => {}
                    };
                }

                MobileResponse::success(id, serde_json::json!({ "status": "ok" }))
            }
            Err(e) => {
                tracing::error!("Erro ao processar sync push: {}", e);
                MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string())
            }
        }
    }

    /// Processa criação de venda remota
    pub async fn remote_sale(&self, id: u64, payload: SaleRemoteCreatePayload) -> MobileResponse {
        let create_sale: CreateSale = match serde_json::from_value(payload.sale) {
            Ok(s) => s,
            Err(e) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::ValidationError,
                    format!("Erro ao desserializar venda: {}", e),
                );
            }
        };

        let repo = SaleRepository::new(&self.pool);

        match repo.create(create_sale).await {
            Ok(sale) => MobileResponse::success(id, sale),
            Err(e) => {
                tracing::error!("Erro ao criar venda remota: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    format!("Erro ao criar venda: {}", e),
                )
            }
        }
    }
}
