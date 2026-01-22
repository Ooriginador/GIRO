
pub async fn find_all(
    &self,
    filters: crate::models::SaleFilters,
) -> AppResult<crate::models::PaginatedResult<Sale>> {
    let mut query = format!("SELECT {} FROM sales WHERE 1=1", Self::SALE_COLS);
    let mut count_query = "SELECT COUNT(*) FROM sales WHERE 1=1".to_string();

    // Build conditions
    if let Some(date_from) = &filters.date_from {
        let cond = format!(" AND date(created_at) >= date('{}')", date_from);
        query.push_str(&cond);
        count_query.push_str(&cond);
    }
    if let Some(date_to) = &filters.date_to {
        let cond = format!(" AND date(created_at) <= date('{}')", date_to);
        query.push_str(&cond);
        count_query.push_str(&cond);
    }
    if let Some(employee_id) = &filters.employee_id {
        let cond = format!(" AND employee_id = '{}'", employee_id);
        query.push_str(&cond);
        count_query.push_str(&cond);
    }
    if let Some(session_id) = &filters.cash_session_id {
        let cond = format!(" AND cash_session_id = '{}'", session_id);
        query.push_str(&cond);
        count_query.push_str(&cond);
    }
    if let Some(payment_method) = &filters.payment_method {
        let cond = format!(" AND payment_method = '{}'", payment_method);
        query.push_str(&cond);
        count_query.push_str(&cond);
    }
    if let Some(status) = &filters.status {
        let cond = format!(" AND status = '{}'", status);
        query.push_str(&cond);
        count_query.push_str(&cond);
    }

    // Count total
    let total: (i64,) = sqlx::query_as(&count_query).fetch_one(self.pool).await?;
    let total_count = total.0;

    // Pagination
    let page = filters.page.unwrap_or(1);
    let limit = filters.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    query.push_str(" ORDER BY created_at DESC");
    query.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    let data = sqlx::query_as::<_, Sale>(&query)
        .fetch_all(self.pool)
        .await?;

    let total_pages = (total_count as f64 / limit as f64).ceil() as i32;

    Ok(crate::models::PaginatedResult {
        data,
        total: total_count,
        page,
        limit,
        total_pages,
    })
}
