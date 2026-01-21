//! Comandos Tauri - Garantias
//!
//! Exposição de operações de garantias para o frontend

use tauri::State;

use crate::error::AppResult;
use crate::models::{
    CreateWarrantyClaim, ResolveWarrantyClaim, UpdateWarrantyClaim, WarrantyClaim,
    WarrantyClaimFilters, WarrantyClaimSummary, WarrantyClaimWithDetails, WarrantyStats,
};
use crate::repositories::{PaginatedResult, Pagination, WarrantyRepository};
use crate::AppState;

// ═══════════════════════════════════════════════════════════════════════════
// CRUD BÁSICO
// ═══════════════════════════════════════════════════════════════════════════

/// Lista garantias ativas (não fechadas/negadas)
#[tauri::command]
pub async fn get_active_warranties(
    state: State<'_, AppState>,
) -> AppResult<Vec<WarrantyClaimSummary>> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.find_active().await
}

/// Lista garantias com paginação e filtros
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn get_warranties_paginated(
    state: State<'_, AppState>,
    page: Option<i32>,
    per_page: Option<i32>,
    status: Option<String>,
    source_type: Option<String>,
    customer_id: Option<String>,
    product_id: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> AppResult<PaginatedResult<WarrantyClaimSummary>> {
    let repo = WarrantyRepository::new(state.pool().clone());

    let pagination = Pagination::new(page.unwrap_or(1), per_page.unwrap_or(20));

    let filters = WarrantyClaimFilters {
        status,
        source_type,
        customer_id,
        product_id,
        date_from,
        date_to,
    };

    repo.find_paginated(&pagination, &filters).await
}

/// Busca garantia por ID
#[tauri::command]
pub async fn get_warranty_by_id(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<WarrantyClaim>> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.find_by_id(&id).await
}

/// Busca garantia com detalhes completos
#[tauri::command]
pub async fn get_warranty_details(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<WarrantyClaimWithDetails>> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.find_by_id_with_details(&id).await
}

/// Cria nova garantia
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn create_warranty_claim(
    state: State<'_, AppState>,
    customer_id: String,
    source_type: String,
    sale_item_id: Option<String>,
    order_item_id: Option<String>,
    product_id: Option<String>,
    description: String,
    reason: String,
) -> AppResult<WarrantyClaim> {
    let repo = WarrantyRepository::new(state.pool().clone());

    let input = CreateWarrantyClaim {
        customer_id,
        source_type,
        sale_item_id,
        order_item_id,
        product_id,
        description,
        reason,
    };

    repo.create(input).await
}

/// Atualiza garantia
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_warranty_claim(
    state: State<'_, AppState>,
    id: String,
    description: Option<String>,
    reason: Option<String>,
    status: Option<String>,
    resolution: Option<String>,
    resolution_type: Option<String>,
    resolved_by_id: Option<String>,
    refund_amount: Option<f64>,
    replacement_cost: Option<f64>,
) -> AppResult<WarrantyClaim> {
    let repo = WarrantyRepository::new(state.pool().clone());

    let input = UpdateWarrantyClaim {
        description,
        reason,
        status,
        resolution,
        resolution_type,
        resolved_by_id,
        refund_amount,
        replacement_cost,
    };

    repo.update(&id, input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

/// Aprova garantia
#[tauri::command]
pub async fn approve_warranty(
    state: State<'_, AppState>,
    id: String,
    employee_id: String,
) -> AppResult<WarrantyClaim> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.approve(&id, &employee_id).await
}

/// Nega garantia
#[tauri::command]
pub async fn deny_warranty(
    state: State<'_, AppState>,
    id: String,
    employee_id: String,
    reason: String,
) -> AppResult<WarrantyClaim> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.deny(&id, &employee_id, reason).await
}

/// Resolve garantia (fecha com solução)
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn resolve_warranty(
    state: State<'_, AppState>,
    id: String,
    resolution_type: String,
    resolution: String,
    resolved_by_id: String,
    refund_amount: Option<f64>,
    replacement_cost: Option<f64>,
) -> AppResult<WarrantyClaim> {
    let repo = WarrantyRepository::new(state.pool().clone());

    let input = ResolveWarrantyClaim {
        resolution_type,
        resolution,
        resolved_by_id,
        refund_amount,
        replacement_cost,
    };

    repo.resolve(&id, input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES ESPECIALIZADAS
// ═══════════════════════════════════════════════════════════════════════════

/// Busca garantias por cliente
#[tauri::command]
pub async fn get_warranties_by_customer(
    state: State<'_, AppState>,
    customer_id: String,
) -> AppResult<Vec<WarrantyClaimSummary>> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.find_by_customer(&customer_id).await
}

/// Busca garantias por produto
#[tauri::command]
pub async fn get_warranties_by_product(
    state: State<'_, AppState>,
    product_id: String,
) -> AppResult<Vec<WarrantyClaimSummary>> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.find_by_product(&product_id).await
}

/// Obtém estatísticas de garantias
#[tauri::command]
pub async fn get_warranty_stats(
    state: State<'_, AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> AppResult<WarrantyStats> {
    let repo = WarrantyRepository::new(state.pool().clone());
    repo.get_stats(date_from, date_to).await
}
