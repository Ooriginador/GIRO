//! Comandos Tauri para Vendas em Espera
//!
//! Permite salvar e recuperar vendas pausadas do PDV.

use crate::audit_log;
use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditService};
use crate::models::{CreateHeldSale, HeldSale};
use crate::repositories::HeldSaleRepository;
use crate::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_held_sales(state: State<'_, AppState>) -> AppResult<Vec<HeldSale>> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.find_all_by_employee(&info.employee_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn save_held_sale(
    input: CreateHeldSale,
    state: State<'_, AppState>,
) -> AppResult<HeldSale> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    let result = repo.create(&info.employee_id, input).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::HeldSaleCreated,
        &info.employee_id,
        &info.employee_name,
        "HeldSale",
        &result.id,
        format!("Valor: {}, Cliente: {:?}", result.total, result.customer_id)
    );

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_held_sale(id: String, state: State<'_, AppState>) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.delete(&id).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::HeldSaleDeleted,
        &info.employee_id,
        &info.employee_name,
        "HeldSale",
        &id,
        "Venda suspensa excluída"
    );

    Ok(())
}
