//! Handler de sincronização PC-to-PC
//!
//! Processa ações: sync.full, sync.delta, sale.remote_create

use crate::models::CreateSale;
use crate::repositories::{SaleRepository, ProductRepository, CustomerRepository, SettingsRepository};
use crate::services::mobile_protocol::{
    MobileErrorCode, MobileResponse, SyncFullPayload, SyncDeltaPayload, SaleRemoteCreatePayload,
};
use sqlx::SqlitePool;
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
                    match repo.search("", 99999).await { // TODO: Implement specific full dump method if needed
                         Ok(products) => {
                             data.insert("products".to_string(), serde_json::to_value(products).unwrap_or_default());
                         },
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

    /// Processa sincronização delta (por enquanto retorna full, TODO: implementar delta real)
    pub async fn delta(&self, id: u64, _payload: SyncDeltaPayload) -> MobileResponse {
         // Por enquanto, retorna vazio ou erro, ou reusa o full.
         // Para simplificar a primeira versão, vamos retornar 'not implemented' ou tratar como full
         // Mas como o mobile pode pedir, vamos retornar sucesso vazio por enquanto
         MobileResponse::success(id, serde_json::json!({
             "message": "Delta sync not yet implemented, please request full sync"
         }))
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
