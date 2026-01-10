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
        let sales_today = sqlx::query!(
            r#"
            SELECT 
                COALESCE(SUM(total), 0.0) as "total!: f64",
                COUNT(id) as "count!: i64"
            FROM sales 
            WHERE date(created_at) = date('now')
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        // OS Abertas
        let open_os = sqlx::query!(
            r#"
            SELECT COUNT(id) as "count!: i64"
            FROM service_orders 
            WHERE status NOT IN ('COMPLETED', 'DELIVERED', 'CANCELED')
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        // Garantias Ativas - DISABLED: warranty_claims table not created
        let active_warranties_count = 0; // Hardcoded until table is created
                                         // let active_warranties = sqlx::query!(
                                         //     r#"
                                         //     SELECT COUNT(id) as count
                                         //     FROM warranty_claims
                                         //     WHERE status IN ('OPEN', 'IN_PROGRESS', 'APPROVED')
                                         //     "#
                                         // )
                                         // .fetch_one(&self.pool)
                                         // .await?;

        // Estoque Baixo
        let low_stock = sqlx::query!(
            r#"
            SELECT COUNT(id) as "count!: i64"
            FROM products
            WHERE current_stock <= min_stock AND is_active = 1
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        // Receita Semanal (Últimos 7 dias)
        // Agregando Sales e ServiceOrders (Delivered)
        let revenue_weekly_rows = sqlx::query!(
            r#"
            WITH RECURSIVE dates(date) AS (
                VALUES(date('now', '-6 days'))
                UNION ALL
                SELECT date(date, '+1 day')
                FROM dates
                WHERE date < date('now')
            )
            SELECT 
                dates.date as "date!: String",
                (COALESCE(SUM(s.total), 0.0) + COALESCE(SUM(so.total), 0.0)) as "amount!: f64"
            FROM dates
            LEFT JOIN sales s ON date(s.created_at) = dates.date
            LEFT JOIN service_orders so ON date(so.completed_at) = dates.date AND so.status = 'DELIVERED'
            GROUP BY dates.date
            ORDER BY dates.date
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let revenue_weekly = revenue_weekly_rows
            .into_iter()
            .map(|r| DailyRevenue {
                date: r.date,
                amount: r.amount,
            })
            .collect();

        Ok(DashboardStats {
            total_sales_today: sales_today.total,
            count_sales_today: sales_today.count, // Sqlite COUNT returns i64 or i32
            open_service_orders: open_os.count,
            active_warranties: active_warranties_count,
            low_stock_products: low_stock.count,
            revenue_weekly,
        })
    }

    pub async fn get_service_order_stats(&self) -> AppResult<ServiceOrderStats> {
        let total = sqlx::query!(r#"SELECT COUNT(id) as count FROM service_orders"#)
            .fetch_one(&self.pool)
            .await?;

        let by_status_rows = sqlx::query!(
            r#"
            SELECT status, COUNT(id) as count
            FROM service_orders
            GROUP BY status
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let revenue = sqlx::query!(
            r#"
            SELECT 
                COALESCE(SUM(labor_cost), 0) as labor,
                COALESCE(SUM(parts_cost), 0) as parts
            FROM service_orders
            WHERE status IN ('COMPLETED', 'DELIVERED')
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        let count_completed = by_status_rows
            .iter()
            .filter(|r| r.status == "COMPLETED" || r.status == "DELIVERED")
            .map(|r| r.count)
            .sum::<i64>();

        let by_status = by_status_rows
            .into_iter()
            .map(|r| StatusCount {
                status: r.status,
                count: r.count,
            })
            .collect();

        let total_revenue = revenue.labor as f64 + revenue.parts as f64;

        let average_ticket = if count_completed > 0 {
            total_revenue / count_completed as f64
        } else {
            0.0
        };

        Ok(ServiceOrderStats {
            total_orders: total.count,
            by_status,
            revenue_labor: revenue.labor as f64,
            revenue_parts: revenue.parts as f64,
            average_ticket,
        })
    }

    pub async fn get_top_products_motoparts(&self, limit: i64) -> AppResult<Vec<TopItem>> {
        let rows = sqlx::query!(
            r#"
            SELECT 
                p.id, p.name,
                COALESCE(SUM(si.quantity), 0.0) as "quantity!: f64",
                COALESCE(SUM(si.total), 0.0) as "total!: f64"
            FROM sale_items si
            JOIN products p ON p.id = si.product_id
            GROUP BY p.id
            ORDER BY quantity DESC
            LIMIT ?
            "#,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        let items = rows
            .into_iter()
            .map(|r| TopItem {
                id: r.id,
                name: r.name,
                quantity: r.quantity,
                total_value: r.total,
            })
            .collect();

        Ok(items)
    }
}
