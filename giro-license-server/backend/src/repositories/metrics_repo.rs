//! Metrics Repository
//!
//! Database operations for metrics sync.

use bigdecimal::BigDecimal;
use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::Metrics;

/// Summary row from database query
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SummaryRow {
    pub total_sales: f64,
    pub total_transactions: i64,
    pub average_ticket: f64,
}

pub struct MetricsRepository {
    pool: PgPool,
}

impl MetricsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Upsert metrics for a license and date
    pub async fn upsert(
        &self,
        license_id: Uuid,
        date: NaiveDate,
        sales_total: BigDecimal,
        sales_count: i32,
        products_sold: i32,
        low_stock_count: i32,
        expiring_count: i32,
        cash_opens: i32,
        cash_closes: i32,
    ) -> AppResult<Metrics> {
        // Calculate average ticket
        let average_ticket = if sales_count > 0 {
            &sales_total / BigDecimal::from(sales_count)
        } else {
            BigDecimal::from(0)
        };

        let record = sqlx::query!(
            r#"
            INSERT INTO metrics (
                license_id, date, sales_total, sales_count, average_ticket,
                products_sold, low_stock_count, expiring_count, cash_opens, cash_closes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (license_id, date) DO UPDATE
            SET 
                sales_total = $3,
                sales_count = $4,
                average_ticket = $5,
                products_sold = $6,
                low_stock_count = $7,
                expiring_count = $8,
                cash_opens = $9,
                cash_closes = $10,
                synced_at = NOW()
            RETURNING 
                id, license_id, date, sales_total as "sales_total!", sales_count as "sales_count!", average_ticket as "average_ticket!",
                products_sold as "products_sold!", low_stock_count as "low_stock_count!", expiring_count as "expiring_count!", 
                cash_opens as "cash_opens!", cash_closes as "cash_closes!",
                synced_at as "synced_at!"
            "#,
            license_id,
            date,
            sales_total,
            sales_count,
            average_ticket,
            products_sold,
            low_stock_count,
            expiring_count,
            cash_opens,
            cash_closes
        )
        .fetch_one(&self.pool)
        .await?;

        let metrics = Metrics {
            id: record.id,
            license_id: record.license_id,
            date: record.date,
            sales_total: record.sales_total,
            sales_count: record.sales_count,
            average_ticket: record.average_ticket,
            products_sold: record.products_sold,
            low_stock_count: record.low_stock_count,
            expiring_count: record.expiring_count,
            cash_opens: record.cash_opens,
            cash_closes: record.cash_closes,
            synced_at: record.synced_at,
        };

        Ok(metrics)
    }

    /// Get metrics summary for dashboard
    pub async fn get_summary(
        &self,
        admin_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> AppResult<SummaryRow> {
        let summary = sqlx::query_as!(
            SummaryRow,
            r#"
            SELECT
                COALESCE(SUM(m.sales_total)::float8, 0.0) as "total_sales!",
                COALESCE(SUM(m.sales_count), 0)::bigint as "total_transactions!",
                CASE 
                    WHEN SUM(m.sales_count) > 0 
                    THEN (SUM(m.sales_total) / SUM(m.sales_count))::float8
                    ELSE 0.0
                END as "average_ticket!"
            FROM metrics m
            INNER JOIN licenses l ON l.id = m.license_id
            WHERE l.admin_id = $1
            AND m.date BETWEEN $2 AND $3
            "#,
            admin_id,
            start_date,
            end_date
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(summary)
    }

    /// Get daily metrics for a license
    pub async fn get_daily(
        &self,
        license_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> AppResult<Vec<Metrics>> {
        let records = sqlx::query!(
            r#"
            SELECT 
                id, license_id, date, sales_total as "sales_total!", sales_count as "sales_count!", average_ticket as "average_ticket!",
                products_sold as "products_sold!", low_stock_count as "low_stock_count!", expiring_count as "expiring_count!", 
                cash_opens as "cash_opens!", cash_closes as "cash_closes!",
                synced_at as "synced_at!"
            FROM metrics
            WHERE license_id = $1
            AND date BETWEEN $2 AND $3
            ORDER BY date DESC
            "#,
            license_id,
            start_date,
            end_date
        )
        .fetch_all(&self.pool)
        .await?;

        let metrics = records
            .into_iter()
            .map(|r| Metrics {
                id: r.id,
                license_id: r.license_id,
                date: r.date,
                sales_total: r.sales_total,
                sales_count: r.sales_count,
                average_ticket: r.average_ticket,
                products_sold: r.products_sold,
                low_stock_count: r.low_stock_count,
                expiring_count: r.expiring_count,
                cash_opens: r.cash_opens,
                cash_closes: r.cash_closes,
                synced_at: r.synced_at,
            })
            .collect();

        Ok(metrics)
    }

    /// Get aggregated metrics for multiple licenses
    pub async fn get_aggregated(
        &self,
        admin_id: Uuid,
        days: i32,
    ) -> AppResult<Vec<DailyAggregate>> {
        let aggregates = sqlx::query_as!(
            DailyAggregate,
            r#"
            SELECT
                m.date,
                COALESCE(SUM(m.sales_total), 0) as "total_sales!: BigDecimal",
                COALESCE(SUM(m.sales_count), 0)::integer as "total_count!",
                COUNT(DISTINCT m.license_id)::integer as "active_licenses!"
            FROM metrics m
            INNER JOIN licenses l ON l.id = m.license_id
            WHERE l.admin_id = $1
            AND m.date >= CURRENT_DATE - make_interval(days => $2)
            GROUP BY m.date
            ORDER BY m.date DESC
            "#,
            admin_id,
            days
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(aggregates)
    }
}

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize, serde::Deserialize)]
pub struct DailyAggregate {
    pub date: NaiveDate,
    pub total_sales: BigDecimal,
    pub total_count: i32,
    pub active_licenses: i32,
}
