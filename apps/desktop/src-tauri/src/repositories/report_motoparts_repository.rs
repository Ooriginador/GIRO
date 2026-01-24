use crate::error::AppResult;
use crate::models::report_motoparts::{
    DailyRevenue, DashboardStats, ServiceOrderStats, StatusCount, TopItem,
};
use sqlx::{Pool, Sqlite};

pub struct ReportMotopartsRepository {
    pool: Pool<Sqlite>,
}

impl ReportMotopartsRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn get_dashboard_stats(&self) -> AppResult<DashboardStats> {
        // Vendas hoje
        let sales_today_row: (f64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COALESCE(SUM(total), 0.0) as total,
                COUNT(id) as count
            FROM sales 
            WHERE date(created_at) = date('now') AND status != 'CANCELED'
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // Vendas ontem
        let sales_yesterday_total: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(total), 0.0) as total
            FROM sales 
            WHERE date(created_at) = date('now', '-1 day') AND status != 'CANCELED'
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // OS Abertas
        let open_os_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(id) as count
            FROM service_orders 
            WHERE status NOT IN ('COMPLETED', 'DELIVERED', 'CANCELED')
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // Garantias Ativas
        let active_warranties_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(id) as count
            FROM warranty_claims
            WHERE status IN ('ACTIVE', 'PENDING')
            "#,
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        // Estoque Baixo
        let low_stock_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(id) as count
            FROM products
            WHERE current_stock <= min_stock AND is_active = 1
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // Alertas Ativos (Unread)
        let active_alerts_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(id) as count
            FROM alerts
            WHERE is_read = 0
            "#,
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        // Receita Semanal (Últimos 7 dias)
        // Receita Semanal (Últimos 7 dias)
        let revenue_rows: Vec<(String, f64)> = sqlx::query_as(
            r#"
            WITH RECURSIVE dates(date) AS (
                VALUES(date('now', '-6 days'))
                UNION ALL
                SELECT date(date, '+1 day')
                FROM dates
                WHERE date < date('now')
            )
            SELECT 
                d.date,
                COALESCE((
                    SELECT SUM(total)
                    FROM sales
                    WHERE date(created_at) = d.date AND status != 'CANCELED'
                ), 0.0) as amount
            FROM dates d
            ORDER BY d.date
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let revenue_weekly = revenue_rows
            .into_iter()
            .map(|(date, amount)| DailyRevenue { date, amount })
            .collect();

        Ok(DashboardStats {
            total_sales_today: sales_today_row.0,
            total_sales_yesterday: sales_yesterday_total,
            count_sales_today: sales_today_row.1 as i32,
            open_service_orders: open_os_count as i32,
            active_warranties: active_warranties_count as i32,
            low_stock_products: low_stock_count as i32,
            active_alerts: active_alerts_count as i32,
            revenue_weekly,
        })
    }

    pub async fn get_service_order_stats(&self) -> AppResult<ServiceOrderStats> {
        let total_count: i64 = sqlx::query_scalar("SELECT COUNT(id) FROM service_orders")
            .fetch_one(&self.pool)
            .await?;

        let by_status_rows: Vec<(String, i64)> = sqlx::query_as(
            r#"
            SELECT status, COUNT(id) as count
            FROM service_orders
            GROUP BY status
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let revenue_row: (f64, f64) = sqlx::query_as(
            r#"
            SELECT 
                COALESCE(SUM(labor_cost), 0.0) as labor,
                COALESCE(SUM(parts_cost), 0.0) as parts
            FROM service_orders
            WHERE status IN ('COMPLETED', 'DELIVERED')
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        let count_completed = by_status_rows
            .iter()
            .filter(|(status, _)| status == "COMPLETED" || status == "DELIVERED")
            .map(|(_, count)| count)
            .sum::<i64>();

        let by_status = by_status_rows
            .into_iter()
            .map(|(status, count)| StatusCount {
                status,
                count: count as i32,
            })
            .collect();

        let total_revenue = revenue_row.0 + revenue_row.1;

        let average_ticket = if count_completed > 0 {
            total_revenue / count_completed as f64
        } else {
            0.0
        };

        Ok(ServiceOrderStats {
            total_orders: total_count as i32,
            by_status,
            revenue_labor: revenue_row.0,
            revenue_parts: revenue_row.1,
            average_ticket,
        })
    }

    pub async fn get_top_products_motoparts(&self, limit: i64) -> AppResult<Vec<TopItem>> {
        let rows: Vec<(String, String, f64, f64)> = sqlx::query_as(
            r#"
            SELECT 
                p.id, p.name,
                COALESCE(SUM(si.quantity), 0.0) as quantity,
                COALESCE(SUM(si.total), 0.0) as total
            FROM sale_items si
            JOIN products p ON p.id = si.product_id
            GROUP BY p.id
            ORDER BY quantity DESC
            LIMIT ?
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let items = rows
            .into_iter()
            .map(|(id, name, quantity, total)| TopItem {
                id,
                name,
                quantity,
                total_value: total,
            })
            .collect();

        Ok(items)
    }
}
