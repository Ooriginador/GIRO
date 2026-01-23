//! Payment Repository
//!
//! Database operations for payment records.

use sqlx::PgPool;
use uuid::Uuid;
use rust_decimal::Decimal;
use bigdecimal::BigDecimal;
use std::str::FromStr;

use crate::errors::AppResult;
use crate::models::payment::{Payment, PaymentStatus, PaymentProvider};

pub struct PaymentRepository {
    pool: PgPool,
}

impl PaymentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new payment record
    pub async fn create(
        &self,
        admin_id: Uuid,
        amount: Decimal,
        provider: PaymentProvider,
        provider_id: Option<String>,
        description: Option<String>,
        licenses_count: i32,
    ) -> AppResult<Payment> {
        let amount_bd = BigDecimal::from_str(&amount.to_string()).unwrap();

        let payment = sqlx::query_as::<_, Payment>(
            r#"
            INSERT INTO payments (
                admin_id, amount, provider, provider_id, 
                description, licenses_count, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING 
                id, admin_id, amount as "amount: Decimal", currency as "currency!", 
                provider as "provider: PaymentProvider", 
                provider_id, 
                status as "status: PaymentStatus", 
                licenses_count as "licenses_count!", 
                description, receipt_url, paid_at, created_at as "created_at!"
            "#,
        )
        .bind(admin_id)
        .bind(amount_bd)
        .bind(provider)
        .bind(provider_id)
        .bind(description)
        .bind(licenses_count)
        .fetch_one(&self.pool)
        .await?;

        Ok(payment)
    }

    /// Find payment by provider ID
    pub async fn find_by_provider_id(&self, provider_id: &str) -> AppResult<Option<Payment>> {
        let payment = sqlx::query_as::<_, Payment>(
            r#"
            SELECT 
                id, admin_id, amount as "amount: Decimal", currency as "currency!", 
                provider as "provider: PaymentProvider", 
                provider_id, 
                status as "status: PaymentStatus", 
                licenses_count as "licenses_count!", 
                description, receipt_url, paid_at, created_at as "created_at!"
            FROM payments
            WHERE provider_id = $1
            "#,
        )
        .bind(provider_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(payment)
    }

    /// Update payment status to completed
    pub async fn complete(&self, id: Uuid, receipt_url: Option<String>) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE payments
            SET status = 'completed', paid_at = NOW(), receipt_url = $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(receipt_url)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update payment status
    pub async fn update_status(&self, id: Uuid, status: PaymentStatus) -> AppResult<()> {
        sqlx::query(
            r#"
            UPDATE payments
            SET status = $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(status)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// List payments for an admin
    pub async fn list_by_admin(&self, admin_id: Uuid) -> AppResult<Vec<Payment>> {
        let payments = sqlx::query_as::<_, Payment>(
            r#"
            SELECT 
                id, admin_id, amount as "amount: Decimal", currency as "currency!", 
                provider as "provider: PaymentProvider", 
                provider_id, 
                status as "status: PaymentStatus", 
                licenses_count as "licenses_count!", 
                description, receipt_url, paid_at, created_at as "created_at!"
            FROM payments
            WHERE admin_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(admin_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(payments)
    }
}
