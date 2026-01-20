//! Handler de sincronização PC-to-PC
//!
//! Processa ações: sync.full, sync.delta, sale.remote_create

use crate::models::CreateSale;
use crate::repositories::{SaleRepository, ProductRepository, CustomerRepository, SettingsRepository};
use crate::services::mobile_protocol::{
    MobileErrorCode, MobileResponse, SyncFullPayload, SyncDeltaPayload, SaleRemoteCreatePayload,
};
use sqlx::SqlitePool;
// use chrono::Utc; // Removed unused import

use std::collections::HashMap;

/// Handler de sincronização
pub struct SyncHandler {
    pool: SqlitePool,
}

impl SyncHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Processa sincronização completa
    pub async fn full(&self, id: u64, payload: SyncFullPayload) -> MobileResponse {
        let mut data = HashMap::new();

        for table in payload.tables {
            match table.as_str() {
                "products" => {
                    let repo = ProductRepository::new(&self.pool);
                    match repo.find_all().await {
                        Ok(products) => {
                            data.insert("products".to_string(), serde_json::to_value(products).unwrap_or_default());
                        }
                        Err(e) => tracing::error!("Erro ao sync products: {}", e),
                    }
                },
                "customers" => {
                     let repo = CustomerRepository::new(&self.pool);
                     match repo.find_all_active().await {
                         Ok(customers) => {
                             data.insert("customers".to_string(), serde_json::to_value(customers).unwrap_or_default());
                         },
                         Err(e) => tracing::error!("Erro ao sync customers: {}", e),
                    }
                },
                "settings" => {
                    let repo = SettingsRepository::new(&self.pool);
                     match repo.find_all().await {
                         Ok(settings) => {
                             data.insert("settings".to_string(), serde_json::to_value(settings).unwrap_or_default());
                         },
                         Err(e) => tracing::error!("Erro ao sync settings: {}", e),
                    }
                },
                _ => {}
            }
        }

        MobileResponse::success(id, data)
    }

    /// Processa sincronização delta (fallback para full)
    pub async fn delta(&self, id: u64, payload: SyncDeltaPayload) -> MobileResponse {
         // Implementação simples de delta: retornamos somente registros com updated_at > last_sync
         // Usa deserialização/parse de updated_at (RFC3339) e compara com o timestamp em segundos

         let mut data = HashMap::new();
         let last_sync = payload.last_sync;

         // Products
         let product_repo = ProductRepository::new(&self.pool);
         match product_repo.find_all().await {
             Ok(products) => {
                 let filtered: Vec<_> = products
                     .into_iter()
                     .filter(|p| {
                         if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&p.updated_at) {
                             dt.timestamp() > last_sync
                         } else {
                             false
                         }
                     })
                     .collect();
                 data.insert("products".to_string(), serde_json::to_value(filtered).unwrap_or_default());
             }
             Err(e) => tracing::error!("Erro ao delta products: {}", e),
         }

         // Customers
         let customer_repo = CustomerRepository::new(&self.pool);
         match customer_repo.find_all_active().await {
             Ok(customers) => {
                 let filtered: Vec<_> = customers
                     .into_iter()
                     .filter(|c| {
                         if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&c.updated_at) {
                             dt.timestamp() > last_sync
                         } else {
                             false
                         }
                     })
                     .collect();
                 data.insert("customers".to_string(), serde_json::to_value(filtered).unwrap_or_default());
             }
             Err(e) => tracing::error!("Erro ao delta customers: {}", e),
         }

         // Settings
         let settings_repo = SettingsRepository::new(&self.pool);
         match settings_repo.find_all().await {
             Ok(settings) => {
                 let filtered: Vec<_> = settings
                     .into_iter()
                     .filter(|s| {
                         if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&s.updated_at) {
                             dt.timestamp() > last_sync
                         } else {
                             false
                         }
                     })
                     .collect();
                 data.insert("settings".to_string(), serde_json::to_value(filtered).unwrap_or_default());
             }
             Err(e) => tracing::error!("Erro ao delta settings: {}", e),
         }

         MobileResponse::success(id, data)
    }

    /// Processa criação de venda remota
    pub async fn remote_sale(&self, id: u64, payload: SaleRemoteCreatePayload) -> MobileResponse {
        // O payload.sale vem como JSON Value, precisamos converter para CreateSale
        // Porém, o CreateSale espera structures específicas.
        // Vamos tentar desserializar diretamente para CreateSale

        let create_sale: CreateSale = match serde_json::from_value(payload.sale) {
            Ok(s) => s,
            Err(e) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::ValidationError,
                    format!("Erro ao desserializar venda: {}", e)
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
                    format!("Erro ao criar venda: {}", e)
                )
            }
        }
    }
}
