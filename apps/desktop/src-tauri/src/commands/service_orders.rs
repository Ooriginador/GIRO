//! Comandos Tauri - Ordens de Serviço
//!
//! Exposição de operações de ordens de serviço para o frontend

use tauri::State;

use crate::error::AppResult;
use crate::models::{
    AddServiceOrderItem, CreateService, CreateServiceOrder, Service, ServiceOrder,
    ServiceOrderFilters, ServiceOrderItem, ServiceOrderSummary, ServiceOrderWithDetails,
    UpdateService, UpdateServiceOrder, UpdateServiceOrderItem,
};
use crate::repositories::{PaginatedResult, Pagination, ServiceOrderRepository};
use crate::AppState;

// ═══════════════════════════════════════════════════════════════════════════
// ORDENS DE SERVIÇO
// ═══════════════════════════════════════════════════════════════════════════

/// Lista ordens abertas (não entregues/canceladas)
#[tauri::command]
pub async fn get_open_service_orders(
    state: State<'_, AppState>,
) -> AppResult<Vec<ServiceOrderSummary>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_open_orders().await
}

/// Lista ordens com paginação e filtros
#[tauri::command]
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
    let repo = ServiceOrderRepository::new(state.pool().clone());

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
pub async fn get_service_order_by_id(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<ServiceOrder>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_by_id(&id).await
}

/// Busca ordem por número
#[tauri::command]
pub async fn get_service_order_by_number(
    state: State<'_, AppState>,
    order_number: i32,
) -> AppResult<Option<ServiceOrder>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_by_number(order_number).await
}

/// Busca ordem com detalhes completos
#[tauri::command]
pub async fn get_service_order_details(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<ServiceOrderWithDetails>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_by_id_with_details(&id).await
}

/// Cria nova ordem de serviço
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn create_service_order(
    state: State<'_, AppState>,
    customer_id: String,
    customer_vehicle_id: String,
    vehicle_year_id: String,
    employee_id: String,
    vehicle_km: Option<i32>,
    symptoms: Option<String>,
    scheduled_date: Option<String>,
    notes: Option<String>,
    internal_notes: Option<String>,
    status: Option<String>,
) -> AppResult<ServiceOrder> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = CreateServiceOrder {
        customer_id,
        customer_vehicle_id,
        vehicle_year_id,
        employee_id,
        vehicle_km,
        symptoms,
        scheduled_date,
        notes,
        internal_notes,
        status,
    };

    repo.create(input).await
}

/// Atualiza ordem de serviço
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_service_order(
    state: State<'_, AppState>,
    id: String,
    vehicle_km: Option<i32>,
    symptoms: Option<String>,
    diagnosis: Option<String>,
    status: Option<String>,
    labor_cost: Option<f64>,
    discount: Option<f64>,
    warranty_days: Option<i32>,
    scheduled_date: Option<String>,
    payment_method: Option<String>,
    is_paid: Option<bool>,
    notes: Option<String>,
    internal_notes: Option<String>,
) -> AppResult<ServiceOrder> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateServiceOrder {
        vehicle_km,
        symptoms,
        diagnosis,
        status,
        labor_cost,
        discount,
        warranty_days,
        scheduled_date,
        payment_method,
        is_paid,
        notes,
        internal_notes,
    };

    repo.update(&id, input).await
}

/// Inicia ordem (muda status para IN_PROGRESS)
#[tauri::command]
pub async fn start_service_order(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<ServiceOrder> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateServiceOrder {
        status: Some("IN_PROGRESS".to_string()),
        ..Default::default()
    };

    repo.update(&id, input).await
}

/// Finaliza ordem (muda status para COMPLETED)
#[tauri::command]
pub async fn complete_service_order(
    state: State<'_, AppState>,
    id: String,
    diagnosis: Option<String>,
) -> AppResult<ServiceOrder> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateServiceOrder {
        status: Some("COMPLETED".to_string()),
        diagnosis,
        ..Default::default()
    };

    repo.update(&id, input).await
}

/// Marca como entregue (muda status para DELIVERED)
#[tauri::command]
pub async fn deliver_service_order(
    state: State<'_, AppState>,
    id: String,
    payment_method: String,
) -> AppResult<ServiceOrder> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateServiceOrder {
        status: Some("DELIVERED".to_string()),
        payment_method: Some(payment_method),
        is_paid: Some(true),
        ..Default::default()
    };

    repo.update(&id, input).await
}

/// Cancela ordem
#[tauri::command]
pub async fn cancel_service_order(
    state: State<'_, AppState>,
    id: String,
    notes: Option<String>,
) -> AppResult<ServiceOrder> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateServiceOrder {
        status: Some("CANCELED".to_string()),
        notes,
        ..Default::default()
    };

    repo.update(&id, input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// ITENS DA ORDEM
// ═══════════════════════════════════════════════════════════════════════════

/// Lista itens de uma ordem
#[tauri::command]
pub async fn get_service_order_items(
    state: State<'_, AppState>,
    order_id: String,
) -> AppResult<Vec<ServiceOrderItem>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_order_items(&order_id).await
}

/// Adiciona item (peça ou serviço) à ordem
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn add_service_order_item(
    state: State<'_, AppState>,
    order_id: String,
    product_id: Option<String>,
    item_type: String,
    description: String,
    employee_id: Option<String>,
    quantity: f64,
    unit_price: f64,
    discount: Option<f64>,
    notes: Option<String>,
) -> AppResult<ServiceOrderItem> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = AddServiceOrderItem {
        order_id,
        product_id,
        item_type,
        description,
        employee_id,
        quantity,
        unit_price,
        discount,
        notes,
    };

    repo.add_item(input).await
}

/// Remove item da ordem
#[tauri::command]
pub async fn remove_service_order_item(
    state: State<'_, AppState>,
    item_id: String,
) -> AppResult<()> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.remove_item(&item_id).await
}

/// Atualiza item da ordem (com delta de estoque automático)
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_service_order_item(
    state: State<'_, AppState>,
    item_id: String,
    quantity: Option<f64>,
    unit_price: Option<f64>,
    discount: Option<f64>,
    notes: Option<String>,
    employee_id: Option<String>,
) -> AppResult<ServiceOrderItem> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateServiceOrderItem {
        quantity,
        unit_price,
        discount,
        notes,
        employee_id,
    };

    repo.update_item(&item_id, input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇOS PRÉ-CADASTRADOS
// ═══════════════════════════════════════════════════════════════════════════

/// Lista todos os serviços ativos
#[tauri::command]
pub async fn get_services(state: State<'_, AppState>) -> AppResult<Vec<Service>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_all_services().await
}

/// Busca serviço por ID
#[tauri::command]
pub async fn get_service_by_id(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<Service>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_service_by_id(&id).await
}

/// Busca serviço por código
#[tauri::command]
pub async fn get_service_by_code(
    state: State<'_, AppState>,
    code: String,
) -> AppResult<Option<Service>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_service_by_code(&code).await
}

/// Cria novo serviço
#[tauri::command]
pub async fn create_service(
    state: State<'_, AppState>,
    code: String,
    name: String,
    description: Option<String>,
    default_price: f64,
    estimated_time: Option<i32>,
    default_warranty_days: Option<i32>,
) -> AppResult<Service> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = CreateService {
        code,
        name,
        description,
        default_price,
        estimated_time,
        default_warranty_days,
    };

    repo.create_service(input).await
}

/// Atualiza serviço
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_service(
    state: State<'_, AppState>,
    id: String,
    code: Option<String>,
    name: Option<String>,
    description: Option<String>,
    default_price: Option<f64>,
    estimated_time: Option<i32>,
    default_warranty_days: Option<i32>,
    is_active: Option<bool>,
) -> AppResult<Service> {
    let repo = ServiceOrderRepository::new(state.pool().clone());

    let input = UpdateService {
        code,
        name,
        description,
        default_price,
        estimated_time,
        default_warranty_days,
        is_active,
    };

    repo.update_service(&id, input).await
}

/// Busca o histórico de serviços de um veículo
#[tauri::command]
pub async fn get_vehicle_services_history(
    state: State<'_, AppState>,
    vehicle_id: String,
) -> AppResult<Vec<ServiceOrderSummary>> {
    let repo = ServiceOrderRepository::new(state.pool().clone());
    repo.find_by_vehicle(&vehicle_id).await
}
