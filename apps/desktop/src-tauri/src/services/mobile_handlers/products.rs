//! Handler de produtos
//!
//! Processa ações: product.get, product.search, product.create, product.update

use crate::middleware::audit::{AuditAction, AuditService, CreateAuditLog};
use crate::models::{CreateProduct, UpdateProduct};
use crate::repositories::ProductRepository;
use crate::services::mobile_protocol::{
    MobileErrorCode, MobileResponse, ProductGetPayload, ProductSearchPayload,
};
use sqlx::SqlitePool;

/// Handler de produtos
pub struct ProductsHandler {
    pool: SqlitePool,
}

impl ProductsHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    async fn log_audit(
        &self,
        action: AuditAction,
        employee_id: Option<&str>,
        target_id: &str,
        details: String,
    ) {
        let audit_service = AuditService::new(self.pool.clone());
        let _ = audit_service
            .log(CreateAuditLog {
                action,
                employee_id: employee_id.unwrap_or("mobile_system").to_string(),
                employee_name: "Mobile User".to_string(),
                target_type: Some("Product".to_string()),
                target_id: Some(target_id.to_string()),
                details: Some(details),
            })
            .await;
    }

    /// Busca produto por barcode
    pub async fn get(&self, id: u64, payload: ProductGetPayload) -> MobileResponse {
        let repo = ProductRepository::new(&self.pool);

        // Tentar por barcode primeiro
        match repo.find_by_barcode(&payload.barcode).await {
            Ok(Some(product)) => MobileResponse::success(id, product),
            Ok(None) => {
                // Tentar por código interno
                match repo.find_by_internal_code(&payload.barcode).await {
                    Ok(Some(product)) => MobileResponse::success(id, product),
                    Ok(None) => MobileResponse::error(
                        id,
                        MobileErrorCode::NotFound,
                        "Produto não encontrado",
                    ),
                    Err(e) => {
                        tracing::error!("Erro ao buscar produto: {}", e);
                        MobileResponse::error(
                            id,
                            MobileErrorCode::InternalError,
                            "Erro ao buscar produto",
                        )
                    }
                }
            }
            Err(e) => {
                tracing::error!("Erro ao buscar produto: {}", e);
                MobileResponse::error(id, MobileErrorCode::InternalError, "Erro ao buscar produto")
            }
        }
    }

    /// Busca produtos por texto
    pub async fn search(&self, id: u64, payload: ProductSearchPayload) -> MobileResponse {
        let repo = ProductRepository::new(&self.pool);

        let limit = payload.limit.clamp(1, 100);

        let products = match repo.search(&payload.query, limit).await {
            Ok(products) => products,
            Err(e) => {
                tracing::error!("Erro ao buscar produtos: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar produtos",
                );
            }
        };

        // Aplicar filtro se especificado
        let filtered: Vec<_> = if let Some(ref filter) = payload.filter {
            match filter.as_str() {
                "low" => products
                    .into_iter()
                    .filter(|p| p.current_stock <= p.min_stock && p.current_stock > 0.0)
                    .collect(),
                "zero" => products
                    .into_iter()
                    .filter(|p| p.current_stock <= 0.0)
                    .collect(),
                "excess" => products
                    .into_iter()
                    .filter(|p| {
                        if let Some(max) = p.max_stock {
                            p.current_stock > max
                        } else {
                            p.current_stock > p.min_stock * 3.0
                        }
                    })
                    .collect(),
                _ => products,
            }
        } else {
            products
        };

        // Aplicar offset
        let offset = payload.offset.max(0) as usize;
        let result: Vec<_> = filtered.into_iter().skip(offset).collect();

        let has_more = result.len() as i32 >= limit;

        MobileResponse::success(
            id,
            serde_json::json!({
                "products": result,
                "total": result.len(),
                "limit": limit,
                "offset": offset,
                "hasMore": has_more
            }),
        )
    }

    /// Cria novo produto (requer permissão)
    pub async fn create(
        &self,
        id: u64,
        payload: serde_json::Value,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_create_product(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para cadastrar produtos",
            );
        }

        // Deserializar input
        let input: CreateProduct = match serde_json::from_value(payload) {
            Ok(input) => input,
            Err(e) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::ValidationError,
                    format!("Dados inválidos: {}", e),
                );
            }
        };

        let repo = ProductRepository::new(&self.pool);

        match repo.create(input).await {
            Ok(product) => {
                tracing::info!("Produto criado via mobile: {}", product.name);

                self.log_audit(
                    AuditAction::ProductCreated,
                    Some(employee_id),
                    &product.id,
                    format!("Produto criado via mobile: {}", product.name),
                )
                .await;

                MobileResponse::success(id, product)
            }
            Err(e) => {
                tracing::error!("Erro ao criar produto: {}", e);
                MobileResponse::error(id, MobileErrorCode::InternalError, "Erro ao criar produto")
            }
        }
    }

    /// Atualiza produto (requer permissão)
    pub async fn update(
        &self,
        id: u64,
        payload: serde_json::Value,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_update_product(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para atualizar produtos",
            );
        }

        // Extrair product_id e input
        let product_id = match payload.get("productId").and_then(|v| v.as_str()) {
            Some(id) => id.to_string(),
            None => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::ValidationError,
                    "productId é obrigatório",
                );
            }
        };

        let input: UpdateProduct = match serde_json::from_value(payload) {
            Ok(input) => input,
            Err(e) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::ValidationError,
                    format!("Dados inválidos: {}", e),
                );
            }
        };

        let repo = ProductRepository::new(&self.pool);

        match repo.update(&product_id, input).await {
            Ok(product) => {
                tracing::info!("Produto atualizado via mobile: {}", product.name);

                self.log_audit(
                    AuditAction::ProductUpdated,
                    Some(employee_id),
                    &product.id,
                    format!("Produto atualizado via mobile: {}", product.name),
                )
                .await;

                MobileResponse::success(id, product)
            }
            Err(e) => {
                tracing::error!("Erro ao atualizar produto: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao atualizar produto",
                )
            }
        }
    }
}

/// Verifica se role pode criar produtos
fn can_create_product(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "STOCKER"
    )
}

/// Verifica se role pode atualizar produtos
fn can_update_product(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "STOCKER"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permissions() {
        assert!(can_create_product("ADMIN"));
        assert!(can_create_product("MANAGER"));
        assert!(can_create_product("STOCKER"));
        assert!(!can_create_product("CASHIER"));
        assert!(!can_create_product("VIEWER"));
    }
}
