//! Metrics Service
//!
//! Metrics sync and dashboard aggregation.

use bigdecimal::BigDecimal;
use chrono::{Duration, NaiveDate, Utc};
use uuid::Uuid;

use crate::dto::metrics::SyncMetricsRequest;
use crate::errors::{AppError, AppResult};
use crate::models::{DashboardAlerts, DashboardData, Metrics, MetricsSummary};
use crate::repositories::{LicenseRepository, MetricsRepository};

pub struct MetricsService {
    metrics_repo: MetricsRepository,
    license_repo: LicenseRepository,
}

impl MetricsService {
    pub fn new(metrics_repo: MetricsRepository, license_repo: LicenseRepository) -> Self {
        Self {
            metrics_repo,
            license_repo,
        }
    }

    /// Sync metrics from desktop
    pub async fn sync(
        &self,
        license_key: &str,
        _hardware_id: &str,
        metrics: SyncMetricsRequest,
    ) -> AppResult<()> {
        // Find and validate license
        let license = self.license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Verify license is active
        if !license.is_valid() {
            return Err(AppError::License("Licença inválida ou expirada".to_string()));
        }

        // Convert f64 to BigDecimal via string to avoid precision issues
        let sales_total = metrics.sales_total.to_string().parse::<BigDecimal>()
            .unwrap_or_else(|_| BigDecimal::from(0));

        // Upsert metrics
        self.metrics_repo
            .upsert(
                license.id,
                metrics.date,
                sales_total,
                metrics.sales_count,
                metrics.products_sold,
                metrics.low_stock_count.unwrap_or(0),
                metrics.expiring_count.unwrap_or(0),
                metrics.cash_opens.unwrap_or(0),
                metrics.cash_closes.unwrap_or(0),
            )
            .await?;

        Ok(())
    }

    /// Get dashboard data for admin
    pub async fn get_dashboard(&self, admin_id: Uuid, _days: i32) -> AppResult<DashboardData> {
        let today_date = Utc::now().date_naive();

        // Get today's summary
        let today_summary = self.metrics_repo
            .get_summary(admin_id, today_date, today_date)
            .await
            .unwrap_or_else(|_| crate::repositories::SummaryRow {
                total_sales: 0.0,
                total_transactions: 0,
                average_ticket: 0.0,
            });

        // Get week summary (last 7 days)
        let week_start = today_date - Duration::days(7);
        let week_summary = self.metrics_repo
            .get_summary(admin_id, week_start, today_date)
            .await
            .unwrap_or_else(|_| crate::repositories::SummaryRow {
                total_sales: 0.0,
                total_transactions: 0,
                average_ticket: 0.0,
            });

        // Get month summary (last 30 days)
        let month_start = today_date - Duration::days(30);
        let month_summary = self.metrics_repo
            .get_summary(admin_id, month_start, today_date)
            .await
            .unwrap_or_else(|_| crate::repositories::SummaryRow {
                total_sales: 0.0,
                total_transactions: 0,
                average_ticket: 0.0,
            });

        // TODO: Get actual alert counts from database
        let alerts = DashboardAlerts {
            low_stock: 0,
            expiring_products: 0,
            licenses_expiring: 0,
        };

        Ok(DashboardData {
            today: MetricsSummary {
                total_sales: today_summary.total_sales,
                total_transactions: today_summary.total_transactions,
                average_ticket: today_summary.average_ticket,
                period_days: 1,
            },
            week: MetricsSummary {
                total_sales: week_summary.total_sales,
                total_transactions: week_summary.total_transactions,
                average_ticket: week_summary.average_ticket,
                period_days: 7,
            },
            month: MetricsSummary {
                total_sales: month_summary.total_sales,
                total_transactions: month_summary.total_transactions,
                average_ticket: month_summary.average_ticket,
                period_days: 30,
            },
            alerts,
        })
    }

    /// Get period summary
    #[allow(dead_code)]
    async fn get_period_summary(
        &self,
        admin_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> AppResult<MetricsSummary> {
        let period_days = (end_date - start_date).num_days() as i32 + 1;

        let summary = self.metrics_repo
            .get_summary(admin_id, start_date, end_date)
            .await?;

        Ok(MetricsSummary {
            total_sales: summary.total_sales,
            total_transactions: summary.total_transactions,
            average_ticket: summary.average_ticket,
            period_days,
        })
    }

    /// Get alert counts
    #[allow(dead_code)]
    async fn get_alerts(&self, admin_id: Uuid) -> AppResult<DashboardAlerts> {
        let today = Utc::now().date_naive();
        let week_from_now = today + Duration::days(7);

        // Count expiring licenses
        let licenses_expiring = self.license_repo
            .count_expiring(admin_id, week_from_now)
            .await
            .unwrap_or(0);

        // For now, return zeros for stock alerts as they come from desktop
        Ok(DashboardAlerts {
            low_stock: 0,
            expiring_products: 0,
            licenses_expiring,
        })
    }

    /// Get metrics for a specific license
    pub async fn get_license_metrics(
        &self,
        license_key: &str,
        admin_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> AppResult<Vec<Metrics>> {
        let license = self.license_repo
            .find_by_key(license_key)
            .await?
            .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

        // Verify ownership
        if license.admin_id != admin_id {
            return Err(AppError::NotFound("Licença não encontrada".to_string()));
        }

        self.metrics_repo
            .get_daily(license.id, start_date, end_date)
            .await
    }

    /// Get server time (for desktop sync)
    pub fn get_server_time(&self) -> chrono::DateTime<Utc> {
        Utc::now()
    }
}
