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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StockReport {
    pub total_products: i64,
    pub total_value: f64,
    pub low_stock_count: i64,
    pub out_of_stock_count: i64,
    pub expiring_count: i64,
    pub excess_stock_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopProduct {
    pub product: Product,
    pub quantity: f64,
    pub revenue: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SalesReport {
    pub total_sales: i64,
    pub total_revenue: f64,
    pub average_ticket: f64,
    pub sales_by_payment_method: HashMap<String, f64>,
    pub sales_by_hour: HashMap<String, f64>,
}

#[tauri::command]
pub async fn get_stock_report(
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<StockReport> {
    crate::require_permission!(state.pool(), &employee_id, Permission::ViewReports);
    let product_repo = ProductRepository::new(state.pool());
    let stock_repo = StockRepository::new(state.pool());

    let products = product_repo.find_all_active().await?;
    let total_products = products.len() as i64;
    let total_value = products
        .iter()
        .map(|p| p.current_stock * p.cost_price)
        .sum::<f64>();

    let low_stock_count = product_repo.find_low_stock().await?.len() as i64;
    let out_of_stock_count = product_repo.find_out_of_stock().await?.len() as i64;
    let excess_stock_count = product_repo.find_excess_stock().await?.len() as i64;

    // "Expirando" em 30 dias (padrão simples)
    let expiring_count = stock_repo.find_expiring_lots(30).await?.len() as i64;

    Ok(StockReport {
        total_products,
        total_value,
        low_stock_count,
        out_of_stock_count,
        expiring_count,
        excess_stock_count,
    })
}

#[tauri::command]
pub async fn get_top_products(
    limit: i32,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<TopProduct>> {
    crate::require_permission!(state.pool(), &employee_id, Permission::ViewReports);
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
pub async fn get_sales_report(
    start_date: String,
    end_date: String,
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<SalesReport> {
    crate::require_permission!(state.pool(), &employee_id, Permission::ViewReports);
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
        total_sales,
        total_revenue,
        average_ticket,
        sales_by_payment_method,
        sales_by_hour,
    })
}
