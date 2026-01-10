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
                SUM(m.sales_total) as "total_sales!",
                SUM(m.sales_count)::integer as "total_count!",
                COUNT(DISTINCT m.license_id)::integer as "active_licenses!"
            FROM metrics m
            INNER JOIN licenses l ON l.id = m.license_id
            WHERE l.admin_id = $1
            AND m.date >= CURRENT_DATE - CAST($2 || ' days' AS INTERVAL)
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
