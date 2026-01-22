//! License Client
//!
//! Client for communicating with GIRO License Server

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// License client configuration
#[derive(Debug, Clone)]
pub struct LicenseClientConfig {
    pub server_url: String,
    pub api_key: String,
    pub timeout: Duration,
}

impl Default for LicenseClientConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:3000".to_string(),
            api_key: String::new(),
            timeout: Duration::from_secs(10),
        }
    }
}

/// License status from server
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    Pending,
    Active,
    Suspended,
    Expired,
    Revoked,
}

/// License information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub key: Option<String>,
    pub status: LicenseStatus,
    pub message: Option<String>,
    pub valid: Option<bool>,
    pub expires_at: Option<DateTime<Utc>>,
    pub days_remaining: Option<i64>,
    pub company_name: String,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
    pub max_users: i32,
    pub features: Vec<String>,
    pub plan_type: Option<String>,
    pub support_expires_at: Option<DateTime<Utc>>,
    pub is_lifetime: Option<bool>,
    pub can_offline: Option<bool>,
    pub has_admin: Option<bool>,
    pub admin_user: Option<AdminUserSyncData>,
}

/// Admin user sync data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminUserSyncData {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub password_hash: String,
}

/// Activation request
#[derive(Debug, Serialize)]
struct ActivateRequest {
    hardware_id: String,
    machine_name: Option<String>,
    os_version: Option<String>,
    cpu_info: Option<String>,
}

/// Admin update request
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAdminRequest {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub company_name: Option<String>,
    pub company_cnpj: Option<String>,
    pub company_address: Option<String>,
    pub company_city: Option<String>,
    pub company_state: Option<String>,
    pub pin: String,
}

/// Validation request
#[derive(Debug, Serialize)]
struct ValidateRequest {
    license_key: String,
    hardware_id: String,
    client_time: DateTime<Utc>,
}

/// Login request
#[derive(Debug, Serialize)]
struct LoginRequest {
    email: String,
    password: String,
}

/// Login response
#[derive(Debug, Deserialize)]
struct LoginResponse {
    access_token: String,
}

/// License Summary from list endpoint
#[derive(Debug, Clone, Deserialize)]
pub struct LicenseSummary {
    pub id: String,
    pub license_key: String,
    pub status: LicenseStatus,
    pub plan_type: String,
}

/// Pagination wrapper
#[derive(Debug, Deserialize)]
struct PaginatedResponse<T> {
    data: Vec<T>,
}

/// Metrics inner payload
#[derive(Debug, Serialize)]
pub struct MetricsData {
    pub date: NaiveDate,

    pub sales_total: f64,
    pub sales_count: i32,
    pub average_ticket: f64,
    pub products_sold: i32,
    pub low_stock_count: Option<i32>,
    pub expiring_count: Option<i32>,
    pub cash_opens: Option<i32>,
    pub cash_closes: Option<i32>,
}

/// Metrics sync payload (as passed from frontend/service)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetricsPayload {
    pub date: String,
    pub sales_total: f64,
    pub sales_count: i32,
    pub products_sold: i32,
    pub low_stock_count: i32,
    pub expiring_count: i32,
    pub cash_opens: i32,
    pub cash_closes: i32,
}

/// License client
#[derive(Clone)]
pub struct LicenseClient {
    config: LicenseClientConfig,
    client: reqwest::Client,
}

impl LicenseClient {
    /// Create new license client
    pub fn new(config: LicenseClientConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("Failed to create HTTP client");

        Self { config, client }
    }

    /// Activate license with hardware binding
    pub async fn activate(
        &self,
        license_key: &str,
        hardware_id: &str,
    ) -> Result<LicenseInfo, String> {
        let url = format!(
            "{}/api/v1/licenses/{}/activate",
            self.config.server_url, license_key
        );
        tracing::info!("[LicenseClient] Ativando licença na URL: {}", url);

        let system_info = std::env::consts::OS;
        let arch_info = std::env::consts::ARCH;

        let payload = ActivateRequest {
            hardware_id: hardware_id.to_string(),
            machine_name: hostname::get().ok().and_then(|h| h.into_string().ok()),
            os_version: Some(format!("{} {}", system_info, arch_info)),
            cpu_info: None,
        };

        let response = self
            .client
            .post(&url)
            .header("X-API-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                let err_msg = format!("Erro ao conectar com servidor de licenças: {}", e);
                tracing::error!("[LicenseClient] {}", err_msg);
                err_msg
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!(
                "[LicenseClient] Erro do servidor ({}): {}",
                status,
                error_text
            );

            let error: serde_json::Value = serde_json::from_str(&error_text)
                .unwrap_or_else(|_| serde_json::json!({"error": "Erro desconhecido"}));

            let msg = error
                .get("message")
                .or(error.get("error"))
                .and_then(|v| v.as_str())
                .unwrap_or("Erro ao ativar licença");

            return Err(msg.to_string());
        }

        #[derive(Deserialize)]
        struct ActivateResponse {
            status: LicenseStatus,
            expires_at: Option<DateTime<Utc>>,
            license_key: String,
            plan_type: String,
            company_name: String,
            company_cnpj: Option<String>,
            company_address: Option<String>,
            company_city: Option<String>,
            company_state: Option<String>,
            max_users: i32,
            features: Vec<String>,
            support_expires_at: Option<DateTime<Utc>>,
            is_lifetime: bool,
            can_offline: bool,
            message: String,
            has_admin: bool,
            admin_user: Option<AdminUserSyncData>,
        }

        let api_resp = response
            .json::<ActivateResponse>()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        Ok(LicenseInfo {
            key: Some(api_resp.license_key),
            status: api_resp.status,
            message: Some(api_resp.message),
            valid: Some(true),
            expires_at: api_resp.expires_at,
            days_remaining: None,
            company_name: api_resp.company_name,
            company_cnpj: api_resp.company_cnpj,
            company_address: api_resp.company_address,
            company_city: api_resp.company_city,
            company_state: api_resp.company_state,
            max_users: api_resp.max_users,
            features: api_resp.features,
            plan_type: Some(api_resp.plan_type),
            support_expires_at: api_resp.support_expires_at,
            is_lifetime: Some(api_resp.is_lifetime),
            can_offline: Some(api_resp.can_offline),
            has_admin: Some(api_resp.has_admin),
            admin_user: api_resp.admin_user,
        })
    }

    /// Validate license
    pub async fn validate(
        &self,
        license_key: &str,
        hardware_id: &str,
    ) -> Result<LicenseInfo, String> {
        let url = format!(
            "{}/api/v1/licenses/{}/validate",
            self.config.server_url, license_key
        );

        let payload = ValidateRequest {
            license_key: license_key.to_string(),
            hardware_id: hardware_id.to_string(),
            client_time: Utc::now(),
        };

        let response = self
            .client
            .post(&url)
            .header("X-API-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao validar licença: {}", e))?;

        if !response.status().is_success() {
            let error: serde_json::Value = response
                .json()
                .await
                .unwrap_or_else(|_| serde_json::json!({"error": "Erro desconhecido"}));

            let msg = error
                .get("message")
                .or(error.get("error"))
                .and_then(|v| v.as_str())
                .unwrap_or("Licença inválida");

            return Err(msg.to_string());
        }

        #[derive(Deserialize)]
        struct ValidateResponse {
            valid: bool,
            status: LicenseStatus,
            expires_at: Option<DateTime<Utc>>,
            days_remaining: Option<i64>,
            license_key: String,
            plan_type: String,
            company_name: String,
            company_cnpj: Option<String>,
            company_address: Option<String>,
            company_city: Option<String>,
            company_state: Option<String>,
            max_users: i32,
            features: Vec<String>,
            support_expires_at: Option<DateTime<Utc>>,
            is_lifetime: bool,
            can_offline: bool,
            message: String,
            has_admin: bool,
            admin_user: Option<AdminUserSyncData>,
        }

        let api_resp = response
            .json::<ValidateResponse>()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        Ok(LicenseInfo {
            key: Some(api_resp.license_key),
            status: api_resp.status,
            message: Some(api_resp.message),
            valid: Some(api_resp.valid),
            expires_at: api_resp.expires_at,
            days_remaining: api_resp.days_remaining,
            company_name: api_resp.company_name,
            company_cnpj: api_resp.company_cnpj,
            company_address: api_resp.company_address,
            company_city: api_resp.company_city,
            company_state: api_resp.company_state,
            max_users: api_resp.max_users,
            features: api_resp.features,
            plan_type: Some(api_resp.plan_type),
            support_expires_at: api_resp.support_expires_at,
            is_lifetime: Some(api_resp.is_lifetime),
            can_offline: Some(api_resp.can_offline),
            has_admin: Some(api_resp.has_admin),
            admin_user: api_resp.admin_user,
        })
    }

    /// Restore license
    pub async fn restore(&self, hardware_id: &str) -> Result<Option<String>, String> {
        let url = format!("{}/api/v1/licenses/restore", self.config.server_url);

        #[derive(Serialize)]
        struct RestoreRequest {
            hardware_id: String,
        }

        let payload = RestoreRequest {
            hardware_id: hardware_id.to_string(),
        };

        let response = self
            .client
            .post(&url)
            .header("X-API-Key", &self.config.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com servidor: {}", e))?;

        if !response.status().is_success() {
            // If it's 404/400, it just means not found, maybe invalid request
            // But we should parse error
            let error_text = response.text().await.unwrap_or_default();
            tracing::warn!("[LicenseClient] Restore failed/not found: {}", error_text);
            return Ok(None);
        }

        #[derive(Deserialize)]
        struct RestoreResponse {
            found: bool,
            license_key: Option<String>,
        }

        let api_resp = response
            .json::<RestoreResponse>()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        if api_resp.found {
            tracing::info!(
                "[LicenseClient] Licença restaurada: {:?}",
                api_resp.license_key
            );
            Ok(api_resp.license_key)
        } else {
            Ok(None)
        }
    }

    /// Sync metrics to server
    pub async fn sync_metrics(
        &self,
        license_key: &str,
        hardware_id: &str,
        metrics: MetricsPayload,
    ) -> Result<(), String> {
        let url = format!("{}/api/v1/metrics/sync", self.config.server_url);

        let date = NaiveDate::parse_from_str(&metrics.date, "%Y-%m-%d")
            .map_err(|_| "Invalid date format".to_string())?;

        let average_ticket = if metrics.sales_count > 0 {
            metrics.sales_total / metrics.sales_count as f64
        } else {
            0.0
        };

        let metrics_data = MetricsData {
            date,
            sales_total: metrics.sales_total,
            sales_count: metrics.sales_count,
            average_ticket,
            products_sold: metrics.products_sold,
            low_stock_count: Some(metrics.low_stock_count),
            expiring_count: Some(metrics.expiring_count),
            cash_opens: Some(metrics.cash_opens),
            cash_closes: Some(metrics.cash_closes),
        };

        #[derive(Serialize)]
        struct SyncRequest {
            license_key: String,
            hardware_id: String,
            metrics: MetricsData,
        }

        let payload = SyncRequest {
            license_key: license_key.to_string(),
            hardware_id: hardware_id.to_string(),
            metrics: metrics_data,
        };

        let response = self
            .client
            .post(&url)
            .header("X-API-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao sincronizar métricas: {}", e))?;

        if !response.status().is_success() {
            let error: serde_json::Value = response
                .json()
                .await
                .unwrap_or_else(|_| serde_json::json!({"error": "Erro desconhecido"}));
            return Err(error
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Erro ao sincronizar métricas")
                .to_string());
        }

        Ok(())
    }

    /// Get server time (for clock sync)
    pub async fn get_server_time(&self) -> Result<DateTime<Utc>, String> {
        let url = format!("{}/api/v1/metrics/time", self.config.server_url);

        #[derive(Deserialize)]
        struct TimeResponse {
            server_time: DateTime<Utc>,
        }

        let response = self
            .client
            .get(&url)
            .header("X-API-Key", &self.config.api_key)
            .send()
            .await
            .map_err(|e| format!("Erro ao obter hora do servidor: {}", e))?;

        let time_resp: TimeResponse = response
            .json()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        Ok(time_resp.server_time)
    }

    /// List cloud backups from license server using bearer token
    pub async fn list_cloud_backups(
        &self,
        bearer_token: &str,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/backups", self.config.server_url);

        let response = self
            .client
            .get(&url)
            .bearer_auth(bearer_token)
            .send()
            .await
            .map_err(|e| format!("Erro ao listar backups na nuvem: {}", e))?;

        if !response.status().is_success() {
            let txt = response.text().await.unwrap_or_default();
            return Err(format!("Erro do servidor ao listar backups: {}", txt));
        }

        let json = response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Erro ao parsear resposta: {}", e))?;

        Ok(json)
    }

    /// Upload a backup blob to license server using bearer token
    pub async fn upload_cloud_backup(
        &self,
        bearer_token: &str,
        data: Vec<u8>,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/backups", self.config.server_url);

        let response = self
            .client
            .post(&url)
            .bearer_auth(bearer_token)
            .header("Content-Type", "application/octet-stream")
            .body(data)
            .send()
            .await
            .map_err(|e| format!("Erro ao enviar backup: {}", e))?;

        if !response.status().is_success() {
            let txt = response.text().await.unwrap_or_default();
            return Err(format!("Erro do servidor ao enviar backup: {}", txt));
        }

        let json = response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Erro ao parsear resposta: {}", e))?;

        Ok(json)
    }

    /// Get backup metadata or download via license server
    pub async fn get_cloud_backup(
        &self,
        bearer_token: &str,
        backup_id: &str,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/backups/{}", self.config.server_url, backup_id);

        let response = self
            .client
            .get(&url)
            .bearer_auth(bearer_token)
            .send()
            .await
            .map_err(|e| format!("Erro ao obter backup: {}", e))?;

        if !response.status().is_success() {
            let txt = response.text().await.unwrap_or_default();
            return Err(format!("Erro do servidor ao obter backup: {}", txt));
        }

        let json = response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Erro ao parsear resposta: {}", e))?;

        Ok(json)
    }

    /// Delete cloud backup
    pub async fn delete_cloud_backup(
        &self,
        bearer_token: &str,
        backup_id: &str,
    ) -> Result<(), String> {
        let url = format!("{}/backups/{}", self.config.server_url, backup_id);

        let response = self
            .client
            .delete(&url)
            .bearer_auth(bearer_token)
            .send()
            .await
            .map_err(|e| format!("Erro ao excluir backup: {}", e))?;

        if !response.status().is_success() {
            let txt = response.text().await.unwrap_or_default();
            return Err(format!("Erro do servidor ao excluir backup: {}", txt));
        }

        Ok(())
    }

    /// Update admin data (Sync)
    pub async fn update_admin(
        &self,
        license_key: &str,
        data: UpdateAdminRequest,
    ) -> Result<(), String> {
        let url = format!(
            "{}/api/v1/licenses/{}/admin",
            self.config.server_url, license_key
        );

        let response = self
            .client
            .post(&url)
            .header("X-API-Key", license_key)
            .json(&data)
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com servidor: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("[LicenseClient] Erro ao atualizar admin: {}", error_text);
            return Err("Falha ao atualizar dados do administrador no servidor".to_string());
        }

        Ok(())
    }

    /// Authenticate with the server
    pub async fn login(&self, email: &str, password: &str) -> Result<String, String> {
        let url = format!("{}/auth/login", self.config.server_url);
        let payload = LoginRequest {
            email: email.to_string(),
            password: password.to_string(),
        };

        let res = self
            .client
            .post(&url)
            .json(&payload)
            .timeout(self.config.timeout)
            .send()
            .await
            .map_err(|e| format!("Falha na conexão: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(format!("Falha no login ({}): {}", status, text));
        }

        let body: LoginResponse = res
            .json()
            .await
            .map_err(|e| format!("Resposta inválida do servidor: {}", e))?;

        Ok(body.access_token)
    }

    /// List licenses for the authenticated user
    pub async fn list_licenses(&self, token: &str) -> Result<Vec<LicenseSummary>, String> {
        let url = format!("{}/licenses", self.config.server_url);

        let res = self
            .client
            .get(&url)
            .bearer_auth(token)
            .timeout(self.config.timeout)
            .send()
            .await
            .map_err(|e| format!("Falha na conexão: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(format!("Falha ao listar licenças ({}): {}", status, text));
        }

        let body: PaginatedResponse<LicenseSummary> = res
            .json()
            .await
            .map_err(|e| format!("Resposta inválida do servidor: {}", e))?;

        Ok(body.data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = LicenseClientConfig::default();
        assert_eq!(config.server_url, "http://localhost:3000");
    }
}
