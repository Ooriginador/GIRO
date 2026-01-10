use crate::error::AppResult;
use crate::models::report_motoparts::{DashboardStats, ServiceOrderStats, TopItem};
use crate::repositories::ReportMotopartsRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_motoparts_dashboard_stats(
    state: State<'_, AppState>,
) -> AppResult<DashboardStats> {
    let repo = ReportMotopartsRepository::new(state.pool().clone());
    repo.get_dashboard_stats().await
}

#[tauri::command]
pub async fn get_service_order_stats(state: State<'_, AppState>) -> AppResult<ServiceOrderStats> {
    let repo = ReportMotopartsRepository::new(state.pool().clone());
    repo.get_service_order_stats().await
}

#[tauri::command]
pub async fn get_top_products_motoparts(
    limit: i64,
    state: State<'_, AppState>,
) -> AppResult<Vec<TopItem>> {
    let repo = ReportMotopartsRepository::new(state.pool().clone());
    repo.get_top_products_motoparts(limit).await
}
