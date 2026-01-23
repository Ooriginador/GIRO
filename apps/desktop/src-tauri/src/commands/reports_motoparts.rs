use crate::error::AppResult;
use crate::middleware::Permission;
use crate::models::report_motoparts::{DashboardStats, ServiceOrderStats, TopItem};
use crate::repositories::ReportMotopartsRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_motoparts_dashboard_stats(
    state: State<'_, AppState>,
) -> AppResult<DashboardStats> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);
    let repo = ReportMotopartsRepository::new(state.pool().clone());
    repo.get_dashboard_stats().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_service_order_stats(state: State<'_, AppState>) -> AppResult<ServiceOrderStats> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);
    let repo = ReportMotopartsRepository::new(state.pool().clone());
    repo.get_service_order_stats().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_top_products_motoparts(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<TopItem>> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);
    let repo = ReportMotopartsRepository::new(state.pool().clone());
    repo.get_top_products_motoparts(limit as i64).await
}
