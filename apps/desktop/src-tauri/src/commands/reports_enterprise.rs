//! Comandos Tauri para Relatórios Enterprise
//!
//! Relatórios específicos para o módulo de Almoxarifado Industrial:
//! - Consumo por Contrato/Atividade/Centro de Custo
//! - Posição de Estoque por Local
//! - Requisições Pendentes

use crate::error::AppResult;
use crate::models::enterprise::{
    ConsumptionByActivity, ConsumptionByCategory, ConsumptionReport, StockBalance,
    StockBalanceWithProduct, StockPositionReport,
};
use crate::AppState;
use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::Row;
use tauri::State;

// ═══════════════════════════════════════════════════════════════════════════════
// MODELOS DE RELATÓRIO
// ═══════════════════════════════════════════════════════════════════════════════

/// Filtros para relatório de consumo
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionReportFilter {
    pub contract_id: Option<String>,
    pub work_front_id: Option<String>,
    pub activity_id: Option<String>,
    pub cost_center: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

/// Relatório de consumo por centro de custo
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CostCenterReport {
    pub cost_center: String,
    pub total_value: f64,
    pub items_count: i32,
    pub by_activity: Vec<ConsumptionByActivity>,
}

/// Relatório de requisições pendentes
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PendingRequestsReport {
    pub total_pending: i32,
    pub total_value: f64,
    pub by_priority: Vec<PendingByPriority>,
    pub by_contract: Vec<PendingByContract>,
    pub oldest_request_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PendingByPriority {
    pub priority: String,
    pub count: i32,
    pub total_value: f64,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PendingByContract {
    pub contract_id: String,
    pub contract_name: String,
    pub count: i32,
    pub total_value: f64,
}

/// Consumo agregado por contrato para dashboard
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ContractConsumptionSummary {
    pub contract_id: String,
    pub contract_code: String,
    pub contract_name: String,
    pub total_consumption: f64,
    pub budget: f64,
    pub percentage: f64,
}

/// Alerta de estoque baixo
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LowStockAlert {
    pub product_id: String,
    pub product_name: String,
    pub internal_code: String,
    pub category_name: Option<String>,
    pub location_id: String,
    pub location_name: String,
    pub current_qty: f64,
    pub reserved_qty: f64,
    pub available_qty: f64,
    pub min_stock: f64,
    pub deficit: f64,
    pub criticality: String, // "CRITICAL", "WARNING", "LOW"
    pub suggested_action: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE CONSUMO POR CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

/// Retorna consumo agregado de todos os contratos ativos (para dashboard)
#[tauri::command]
#[specta::specta]
pub async fn get_contracts_consumption_summary(
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> AppResult<Vec<ContractConsumptionSummary>> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();
    let limit = limit.unwrap_or(5);

    // Get current month start
    let rows = sqlx::query(
        r#"
        SELECT 
            c.id as contract_id,
            c.code as contract_code,
            c.name as contract_name,
            c.budget,
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_consumption
        FROM contracts c
        LEFT JOIN work_fronts wf ON wf.contract_id = c.id
        LEFT JOIN activities a ON a.work_front_id = wf.id
        LEFT JOIN material_consumptions mc ON mc.activity_id = a.id
            AND mc.consumed_at >= date('now', 'start of month')
        WHERE c.status = 'ACTIVE'
        GROUP BY c.id, c.code, c.name, c.budget
        ORDER BY total_consumption DESC
        LIMIT ?
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let result: Vec<ContractConsumptionSummary> = rows
        .iter()
        .map(|row| {
            let total_consumption: f64 = row.try_get("total_consumption").unwrap_or(0.0);
            let budget: f64 = row.try_get("budget").unwrap_or(0.0);
            let percentage = if budget > 0.0 {
                (total_consumption / budget) * 100.0
            } else {
                0.0
            };
            ContractConsumptionSummary {
                contract_id: row.try_get("contract_id").unwrap_or_default(),
                contract_code: row.try_get("contract_code").unwrap_or_default(),
                contract_name: row.try_get("contract_name").unwrap_or_default(),
                total_consumption,
                budget,
                percentage,
            }
        })
        .collect();

    Ok(result)
}

/// Retorna relatório de consumo agregado por contrato
#[tauri::command]
#[specta::specta]
pub async fn report_consumption_by_contract(
    contract_id: String,
    date_from: Option<String>,
    date_to: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<ConsumptionReport> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    // Total geral
    let total_row = sqlx::query(
        r#"
        SELECT 
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COALESCE(COUNT(*), 0) as items_count
        FROM material_consumptions mc
        JOIN activities a ON mc.activity_id = a.id
        JOIN work_fronts wf ON a.work_front_id = wf.id
        WHERE wf.contract_id = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        "#,
    )
    .bind(&contract_id)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_one(pool)
    .await?;

    let total_value: f64 = total_row.try_get("total_value").unwrap_or(0.0);
    let items_count: i32 = total_row.try_get("items_count").unwrap_or(0);

    // Por categoria
    let by_category_rows = sqlx::query(
        r#"
        SELECT 
            p.category_id,
            COALESCE(c.name, 'Sem Categoria') as category_name,
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COUNT(*) as items_count
        FROM material_consumptions mc
        JOIN activities a ON mc.activity_id = a.id
        JOIN work_fronts wf ON a.work_front_id = wf.id
        JOIN products p ON mc.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE wf.contract_id = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        GROUP BY p.category_id, c.name
        ORDER BY total_value DESC
        "#,
    )
    .bind(&contract_id)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_all(pool)
    .await?;

    let by_category: Vec<ConsumptionByCategory> = by_category_rows
        .iter()
        .map(|row| ConsumptionByCategory {
            category_id: row.try_get::<String, _>("category_id").unwrap_or_default(),
            category_name: row
                .try_get::<String, _>("category_name")
                .unwrap_or_default(),
            total_value: row.try_get("total_value").unwrap_or(0.0),
            items_count: row.try_get("items_count").unwrap_or(0),
        })
        .collect();

    // Por atividade
    let by_activity_rows = sqlx::query(
        r#"
        SELECT 
            a.id as activity_id,
            a.name as activity_name,
            a.code as activity_code,
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COUNT(*) as items_count
        FROM material_consumptions mc
        JOIN activities a ON mc.activity_id = a.id
        JOIN work_fronts wf ON a.work_front_id = wf.id
        WHERE wf.contract_id = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        GROUP BY a.id, a.name, a.code
        ORDER BY total_value DESC
        "#,
    )
    .bind(&contract_id)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_all(pool)
    .await?;

    let by_activity: Vec<ConsumptionByActivity> = by_activity_rows
        .iter()
        .map(|row| ConsumptionByActivity {
            activity_id: row.try_get::<String, _>("activity_id").unwrap_or_default(),
            activity_name: row
                .try_get::<String, _>("activity_name")
                .unwrap_or_default(),
            activity_code: row
                .try_get::<String, _>("activity_code")
                .unwrap_or_default(),
            total_value: row.try_get("total_value").unwrap_or(0.0),
            items_count: row.try_get("items_count").unwrap_or(0),
        })
        .collect();

    Ok(ConsumptionReport {
        total_value,
        items_count,
        by_category,
        by_activity,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE CONSUMO POR ATIVIDADE
// ═══════════════════════════════════════════════════════════════════════════════

/// Retorna relatório de consumo para uma atividade específica
#[tauri::command]
#[specta::specta]
pub async fn report_consumption_by_activity(
    activity_id: String,
    date_from: Option<String>,
    date_to: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<ConsumptionReport> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    // Total geral para atividade
    let total_row = sqlx::query(
        r#"
        SELECT 
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COALESCE(COUNT(*), 0) as items_count
        FROM material_consumptions mc
        WHERE mc.activity_id = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        "#,
    )
    .bind(&activity_id)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_one(pool)
    .await?;

    let total_value: f64 = total_row.try_get("total_value").unwrap_or(0.0);
    let items_count: i32 = total_row.try_get("items_count").unwrap_or(0);

    // Por categoria
    let by_category_rows = sqlx::query(
        r#"
        SELECT 
            p.category_id,
            COALESCE(c.name, 'Sem Categoria') as category_name,
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COUNT(*) as items_count
        FROM material_consumptions mc
        JOIN products p ON mc.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE mc.activity_id = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        GROUP BY p.category_id, c.name
        ORDER BY total_value DESC
        "#,
    )
    .bind(&activity_id)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_all(pool)
    .await?;

    let by_category: Vec<ConsumptionByCategory> = by_category_rows
        .iter()
        .map(|row| ConsumptionByCategory {
            category_id: row.try_get::<String, _>("category_id").unwrap_or_default(),
            category_name: row
                .try_get::<String, _>("category_name")
                .unwrap_or_default(),
            total_value: row.try_get("total_value").unwrap_or(0.0),
            items_count: row.try_get("items_count").unwrap_or(0),
        })
        .collect();

    // Buscar info da atividade
    let activity_row = sqlx::query(r#"SELECT id, name, code FROM activities WHERE id = ?"#)
        .bind(&activity_id)
        .fetch_one(pool)
        .await?;

    let by_activity = vec![ConsumptionByActivity {
        activity_id: activity_row.try_get::<String, _>("id").unwrap_or_default(),
        activity_name: activity_row
            .try_get::<String, _>("name")
            .unwrap_or_default(),
        activity_code: activity_row
            .try_get::<String, _>("code")
            .unwrap_or_default(),
        total_value,
        items_count,
    }];

    Ok(ConsumptionReport {
        total_value,
        items_count,
        by_category,
        by_activity,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE CONSUMO POR CENTRO DE CUSTO
// ═══════════════════════════════════════════════════════════════════════════════

/// Retorna relatório de consumo agregado por centro de custo
#[tauri::command]
#[specta::specta]
pub async fn report_consumption_by_cost_center(
    cost_center: String,
    date_from: Option<String>,
    date_to: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<CostCenterReport> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    // Total geral para centro de custo
    let total_row = sqlx::query(
        r#"
        SELECT 
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COALESCE(COUNT(*), 0) as items_count
        FROM material_consumptions mc
        JOIN activities a ON mc.activity_id = a.id
        WHERE a.cost_center = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        "#,
    )
    .bind(&cost_center)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_one(pool)
    .await?;

    let total_value: f64 = total_row.try_get("total_value").unwrap_or(0.0);
    let items_count: i32 = total_row.try_get("items_count").unwrap_or(0);

    // Por atividade dentro do centro de custo
    let by_activity_rows = sqlx::query(
        r#"
        SELECT 
            a.id as activity_id,
            a.name as activity_name,
            a.code as activity_code,
            COALESCE(SUM(mc.quantity * mc.unit_cost), 0.0) as total_value,
            COUNT(*) as items_count
        FROM material_consumptions mc
        JOIN activities a ON mc.activity_id = a.id
        WHERE a.cost_center = ?
          AND (? IS NULL OR mc.consumed_at >= ?)
          AND (? IS NULL OR mc.consumed_at <= ?)
        GROUP BY a.id, a.name, a.code
        ORDER BY total_value DESC
        "#,
    )
    .bind(&cost_center)
    .bind(&date_from)
    .bind(&date_from)
    .bind(&date_to)
    .bind(&date_to)
    .fetch_all(pool)
    .await?;

    let by_activity: Vec<ConsumptionByActivity> = by_activity_rows
        .iter()
        .map(|row| ConsumptionByActivity {
            activity_id: row.try_get::<String, _>("activity_id").unwrap_or_default(),
            activity_name: row
                .try_get::<String, _>("activity_name")
                .unwrap_or_default(),
            activity_code: row
                .try_get::<String, _>("activity_code")
                .unwrap_or_default(),
            total_value: row.try_get("total_value").unwrap_or(0.0),
            items_count: row.try_get("items_count").unwrap_or(0),
        })
        .collect();

    Ok(CostCenterReport {
        cost_center,
        total_value,
        items_count,
        by_activity,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE POSIÇÃO DE ESTOQUE
// ═══════════════════════════════════════════════════════════════════════════════

/// Retorna relatório de posição de estoque por local
#[tauri::command]
#[specta::specta]
pub async fn report_stock_position(
    location_id: String,
    state: State<'_, AppState>,
) -> AppResult<StockPositionReport> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    // Info do local
    let location_row = sqlx::query(r#"SELECT id, name FROM stock_locations WHERE id = ?"#)
        .bind(&location_id)
        .fetch_one(pool)
        .await?;

    let location_name: String = location_row.try_get("name").unwrap_or_default();

    // Balances com produto
    let items_rows = sqlx::query(
        r#"
        SELECT 
            sb.id,
            sb.location_id,
            sb.product_id,
            sb.lot_id,
            sb.quantity,
            sb.reserved_quantity,
            sb.unit_cost,
            sb.last_movement_at,
            p.id as p_id,
            p.name as p_name,
            p.sku,
            p.min_stock,
            p.max_stock,
            p.unit
        FROM stock_balances sb
        JOIN products p ON sb.product_id = p.id
        WHERE sb.location_id = ?
          AND sb.quantity > 0
        ORDER BY p.name
        "#,
    )
    .bind(&location_id)
    .fetch_all(pool)
    .await?;

    let mut total_items = 0i32;
    let mut total_value = 0.0f64;
    let mut low_stock_items = 0i32;

    let items: Vec<StockBalanceWithProduct> = items_rows
        .iter()
        .map(|row| {
            let quantity: f64 = row.try_get("quantity").unwrap_or(0.0);
            let reserved_qty: f64 = row.try_get("reserved_quantity").unwrap_or(0.0);
            let min_stock: f64 = row
                .try_get::<Option<f64>, _>("min_stock")
                .unwrap_or(None)
                .unwrap_or(0.0);

            total_items += 1;
            // Enterprise StockBalance doesn't have unit_cost, using 0 for now
            total_value += 0.0;

            if quantity < min_stock {
                low_stock_items += 1;
            }

            let available_qty = quantity - reserved_qty;

            StockBalanceWithProduct {
                balance: StockBalance {
                    id: row.try_get::<String, _>("id").unwrap_or_default(),
                    location_id: row.try_get::<String, _>("location_id").unwrap_or_default(),
                    product_id: row.try_get::<String, _>("product_id").unwrap_or_default(),
                    quantity,
                    reserved_qty,
                    min_qty: min_stock,
                    max_qty: row.try_get::<Option<f64>, _>("max_stock").unwrap_or(None),
                    last_count_date: None,
                    last_count_qty: None,
                    created_at: String::new(),
                    updated_at: String::new(),
                },
                product_name: row.try_get::<String, _>("p_name").unwrap_or_default(),
                product_code: row.try_get::<String, _>("sku").unwrap_or_default(),
                product_unit: row.try_get::<String, _>("unit").unwrap_or_default(),
                available_qty,
            }
        })
        .collect();

    Ok(StockPositionReport {
        location_id,
        location_name,
        total_items,
        total_value,
        low_stock_items,
        items,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE REQUISIÇÕES PENDENTES
// ═══════════════════════════════════════════════════════════════════════════════

/// Retorna relatório de requisições pendentes de aprovação
#[tauri::command]
#[specta::specta]
pub async fn report_pending_requests(
    contract_id: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<PendingRequestsReport> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    // Total geral (com ou sem filtro de contrato)
    let (total_pending, total_value, oldest_request_date): (i32, f64, Option<String>) =
        if let Some(ref cid) = contract_id {
            let row = sqlx::query(
                r#"
                SELECT 
                    COUNT(*) as total_pending,
                    COALESCE(SUM(mr.total_value), 0.0) as total_value,
                    MIN(mr.created_at) as oldest_date
                FROM material_requests mr
                WHERE mr.status = 'PENDING' AND mr.contract_id = ?
                "#,
            )
            .bind(cid)
            .fetch_one(pool)
            .await?;

            (
                row.try_get("total_pending").unwrap_or(0),
                row.try_get("total_value").unwrap_or(0.0),
                row.try_get("oldest_date").unwrap_or(None),
            )
        } else {
            let row = sqlx::query(
                r#"
                SELECT 
                    COUNT(*) as total_pending,
                    COALESCE(SUM(mr.total_value), 0.0) as total_value,
                    MIN(mr.created_at) as oldest_date
                FROM material_requests mr
                WHERE mr.status = 'PENDING'
                "#,
            )
            .fetch_one(pool)
            .await?;

            (
                row.try_get("total_pending").unwrap_or(0),
                row.try_get("total_value").unwrap_or(0.0),
                row.try_get("oldest_date").unwrap_or(None),
            )
        };

    // Por prioridade
    let priority_rows = if let Some(ref cid) = contract_id {
        sqlx::query(
            r#"
            SELECT 
                mr.priority,
                COUNT(*) as count,
                COALESCE(SUM(mr.total_value), 0.0) as total_value
            FROM material_requests mr
            WHERE mr.status = 'PENDING' AND mr.contract_id = ?
            GROUP BY mr.priority
            ORDER BY 
                CASE mr.priority 
                    WHEN 'URGENT' THEN 1 
                    WHEN 'HIGH' THEN 2 
                    WHEN 'NORMAL' THEN 3 
                    WHEN 'LOW' THEN 4 
                END
            "#,
        )
        .bind(cid)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query(
            r#"
            SELECT 
                mr.priority,
                COUNT(*) as count,
                COALESCE(SUM(mr.total_value), 0.0) as total_value
            FROM material_requests mr
            WHERE mr.status = 'PENDING'
            GROUP BY mr.priority
            ORDER BY 
                CASE mr.priority 
                    WHEN 'URGENT' THEN 1 
                    WHEN 'HIGH' THEN 2 
                    WHEN 'NORMAL' THEN 3 
                    WHEN 'LOW' THEN 4 
                END
            "#,
        )
        .fetch_all(pool)
        .await?
    };

    let by_priority: Vec<PendingByPriority> = priority_rows
        .iter()
        .map(|row| PendingByPriority {
            priority: row.try_get::<String, _>("priority").unwrap_or_default(),
            count: row.try_get("count").unwrap_or(0),
            total_value: row.try_get("total_value").unwrap_or(0.0),
        })
        .collect();

    // Por contrato (sempre lista todos os contratos com pendências)
    let contract_rows = sqlx::query(
        r#"
        SELECT 
            mr.contract_id,
            c.name as contract_name,
            COUNT(*) as count,
            COALESCE(SUM(mr.total_value), 0.0) as total_value
        FROM material_requests mr
        JOIN contracts c ON mr.contract_id = c.id
        WHERE mr.status = 'PENDING'
        GROUP BY mr.contract_id, c.name
        ORDER BY total_value DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let by_contract: Vec<PendingByContract> = contract_rows
        .iter()
        .map(|row| PendingByContract {
            contract_id: row.try_get::<String, _>("contract_id").unwrap_or_default(),
            contract_name: row
                .try_get::<String, _>("contract_name")
                .unwrap_or_default(),
            count: row.try_get("count").unwrap_or(0),
            total_value: row.try_get("total_value").unwrap_or(0.0),
        })
        .collect();

    Ok(PendingRequestsReport {
        total_pending,
        total_value,
        by_priority,
        by_contract,
        oldest_request_date,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO SIENGE (CSV)
// ═══════════════════════════════════════════════════════════════════════════════

/// Filtros para exportação Sienge
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SiengeExportFilter {
    pub export_type: String, // "stock_position" | "consumption" | "requests"
    pub contract_id: Option<String>,
    pub location_id: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

/// Resultado da exportação
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub file_path: String,
    pub file_name: String,
    pub records_count: i32,
    pub format: String,
}

/// Exporta dados para formato Sienge (CSV)
#[tauri::command]
#[specta::specta]
pub async fn export_sienge_csv(
    filter: SiengeExportFilter,
    output_dir: String,
    state: State<'_, AppState>,
) -> AppResult<ExportResult> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let file_name = format!("sienge_{}_{}.csv", filter.export_type, timestamp);
    let file_path = format!("{}/{}", output_dir, file_name);

    let mut csv_content = String::new();
    let mut records_count = 0;

    match filter.export_type.as_str() {
        "stock_position" => {
            // Header Sienge estoque
            csv_content.push_str("CODIGO_INSUMO;DESCRICAO;UNIDADE;QUANTIDADE;VALOR_UNITARIO;VALOR_TOTAL;LOCAL;CONTRATO\n");

            let query = if let Some(ref loc_id) = filter.location_id {
                sqlx::query(
                    r#"
                    SELECT 
                        p.code as codigo,
                        p.name as descricao,
                        p.unit as unidade,
                        sb.quantity as quantidade,
                        p.cost_price as valor_unitario,
                        (sb.quantity * p.cost_price) as valor_total,
                        l.name as local_name,
                        COALESCE(c.code, '') as contrato_code
                    FROM stock_balances sb
                    JOIN products p ON sb.product_id = p.id
                    JOIN stock_locations l ON sb.location_id = l.id
                    LEFT JOIN work_fronts wf ON l.work_front_id = wf.id
                    LEFT JOIN contracts c ON wf.contract_id = c.id
                    WHERE sb.location_id = ? AND sb.quantity > 0
                    ORDER BY p.code
                    "#,
                )
                .bind(loc_id)
                .fetch_all(pool)
                .await?
            } else {
                sqlx::query(
                    r#"
                    SELECT 
                        p.code as codigo,
                        p.name as descricao,
                        p.unit as unidade,
                        sb.quantity as quantidade,
                        p.cost_price as valor_unitario,
                        (sb.quantity * p.cost_price) as valor_total,
                        l.name as local_name,
                        COALESCE(c.code, '') as contrato_code
                    FROM stock_balances sb
                    JOIN products p ON sb.product_id = p.id
                    JOIN stock_locations l ON sb.location_id = l.id
                    LEFT JOIN work_fronts wf ON l.work_front_id = wf.id
                    LEFT JOIN contracts c ON wf.contract_id = c.id
                    WHERE sb.quantity > 0
                    ORDER BY l.name, p.code
                    "#,
                )
                .fetch_all(pool)
                .await?
            };

            for row in &query {
                let codigo: String = row.try_get("codigo").unwrap_or_default();
                let descricao: String = row.try_get("descricao").unwrap_or_default();
                let unidade: String = row.try_get("unidade").unwrap_or_else(|_| "UN".to_string());
                let quantidade: f64 = row.try_get("quantidade").unwrap_or(0.0);
                let valor_unitario: f64 = row.try_get("valor_unitario").unwrap_or(0.0);
                let valor_total: f64 = row.try_get("valor_total").unwrap_or(0.0);
                let local: String = row.try_get("local_name").unwrap_or_default();
                let contrato: String = row.try_get("contrato_code").unwrap_or_default();

                csv_content.push_str(&format!(
                    "{};{};{};{:.4};{:.4};{:.4};{};{}\n",
                    codigo,
                    descricao,
                    unidade,
                    quantidade,
                    valor_unitario,
                    valor_total,
                    local,
                    contrato
                ));
                records_count += 1;
            }
        }
        "consumption" => {
            // Header Sienge consumo
            csv_content.push_str("DATA;CODIGO_INSUMO;DESCRICAO;UNIDADE;QUANTIDADE;VALOR_UNITARIO;VALOR_TOTAL;CONTRATO;ATIVIDADE;CENTRO_CUSTO\n");

            let rows = sqlx::query(
                r#"
                SELECT 
                    mc.consumed_at as data,
                    p.code as codigo,
                    p.name as descricao,
                    p.unit as unidade,
                    mc.quantity as quantidade,
                    mc.unit_cost as valor_unitario,
                    (mc.quantity * mc.unit_cost) as valor_total,
                    c.code as contrato_code,
                    a.name as atividade,
                    COALESCE(a.cost_center, '') as centro_custo
                FROM material_consumptions mc
                JOIN products p ON mc.product_id = p.id
                JOIN activities a ON mc.activity_id = a.id
                JOIN work_fronts wf ON a.work_front_id = wf.id
                JOIN contracts c ON wf.contract_id = c.id
                WHERE (? IS NULL OR c.id = ?)
                  AND (? IS NULL OR mc.consumed_at >= ?)
                  AND (? IS NULL OR mc.consumed_at <= ?)
                ORDER BY mc.consumed_at DESC
                "#,
            )
            .bind(&filter.contract_id)
            .bind(&filter.contract_id)
            .bind(&filter.date_from)
            .bind(&filter.date_from)
            .bind(&filter.date_to)
            .bind(&filter.date_to)
            .fetch_all(pool)
            .await?;

            for row in &rows {
                let data: String = row.try_get("data").unwrap_or_default();
                let codigo: String = row.try_get("codigo").unwrap_or_default();
                let descricao: String = row.try_get("descricao").unwrap_or_default();
                let unidade: String = row.try_get("unidade").unwrap_or_else(|_| "UN".to_string());
                let quantidade: f64 = row.try_get("quantidade").unwrap_or(0.0);
                let valor_unitario: f64 = row.try_get("valor_unitario").unwrap_or(0.0);
                let valor_total: f64 = row.try_get("valor_total").unwrap_or(0.0);
                let contrato: String = row.try_get("contrato_code").unwrap_or_default();
                let atividade: String = row.try_get("atividade").unwrap_or_default();
                let centro_custo: String = row.try_get("centro_custo").unwrap_or_default();

                csv_content.push_str(&format!(
                    "{};{};{};{};{:.4};{:.4};{:.4};{};{};{}\n",
                    data,
                    codigo,
                    descricao,
                    unidade,
                    quantidade,
                    valor_unitario,
                    valor_total,
                    contrato,
                    atividade,
                    centro_custo
                ));
                records_count += 1;
            }
        }
        "requests" => {
            // Header Sienge requisições
            csv_content.push_str("NUMERO;DATA;CONTRATO;SOLICITANTE;PRIORIDADE;STATUS;CODIGO_INSUMO;DESCRICAO;QUANTIDADE;VALOR_ESTIMADO\n");

            let rows = sqlx::query(
                r#"
                SELECT 
                    mr.request_number as numero,
                    mr.created_at as data,
                    c.code as contrato_code,
                    COALESCE(e.name, mr.requester_id) as solicitante,
                    mr.priority as prioridade,
                    mr.status as status,
                    p.code as codigo,
                    p.name as descricao,
                    mri.quantity as quantidade,
                    (mri.quantity * mri.unit_price) as valor_estimado
                FROM material_requests mr
                JOIN contracts c ON mr.contract_id = c.id
                LEFT JOIN employees e ON mr.requester_id = e.id
                JOIN material_request_items mri ON mr.id = mri.request_id
                JOIN products p ON mri.product_id = p.id
                WHERE (? IS NULL OR mr.contract_id = ?)
                  AND (? IS NULL OR mr.created_at >= ?)
                  AND (? IS NULL OR mr.created_at <= ?)
                ORDER BY mr.created_at DESC
                "#,
            )
            .bind(&filter.contract_id)
            .bind(&filter.contract_id)
            .bind(&filter.date_from)
            .bind(&filter.date_from)
            .bind(&filter.date_to)
            .bind(&filter.date_to)
            .fetch_all(pool)
            .await?;

            for row in &rows {
                let numero: String = row.try_get("numero").unwrap_or_default();
                let data: String = row.try_get("data").unwrap_or_default();
                let contrato: String = row.try_get("contrato_code").unwrap_or_default();
                let solicitante: String = row.try_get("solicitante").unwrap_or_default();
                let prioridade: String = row.try_get("prioridade").unwrap_or_default();
                let status: String = row.try_get("status").unwrap_or_default();
                let codigo: String = row.try_get("codigo").unwrap_or_default();
                let descricao: String = row.try_get("descricao").unwrap_or_default();
                let quantidade: f64 = row.try_get("quantidade").unwrap_or(0.0);
                let valor: f64 = row.try_get("valor_estimado").unwrap_or(0.0);

                csv_content.push_str(&format!(
                    "{};{};{};{};{};{};{};{};{:.4};{:.4}\n",
                    numero,
                    data,
                    contrato,
                    solicitante,
                    prioridade,
                    status,
                    codigo,
                    descricao,
                    quantidade,
                    valor
                ));
                records_count += 1;
            }
        }
        _ => {
            return Err(crate::error::AppError::Validation(format!(
                "Tipo de exportação inválido: {}",
                filter.export_type
            )));
        }
    }

    // Write file
    std::fs::write(&file_path, csv_content)?;

    tracing::info!(
        "Sienge export completed: {} records to {}",
        records_count,
        file_path
    );

    Ok(ExportResult {
        file_path,
        file_name,
        records_count,
        format: "CSV".to_string(),
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO UAU (XML)
// ═══════════════════════════════════════════════════════════════════════════════

/// Filtros para exportação UAU
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UauExportFilter {
    pub export_type: String, // "stock_position" | "consumption" | "transfers"
    pub contract_id: Option<String>,
    pub location_id: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

/// Exporta dados para formato UAU (XML)
#[tauri::command]
#[specta::specta]
pub async fn export_uau_xml(
    filter: UauExportFilter,
    output_dir: String,
    state: State<'_, AppState>,
) -> AppResult<ExportResult> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let file_name = format!("uau_{}_{}.xml", filter.export_type, timestamp);
    let file_path = format!("{}/{}", output_dir, file_name);

    let mut xml_content = String::new();
    xml_content.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    let mut records_count = 0;

    match filter.export_type.as_str() {
        "stock_position" => {
            xml_content.push_str("<UAU_ESTOQUE>\n");
            xml_content.push_str("  <HEADER>\n");
            xml_content.push_str(&format!(
                "    <DATA_GERACAO>{}</DATA_GERACAO>\n",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
            ));
            xml_content.push_str("    <SISTEMA>GIRO_ENTERPRISE</SISTEMA>\n");
            xml_content.push_str("  </HEADER>\n");
            xml_content.push_str("  <ITENS>\n");

            let rows = sqlx::query(
                r#"
                SELECT 
                    p.code as codigo,
                    p.name as descricao,
                    p.unit as unidade,
                    sb.quantity as quantidade,
                    p.cost_price as custo,
                    l.code as local_code,
                    l.name as local_name,
                    COALESCE(c.code, '') as obra_code
                FROM stock_balances sb
                JOIN products p ON sb.product_id = p.id
                JOIN stock_locations l ON sb.location_id = l.id
                LEFT JOIN work_fronts wf ON l.work_front_id = wf.id
                LEFT JOIN contracts c ON wf.contract_id = c.id
                WHERE sb.quantity > 0
                  AND (? IS NULL OR sb.location_id = ?)
                ORDER BY l.code, p.code
                "#,
            )
            .bind(&filter.location_id)
            .bind(&filter.location_id)
            .fetch_all(pool)
            .await?;

            for row in &rows {
                let codigo: String = row.try_get("codigo").unwrap_or_default();
                let descricao: String = row.try_get("descricao").unwrap_or_default();
                let unidade: String = row.try_get("unidade").unwrap_or_else(|_| "UN".to_string());
                let quantidade: f64 = row.try_get("quantidade").unwrap_or(0.0);
                let custo: f64 = row.try_get("custo").unwrap_or(0.0);
                let local_code: String = row.try_get("local_code").unwrap_or_default();
                let obra_code: String = row.try_get("obra_code").unwrap_or_default();

                xml_content.push_str("    <ITEM>\n");
                xml_content.push_str(&format!("      <CODIGO>{}</CODIGO>\n", escape_xml(&codigo)));
                xml_content.push_str(&format!(
                    "      <DESCRICAO>{}</DESCRICAO>\n",
                    escape_xml(&descricao)
                ));
                xml_content.push_str(&format!(
                    "      <UNIDADE>{}</UNIDADE>\n",
                    escape_xml(&unidade)
                ));
                xml_content.push_str(&format!(
                    "      <QUANTIDADE>{:.4}</QUANTIDADE>\n",
                    quantidade
                ));
                xml_content.push_str(&format!(
                    "      <CUSTO_UNITARIO>{:.4}</CUSTO_UNITARIO>\n",
                    custo
                ));
                xml_content.push_str(&format!(
                    "      <CUSTO_TOTAL>{:.4}</CUSTO_TOTAL>\n",
                    quantidade * custo
                ));
                xml_content.push_str(&format!(
                    "      <ALMOXARIFADO>{}</ALMOXARIFADO>\n",
                    escape_xml(&local_code)
                ));
                xml_content.push_str(&format!("      <OBRA>{}</OBRA>\n", escape_xml(&obra_code)));
                xml_content.push_str("    </ITEM>\n");
                records_count += 1;
            }

            xml_content.push_str("  </ITENS>\n");
            xml_content.push_str(&format!("  <TOTAL_ITENS>{}</TOTAL_ITENS>\n", records_count));
            xml_content.push_str("</UAU_ESTOQUE>\n");
        }
        "consumption" => {
            xml_content.push_str("<UAU_CONSUMO>\n");
            xml_content.push_str("  <HEADER>\n");
            xml_content.push_str(&format!(
                "    <DATA_GERACAO>{}</DATA_GERACAO>\n",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
            ));
            xml_content.push_str(&format!(
                "    <PERIODO_DE>{}</PERIODO_DE>\n",
                filter.date_from.as_deref().unwrap_or("")
            ));
            xml_content.push_str(&format!(
                "    <PERIODO_ATE>{}</PERIODO_ATE>\n",
                filter.date_to.as_deref().unwrap_or("")
            ));
            xml_content.push_str("    <SISTEMA>GIRO_ENTERPRISE</SISTEMA>\n");
            xml_content.push_str("  </HEADER>\n");
            xml_content.push_str("  <MOVIMENTACOES>\n");

            let rows = sqlx::query(
                r#"
                SELECT 
                    mc.id,
                    mc.consumed_at as data,
                    p.code as codigo,
                    p.name as descricao,
                    p.unit as unidade,
                    mc.quantity as quantidade,
                    mc.unit_cost as custo,
                    c.code as obra_code,
                    a.name as atividade,
                    a.cost_center as centro_custo
                FROM material_consumptions mc
                JOIN products p ON mc.product_id = p.id
                JOIN activities a ON mc.activity_id = a.id
                JOIN work_fronts wf ON a.work_front_id = wf.id
                JOIN contracts c ON wf.contract_id = c.id
                WHERE (? IS NULL OR c.id = ?)
                  AND (? IS NULL OR mc.consumed_at >= ?)
                  AND (? IS NULL OR mc.consumed_at <= ?)
                ORDER BY mc.consumed_at DESC
                "#,
            )
            .bind(&filter.contract_id)
            .bind(&filter.contract_id)
            .bind(&filter.date_from)
            .bind(&filter.date_from)
            .bind(&filter.date_to)
            .bind(&filter.date_to)
            .fetch_all(pool)
            .await?;

            for row in &rows {
                let id: String = row.try_get("id").unwrap_or_default();
                let data: String = row.try_get("data").unwrap_or_default();
                let codigo: String = row.try_get("codigo").unwrap_or_default();
                let descricao: String = row.try_get("descricao").unwrap_or_default();
                let unidade: String = row.try_get("unidade").unwrap_or_else(|_| "UN".to_string());
                let quantidade: f64 = row.try_get("quantidade").unwrap_or(0.0);
                let custo: f64 = row.try_get("custo").unwrap_or(0.0);
                let obra: String = row.try_get("obra_code").unwrap_or_default();
                let atividade: String = row.try_get("atividade").unwrap_or_default();
                let centro_custo: String = row.try_get("centro_custo").unwrap_or_default();

                xml_content.push_str("    <MOVIMENTO>\n");
                xml_content.push_str(&format!("      <ID>{}</ID>\n", escape_xml(&id)));
                xml_content.push_str(&format!("      <DATA>{}</DATA>\n", escape_xml(&data)));
                xml_content.push_str("      <TIPO>CONSUMO</TIPO>\n");
                xml_content.push_str(&format!(
                    "      <CODIGO_INSUMO>{}</CODIGO_INSUMO>\n",
                    escape_xml(&codigo)
                ));
                xml_content.push_str(&format!(
                    "      <DESCRICAO>{}</DESCRICAO>\n",
                    escape_xml(&descricao)
                ));
                xml_content.push_str(&format!(
                    "      <UNIDADE>{}</UNIDADE>\n",
                    escape_xml(&unidade)
                ));
                xml_content.push_str(&format!(
                    "      <QUANTIDADE>{:.4}</QUANTIDADE>\n",
                    quantidade
                ));
                xml_content.push_str(&format!(
                    "      <CUSTO_UNITARIO>{:.4}</CUSTO_UNITARIO>\n",
                    custo
                ));
                xml_content.push_str(&format!(
                    "      <CUSTO_TOTAL>{:.4}</CUSTO_TOTAL>\n",
                    quantidade * custo
                ));
                xml_content.push_str(&format!("      <OBRA>{}</OBRA>\n", escape_xml(&obra)));
                xml_content.push_str(&format!(
                    "      <ATIVIDADE>{}</ATIVIDADE>\n",
                    escape_xml(&atividade)
                ));
                xml_content.push_str(&format!(
                    "      <CENTRO_CUSTO>{}</CENTRO_CUSTO>\n",
                    escape_xml(&centro_custo)
                ));
                xml_content.push_str("    </MOVIMENTO>\n");
                records_count += 1;
            }

            xml_content.push_str("  </MOVIMENTACOES>\n");
            xml_content.push_str(&format!(
                "  <TOTAL_MOVIMENTOS>{}</TOTAL_MOVIMENTOS>\n",
                records_count
            ));
            xml_content.push_str("</UAU_CONSUMO>\n");
        }
        "transfers" => {
            xml_content.push_str("<UAU_TRANSFERENCIAS>\n");
            xml_content.push_str("  <HEADER>\n");
            xml_content.push_str(&format!(
                "    <DATA_GERACAO>{}</DATA_GERACAO>\n",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
            ));
            xml_content.push_str("    <SISTEMA>GIRO_ENTERPRISE</SISTEMA>\n");
            xml_content.push_str("  </HEADER>\n");
            xml_content.push_str("  <TRANSFERENCIAS>\n");

            let rows = sqlx::query(
                r#"
                SELECT 
                    st.id,
                    st.transfer_number as numero,
                    st.created_at as data,
                    st.status,
                    lo.code as origem_code,
                    lo.name as origem_name,
                    ld.code as destino_code,
                    ld.name as destino_name,
                    p.code as produto_code,
                    p.name as produto_name,
                    sti.quantity as quantidade
                FROM stock_transfers st
                JOIN stock_locations lo ON st.origin_location_id = lo.id
                JOIN stock_locations ld ON st.destination_location_id = ld.id
                JOIN stock_transfer_items sti ON st.id = sti.transfer_id
                JOIN products p ON sti.product_id = p.id
                WHERE (? IS NULL OR st.created_at >= ?)
                  AND (? IS NULL OR st.created_at <= ?)
                ORDER BY st.created_at DESC
                "#,
            )
            .bind(&filter.date_from)
            .bind(&filter.date_from)
            .bind(&filter.date_to)
            .bind(&filter.date_to)
            .fetch_all(pool)
            .await?;

            for row in &rows {
                let numero: String = row.try_get("numero").unwrap_or_default();
                let data: String = row.try_get("data").unwrap_or_default();
                let status: String = row.try_get("status").unwrap_or_default();
                let origem: String = row.try_get("origem_code").unwrap_or_default();
                let destino: String = row.try_get("destino_code").unwrap_or_default();
                let produto: String = row.try_get("produto_code").unwrap_or_default();
                let produto_nome: String = row.try_get("produto_name").unwrap_or_default();
                let quantidade: f64 = row.try_get("quantidade").unwrap_or(0.0);

                xml_content.push_str("    <TRANSFERENCIA>\n");
                xml_content.push_str(&format!("      <NUMERO>{}</NUMERO>\n", escape_xml(&numero)));
                xml_content.push_str(&format!("      <DATA>{}</DATA>\n", escape_xml(&data)));
                xml_content.push_str(&format!("      <STATUS>{}</STATUS>\n", escape_xml(&status)));
                xml_content.push_str(&format!(
                    "      <ALMOX_ORIGEM>{}</ALMOX_ORIGEM>\n",
                    escape_xml(&origem)
                ));
                xml_content.push_str(&format!(
                    "      <ALMOX_DESTINO>{}</ALMOX_DESTINO>\n",
                    escape_xml(&destino)
                ));
                xml_content.push_str(&format!(
                    "      <CODIGO_INSUMO>{}</CODIGO_INSUMO>\n",
                    escape_xml(&produto)
                ));
                xml_content.push_str(&format!(
                    "      <DESCRICAO>{}</DESCRICAO>\n",
                    escape_xml(&produto_nome)
                ));
                xml_content.push_str(&format!(
                    "      <QUANTIDADE>{:.4}</QUANTIDADE>\n",
                    quantidade
                ));
                xml_content.push_str("    </TRANSFERENCIA>\n");
                records_count += 1;
            }

            xml_content.push_str("  </TRANSFERENCIAS>\n");
            xml_content.push_str(&format!(
                "  <TOTAL_TRANSFERENCIAS>{}</TOTAL_TRANSFERENCIAS>\n",
                records_count
            ));
            xml_content.push_str("</UAU_TRANSFERENCIAS>\n");
        }
        _ => {
            return Err(crate::error::AppError::Validation(format!(
                "Tipo de exportação inválido: {}",
                filter.export_type
            )));
        }
    }

    // Write file
    std::fs::write(&file_path, xml_content)?;

    tracing::info!(
        "UAU XML export completed: {} records to {}",
        records_count,
        file_path
    );

    Ok(ExportResult {
        file_path,
        file_name,
        records_count,
        format: "XML".to_string(),
    })
}

/// Helper to escape XML special characters
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTAS DE ESTOQUE BAIXO
// ═══════════════════════════════════════════════════════════════════════════════

/// Retorna alertas de estoque baixo por local para o módulo Enterprise
/// Considera stock_balances vs products.min_stock
#[tauri::command]
#[specta::specta]
pub async fn get_low_stock_alerts(
    location_id: Option<String>,
    category_id: Option<String>,
    criticality: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<Vec<LowStockAlert>> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    let rows = sqlx::query(
        r#"
        SELECT 
            p.id as product_id,
            p.name as product_name,
            COALESCE(p.internal_code, '') as internal_code,
            cat.name as category_name,
            sl.id as location_id,
            sl.name as location_name,
            COALESCE(sb.quantity, 0.0) as current_qty,
            COALESCE(sb.reserved_qty, 0.0) as reserved_qty,
            COALESCE(p.min_stock, 0.0) as min_stock
        FROM products p
        JOIN stock_balances sb ON sb.product_id = p.id
        JOIN stock_locations sl ON sl.id = sb.location_id
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE p.is_active = 1
          AND COALESCE(p.min_stock, 0.0) > 0
          AND (sb.quantity - COALESCE(sb.reserved_qty, 0.0)) < COALESCE(p.min_stock, 0.0)
          AND (? IS NULL OR sl.id = ?)
          AND (? IS NULL OR p.category_id = ?)
        ORDER BY 
            (COALESCE(p.min_stock, 0.0) - (sb.quantity - COALESCE(sb.reserved_qty, 0.0))) DESC
        "#,
    )
    .bind(&location_id)
    .bind(&location_id)
    .bind(&category_id)
    .bind(&category_id)
    .fetch_all(pool)
    .await?;

    let mut alerts: Vec<LowStockAlert> = rows
        .iter()
        .map(|row| {
            let current_qty: f64 = row.try_get("current_qty").unwrap_or(0.0);
            let reserved_qty: f64 = row.try_get("reserved_qty").unwrap_or(0.0);
            let min_stock: f64 = row.try_get("min_stock").unwrap_or(0.0);
            let available_qty = current_qty - reserved_qty;
            let deficit = min_stock - available_qty;

            // Determine criticality based on percentage of min_stock
            let ratio = if min_stock > 0.0 {
                available_qty / min_stock
            } else {
                1.0
            };
            let criticality = if ratio <= 0.25 {
                "CRITICAL".to_string()
            } else if ratio <= 0.5 {
                "WARNING".to_string()
            } else {
                "LOW".to_string()
            };

            // Suggest action based on context
            let suggested_action = if available_qty <= 0.0 {
                "Criar Pedido de Compra Urgente".to_string()
            } else if deficit > 0.0 {
                "Solicitar Transferência ou Compra".to_string()
            } else {
                "Monitorar".to_string()
            };

            LowStockAlert {
                product_id: row.try_get("product_id").unwrap_or_default(),
                product_name: row.try_get("product_name").unwrap_or_default(),
                internal_code: row.try_get("internal_code").unwrap_or_default(),
                category_name: row
                    .try_get::<Option<String>, _>("category_name")
                    .ok()
                    .flatten(),
                location_id: row.try_get("location_id").unwrap_or_default(),
                location_name: row.try_get("location_name").unwrap_or_default(),
                current_qty,
                reserved_qty,
                available_qty,
                min_stock,
                deficit,
                criticality,
                suggested_action,
            }
        })
        .collect();

    // Filter by criticality if specified
    if let Some(ref crit) = criticality {
        alerts.retain(|a| a.criticality == *crit);
    }

    Ok(alerts)
}

/// Retorna contagem de alertas por criticidade (para badge no dashboard)
#[tauri::command]
#[specta::specta]
pub async fn get_low_stock_alerts_count(
    state: State<'_, AppState>,
) -> AppResult<LowStockAlertsCount> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    let row = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN ((sb.quantity - COALESCE(sb.reserved_qty, 0.0)) / COALESCE(p.min_stock, 1.0)) <= 0.25 THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN ((sb.quantity - COALESCE(sb.reserved_qty, 0.0)) / COALESCE(p.min_stock, 1.0)) > 0.25 
                      AND ((sb.quantity - COALESCE(sb.reserved_qty, 0.0)) / COALESCE(p.min_stock, 1.0)) <= 0.5 THEN 1 ELSE 0 END) as warning,
            SUM(CASE WHEN ((sb.quantity - COALESCE(sb.reserved_qty, 0.0)) / COALESCE(p.min_stock, 1.0)) > 0.5 THEN 1 ELSE 0 END) as low
        FROM products p
        JOIN stock_balances sb ON sb.product_id = p.id
        WHERE p.is_active = 1
          AND COALESCE(p.min_stock, 0.0) > 0
          AND (sb.quantity - COALESCE(sb.reserved_qty, 0.0)) < COALESCE(p.min_stock, 0.0)
        "#,
    )
    .fetch_one(pool)
    .await?;

    Ok(LowStockAlertsCount {
        total: row.try_get::<i32, _>("total").unwrap_or(0),
        critical: row.try_get::<i32, _>("critical").unwrap_or(0),
        warning: row.try_get::<i32, _>("warning").unwrap_or(0),
        low: row.try_get::<i32, _>("low").unwrap_or(0),
    })
}

/// Contagem de alertas por criticidade
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LowStockAlertsCount {
    pub total: i32,
    pub critical: i32,
    pub warning: i32,
    pub low: i32,
}
