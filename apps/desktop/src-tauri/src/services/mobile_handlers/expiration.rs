//! Handler de validades
//!
//! Processa ações: expiration.list, expiration.action

use crate::models::{ExpirationAction, ProductLotWithProduct};
use crate::repositories::{ProductLotRepository, StockRepository};
use crate::services::mobile_protocol::{
    ExpirationActionPayload, ExpirationListPayload, MobileErrorCode, MobileResponse,
};
use sqlx::SqlitePool;

/// Handler de validades
pub struct ExpirationHandler {
    pool: SqlitePool,
}

impl ExpirationHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Lista produtos por situação de validade
    pub async fn list(&self, id: u64, payload: ExpirationListPayload) -> MobileResponse {
        let repo = ProductLotRepository::new(&self.pool);

        let days = payload.days.unwrap_or(30);
        let limit = payload.limit.unwrap_or(50).min(100);
        let offset = payload.offset.unwrap_or(0);

        let lots = match payload.filter.as_deref() {
            Some("expired") => repo.list_expired(limit, offset).await,
            Some("critical") => repo.list_expiring_within(7, limit, offset).await,
            Some("warning") => repo.list_expiring_within(days, limit, offset).await,
            Some("ok") => repo.list_valid(limit, offset).await,
            _ => repo.list_expiring_within(days, limit, offset).await,
        };

        match lots {
            Ok(list) => {
                // Enriquecer com status calculado
                let enriched: Vec<serde_json::Value> = list
                    .iter()
                    .map(|lot| {
                        let status = calculate_expiration_status(lot);
                        let days_until = lot
                            .expiration_date
                            .as_ref()
                            .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                            .map(|d| {
                                (d.with_timezone(&chrono::Utc) - chrono::Utc::now()).num_days()
                            })
                            .unwrap_or(i64::MAX);

                        serde_json::json!({
                            "lotId": lot.id,
                            "productId": lot.product_id,
                            "productName": lot.product_name,
                            "barcode": lot.barcode,
                            "lotNumber": lot.lot_number,
                            "quantity": lot.quantity,
                            "expirationDate": lot.expiration_date,
                            "daysUntilExpiration": days_until,
                            "status": status,
                            "costPrice": lot.cost_price,
                            "totalValue": lot.quantity * lot.cost_price
                        })
                    })
                    .collect();

                // Agrupar por status para resumo
                let expired_count = enriched.iter().filter(|l| l["status"] == "expired").count();
                let critical_count = enriched
                    .iter()
                    .filter(|l| l["status"] == "critical")
                    .count();
                let warning_count = enriched.iter().filter(|l| l["status"] == "warning").count();

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "lots": enriched,
                        "total": enriched.len(),
                        "summary": {
                            "expired": expired_count,
                            "critical": critical_count,
                            "warning": warning_count
                        },
                        "limit": limit,
                        "offset": offset,
                        "hasMore": enriched.len() as i32 >= limit
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao listar validades: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao listar validades",
                )
            }
        }
    }

    /// Executa ação sobre produto vencido/a vencer
    pub async fn action(
        &self,
        id: u64,
        payload: ExpirationActionPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        // Verificar permissão
        if !can_manage_expiration(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para gerenciar validades",
            );
        }

        let lot_repo = ProductLotRepository::new(&self.pool);
        let stock_repo = StockRepository::new(&self.pool);

        // Buscar lote
        let lot = match lot_repo.get_by_id(&payload.lot_id).await {
            Ok(Some(lot)) => lot,
            Ok(None) => {
                return MobileResponse::error(id, MobileErrorCode::NotFound, "Lote não encontrado");
            }
            Err(e) => {
                tracing::error!("Erro ao buscar lote: {}", e);
                return MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar lote",
                );
            }
        };

        let action = parse_action(&payload.action);

        match action {
            ExpirationAction::WriteOff => {
                // Dar baixa total no lote
                match stock_repo
                    .write_off_lot(
                        &lot.id,
                        &lot.product_id,
                        lot.quantity,
                        employee_id,
                        "Vencimento - baixa via mobile",
                    )
                    .await
                {
                    Ok(_) => {
                        tracing::info!(
                            "Baixa de validade: lote={}, qtd={}, produto={}",
                            lot.id,
                            lot.quantity,
                            lot.product_id
                        );

                        MobileResponse::success(
                            id,
                            serde_json::json!({
                                "lotId": lot.id,
                                "productId": lot.product_id,
                                "action": "writeoff",
                                "quantityRemoved": lot.quantity,
                                "success": true
                            }),
                        )
                    }
                    Err(e) => {
                        tracing::error!("Erro ao dar baixa: {}", e);
                        MobileResponse::error(
                            id,
                            MobileErrorCode::InternalError,
                            "Erro ao dar baixa no lote",
                        )
                    }
                }
            }

            ExpirationAction::Discount => {
                // Aplicar desconto ao produto
                let discount = payload.discount_percent.unwrap_or(30.0);

                match lot_repo.apply_discount(&lot.id, discount).await {
                    Ok(_) => {
                        tracing::info!(
                            "Desconto aplicado: lote={}, desconto={}%",
                            lot.id,
                            discount
                        );

                        MobileResponse::success(
                            id,
                            serde_json::json!({
                                "lotId": lot.id,
                                "productId": lot.product_id,
                                "action": "discount",
                                "discountPercent": discount,
                                "success": true
                            }),
                        )
                    }
                    Err(e) => {
                        tracing::error!("Erro ao aplicar desconto: {}", e);
                        MobileResponse::error(
                            id,
                            MobileErrorCode::InternalError,
                            "Erro ao aplicar desconto",
                        )
                    }
                }
            }

            ExpirationAction::Transfer => {
                // Registrar para transferência/doação
                match lot_repo
                    .mark_for_transfer(&lot.id, payload.notes.as_deref())
                    .await
                {
                    Ok(_) => {
                        tracing::info!("Lote marcado para transferência: {}", lot.id);

                        MobileResponse::success(
                            id,
                            serde_json::json!({
                                "lotId": lot.id,
                                "productId": lot.product_id,
                                "action": "transfer",
                                "success": true
                            }),
                        )
                    }
                    Err(e) => {
                        tracing::error!("Erro ao marcar transferência: {}", e);
                        MobileResponse::error(
                            id,
                            MobileErrorCode::InternalError,
                            "Erro ao marcar para transferência",
                        )
                    }
                }
            }

            ExpirationAction::Ignore => {
                // Apenas registrar que foi verificado
                match lot_repo.mark_verified(&lot.id, employee_id).await {
                    Ok(_) => {
                        tracing::info!("Lote verificado e ignorado: {}", lot.id);

                        MobileResponse::success(
                            id,
                            serde_json::json!({
                                "lotId": lot.id,
                                "productId": lot.product_id,
                                "action": "ignore",
                                "success": true
                            }),
                        )
                    }
                    Err(e) => {
                        tracing::error!("Erro ao marcar verificado: {}", e);
                        MobileResponse::error(
                            id,
                            MobileErrorCode::InternalError,
                            "Erro ao registrar verificação",
                        )
                    }
                }
            }
        }
    }
}

/// Calcula status de validade do lote
fn calculate_expiration_status(lot: &ProductLotWithProduct) -> &'static str {
    let Some(ref exp_date_str) = lot.expiration_date else {
        return "ok";
    };

    // Parse da data de expiração (formato ISO 8601)
    let exp_date = match chrono::DateTime::parse_from_rfc3339(exp_date_str) {
        Ok(d) => d.with_timezone(&chrono::Utc),
        Err(_) => return "ok",
    };

    let now = chrono::Utc::now();
    let days_until = (exp_date - now).num_days();

    match days_until {
        d if d < 0 => "expired",
        d if d <= 7 => "critical",
        d if d <= 30 => "warning",
        _ => "ok",
    }
}

/// Converte string para ação
fn parse_action(s: &str) -> ExpirationAction {
    match s.to_lowercase().as_str() {
        "writeoff" | "baixa" | "write_off" => ExpirationAction::WriteOff,
        "discount" | "desconto" => ExpirationAction::Discount,
        "transfer" | "transferencia" | "doacao" => ExpirationAction::Transfer,
        "ignore" | "ignorar" => ExpirationAction::Ignore,
        _ => ExpirationAction::Ignore,
    }
}

/// Verifica se role pode gerenciar validades
fn can_manage_expiration(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "STOCKER"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_action() {
        assert!(matches!(
            parse_action("writeoff"),
            ExpirationAction::WriteOff
        ));
        assert!(matches!(
            parse_action("DESCONTO"),
            ExpirationAction::Discount
        ));
        assert!(matches!(
            parse_action("transfer"),
            ExpirationAction::Transfer
        ));
        assert!(matches!(parse_action("unknown"), ExpirationAction::Ignore));
    }

    #[test]
    fn test_permissions() {
        assert!(can_manage_expiration("ADMIN"));
        assert!(can_manage_expiration("STOCKER"));
        assert!(!can_manage_expiration("CASHIER"));
    }
}
