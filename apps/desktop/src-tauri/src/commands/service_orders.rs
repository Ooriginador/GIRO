//! Comandos Tauri - Ordens de Serviço
//!
//! Exposição de operações de ordens de serviço para o frontend

use crate::commands::network::NetworkState;
use tauri::State;
use tokio::sync::RwLock;

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{
    AddServiceOrderItem, CreateServiceOrder, Service, ServiceOrder, ServiceOrderFilters,
    ServiceOrderItem, ServiceOrderSummary, ServiceOrderWithDetails, UpdateServiceOrder,
    UpdateServiceOrderItem,
};
use crate::repositories::{PaginatedResult, Pagination, ServiceOrderRepository};
use crate::require_permission;
use crate::AppState;

// use sqlx::Row;

// ═══════════════════════════════════════════════════════════════════════════
// ORDENS DE SERVIÇO
// ═══════════════════════════════════════════════════════════════════════════

/// Lista ordens abertas (não entregues/canceladas)
#[tauri::command]
#[specta::specta]
pub async fn get_open_service_orders(
    state: State<'_, AppState>,
) -> AppResult<Vec<ServiceOrderSummary>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_open_orders().await
}

/// Lista ordens com paginação e filtros
#[tauri::command]
#[specta::specta]
#[allow(clippy::too_many_arguments)]
pub async fn get_service_orders_paginated(
    state: State<'_, AppState>,
    page: Option<i32>,
    per_page: Option<i32>,
    status: Option<String>,
    customer_id: Option<String>,
    vehicle_id: Option<String>,
    employee_id: Option<String>,
    is_paid: Option<bool>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> AppResult<PaginatedResult<ServiceOrderSummary>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let pagination = Pagination::new(page.unwrap_or(1), per_page.unwrap_or(20));

    let filters = ServiceOrderFilters {
        status,
        customer_id,
        vehicle_id,
        employee_id,
        is_paid,
        date_from,
        date_to,
    };

    repo.find_paginated(&pagination, &filters).await
}

/// Busca ordem por ID
#[tauri::command]
#[specta::specta]
pub async fn get_service_order_by_id(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<ServiceOrder>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_by_id(&id).await
}

/// Busca ordem por número
#[tauri::command]
#[specta::specta]
pub async fn get_service_order_by_number(
    state: State<'_, AppState>,
    order_number: i32,
) -> AppResult<Option<ServiceOrder>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_by_number(order_number).await
}

/// Busca ordem com detalhes completos
#[tauri::command]
#[specta::specta]
pub async fn get_service_order_details(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<ServiceOrderWithDetails>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_by_id_with_details(&id).await
}

/// Cria nova ordem de serviço
#[tauri::command]
#[specta::specta]
pub async fn create_service_order(
    state: State<'_, AppState>,
    input: CreateServiceOrder,
    _network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<ServiceOrder> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::CreateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    let result = repo.create(input.clone()).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderCreated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &result.id,
        format!(
            "Cliente: {}, Veículo: {}",
            input.customer_id, input.customer_vehicle_id
        )
    );

    Ok(result)
}

/// Atualiza ordem de serviço
#[tauri::command]
#[specta::specta]
pub async fn update_service_order(
    state: State<'_, AppState>,
    id: String,
    input: UpdateServiceOrder,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<ServiceOrder> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    let result = repo.update(&id, input.clone()).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &id,
        format!("Status: {:?}", input.status)
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "service_order",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

/// Inicia ordem (muda status para IN_PROGRESS)
#[tauri::command]
#[specta::specta]
pub async fn start_service_order(
    state: State<'_, AppState>,
    id: String,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<ServiceOrder> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let input = UpdateServiceOrder {
        status: Some("IN_PROGRESS".to_string()),
        ..Default::default()
    };

    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &id,
        "Status: IN_PROGRESS"
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "service_order",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

/// Finaliza ordem (muda status para COMPLETED)
#[tauri::command]
#[specta::specta]
pub async fn complete_service_order(
    state: State<'_, AppState>,
    id: String,
    diagnosis: Option<String>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<ServiceOrder> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let input = UpdateServiceOrder {
        status: Some("COMPLETED".to_string()),
        diagnosis,
        ..Default::default()
    };

    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &id,
        "Status: COMPLETED"
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "service_order",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

/// Marca como entregue (muda status para DELIVERED)
#[tauri::command]
#[specta::specta]
pub async fn deliver_service_order(
    state: State<'_, AppState>,
    id: String,
    payment_method: String,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<ServiceOrder> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let input = UpdateServiceOrder {
        status: Some("DELIVERED".to_string()),
        payment_method: Some(payment_method),
        is_paid: Some(true),
        ..Default::default()
    };

    let result = repo.update(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &id,
        "Status: DELIVERED"
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "service_order",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

/// Cancela ordem
#[tauri::command]
#[specta::specta]
pub async fn cancel_service_order(
    state: State<'_, AppState>,
    id: String,
    notes: Option<String>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<ServiceOrder> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::CancelServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    let result = repo
        .cancel_with_stock_restoration(&id, notes.clone())
        .await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderCanceled,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &id,
        format!("Motivo: {:?}", notes)
    );

    // Push to Network
    if let Some(client) = network_state.read().await.client.as_ref() {
        let _ = client
            .push_update(
                "service_order",
                serde_json::to_value(&result).unwrap_or_default(),
            )
            .await;
    }

    Ok(result)
}

/// Finaliza ordem de serviço (Gera venda e financeiro)
#[tauri::command]
#[specta::specta]
pub async fn finish_service_order(
    state: State<'_, AppState>,
    id: String,
    payments: Vec<crate::models::CreateSalePayment>,
    amount_paid: f64,
    cash_session_id: String,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<String> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::FinishServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    let sale_id = repo
        .finish_order_transaction(
            &id,
            payments,
            amount_paid,
            &info.employee_id,
            &cash_session_id,
        )
        .await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderFinished,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &id,
        format!("Venda Gerada: {}", sale_id)
    );

    // Push to Network (We should push the OS update because status might have changed to FINISHED/PAID if that logic exists, though finish_order_transaction does complex things)
    // finish_order_transaction updates OS status to DELIVERED usually or PAID.
    // Ideally we fetch the updated OS.
    if let Ok(Some(os)) = repo.find_by_id(&id).await {
        if let Some(client) = network_state.read().await.client.as_ref() {
            let _ = client
                .push_update(
                    "service_order",
                    serde_json::to_value(&os).unwrap_or_default(),
                )
                .await;
        }
    }

    Ok(sale_id)
}

// ═══════════════════════════════════════════════════════════════════════════
// ITENS DA ORDEM
// ═══════════════════════════════════════════════════════════════════════════

/// Lista itens de uma ordem
#[tauri::command]
#[specta::specta]
pub async fn get_service_order_items(
    state: State<'_, AppState>,
    order_id: String,
) -> AppResult<Vec<ServiceOrderItem>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_order_items(&order_id).await
}

/// Adiciona item (peça ou serviço) à ordem
#[tauri::command]
#[specta::specta]
#[allow(clippy::too_many_arguments)]
pub async fn add_service_order_item(
    state: State<'_, AppState>,
    order_id: String,
    product_id: Option<String>,
    item_type: String,
    description: String,
    quantity: f64,
    unit_price: f64,
    discount: Option<f64>,
    notes: Option<String>,
) -> AppResult<ServiceOrderItem> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let input = AddServiceOrderItem {
        order_id: order_id.clone(),
        product_id: product_id.clone(),
        item_type,
        description,
        employee_id: Some(info.employee_id.clone()),
        quantity,
        unit_price,
        discount,
        notes,
    };

    let result = repo.add_item(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &order_id,
        format!("Item Adicionado: {}", result.id)
    );

    Ok(result)
}

/// Remove item da ordem
#[tauri::command]
#[specta::specta]
pub async fn remove_service_order_item(
    state: State<'_, AppState>,
    item_id: String,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.remove_item(&item_id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &item_id, // We don't have order_id here easily, but item_id is something
        format!("Item Removido: {}", item_id)
    );

    Ok(())
}

/// Atualiza item da ordem (com delta de estoque automático)
#[tauri::command]
#[specta::specta]
#[allow(clippy::too_many_arguments)]
pub async fn update_service_order_item(
    state: State<'_, AppState>,
    item_id: String,
    quantity: Option<f64>,
    unit_price: Option<f64>,
    discount: Option<f64>,
    notes: Option<String>,
) -> AppResult<ServiceOrderItem> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(
        state.pool(),
        &info.employee_id,
        Permission::UpdateServiceOrder
    );
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let input = UpdateServiceOrderItem {
        quantity,
        unit_price,
        discount,
        notes,
        employee_id: Some(info.employee_id.clone()),
    };

    let result = repo.update_item(&item_id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceOrderUpdated,
        &employee.id,
        &employee.name,
        "ServiceOrder",
        &item_id,
        format!("Item Atualizado: {}", item_id)
    );

    Ok(result)
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇOS PRÉ-CADASTRADOS
// ═══════════════════════════════════════════════════════════════════════════

/// Lista todos os serviços ativos
#[tauri::command]
#[specta::specta]
pub async fn get_services(state: State<'_, AppState>) -> AppResult<Vec<Service>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_all_services().await
}

/// Busca serviço por ID
#[tauri::command]
#[specta::specta]
pub async fn get_service_by_id(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<Service>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_service_by_id(&id).await
}

/// Busca serviço por código
#[tauri::command]
#[specta::specta]
pub async fn get_service_by_code(
    state: State<'_, AppState>,
    code: String,
) -> AppResult<Option<Service>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_service_by_code(&code).await
}

/// Cria novo serviço
#[tauri::command]
#[specta::specta]
pub async fn create_service(
    state: State<'_, AppState>,
    input: crate::models::CreateService,
) -> AppResult<Service> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(state.pool(), &info.employee_id, Permission::ManageServices);
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let result = repo.create_service(input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceCreated,
        &employee.id,
        &employee.name,
        "Service",
        &result.id,
        format!("Serviço Criado: {}", result.name)
    );

    Ok(result)
}

/// Atualiza serviço
#[tauri::command]
#[specta::specta]
pub async fn update_service(
    state: State<'_, AppState>,
    id: String,
    input: crate::models::UpdateService,
) -> AppResult<Service> {
    let info = state.session.require_authenticated()?;
    let employee = require_permission!(state.pool(), &info.employee_id, Permission::ManageServices);
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());

    let result = repo.update_service(&id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::ServiceUpdated,
        &employee.id,
        &employee.name,
        "Service",
        &id,
        format!("Serviço Atualizado: {}", id)
    );

    Ok(result)
}

/// Busca o histórico de serviços de um veículo
#[tauri::command]
#[specta::specta]
pub async fn get_vehicle_services_history(
    state: State<'_, AppState>,
    vehicle_id: String,
) -> AppResult<Vec<ServiceOrderSummary>> {
    state.session.require_authenticated()?;
    let repo =
        ServiceOrderRepository::with_events(state.pool().clone(), state.event_service.clone());
    repo.find_by_vehicle(&vehicle_id).await
}
