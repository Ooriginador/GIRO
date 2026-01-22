//! Comandos Tauri para Vendas

use crate::error::AppResult;
use crate::models::{
    CreateSale, DailySalesSummary, MonthlySalesSummary, PaginatedResult, Sale, SaleFilters,
    SaleWithDetails,
};
use crate::repositories::SaleRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_sales(
    filter: Option<SaleFilters>,
    state: State<'_, AppState>,
) -> AppResult<PaginatedResult<Sale>> {
    let repo = SaleRepository::new(state.pool());
    repo.find_all(filter.unwrap_or_default()).await
}

#[tauri::command]
pub async fn get_sales_today(state: State<'_, AppState>) -> AppResult<Vec<Sale>> {
    let repo = SaleRepository::new(state.pool());
    repo.find_today().await
}

// Alias para compatibilidade com frontend
#[tauri::command]
pub async fn get_today_sales(state: State<'_, AppState>) -> AppResult<Vec<Sale>> {
    get_sales_today(state).await
}

#[tauri::command]
pub async fn get_sale_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<SaleWithDetails>> {
    let repo = SaleRepository::new(state.pool());
    repo.find_with_details(&id).await
}

#[tauri::command]
pub async fn get_sales_by_session(
    session_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<Sale>> {
    let repo = SaleRepository::new(state.pool());
    repo.find_by_session(&session_id).await
}

#[tauri::command]
pub async fn create_sale(input: CreateSale, state: State<'_, AppState>) -> AppResult<Sale> {
    let employee = require_permission!(state.pool(), &input.employee_id, Permission::CreateSales);
    let repo = SaleRepository::new(state.pool());
    let result = repo.create(input.clone()).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::SaleCreated,
        &employee.id,
        &employee.name,
        "Sale",
        &result.id,
        format!("Valor: {}, Itens: {}", result.total, input.items.len())
    );

    Ok(result)
}

use crate::audit_log;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::require_permission;

#[tauri::command]
pub async fn cancel_sale(
    id: String,
    canceled_by: String,
    reason: String,
    state: State<'_, AppState>,
) -> AppResult<Sale> {
    let employee = require_permission!(state.pool(), &canceled_by, Permission::CancelSales);
    let repo = SaleRepository::new(state.pool());
    let result = repo.cancel(&id, &canceled_by, &reason).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::SaleCanceled,
        &employee.id,
        &employee.name,
        "Sale",
        &id,
        format!("Razão: {}", reason)
    );

    Ok(result)
}

#[tauri::command]
pub async fn get_daily_summary(
    date: String,
    state: State<'_, AppState>,
) -> AppResult<DailySalesSummary> {
    let repo = SaleRepository::new(state.pool());
    repo.get_daily_summary(&date).await
}

/// Total de vendas (valor) do dia atual.
///
/// Compatibilidade com o frontend (`get_daily_sales_total`).
#[tauri::command]
pub async fn get_daily_sales_total(state: State<'_, AppState>) -> AppResult<f64> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let repo = SaleRepository::new(state.pool());
    let summary = repo.get_daily_summary(&today).await?;
    Ok(summary.total_amount)
}

/// Resumo de vendas do mês (YYYY-MM)
#[tauri::command]
pub async fn get_monthly_summary(
    year_month: String,
    state: State<'_, AppState>,
) -> AppResult<MonthlySalesSummary> {
    let repo = SaleRepository::new(state.pool());
    repo.get_monthly_summary(&year_month).await
}
