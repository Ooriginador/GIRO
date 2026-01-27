//! Repositório de Caixa

use crate::error::AppResult;
use crate::models::{
    CashMovement, CashSession, CashSessionSummary, CreateCashMovement, CreateCashSession,
    PaymentMethodSummary,
};
use crate::repositories::new_id;
use sqlx::{Row, SqlitePool};

pub struct CashRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> CashRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    const SESSION_COLS: &'static str = "id, employee_id, opened_at, closed_at, opening_balance, expected_balance, actual_balance, difference, status, notes, created_at, updated_at";
    const MOVEMENT_COLS: &'static str = "id, session_id, type, amount, description, created_at";

    pub async fn find_session_by_id(&self, id: &str) -> AppResult<Option<CashSession>> {
        let query = format!(
            "SELECT {} FROM cash_sessions WHERE id = ?",
            Self::SESSION_COLS
        );
        let result = sqlx::query_as::<_, CashSession>(&query)
            .bind(id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_current_session(&self) -> AppResult<Option<CashSession>> {
        let query = format!(
            "SELECT {} FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1",
            Self::SESSION_COLS
        );
        let result = sqlx::query_as::<_, CashSession>(&query)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_session_by_employee(
        &self,
        employee_id: &str,
    ) -> AppResult<Option<CashSession>> {
        let query = format!(
            "SELECT {} FROM cash_sessions WHERE employee_id = ? AND status = 'OPEN'",
            Self::SESSION_COLS
        );
        let result = sqlx::query_as::<_, CashSession>(&query)
            .bind(employee_id)
            .fetch_optional(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_session_history(&self, limit: i32) -> AppResult<Vec<CashSession>> {
        let query = format!(
            "SELECT {} FROM cash_sessions ORDER BY opened_at DESC LIMIT ?",
            Self::SESSION_COLS
        );
        let result = sqlx::query_as::<_, CashSession>(&query)
            .bind(limit)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn find_movements_by_session(
        &self,
        session_id: &str,
    ) -> AppResult<Vec<CashMovement>> {
        let query = format!(
            "SELECT {} FROM cash_movements WHERE session_id = ? ORDER BY created_at",
            Self::MOVEMENT_COLS
        );
        let result = sqlx::query_as::<_, CashMovement>(&query)
            .bind(session_id)
            .fetch_all(self.pool)
            .await?;
        Ok(result)
    }

    pub async fn open_session(&self, data: CreateCashSession) -> AppResult<CashSession> {
        // Check if there's already an open session
        if self.find_current_session().await?.is_some() {
            return Err(crate::error::AppError::CashSessionAlreadyOpen);
        }

        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO cash_sessions (id, employee_id, opened_at, opening_balance, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.employee_id)
        .bind(&now)
        .bind(data.opening_balance)
        .bind(&data.notes)
        .bind(&now)
        .bind(&now)
        .execute(self.pool)
        .await?;

        // Create opening movement
        self.add_movement(CreateCashMovement {
            session_id: id.clone(),
            employee_id: data.employee_id.clone(),
            movement_type: "OPENING".to_string(),
            amount: data.opening_balance,
            description: Some("Abertura de caixa".to_string()),
        })
        .await?;

        self.find_session_by_id(&id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "CashSession".into(),
                id,
            })
    }

    pub async fn get_session_summary(&self, session_id: &str) -> AppResult<CashSessionSummary> {
        let session = self.find_session_by_id(session_id).await?.ok_or_else(|| {
            crate::error::AppError::NotFound {
                entity: "CashSession".into(),
                id: session_id.into(),
            }
        })?;

        // 1. Get Totals from Sales
        let sales_row = sqlx::query(
            r#"
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0.0 END), 0.0) as total_sales,
                COALESCE(SUM(CASE WHEN status = 'CANCELED' THEN total ELSE 0.0 END), 0.0) as total_canceled
            FROM sales 
            WHERE cash_session_id = ?
            "#
        )
        .bind(session_id)
        .fetch_one(self.pool)
        .await?;

        let total_sales: f64 = sales_row.try_get("total_sales")?;
        let total_canceled: f64 = sales_row.try_get("total_canceled")?;

        // 2. Get Sales by Payment Method
        let payment_rows = sqlx::query(
            r#"
            SELECT method as payment_method, COALESCE(SUM(amount), 0.0) as total, COUNT(*) as count
            FROM sale_payments
            WHERE sale_id IN (SELECT id FROM sales WHERE cash_session_id = ? AND status = 'COMPLETED')
            GROUP BY method
            "#,
        )
        .bind(session_id)
        .fetch_all(self.pool)
        .await?;

        let mut sales_by_method = Vec::new();
        let mut cash_sales = 0.0;

        for row in payment_rows {
            let method: String = row.try_get("payment_method")?;
            let amount: f64 = row.try_get("total")?;
            let count: i64 = row.try_get("count")?;

            if method == "CASH" {
                cash_sales = amount;
            }

            sales_by_method.push(PaymentMethodSummary {
                method,
                amount,
                count,
            });
        }

        // 3. Get Movements
        let movements = self.find_movements_by_session(session_id).await?;
        let mut total_supplies = 0.0;
        let mut total_withdrawals = 0.0;

        for m in &movements {
            match m.movement_type.as_str() {
                "SUPPLY" => total_supplies += m.amount,
                "BLEED" => total_withdrawals += m.amount,
                _ => {}
            }
        }

        // 4. Calculate Expected Cash in Drawer
        // Opening + Supplies - Bleeds + CASH Sales
        let cash_in_drawer =
            session.opening_balance + total_supplies - total_withdrawals + cash_sales;

        Ok(CashSessionSummary {
            session,
            total_sales,
            total_canceled,
            total_withdrawals,
            total_supplies,
            movement_count: movements.len() as i64,
            sales_by_method,
            cash_in_drawer,
        })
    }

    pub async fn close_session(
        &self,
        id: &str,
        actual_balance: f64,
        notes: Option<String>,
    ) -> AppResult<CashSession> {
        let session = self
            .find_session_by_id(id)
            .await?
            .ok_or(crate::error::AppError::CashSessionNotOpen)?;

        if session.status != "OPEN" {
            return Err(crate::error::AppError::CashSessionNotOpen);
        }

        // Calculate expected balance using the full summary logic
        let summary = self.get_session_summary(id).await?;
        let expected = summary.cash_in_drawer;
        let difference = actual_balance - expected;
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE cash_sessions SET closed_at = ?, expected_balance = ?, actual_balance = ?, difference = ?, status = 'CLOSED', notes = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&now)
        .bind(expected)
        .bind(actual_balance)
        .bind(difference)
        .bind(&notes)
        .bind(&now)
        .bind(id)
        .execute(self.pool)
        .await?;

        self.find_session_by_id(id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "CashSession".into(),
                id: id.into(),
            })
    }

    pub async fn add_movement(&self, data: CreateCashMovement) -> AppResult<CashMovement> {
        // Validate BLEED (withdrawal) doesn't exceed available cash in drawer
        if data.movement_type == "BLEED" {
            let summary = self.get_session_summary(&data.session_id).await?;
            let available_cash = summary.cash_in_drawer;

            if data.amount > available_cash {
                return Err(crate::error::AppError::Validation(format!(
                    "Sangria de R$ {:.2} excede o saldo disponível em caixa de R$ {:.2}",
                    data.amount, available_cash
                )));
            }

            if data.amount <= 0.0 {
                return Err(crate::error::AppError::Validation(
                    "O valor da sangria deve ser maior que zero".into(),
                ));
            }
        }

        // Validate SUPPLY amount is positive
        if data.movement_type == "SUPPLY" && data.amount <= 0.0 {
            return Err(crate::error::AppError::Validation(
                "O valor do suprimento deve ser maior que zero".into(),
            ));
        }

        let id = new_id();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO cash_movements (id, session_id, employee_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&data.session_id)
        .bind(&data.employee_id)
        .bind(&data.movement_type)
        .bind(data.amount)
        .bind(&data.description)
        .bind(&now)
        .execute(self.pool)
        .await?;

        let query = format!(
            "SELECT {} FROM cash_movements WHERE id = ?",
            Self::MOVEMENT_COLS
        );
        let result = sqlx::query_as::<_, CashMovement>(&query)
            .bind(&id)
            .fetch_one(self.pool)
            .await?;
        Ok(result)
    }
}

#[cfg(test)]
#[path = "cash_repository_test.rs"]
mod cash_repository_test;
