//! Handler de inventário
//!
//! Processa ações: inventory.start, inventory.count, inventory.finish, inventory.cancel, inventory.status

use crate::models::{Inventory, InventoryItem, InventoryStatus};
use crate::repositories::InventoryRepository;
use crate::services::mobile_protocol::{
    InventoryCountPayload, InventoryStartPayload, MobileErrorCode, MobileResponse,
};
use sqlx::SqlitePool;

/// Handler de inventário
pub struct InventoryHandler {
    pool: SqlitePool,
}

impl InventoryHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Inicia novo inventário
    pub async fn start(
        &self,
        id: u64,
        payload: InventoryStartPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_manage_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para iniciar inventário",
            );
        }

        let repo = InventoryRepository::new(&self.pool);

        // Verificar se já existe inventário em andamento
        if let Ok(Some(existing)) = repo.get_in_progress().await {
            return MobileResponse::error(
                id,
                MobileErrorCode::InventoryInProgress,
                format!("Já existe inventário em andamento: {}", existing.id),
            );
        }

        // Criar inventário
        let inventory = Inventory {
            id: uuid::Uuid::new_v4().to_string(),
            name: payload.name.unwrap_or_else(|| {
                format!("Inventário {}", chrono::Local::now().format("%d/%m/%Y"))
            }),
            description: payload.description,
            status: InventoryStatus::InProgress,
            category_filter: payload.category_id,
            section_filter: payload.section,
            started_at: chrono::Utc::now(),
            finished_at: None,
            started_by: employee_id.to_string(),
            finished_by: None,
            total_products: 0,
            counted_products: 0,
            divergent_products: 0,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        match repo.create(&inventory).await {
            Ok(_) => {
                tracing::info!("Inventário iniciado via mobile: {}", inventory.id);

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": inventory.id,
                        "name": inventory.name,
                        "status": "in_progress",
                        "startedAt": inventory.started_at
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao criar inventário: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao iniciar inventário",
                )
            }
        }
    }

    /// Registra contagem de produto
    pub async fn count(
        &self,
        id: u64,
        payload: InventoryCountPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_count_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para contar inventário",
            );
        }

        let repo = InventoryRepository::new(&self.pool);

        // Verificar se inventário existe e está em andamento
        let inventory = match repo.get_by_id(&payload.inventory_id).await {
            Ok(Some(inv)) => inv,
            Ok(None) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::NotFound,
                    "Inventário não encontrado",
                );
            }
            Err(e) => {
                tracing::error!("Erro ao buscar inventário: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar inventário",
                );
            }
        };

        if inventory.status != InventoryStatus::InProgress {
            return MobileResponse::error(
                id,
                MobileErrorCode::InvalidState,
                "Inventário não está em andamento",
            );
        }

        // Validar quantidade
        if payload.counted_quantity < 0.0 {
            return MobileResponse::error(
                id,
                MobileErrorCode::ValidationError,
                "Quantidade não pode ser negativa",
            );
        }

        // Buscar estoque esperado
        let expected = repo
            .get_expected_stock(&payload.product_id)
            .await
            .unwrap_or(0.0);

        let divergence = payload.counted_quantity - expected;

        // Criar item de contagem
        let item = InventoryItem {
            id: uuid::Uuid::new_v4().to_string(),
            inventory_id: payload.inventory_id.clone(),
            product_id: payload.product_id.clone(),
            lot_id: payload.lot_id.clone(),
            expected_quantity: expected,
            counted_quantity: payload.counted_quantity,
            divergence,
            notes: payload.notes.clone(),
            counted_by: employee_id.to_string(),
            counted_at: chrono::Utc::now(),
            created_at: chrono::Utc::now(),
        };

        match repo.add_count(&item).await {
            Ok(_) => {
                tracing::info!(
                    "Contagem registrada: produto={}, contado={}, esperado={}, divergência={}",
                    payload.product_id,
                    payload.counted_quantity,
                    expected,
                    divergence
                );

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": payload.inventory_id,
                        "productId": payload.product_id,
                        "expectedQuantity": expected,
                        "countedQuantity": payload.counted_quantity,
                        "divergence": divergence,
                        "hasDivergence": divergence.abs() > 0.001
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao registrar contagem: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao registrar contagem",
                )
            }
        }
    }

    /// Finaliza inventário
    pub async fn finish(
        &self,
        id: u64,
        inventory_id: &str,
        apply_adjustments: bool,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_manage_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para finalizar inventário",
            );
        }

        let repo = InventoryRepository::new(&self.pool);

        // Verificar inventário
        let inventory = match repo.get_by_id(inventory_id).await {
            Ok(Some(inv)) => inv,
            Ok(None) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::NotFound,
                    "Inventário não encontrado",
                );
            }
            Err(e) => {
                tracing::error!("Erro ao buscar inventário: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar inventário",
                );
            }
        };

        if inventory.status != InventoryStatus::InProgress {
            return MobileResponse::error(
                id,
                MobileErrorCode::InvalidState,
                "Inventário não está em andamento",
            );
        }

        // Finalizar e aplicar ajustes se solicitado
        match repo
            .finish(inventory_id, employee_id, apply_adjustments)
            .await
        {
            Ok(summary) => {
                tracing::info!(
                    "Inventário finalizado: id={}, divergências={}, ajustes_aplicados={}",
                    inventory_id,
                    summary.divergent_count,
                    apply_adjustments
                );

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": inventory_id,
                        "status": "finished",
                        "totalProducts": summary.total_products,
                        "countedProducts": summary.counted_products,
                        "divergentProducts": summary.divergent_count,
                        "adjustmentsApplied": apply_adjustments,
                        "finishedAt": chrono::Utc::now()
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao finalizar inventário: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao finalizar inventário",
                )
            }
        }
    }

    /// Cancela inventário
    pub async fn cancel(
        &self,
        id: u64,
        inventory_id: &str,
        reason: Option<String>,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_manage_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para cancelar inventário",
            );
        }

        let repo = InventoryRepository::new(&self.pool);

        match repo.cancel(inventory_id, reason.as_deref()).await {
            Ok(_) => {
                tracing::info!("Inventário cancelado: {}", inventory_id);

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": inventory_id,
                        "status": "cancelled",
                        "reason": reason
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao cancelar inventário: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao cancelar inventário",
                )
            }
        }
    }

    /// Status do inventário em andamento
    pub async fn status(&self, id: u64) -> MobileResponse {
        let repo = InventoryRepository::new(&self.pool);

        match repo.get_in_progress().await {
            Ok(Some(inventory)) => {
                // Buscar progresso
                let progress = repo.get_progress(&inventory.id).await.unwrap_or_default();

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": inventory.id,
                        "name": inventory.name,
                        "status": "in_progress",
                        "startedAt": inventory.started_at,
                        "totalProducts": progress.total,
                        "countedProducts": progress.counted,
                        "divergentProducts": progress.divergent,
                        "progress": if progress.total > 0 {
                            (progress.counted as f64 / progress.total as f64 * 100.0) as i32
                        } else {
                            0
                        }
                    }),
                )
            }
            Ok(None) => MobileResponse::success(
                id,
                serde_json::json!({
                    "inventoryId": null,
                    "status": "none",
                    "message": "Nenhum inventário em andamento"
                }),
            ),
            Err(e) => {
                tracing::error!("Erro ao buscar status: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar status do inventário",
                )
            }
        }
    }
}

/// Verifica se role pode gerenciar inventário
fn can_manage_inventory(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "STOCKER"
    )
}

/// Verifica se role pode contar inventário
fn can_count_inventory(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "STOCKER" | "CASHIER"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permissions() {
        assert!(can_manage_inventory("ADMIN"));
        assert!(can_manage_inventory("STOCKER"));
        assert!(!can_manage_inventory("CASHIER"));

        assert!(can_count_inventory("CASHIER"));
        assert!(can_count_inventory("STOCKER"));
        assert!(!can_count_inventory("VIEWER"));
    }
}
