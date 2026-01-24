//! Comandos Tauri para Estoque

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::middleware::Permission;
use crate::models::{CreateStockMovement, ProductLot, StockMovementRow};
use crate::repositories::StockRepository;
use crate::require_permission;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_recent_stock_movements(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockMovementRow>> {
    let repo = StockRepository::new(state.pool());
    repo.find_recent_movements(limit).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_product_stock_movements(
    product_id: String,
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<StockMovementRow>> {
    let repo = StockRepository::new(state.pool());
    repo.find_movements_by_product(&product_id, limit).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_stock_movement(
    mut input: CreateStockMovement,
    state: State<'_, AppState>,
) -> AppResult<StockMovementRow> {
    let info = state.session.require_authenticated()?;
    input.employee_id = Some(info.employee_id.clone());
    let employee = require_permission!(state.pool(), &info.employee_id, Permission::ManageStock);

    // Parse role string to EmployeeRole
    let role_str = info.role.as_str();
    let role_enum = match role_str {
        "ADMIN" => crate::models::EmployeeRole::Admin,
        "MANAGER" => crate::models::EmployeeRole::Manager,
        "CASHIER" => crate::models::EmployeeRole::Cashier,
        "VIEWER" => crate::models::EmployeeRole::Viewer,
        "STOCKER" => crate::models::EmployeeRole::Stocker,
        _ => crate::models::EmployeeRole::Viewer,
    };

    // Check if user has permission to allow negative stock
    let allow_negative =
        crate::middleware::Permission::has_permission(role_enum, Permission::AllowNegativeStock);

    let repo = StockRepository::new(state.pool());
    let result = repo.create_movement(input.clone(), allow_negative).await?;

    // Fetch product name for better logging
    let product_name: String = sqlx::query_scalar("SELECT name FROM products WHERE id = ?")
        .bind(&input.product_id)
        .fetch_one(state.pool())
        .await
        .unwrap_or_else(|_| "Produto Desconhecido".to_string());

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    let action = match input.movement_type.as_str() {
        "ENTRY" | "INPUT" => AuditAction::StockEntry,
        "TRANSFER" => AuditAction::StockTransfer,
        _ => AuditAction::StockAdjustment,
    };

    audit_log!(
        audit_service,
        action,
        &employee.id,
        &employee.name,
        "Product",
        &input.product_id,
        format!(
            "Produto: {} | Quantidade: {} | Estoque: {} -> {} | Razão: {:?}",
            product_name, result.quantity, result.previous_stock, result.new_stock, result.reason
        )
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn get_product_lots(
    product_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<ProductLot>> {
    let repo = StockRepository::new(state.pool());
    repo.find_lots_by_product(&product_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_expiring_lots(
    days: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<ProductLot>> {
    let repo = StockRepository::new(state.pool());
    repo.find_expiring_lots(days).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_expired_lots(state: State<'_, AppState>) -> AppResult<Vec<ProductLot>> {
    let repo = StockRepository::new(state.pool());
    repo.find_expired_lots().await
}
