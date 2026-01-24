//! Comandos Tauri para Auditoria
//!
//! Expõe consultas de logs para a interface administrativa.

use crate::error::AppResult;
use crate::middleware::audit::{AuditAction, AuditLog, AuditService};
use crate::middleware::Permission;
use crate::require_permission;
use crate::AppState;
use chrono::{DateTime, Utc};
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_audit_logs(
    action: Option<AuditAction>,
    employee_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    state: State<'_, AppState>,
) -> AppResult<Vec<AuditLog>> {
    let info = state.session.require_authenticated()?;
    require_permission!(state.pool(), &info.employee_id, Permission::ManageSystem);

    let audit_service = AuditService::new(state.pool().clone());

    let start = start_date.and_then(|s| parse_flexible_date(&s));
    let end = end_date.and_then(|s| parse_flexible_date(&s));

    let logs = audit_service
        .find_logs(
            action,
            employee_id.as_deref(),
            start,
            end,
            limit.unwrap_or(50),
            offset.unwrap_or(0),
        )
        .await?;

    Ok(logs)
}

#[tauri::command]
#[specta::specta]
pub async fn get_audit_summary(
    days: i64,
    state: State<'_, AppState>,
) -> AppResult<Vec<(String, i64)>> {
    let info = state.session.require_authenticated()?;
    require_permission!(state.pool(), &info.employee_id, Permission::ManageSystem);

    let audit_service = AuditService::new(state.pool().clone());
    let summary = audit_service.count_by_action(days).await?;

    Ok(summary)
}

fn parse_flexible_date(s: &str) -> Option<DateTime<Utc>> {
    // Try RFC3339 first (standard)
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(dt.with_timezone(&Utc));
    }

    // Try parsing as UTC directly (sometimes frontend sends it this way)
    if let Ok(dt) = s.parse::<DateTime<Utc>>() {
        return Some(dt);
    }

    // Try NaiveDateTime and assume UTC if no offset
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        use chrono::TimeZone;
        return Some(Utc.from_utc_datetime(&dt));
    }

    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        use chrono::TimeZone;
        return Some(Utc.from_utc_datetime(&dt));
    }

    None
}
