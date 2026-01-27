//! Comandos Tauri para Vendas em Espera
//!
//! Permite salvar e recuperar vendas pausadas do PDV.
//! Também gerencia pedidos de atendentes aguardando finalização no caixa.

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

/// Busca pedidos aguardando finalização no caixa
#[tauri::command]
#[specta::specta]
pub async fn get_waiting_orders(state: State<'_, AppState>) -> AppResult<Vec<HeldSale>> {
    state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.find_waiting_orders().await
}

#[tauri::command]
#[specta::specta]
pub async fn save_held_sale(
    input: CreateHeldSale,
    state: State<'_, AppState>,
) -> AppResult<HeldSale> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    let result = repo
        .create(
            &info.employee_id,
            Some(&info.employee_name),
            Some(&info.role),
            input,
        )
        .await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::HeldSaleCreated,
        &info.employee_id,
        &info.employee_name,
        "HeldSale",
        &result.id,
        format!(
            "Valor: {}, Cliente: {:?}, Role: {}",
            result.total, result.customer_id, info.role
        )
    );

    Ok(result)
}

/// Atualiza o status de um pedido (WAITING -> PROCESSING -> COMPLETED)
#[tauri::command]
#[specta::specta]
pub async fn update_held_sale_status(
    id: String,
    status: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let info = state.session.require_authenticated()?;
    let repo = HeldSaleRepository::new(state.pool());
    repo.update_status(&id, &status).await?;

    // Audit Log
    let audit_service = AuditService::new(state.pool().clone());
    audit_log!(
        audit_service,
        AuditAction::HeldSaleUpdated,
        &info.employee_id,
        &info.employee_name,
        "HeldSale",
        &id,
        format!("Status alterado para: {}", status)
    );

    Ok(())
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
