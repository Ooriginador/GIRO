//! Comandos Tauri para Relatórios/Agrupamentos

use crate::error::AppResult;
use crate::middleware::Permission;
use crate::models::Product;
use crate::repositories::{ProductRepository, StockRepository};
use crate::AppState;
use serde::Serialize;
use sqlx::Row;
use std::collections::HashMap;
use tauri::State;

// Type alias para reduzir complexidade de tipo
type KardexRowData = (String, String, String, String, String, f64, f64, f64, f64);

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct StockReport {
    pub total_products: i32,
    pub total_value: f64,
    pub low_stock_count: i32,
    pub out_of_stock_count: i32,
    pub expiring_count: i32,
    pub excess_stock_count: i32,
    pub valuation_by_category: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TopProduct {
    pub product: Product,
    pub quantity: f64,
    pub revenue: f64,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SalesReport {
    pub total_sales: i32,
    pub total_revenue: f64,
    pub average_ticket: f64,
    pub sales_by_payment_method: HashMap<String, f64>,
    pub sales_by_hour: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FinancialReport {
    pub revenue: f64,
    pub cogs: f64, // Cost of Goods Sold
    pub gross_profit: f64,
    pub expenses: f64,
    pub net_profit: f64,
    pub margin: f64,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeRanking {
    pub employee_id: String,
    pub employee_name: String,
    pub sales_count: i32,
    pub total_amount: f64,
    pub total_commission: f64,
}

#[tauri::command]
#[specta::specta]
pub async fn get_stock_report(
    category_id: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<StockReport> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);
    let product_repo = ProductRepository::new(state.pool());
    let stock_repo = StockRepository::new(state.pool());

    let products = product_repo.find_all_active(category_id.clone()).await?;
    let total_products = products.len() as i64;
    let total_value = products
        .iter()
        .map(|p| p.current_stock * p.cost_price)
        .sum::<f64>();

    let low_stock_count = product_repo
        .find_low_stock(category_id.clone())
        .await?
        .len() as i64;
    let out_of_stock_count = product_repo
        .find_out_of_stock(category_id.clone())
        .await?
        .len() as i64;
    let excess_stock_count = product_repo
        .find_excess_stock(category_id.clone())
        .await?
        .len() as i64;

    // Lotes expirando em 30 dias, filtrado por categoria se especificado
    let expiring_count = stock_repo
        .find_expiring_lots_by_category(30, category_id.clone())
        .await?
        .len() as i64;

    // Valuation por categoria - usando prepared statements para evitar SQL injection
    let category_rows = if let Some(ref cat_id) = category_id {
        sqlx::query(
            r#"
            SELECT 
                COALESCE(c.name, 'Sem Categoria') as category_name,
                SUM(p.current_stock * p.cost_price) as total_value
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1 AND p.category_id = ?
            GROUP BY category_name 
            ORDER BY total_value DESC
            "#,
        )
        .bind(cat_id)
        .fetch_all(state.pool())
        .await?
    } else {
        sqlx::query(
            r#"
            SELECT 
                COALESCE(c.name, 'Sem Categoria') as category_name,
                SUM(p.current_stock * p.cost_price) as total_value
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1
            GROUP BY category_name 
            ORDER BY total_value DESC
            "#,
        )
        .fetch_all(state.pool())
        .await?
    };

    let mut valuation_by_category = HashMap::new();
    for row in category_rows {
        let name: String = row.try_get("category_name")?;
        let value: f64 = row.try_get("total_value")?;
        valuation_by_category.insert(name, value);
    }

    Ok(StockReport {
        total_products: total_products as i32,
        total_value,
        low_stock_count: low_stock_count as i32,
        out_of_stock_count: out_of_stock_count as i32,
        expiring_count: expiring_count as i32,
        excess_stock_count: excess_stock_count as i32,
        valuation_by_category,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_top_products(
    limit: i32,
    state: State<'_, AppState>,
) -> AppResult<Vec<TopProduct>> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);
    let limit = if limit <= 0 { 20 } else { limit };

    // Agrupa itens por produto usando apenas vendas COMPLETED
    // Retorna produto completo + quantidade + receita
    let rows = sqlx::query(
        r#"
        SELECT
          si.product_id AS product_id,
          SUM(si.quantity) AS quantity,
          SUM(si.total) AS revenue
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        WHERE s.status = 'COMPLETED'
        GROUP BY si.product_id
        ORDER BY revenue DESC
        LIMIT ?
        "#,
    )
    .bind(limit)
    .fetch_all(state.pool())
    .await?;

    let product_repo = ProductRepository::new(state.pool());
    let mut result: Vec<TopProduct> = Vec::new();

    for row in rows {
        let product_id: String = row.try_get("product_id")?;
        let quantity: f64 = row.try_get::<f64, _>("quantity")?;
        let revenue: f64 = row.try_get::<f64, _>("revenue")?;

        if let Some(product) = product_repo.find_by_id(&product_id).await? {
            result.push(TopProduct {
                product,
                quantity,
                revenue,
            });
        }
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn get_sales_report(
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> AppResult<SalesReport> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);
    // Totais
    let total_row = sqlx::query(
        r#"
        SELECT
          COUNT(*) AS total_sales,
          COALESCE(SUM(total), 0) AS total_revenue
        FROM sales
        WHERE status = 'COMPLETED'
          AND date(created_at) >= date(?)
          AND date(created_at) <= date(?)
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(state.pool())
    .await?;

    let total_sales: i64 = total_row.try_get("total_sales")?;
    let total_revenue: f64 = total_row.try_get("total_revenue")?;
    let average_ticket = if total_sales > 0 {
        total_revenue / total_sales as f64
    } else {
        0.0
    };

    // Por forma de pagamento
    let payment_rows = sqlx::query(
        r#"
        SELECT
          payment_method AS method,
          COALESCE(SUM(total), 0) AS amount
        FROM sales
        WHERE status = 'COMPLETED'
          AND date(created_at) >= date(?)
          AND date(created_at) <= date(?)
        GROUP BY payment_method
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(state.pool())
    .await?;

    let mut sales_by_payment_method: HashMap<String, f64> = HashMap::new();
    for row in payment_rows {
        let method: String = row.try_get("method")?;
        let amount: f64 = row.try_get("amount")?;
        sales_by_payment_method.insert(method, amount);
    }

    // Por hora (00..23)
    let hour_rows = sqlx::query(
        r#"
        SELECT
          strftime('%H', created_at) AS hour,
          COALESCE(SUM(total), 0) AS amount
        FROM sales
        WHERE status = 'COMPLETED'
          AND date(created_at) >= date(?)
          AND date(created_at) <= date(?)
        GROUP BY hour
        ORDER BY hour ASC
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(state.pool())
    .await?;

    let mut sales_by_hour: HashMap<String, f64> = HashMap::new();
    for row in hour_rows {
        let hour: String = row.try_get("hour")?;
        let amount: f64 = row.try_get("amount")?;
        sales_by_hour.insert(hour, amount);
    }

    Ok(SalesReport {
        total_sales: total_sales as i32,
        total_revenue,
        average_ticket,
        sales_by_payment_method,
        sales_by_hour,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_financial_report(
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> AppResult<FinancialReport> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);

    // Receita Total
    let revenue_row = sqlx::query(
        "SELECT COALESCE(SUM(total), 0.0) as revenue FROM sales WHERE status = 'COMPLETED' AND date(created_at) >= date(?) AND date(created_at) <= date(?)"
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(state.pool())
    .await?;
    let revenue: f64 = revenue_row.try_get("revenue")?;

    // CMV (Custo de Mercadoria Vendida)
    let cogs_row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(si.quantity * p.cost_price), 0.0) as cogs
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE s.status = 'COMPLETED'
          AND date(s.created_at) >= date(?)
          AND date(s.created_at) <= date(?)
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(state.pool())
    .await?;
    let cogs: f64 = cogs_row.try_get("cogs")?;

    // Despesas (Sangrias/Saídas)
    let expenses_row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(amount), 0.0) as expenses
        FROM cash_movements
        WHERE type = 'OUTGO'
          AND date(created_at) >= date(?)
          AND date(created_at) <= date(?)
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(state.pool())
    .await?;
    let expenses: f64 = expenses_row.try_get("expenses")?;

    let gross_profit = revenue - cogs;
    let net_profit = gross_profit - expenses;
    let margin = if revenue > 0.0 {
        (net_profit / revenue) * 100.0
    } else {
        0.0
    };

    Ok(FinancialReport {
        revenue,
        cogs,
        gross_profit,
        expenses,
        net_profit,
        margin,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_employee_performance(
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<EmployeeRanking>> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);

    let rows = sqlx::query(
        r#"
        SELECT 
            e.id as employee_id,
            e.name as employee_name,
            COUNT(s.id) as sales_count,
            COALESCE(SUM(s.total), 0.0) as total_amount,
            COALESCE(SUM(c.amount), 0.0) as total_commission
        FROM employees e
        LEFT JOIN sales s ON s.employee_id = e.id AND s.status = 'COMPLETED' 
            AND date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)
        LEFT JOIN commissions c ON c.sale_id = s.id
        GROUP BY e.id, e.name
        ORDER BY total_amount DESC
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(state.pool())
    .await?;

    let mut ranking = Vec::new();
    for row in rows {
        ranking.push(EmployeeRanking {
            employee_id: row.try_get("employee_id")?,
            employee_name: row.try_get("employee_name")?,
            sales_count: row.try_get::<i64, _>("sales_count")? as i32,
            total_amount: row.try_get("total_amount")?,
            total_commission: row.try_get("total_commission")?,
        });
    }

    Ok(ranking)
}

// ═══════════════════════════════════════════════════════════════════════════
// KARDEX - RELATÓRIO DE MOVIMENTAÇÃO (COMPLIANCE)
// ═══════════════════════════════════════════════════════════════════════════

/// Representa uma movimentação no Kardex
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct KardexEntry {
    pub date: String,
    pub document_type: String, // REQUEST, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, SALE
    pub document_code: String,
    pub description: String,
    pub location_name: String,
    pub qty_in: f64,
    pub qty_out: f64,
    pub balance: f64,
    pub unit_cost: f64,
    pub total_cost: f64,
}

/// Relatório Kardex completo de um produto
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct KardexReport {
    pub product_id: String,
    pub product_name: String,
    pub product_code: String,
    pub start_date: String,
    pub end_date: String,
    pub opening_balance: f64,
    pub total_in: f64,
    pub total_out: f64,
    pub closing_balance: f64,
    pub entries: Vec<KardexEntry>,
}

/// Obtém relatório Kardex de um produto
#[tauri::command]
#[specta::specta]
pub async fn get_product_kardex(
    product_id: String,
    start_date: String,
    end_date: String,
    location_id: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<KardexReport> {
    let info = state.session.require_authenticated()?;
    crate::require_permission!(state.pool(), &info.employee_id, Permission::ViewReports);

    // Get product info
    let product: (String, String) =
        sqlx::query_as("SELECT name, internal_code FROM products WHERE id = ?")
            .bind(&product_id)
            .fetch_one(state.pool())
            .await
            .map_err(|_| crate::error::AppError::NotFound {
                entity: "Product".into(),
                id: product_id.clone(),
            })?;

    let mut entries: Vec<KardexEntry> = Vec::new();

    // 1. Material Consumptions (OUT via Requests)
    let consumption_query = if location_id.is_some() {
        r#"
        SELECT mc.consumed_at as date, 'REQUEST' as doc_type,
               mr.request_number as doc_code,
               COALESCE(a.name, 'Consumo') as description,
               COALESCE(sl.name, 'N/A') as location_name,
               0.0 as qty_in, mc.quantity as qty_out,
               mc.unit_cost, mc.total_cost
        FROM material_consumptions mc
        LEFT JOIN material_requests mr ON mc.request_id = mr.id
        LEFT JOIN activities a ON mc.activity_id = a.id
        LEFT JOIN stock_locations sl ON mr.source_location_id = sl.id
        WHERE mc.product_id = ? AND mc.consumed_at BETWEEN ? AND ?
          AND mr.source_location_id = ?
        ORDER BY mc.consumed_at
        "#
    } else {
        r#"
        SELECT mc.consumed_at as date, 'REQUEST' as doc_type,
               mr.request_number as doc_code,
               COALESCE(a.name, 'Consumo') as description,
               COALESCE(sl.name, 'N/A') as location_name,
               0.0 as qty_in, mc.quantity as qty_out,
               mc.unit_cost, mc.total_cost
        FROM material_consumptions mc
        LEFT JOIN material_requests mr ON mc.request_id = mr.id
        LEFT JOIN activities a ON mc.activity_id = a.id
        LEFT JOIN stock_locations sl ON mr.source_location_id = sl.id
        WHERE mc.product_id = ? AND mc.consumed_at BETWEEN ? AND ?
        ORDER BY mc.consumed_at
        "#
    };

    let consumption_rows: Vec<KardexRowData> = if let Some(loc_id) = location_id.as_ref() {
        sqlx::query_as(consumption_query)
            .bind(&product_id)
            .bind(&start_date)
            .bind(&end_date)
            .bind(loc_id)
            .fetch_all(state.pool())
            .await?
    } else {
        sqlx::query_as(consumption_query)
            .bind(&product_id)
            .bind(&start_date)
            .bind(&end_date)
            .fetch_all(state.pool())
            .await?
    };

    for row in consumption_rows {
        entries.push(KardexEntry {
            date: row.0,
            document_type: row.1,
            document_code: row.2,
            description: row.3,
            location_name: row.4,
            qty_in: row.5,
            qty_out: row.6,
            balance: 0.0, // Will calculate later
            unit_cost: row.7,
            total_cost: row.8,
        });
    }

    // 2. Stock Transfers (IN and OUT)
    let transfer_rows: Vec<KardexRowData> = sqlx::query_as(
        r#"
        SELECT 
            COALESCE(st.shipped_at, st.received_at, st.created_at) as date,
            CASE 
                WHEN st.destination_location_id = ? THEN 'TRANSFER_IN'
                ELSE 'TRANSFER_OUT'
            END as doc_type,
            st.transfer_number as doc_code,
            'Transferência' as description,
            CASE 
                WHEN st.destination_location_id = ? THEN COALESCE(src.name, 'Origem')
                ELSE COALESCE(dst.name, 'Destino')
            END as location_name,
            CASE WHEN st.destination_location_id = ? THEN sti.received_qty ELSE 0.0 END as qty_in,
            CASE WHEN st.source_location_id = ? THEN sti.shipped_qty ELSE 0.0 END as qty_out,
            COALESCE(sti.unit_price, 0.0) as unit_cost,
            COALESCE(sti.unit_price, 0.0) * COALESCE(sti.shipped_qty, sti.received_qty, 0.0) as total_cost
        FROM stock_transfer_items sti
        JOIN stock_transfers st ON sti.transfer_id = st.id
        LEFT JOIN stock_locations src ON st.source_location_id = src.id
        LEFT JOIN stock_locations dst ON st.destination_location_id = dst.id
        WHERE sti.product_id = ?
          AND st.status IN ('SHIPPED', 'RECEIVED', 'COMPLETED')
          AND COALESCE(st.shipped_at, st.received_at, st.created_at) BETWEEN ? AND ?
        ORDER BY date
        "#,
    )
    .bind(location_id.as_deref().unwrap_or(""))
    .bind(location_id.as_deref().unwrap_or(""))
    .bind(location_id.as_deref().unwrap_or(""))
    .bind(location_id.as_deref().unwrap_or(""))
    .bind(&product_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(state.pool())
    .await?;

    for row in transfer_rows {
        if row.5 > 0.0 || row.6 > 0.0 {
            entries.push(KardexEntry {
                date: row.0,
                document_type: row.1,
                document_code: row.2,
                description: row.3,
                location_name: row.4,
                qty_in: row.5,
                qty_out: row.6,
                balance: 0.0,
                unit_cost: row.7,
                total_cost: row.8,
            });
        }
    }

    // 3. Stock Movements (Adjustments)
    let adjustment_rows: Vec<(String, String, String, f64, f64)> = sqlx::query_as(
        r#"
        SELECT created_at as date, 
               movement_type as doc_type,
               COALESCE(notes, 'Ajuste de estoque') as description,
               CASE WHEN quantity > 0 THEN quantity ELSE 0.0 END as qty_in,
               CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0.0 END as qty_out
        FROM stock_movements
        WHERE product_id = ? AND created_at BETWEEN ? AND ?
        ORDER BY created_at
        "#,
    )
    .bind(&product_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(state.pool())
    .await?;

    for row in adjustment_rows {
        entries.push(KardexEntry {
            date: row.0.clone(),
            document_type: "ADJUSTMENT".to_string(),
            document_code: format!("ADJ-{}", &row.0[0..10]),
            description: row.2,
            location_name: "Estoque Principal".to_string(),
            qty_in: row.3,
            qty_out: row.4,
            balance: 0.0,
            unit_cost: 0.0,
            total_cost: 0.0,
        });
    }

    // Sort by date
    entries.sort_by(|a, b| a.date.cmp(&b.date));

    // Calculate running balance
    let (opening_balance,): (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(quantity), 0.0) FROM stock_balances WHERE product_id = ?",
    )
    .bind(&product_id)
    .fetch_one(state.pool())
    .await?;

    // Approximate opening by reversing entries (simplified)
    let total_in: f64 = entries.iter().map(|e| e.qty_in).sum();
    let total_out: f64 = entries.iter().map(|e| e.qty_out).sum();
    let calculated_opening = opening_balance - total_in + total_out;

    let mut running = calculated_opening;
    for entry in &mut entries {
        running = running + entry.qty_in - entry.qty_out;
        entry.balance = running;
    }

    Ok(KardexReport {
        product_id: product_id.clone(),
        product_name: product.0,
        product_code: product.1,
        start_date,
        end_date,
        opening_balance: calculated_opening,
        total_in,
        total_out,
        closing_balance: running,
        entries,
    })
}
