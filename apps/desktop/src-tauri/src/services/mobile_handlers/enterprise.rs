//! Handlers Enterprise para Requisições e Transferências
//!
//! Processa ações: enterprise.request.*, enterprise.transfer.*, enterprise.context.*

use crate::middleware::audit::{AuditAction, AuditService, CreateAuditLog};
use crate::models::enterprise::{
    AddRequestItem, AddTransferItem, CreateEnterpriseInventoryCount, CreateMaterialRequest,
    CreateStockTransfer, RequestFilters, UpdateMaterialRequest, UpdateStockTransfer,
};
use crate::repositories::{
    ContractRepository, EnterpriseInventoryRepository, MaterialRequestRepository, Pagination,
    StockLocationRepository, StockTransferRepository,
};
use crate::services::mobile_protocol::{MobileErrorCode, MobileResponse};
use serde::Deserialize;
use sqlx::SqlitePool;

// ============================================================================
// Payloads - Request
// ============================================================================

/// Payload para listar requisições
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestListPayload {
    pub status: Option<String>,
    pub contract_id: Option<String>,
    pub limit: Option<i32>,
    pub page: Option<i32>,
}

/// Payload para criar requisição
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequestPayload {
    pub contract_id: String,
    pub activity_id: Option<String>,
    pub priority: Option<String>,
    pub notes: Option<String>,
}

/// Payload para atualizar requisição
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRequestPayload {
    pub request_id: String,
    pub priority: Option<String>,
    pub needed_date: Option<String>,
    pub destination_location_id: Option<String>,
    pub work_front_id: Option<String>,
    pub activity_id: Option<String>,
    pub notes: Option<String>,
}

/// Payload para adicionar item
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddItemPayload {
    pub request_id: String,
    pub product_id: String,
    pub quantity: f64,
    pub notes: Option<String>,
}

/// Payload para submeter requisição
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitRequestPayload {
    pub request_id: String,
}

/// Payload para aprovar requisição
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveRequestPayload {
    pub request_id: String,
    pub notes: Option<String>,
}

/// Payload para rejeitar requisição
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RejectRequestPayload {
    pub request_id: String,
    pub reason: String,
}

// ============================================================================
// Payloads - Transfer
// ============================================================================

/// Payload para listar transferências
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferListPayload {
    pub status: Option<String>,
    pub from_location_id: Option<String>,
    pub to_location_id: Option<String>,
    pub limit: Option<i32>,
    pub page: Option<i32>,
}

/// Payload para criar transferência
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTransferPayload {
    pub from_location_id: String,
    pub to_location_id: String,
    pub notes: Option<String>,
}

/// Payload para atualizar transferência
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTransferPayload {
    pub transfer_id: String,
    pub from_location_id: Option<String>,
    pub to_location_id: Option<String>,
    pub notes: Option<String>,
}

/// Payload para adicionar item à transferência
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTransferItemPayload {
    pub transfer_id: String,
    pub product_id: String,
    pub quantity: f64,
    pub lot_number: Option<String>,
    pub notes: Option<String>,
}

/// Payload para despachar transferência
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipTransferPayload {
    pub transfer_id: String,
}

/// Payload para receber transferência
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiveTransferPayload {
    pub transfer_id: String,
    pub items: Option<Vec<ReceiveItemPayload>>,
}

/// Payload para item recebido
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiveItemPayload {
    pub item_id: String,
    pub received_quantity: f64,
}

// ============================================================================
// Enterprise Request Handler
// ============================================================================

/// Handler para requisições de material
pub struct EnterpriseRequestHandler {
    pool: SqlitePool,
}

impl EnterpriseRequestHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Audit helper
    async fn log_audit(
        &self,
        action: AuditAction,
        user_id: &str,
        entity_id: &str,
        details: String,
    ) {
        let audit_service = AuditService::new(self.pool.clone());
        let _ = audit_service
            .log(CreateAuditLog {
                action,
                employee_id: user_id.to_string(),
                employee_name: "Mobile User".to_string(),
                target_type: Some("MaterialRequest".to_string()),
                target_id: Some(entity_id.to_string()),
                details: Some(details),
            })
            .await;
    }

    /// Lista requisições paginadas
    pub async fn list(
        &self,
        id: u64,
        payload: RequestListPayload,
        _employee_id: &str,
        _employee_role: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        let filters = RequestFilters {
            status: payload.status,
            contract_id: payload.contract_id,
            ..Default::default()
        };

        let pagination = Pagination {
            page: payload.page.unwrap_or(1),
            per_page: payload.limit.unwrap_or(20),
        };

        match repo.find_paginated(&pagination, &filters).await {
            Ok(result) => MobileResponse::success(
                id,
                serde_json::json!({
                    "requests": result.data,
                    "total": result.total,
                    "page": pagination.page,
                    "perPage": pagination.per_page
                }),
            ),
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Obtém requisição por ID
    pub async fn get(&self, id: u64, request_id: &str) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        match repo.find_by_id(request_id).await {
            Ok(Some(request)) => {
                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Ok(None) => {
                MobileResponse::error(id, MobileErrorCode::NotFound, "Requisição não encontrada")
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Cria nova requisição
    pub async fn create(
        &self,
        id: u64,
        payload: CreateRequestPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        let input = CreateMaterialRequest {
            contract_id: payload.contract_id,
            work_front_id: None,
            activity_id: payload.activity_id,
            priority: payload.priority,
            needed_date: None,
            source_location_id: None,
            destination_location_id: None,
            notes: payload.notes,
        };

        match repo.create(input, employee_id).await {
            Ok(request) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &request.id,
                    format!("Requisição criada via mobile: {}", request.request_number),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Atualiza requisição
    pub async fn update(
        &self,
        id: u64,
        payload: UpdateRequestPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        let input = UpdateMaterialRequest {
            priority: payload.priority,
            needed_date: payload.needed_date,
            work_front_id: payload.work_front_id,
            activity_id: payload.activity_id,
            destination_location_id: payload.destination_location_id,
            notes: payload.notes,
        };

        match repo.update(&payload.request_id, input).await {
            Ok(request) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &request.id,
                    format!(
                        "Requisição atualizada via mobile: {}",
                        request.request_number
                    ),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Adiciona item à requisição
    pub async fn add_item(
        &self,
        id: u64,
        payload: AddItemPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        let input = AddRequestItem {
            product_id: payload.product_id.clone(),
            requested_qty: payload.quantity,
            notes: payload.notes,
        };

        match repo.add_item(&payload.request_id, input).await {
            Ok(item) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &payload.request_id,
                    format!("Item adicionado: {}", payload.product_id),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "item": item }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Remove item da requisição
    pub async fn remove_item(
        &self,
        id: u64,
        request_id: &str,
        item_id: &str,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        match repo.remove_item(request_id, item_id).await {
            Ok(_) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    request_id,
                    format!("Item removido: {}", item_id),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "success": true }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Submete requisição para aprovação
    pub async fn submit(
        &self,
        id: u64,
        payload: SubmitRequestPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        match repo.submit(&payload.request_id).await {
            Ok(request) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &request.id,
                    "Requisição submetida para aprovação".to_string(),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Aprova requisição
    pub async fn approve(
        &self,
        id: u64,
        payload: ApproveRequestPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_approve_requests(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para aprovar requisições",
            );
        }

        let service = crate::services::enterprise::EnterpriseService::new(&self.pool);

        match service
            .approve_request_fully(&payload.request_id, employee_id)
            .await
        {
            Ok(request) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &request.id,
                    "Requisição aprovada".to_string(),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Rejeita requisição
    pub async fn reject(
        &self,
        id: u64,
        payload: RejectRequestPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_approve_requests(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para rejeitar requisições",
            );
        }

        let repo = MaterialRequestRepository::new(&self.pool);

        match repo
            .reject(&payload.request_id, employee_id, &payload.reason)
            .await
        {
            Ok(request) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &request.id,
                    format!("Requisição rejeitada: {}", payload.reason),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Cancela requisição
    pub async fn cancel(
        &self,
        id: u64,
        request_id: &str,
        reason: Option<String>,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = MaterialRequestRepository::new(&self.pool);

        match repo.cancel(request_id).await {
            Ok(request) => {
                let reason_msg = reason.unwrap_or_else(|| "Sem motivo".to_string());
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &request.id,
                    format!("Requisição cancelada: {}", reason_msg),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "request": request }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }
}

// ============================================================================
// Enterprise Transfer Handler
// ============================================================================

/// Handler para transferências de estoque
pub struct EnterpriseTransferHandler {
    pool: SqlitePool,
}

impl EnterpriseTransferHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Audit helper
    async fn log_audit(
        &self,
        action: AuditAction,
        user_id: &str,
        entity_id: &str,
        details: String,
    ) {
        let audit_service = AuditService::new(self.pool.clone());
        let _ = audit_service
            .log(CreateAuditLog {
                action,
                employee_id: user_id.to_string(),
                employee_name: "Mobile User".to_string(),
                target_type: Some("StockTransfer".to_string()),
                target_id: Some(entity_id.to_string()),
                details: Some(details),
            })
            .await;
    }

    /// Lista transferências paginadas
    pub async fn list(
        &self,
        id: u64,
        payload: TransferListPayload,
        _employee_id: &str,
        _employee_role: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        let pagination = Pagination {
            page: payload.page.unwrap_or(1),
            per_page: payload.limit.unwrap_or(20),
        };

        match repo
            .find_paginated(
                &pagination,
                payload.status.as_deref(),
                payload.from_location_id.as_deref(),
                payload.to_location_id.as_deref(),
            )
            .await
        {
            Ok(result) => MobileResponse::success(
                id,
                serde_json::json!({
                    "transfers": result.data,
                    "total": result.total,
                    "page": pagination.page,
                    "perPage": pagination.per_page
                }),
            ),
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Obtém transferência por ID
    pub async fn get(&self, id: u64, transfer_id: &str) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        match repo.find_by_id(transfer_id).await {
            Ok(Some(transfer)) => {
                MobileResponse::success(id, serde_json::json!({ "transfer": transfer }))
            }
            Ok(None) => MobileResponse::error(
                id,
                MobileErrorCode::NotFound,
                "Transferência não encontrada",
            ),
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Cria nova transferência
    pub async fn create(
        &self,
        id: u64,
        payload: CreateTransferPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        let input = CreateStockTransfer {
            source_location_id: payload.from_location_id,
            destination_location_id: payload.to_location_id,
            notes: payload.notes,
        };

        match repo.create(input, employee_id).await {
            Ok(transfer) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &transfer.id,
                    format!("Transferência criada: {}", transfer.transfer_number),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "transfer": transfer }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Atualiza transferência
    pub async fn update(
        &self,
        id: u64,
        payload: UpdateTransferPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        let input = UpdateStockTransfer {
            source_location_id: payload.from_location_id,
            destination_location_id: payload.to_location_id,
            notes: payload.notes,
        };

        match repo.update(&payload.transfer_id, input).await {
            Ok(transfer) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &transfer.id,
                    format!("Transferência atualizada: {}", transfer.transfer_number),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "transfer": transfer }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Adiciona item à transferência
    pub async fn add_item(
        &self,
        id: u64,
        payload: AddTransferItemPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        let input = AddTransferItem {
            product_id: payload.product_id.clone(),
            requested_qty: payload.quantity,
            notes: payload.notes,
        };

        match repo.add_item(&payload.transfer_id, input).await {
            Ok(item) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &payload.transfer_id,
                    format!("Item adicionado: {}", payload.product_id),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "item": item }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Remove item da transferência
    pub async fn remove_item(
        &self,
        id: u64,
        transfer_id: &str,
        item_id: &str,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        match repo.remove_item(transfer_id, item_id).await {
            Ok(_) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    transfer_id,
                    format!("Item removido: {}", item_id),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "success": true }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Despacha transferência
    pub async fn ship(
        &self,
        id: u64,
        payload: ShipTransferPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        match repo.ship(&payload.transfer_id, employee_id).await {
            Ok(transfer) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &transfer.id,
                    "Transferência despachada".to_string(),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "transfer": transfer }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Recebe transferência
    pub async fn receive(
        &self,
        id: u64,
        payload: ReceiveTransferPayload,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        // Se houver itens com quantidades específicas, atualiza antes de finalizar
        if let Some(items) = &payload.items {
            for item in items {
                if let Err(e) = repo
                    .update_item_received_qty(&item.item_id, item.received_quantity)
                    .await
                {
                    return MobileResponse::error(
                        id,
                        MobileErrorCode::InternalError,
                        format!("Erro ao atualizar item: {}", e),
                    );
                }
            }
        }

        match repo.receive(&payload.transfer_id, employee_id).await {
            Ok(transfer) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &transfer.id,
                    "Transferência recebida".to_string(),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "transfer": transfer }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Cancela transferência
    pub async fn cancel(
        &self,
        id: u64,
        transfer_id: &str,
        reason: Option<String>,
        employee_id: &str,
    ) -> MobileResponse {
        let repo = StockTransferRepository::new(&self.pool);

        match repo.cancel(transfer_id).await {
            Ok(transfer) => {
                let reason_msg = reason.unwrap_or_else(|| "Sem motivo".to_string());
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &transfer.id,
                    format!("Transferência cancelada: {}", reason_msg),
                )
                .await;

                MobileResponse::success(id, serde_json::json!({ "transfer": transfer }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }
}

// ============================================================================
// Enterprise Context Handler
// ============================================================================

/// Handler para contexto enterprise (contratos, locais)
pub struct EnterpriseContextHandler {
    pool: SqlitePool,
}

impl EnterpriseContextHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Obtém lista de contratos ativos
    pub async fn get_contracts(&self, id: u64) -> MobileResponse {
        let repo = ContractRepository::new(&self.pool);

        match repo.find_all_active().await {
            Ok(contracts) => {
                MobileResponse::success(id, serde_json::json!({ "contracts": contracts }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Obtém lista de locais de estoque
    pub async fn get_locations(&self, id: u64, contract_id: Option<String>) -> MobileResponse {
        let repo = StockLocationRepository::new(&self.pool);

        let locations = if let Some(cid) = contract_id {
            repo.find_by_contract(&cid).await
        } else {
            repo.find_all_active().await
        };

        match locations {
            Ok(locs) => MobileResponse::success(id, serde_json::json!({ "locations": locs })),
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Obtém contexto completo (contratos + locais do contrato ativo)
    pub async fn get_context(&self, id: u64) -> MobileResponse {
        let contract_repo = ContractRepository::new(&self.pool);
        let location_repo = StockLocationRepository::new(&self.pool);

        let contracts = contract_repo.find_all_active().await.unwrap_or_default();
        let locations = location_repo.find_all_active().await.unwrap_or_default();

        MobileResponse::success(
            id,
            serde_json::json!({
                "contracts": contracts,
                "locations": locations
            }),
        )
    }
}

// ============================================================================
// Helpers
// ============================================================================

/// Verifica se role pode aprovar requisições
fn can_approve_requests(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "SUPERVISOR" | "ALMOXARIFE_SENIOR"
    )
}

/// Verifica se role pode gerenciar inventário enterprise
fn can_manage_enterprise_inventory(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "ALMOXARIFE" | "ALMOXARIFE_SENIOR" | "SUPERVISOR"
    )
}

/// Verifica se role pode contar inventário enterprise
fn can_count_enterprise_inventory(role: &str) -> bool {
    matches!(
        role.to_uppercase().as_str(),
        "ADMIN" | "MANAGER" | "ALMOXARIFE" | "ALMOXARIFE_SENIOR" | "SUPERVISOR" | "OPERADOR"
    )
}

// ============================================================================
// Enterprise Inventory Handler
// ============================================================================

/// Payload para listar locais de inventário
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryLocationsPayload {
    pub contract_id: Option<String>,
}

/// Payload para iniciar inventário enterprise
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseInventoryStartPayload {
    pub location_id: String,
    pub inventory_type: Option<String>,
    pub name: Option<String>,
    pub notes: Option<String>,
}

/// Payload para contagem de inventário enterprise
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseInventoryCountPayload {
    pub inventory_id: String,
    pub product_id: String,
    pub lot_number: Option<String>,
    pub counted_quantity: f64,
    pub notes: Option<String>,
}

/// Payload para sincronizar inventário enterprise
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseInventorySyncPayload {
    pub inventory_id: String,
    pub counts: Vec<EnterpriseInventoryCountPayload>,
}

/// Payload para finalizar inventário enterprise
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseInventoryFinishPayload {
    pub inventory_id: String,
    pub apply_adjustments: bool,
    pub notes: Option<String>,
}

/// Payload para cancelar inventário enterprise
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnterpriseInventoryCancelPayload {
    pub inventory_id: String,
    pub reason: String,
}

/// Handler para inventário enterprise por localização
pub struct EnterpriseInventoryHandler {
    pool: SqlitePool,
}

impl EnterpriseInventoryHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Audit helper
    async fn log_audit(
        &self,
        action: AuditAction,
        user_id: &str,
        entity_id: &str,
        details: String,
    ) {
        let audit_service = AuditService::new(self.pool.clone());
        let _ = audit_service
            .log(CreateAuditLog {
                action,
                employee_id: user_id.to_string(),
                employee_name: "Mobile User".to_string(),
                target_type: Some("EnterpriseInventory".to_string()),
                target_id: Some(entity_id.to_string()),
                details: Some(details),
            })
            .await;
    }

    /// Lista locais disponíveis para inventário
    pub async fn get_locations(
        &self,
        id: u64,
        payload: InventoryLocationsPayload,
        _employee_id: &str,
        _employee_role: &str,
    ) -> MobileResponse {
        let repo = StockLocationRepository::new(&self.pool);

        let locations = if let Some(cid) = payload.contract_id {
            repo.find_by_contract(&cid).await
        } else {
            repo.find_all_active().await
        };

        match locations {
            Ok(locs) => {
                let locs_with_stock: Vec<_> = locs
                    .into_iter()
                    .map(|loc| {
                        serde_json::json!({
                            "id": loc.id,
                            "code": loc.code,
                            "name": loc.name,
                            "type": loc.location_type,
                            "address": loc.address,
                            "contractId": loc.contract_id,
                            "isActive": loc.is_active
                        })
                    })
                    .collect();

                MobileResponse::success(id, serde_json::json!({ "locations": locs_with_stock }))
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Inicia inventário para uma localização
    pub async fn start(
        &self,
        id: u64,
        payload: EnterpriseInventoryStartPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_manage_enterprise_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para iniciar inventário",
            );
        }

        let loc_repo = StockLocationRepository::new(&self.pool);
        let repo = EnterpriseInventoryRepository::new(&self.pool);

        // Verificar se localização existe
        let location = match loc_repo.find_by_id(&payload.location_id).await {
            Ok(Some(loc)) => loc,
            Ok(None) => {
                return MobileResponse::error(
                    id,
                    MobileErrorCode::NotFound,
                    "Localização não encontrada",
                );
            }
            Err(e) => {
                return MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string())
            }
        };

        // Criar inventário
        let input = CreateEnterpriseInventoryCount {
            location_id: payload.location_id.clone(),
            count_type: payload.inventory_type.unwrap_or("FULL".to_string()),
            notes: payload.notes,
        };

        match repo.create(input, employee_id).await {
            Ok(inventory) => {
                let items = match repo.get_items(&inventory.id).await {
                    Ok(i) => i,
                    Err(e) => {
                        return MobileResponse::error(
                            id,
                            MobileErrorCode::InternalError,
                            e.to_string(),
                        )
                    }
                };

                let mobile_items: Vec<serde_json::Value> = items
                    .iter()
                    .map(|item| {
                        serde_json::json!({
                            "id": item.item.id,
                            "productId": item.item.product_id,
                            "productName": item.product_name,
                            "productCode": item.product_code,
                            "productUnit": item.product_unit,
                            "expectedQuantity": item.item.system_qty,
                            "countedQuantity": item.item.counted_qty.unwrap_or(0.0),
                            "difference": item.item.difference.unwrap_or(0.0),
                            "status": if item.item.counted_at.is_some() { "counted" } else { "pending" },
                            "countedAt": item.item.counted_at,
                            "notes": item.item.notes
                        })
                    })
                    .collect();

                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &inventory.id,
                    format!(
                        "Inventário enterprise iniciado na localização: {}",
                        location.name
                    ),
                )
                .await;

                tracing::info!(
                    "Inventário enterprise iniciado: {} em {}",
                    inventory.id,
                    location.name
                );

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": inventory.id,
                        "code": format!("INV-{}", &inventory.id[0..8]),
                        "name": payload.name.unwrap_or(format!("Inventário {}", location.name)),
                        "location": {
                            "locationId": location.id,
                            "name": location.name,
                            "code": location.code,
                            "type": location.location_type,
                            "address": location.address
                        },
                        "expectedProducts": items.len(),
                        "items": mobile_items,
                        "startedAt": inventory.started_at
                    }),
                )
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Registra contagem de produto
    pub async fn count(
        &self,
        id: u64,
        payload: EnterpriseInventoryCountPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_count_enterprise_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para contar inventário",
            );
        }

        let repo = EnterpriseInventoryRepository::new(&self.pool);

        // Buscar item pelo produto e inventário
        let items = match repo.get_items(&payload.inventory_id).await {
            Ok(i) => i,
            Err(e) => {
                return MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string())
            }
        };

        if let Some(item_wrapper) = items
            .iter()
            .find(|i| i.item.product_id == payload.product_id)
        {
            match repo
                .count_item(
                    &item_wrapper.item.id,
                    payload.counted_quantity,
                    employee_id,
                    payload.notes.clone(),
                )
                .await
            {
                Ok(_) => {
                    self.log_audit(
                        AuditAction::ProductUpdated,
                        employee_id,
                        &payload.inventory_id,
                        format!(
                            "Contagem registrada: produto {} = {} unidades",
                            payload.product_id, payload.counted_quantity
                        ),
                    )
                    .await;

                    MobileResponse::success(id, serde_json::json!({ "success": true }))
                }
                Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
            }
        } else {
            MobileResponse::error(
                id,
                MobileErrorCode::NotFound,
                "Produto não encontrado neste inventário",
            )
        }
    }

    /// Sincroniza múltiplas contagens
    pub async fn sync(
        &self,
        id: u64,
        payload: EnterpriseInventorySyncPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_count_enterprise_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para sincronizar inventário",
            );
        }

        let repo = EnterpriseInventoryRepository::new(&self.pool);

        // Fetch items once
        let items = match repo.get_items(&payload.inventory_id).await {
            Ok(i) => i,
            Err(e) => {
                return MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string())
            }
        };

        let mut processed = 0;
        let mut failed = 0;

        for count_payload in payload.counts {
            if let Some(item_wrapper) = items
                .iter()
                .find(|i| i.item.product_id == count_payload.product_id)
            {
                match repo
                    .count_item(
                        &item_wrapper.item.id,
                        count_payload.counted_quantity,
                        employee_id,
                        count_payload.notes,
                    )
                    .await
                {
                    Ok(_) => processed += 1,
                    Err(_) => failed += 1,
                }
            } else {
                failed += 1;
            }
        }

        self.log_audit(
            AuditAction::ProductUpdated,
            employee_id,
            &payload.inventory_id,
            format!("Sincronizadas {} contagens. Falhas: {}", processed, failed),
        )
        .await;

        tracing::info!(
            "Sincronização inventário enterprise: {} processadas, {} falhas",
            processed,
            failed
        );

        MobileResponse::success(
            id,
            serde_json::json!({
                "inventoryId": payload.inventory_id,
                "processed": processed,
                "failed": failed,
                "syncedAt": chrono::Utc::now().to_rfc3339()
            }),
        )
    }

    /// Finaliza inventário
    pub async fn finish(
        &self,
        id: u64,
        payload: EnterpriseInventoryFinishPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_manage_enterprise_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para finalizar inventário",
            );
        }

        let repo = EnterpriseInventoryRepository::new(&self.pool);

        match repo
            .complete(
                &payload.inventory_id,
                employee_id,
                payload.apply_adjustments,
            )
            .await
        {
            Ok(_) => {
                self.log_audit(
                    AuditAction::ProductUpdated,
                    employee_id,
                    &payload.inventory_id,
                    format!(
                        "Inventário finalizado. Ajustes aplicados: {}",
                        if payload.apply_adjustments {
                            "Sim"
                        } else {
                            "Não"
                        }
                    ),
                )
                .await;

                tracing::info!(
                    "Inventário enterprise finalizado: {} (ajustes: {})",
                    payload.inventory_id,
                    payload.apply_adjustments
                );

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "inventoryId": payload.inventory_id,
                        "status": "COMPLETED",
                        "finishedAt": chrono::Utc::now().to_rfc3339(),
                        "finishedBy": employee_id,
                        "adjustmentsApplied": payload.apply_adjustments
                    }),
                )
            }
            Err(e) => MobileResponse::error(id, MobileErrorCode::InternalError, e.to_string()),
        }
    }

    /// Cancela inventário
    pub async fn cancel(
        &self,
        id: u64,
        payload: EnterpriseInventoryCancelPayload,
        employee_id: &str,
        employee_role: &str,
    ) -> MobileResponse {
        if !can_manage_enterprise_inventory(employee_role) {
            return MobileResponse::error(
                id,
                MobileErrorCode::PermissionDenied,
                "Sem permissão para cancelar inventário",
            );
        }

        self.log_audit(
            AuditAction::ProductUpdated,
            employee_id,
            &payload.inventory_id,
            format!("Inventário cancelado: {}", payload.reason),
        )
        .await;

        tracing::info!(
            "Inventário enterprise cancelado: {} - {}",
            payload.inventory_id,
            payload.reason
        );

        MobileResponse::success(
            id,
            serde_json::json!({
                "inventoryId": payload.inventory_id,
                "status": "CANCELLED",
                "cancelledAt": chrono::Utc::now().to_rfc3339(),
                "cancelledBy": employee_id,
                "reason": payload.reason
            }),
        )
    }
}
