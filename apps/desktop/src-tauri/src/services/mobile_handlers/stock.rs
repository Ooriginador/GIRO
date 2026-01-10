//! Handler de estoque
//!
//! Processa ações: stock.adjust, stock.list, stock.history

use crate::models::{StockMovement, StockMovementType};
use crate::repositories::{ProductRepository, StockRepository};
use crate::services::mobile_protocol::{MobileErrorCode, MobileResponse, StockAdjustPayload};
use sqlx::SqlitePool;

/// Handler de estoque
pub struct StockHandler {
    pool: SqlitePool,
}

impl StockHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Ajusta estoque de produto
    pub async fn adjust(
        &self,
        id: u64,
        payload: StockAdjustPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_adjust_stock(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para ajustar estoque",
            );
        }

        // Validar quantidade
        if payload.quantity == 0.0 {
            return MobileResponse::error(
                id,
                MobileErrorCode::ValidationError,
                "Quantidade deve ser diferente de zero",
            );
        }

        let product_repo = ProductRepository::new(&self.pool);
        let stock_repo = StockRepository::new(&self.pool);

        // Buscar produto
        let product = match product_repo.find_by_id(&payload.product_id).await {
            Ok(Some(p)) => p,
            Ok(None) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::NotFound,
                    "Produto não encontrado",
                );
            }
            Err(e) => {
                tracing::error!("Erro ao buscar produto: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar produto",
                );
            }
        };

        // Determinar tipo de movimento
        let movement_type = parse_movement_type(&payload.movement_type);

        // Calcular nova quantidade
        let new_stock = match movement_type {
            StockMovementType::Entry
            | StockMovementType::Adjustment
            | StockMovementType::Return
            | StockMovementType::Transfer => product.current_stock + payload.quantity.abs(),

            StockMovementType::Exit
            | StockMovementType::Sale
            | StockMovementType::Shrinkage
            | StockMovementType::Expiration => {
                let qty = payload.quantity.abs();
                if product.current_stock < qty && !payload.allow_negative.unwrap_or(false) {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::InsufficientStock,
                        format!(
                            "Estoque insuficiente: {} disponível, {} solicitado",
                            product.current_stock, qty
                        ),
                    );
                }
                product.current_stock - qty
            }
        };

        // Criar movimento
        let movement = StockMovement {
            id: uuid::Uuid::new_v4().to_string(),
            product_id: payload.product_id.clone(),
            lot_id: payload.lot_id.clone(),
            movement_type: movement_type.clone(),
            quantity: payload.quantity,
            previous_stock: product.current_stock,
            new_stock,
            reason: payload.reason.clone(),
            employee_id: employee_id.to_string(),
            created_at: chrono::Utc::now(),
        };

        // Executar ajuste em transação
        match stock_repo
            .create_movement_and_update_stock(&movement, new_stock)
            .await
        {
            Ok(_) => {
                tracing::info!(
                    "Estoque ajustado via mobile: {} -> {} ({})",
                    product.name,
                    new_stock,
                    payload.quantity
                );

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "productId": payload.product_id,
                        "previousStock": product.current_stock,
                        "newStock": new_stock,
                        "adjustment": payload.quantity,
                        "movementType": format!("{:?}", movement_type),
                        "movementId": movement.id
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao ajustar estoque: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao ajustar estoque",
                )
            }
        }
    }

    /// Lista produtos com estoque baixo/zerado
    pub async fn list(
        &self,
        id: u64,
        filter: Option<String>,
        limit: i32,
        offset: i32,
    ) -> MobileResponse {
        let product_repo = ProductRepository::new(&self.pool);

        let products = match filter.as_deref() {
            Some("low") => product_repo.list_low_stock(limit, offset).await,
            Some("zero") => product_repo.list_zero_stock(limit, offset).await,
            Some("excess") => product_repo.list_excess_stock(limit, offset).await,
            _ => product_repo.list_all(limit, offset).await,
        };

        match products {
            Ok(list) => {
                let has_more = list.len() as i32 >= limit;
                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "products": list,
                        "total": list.len(),
                        "limit": limit,
                        "offset": offset,
                        "hasMore": has_more
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao listar estoque: {}", e);
                MobileResponse::error(id, MobileErrorCode::InternalError, "Erro ao listar estoque")
            }
        }
    }

    /// Histórico de movimentos de um produto
    pub async fn history(&self, id: u64, product_id: &str, limit: i32) -> MobileResponse {
        let stock_repo = StockRepository::new(&self.pool);

        match stock_repo.get_movements_by_product(product_id, limit).await {
            Ok(movements) => MobileResponse::success(
                id,
                serde_json::json!({
                    "productId": product_id,
                    "movements": movements,
                    "total": movements.len()
                }),
            ),
            Err(e) => {
                tracing::error!("Erro ao buscar histórico: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar histórico",
                )
            }
        }
    }
}

/// Converte string para tipo de movimento
fn parse_movement_type(s: &str) -> StockMovementType {
    match s.to_lowercase().as_str() {
        "entry" | "entrada" => StockMovementType::Entry,
        "exit" | "saida" => StockMovementType::Exit,
        "sale" | "venda" => StockMovementType::Sale,
        "return" | "devolucao" => StockMovementType::Return,
        "adjustment" | "ajuste" => StockMovementType::Adjustment,
        "transfer" | "transferencia" => StockMovementType::Transfer,
        "shrinkage" | "quebra" => StockMovementType::Shrinkage,
        "expiration" | "vencimento" => StockMovementType::Expiration,
        _ => StockMovementType::Adjustment,
    }
}

/// Verifica se role pode ajustar estoque
fn can_adjust_stock(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "STOCKER"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_movement_type() {
        assert!(matches!(
            parse_movement_type("entry"),
            StockMovementType::Entry
        ));
        assert!(matches!(
            parse_movement_type("ENTRADA"),
            StockMovementType::Entry
        ));
        assert!(matches!(
            parse_movement_type("sale"),
            StockMovementType::Sale
        ));
        assert!(matches!(
            parse_movement_type("unknown"),
            StockMovementType::Adjustment
        ));
    }

    #[test]
    fn test_permissions() {
        assert!(can_adjust_stock("ADMIN"));
        assert!(can_adjust_stock("STOCKER"));
        assert!(!can_adjust_stock("CASHIER"));
    }
}
