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
            // Increased timeout for Windows (slower DNS/firewall)
            timeout: Duration::from_secs(30),
        }
    }
}

/// License status from server
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    Pending,
    Active,
    Suspended,
    Expired,
    Revoked,
}

/// License information
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct LicenseInfo {
    pub key: Option<String>,
    pub status: LicenseStatus,
    pub message: Option<String>,
    pub valid: Option<bool>,
    pub expires_at: Option<DateTime<Utc>>,
    pub days_remaining: Option<f64>,
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
    /// Grace period in days for offline validation (default: 7)
    pub grace_period_days: Option<i32>,
}

/// Admin user sync data
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
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
    admin_data: Option<AdminRegistrationData>,
}

/// Admin registration data for inline registration during activation
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct AdminRegistrationData {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub pin: String,
}

/// Admin update request
#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
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

/// Network diagnostic result
#[derive(Debug, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct ConnectionDiagnostic {
    pub success: bool,
    pub status_code: u16,
    pub message: String,
    pub dns_resolved: bool,
    pub can_reach_server: bool,
}

/// Validation request
#[derive(Debug, Serialize)]
struct ValidateRequest {
    license_key: String,
    hardware_id: String,
    client_time: DateTime<Utc>,
    machine_name: Option<String>,
    os_version: Option<String>,
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
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct LicenseSummary {
    pub id: String,
    pub license_key: String,
    pub status: LicenseStatus,
    pub plan_type: String,
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_validated: Option<DateTime<Utc>>,
    pub support_expires_at: Option<DateTime<Utc>>,
    pub can_offline: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub max_hardware: i32,
    pub active_hardware_count: Option<i64>,
}

/// Pagination metadata alignment
#[derive(Debug, Deserialize, specta::Type)]
pub struct PaginationMeta {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub total_pages: i32,
    pub has_next: bool,
    pub has_prev: bool,
}

/// Pagination wrapper
#[derive(Debug, Deserialize, specta::Type)]
#[allow(dead_code)]
struct PaginatedResponse<T> {
    pub data: Vec<T>,
    #[allow(dead_code)]
    pub pagination: PaginationMeta,
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
#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "snake_case")]
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

    /// Get the client configuration (for sync client)
    pub fn config(&self) -> &LicenseClientConfig {
        &self.config
    }

    /// Activate license with hardware binding
    ///
    /// If `admin_data` is provided and the admin has no name set on the server,
    /// the admin profile will be created with the provided data.
    pub async fn activate(
        &self,
        license_key: &str,
        hardware_id: &str,
        admin_data: Option<AdminRegistrationData>,
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
            admin_data,
        };

        // Retry with exponential backoff on transient connection errors
        const MAX_RETRIES: usize = 2; // total attempts = MAX_RETRIES + 1
        let mut attempt: usize = 0;
        let response = loop {
            match self
                .client
                .post(&url)
                .header("X-License-Key", license_key)
                .json(&payload)
                .send()
                .await
            {
                Ok(resp) => break resp,
                Err(e) => {
                    let err_msg = format!("Erro ao conectar com servidor de licenças: {}", e);
                    tracing::error!("[LicenseClient] {}", err_msg);
                    if attempt >= MAX_RETRIES {
                        return Err(err_msg);
                    }
                    // backoff (ms): 200 * 2^attempt
                    let backoff = std::time::Duration::from_millis(200 * 2u64.pow(attempt as u32));
                    tokio::time::sleep(backoff).await;
                    attempt += 1;
                    continue;
                }
            }
        };

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
            grace_period_days: None, // Activation response doesn't include this
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
            machine_name: hostname::get().ok().and_then(|h| h.into_string().ok()),
            os_version: Some(format!(
                "{} {}",
                std::env::consts::OS,
                std::env::consts::ARCH
            )),
        };

        // Retry with exponential backoff on transient connection errors
        const MAX_RETRIES: usize = 2;
        let mut attempt: usize = 0;
        let response = loop {
            match self
                .client
                .post(&url)
                .header("X-License-Key", license_key)
                .json(&payload)
                .send()
                .await
            {
                Ok(resp) => break resp,
                Err(e) => {
                    let err_msg = format!("Erro ao validar licença: {}", e);
                    tracing::error!("[LicenseClient] {}", err_msg);
                    if attempt >= MAX_RETRIES {
                        return Err(err_msg);
                    }
                    let backoff = std::time::Duration::from_millis(200 * 2u64.pow(attempt as u32));
                    tokio::time::sleep(backoff).await;
                    attempt += 1;
                    continue;
                }
            }
        };

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
            days_remaining: Option<f64>,
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
            grace_period_days: Option<i32>,
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
            grace_period_days: api_resp.grace_period_days,
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
            .header("X-License-Key", license_key)
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
        let url = format!("{}/api/v1/backups", self.config.server_url);

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

    /// Upload a backup file to license server using bearer token (Streaming)
    pub async fn upload_cloud_backup(
        &self,
        bearer_token: &str,
        file_path: std::path::PathBuf,
    ) -> Result<serde_json::Value, String> {
        let url = format!("{}/api/v1/backups", self.config.server_url);

        let file = tokio::fs::File::open(&file_path)
            .await
            .map_err(|e| format!("Erro ao abrir arquivo de backup: {}", e))?;

        let stream = reqwest::Body::from(file);

        let response = self
            .client
            .post(&url)
            .bearer_auth(bearer_token)
            .header("Content-Type", "application/octet-stream")
            .body(stream)
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
        let url = format!("{}/api/v1/backups/{}", self.config.server_url, backup_id);

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
        let url = format!("{}/api/v1/backups/{}", self.config.server_url, backup_id);

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
            .header("X-License-Key", license_key)
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
        let url = format!("{}/api/v1/auth/login", self.config.server_url);
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
        let url = format!("{}/api/v1/licenses", self.config.server_url);

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

    /// Test connection to license server
    pub async fn test_connection(&self) -> ConnectionDiagnostic {
        let url = format!("{}/api/v1/health", self.config.server_url);

        let res = self.client.get(&url).send().await;

        match res {
            Ok(resp) => {
                let status = resp.status();
                ConnectionDiagnostic {
                    success: status.is_success(),
                    status_code: status.as_u16(),
                    message: "Conexão estabelecida com sucesso".to_string(),
                    dns_resolved: true,
                    can_reach_server: true,
                }
            }
            Err(e) => {
                let msg = e.to_string();
                let dns_failed = msg.contains("dns") || msg.contains("resolve");
                let server_unreachable = msg.contains("connect") || msg.contains("timeout");

                let friendly_msg = if msg.contains("cert") || msg.contains("ssl") {
                    "Erro de Certificado SSL/TLS. Verifique se a data do seu computador está correta.".to_string()
                } else if dns_failed {
                    "Não foi possível resolver o endereço do servidor (DNS). Verifique sua internet.".to_string()
                } else if server_unreachable {
                    "O servidor de licenças está inacessível. Pode estar em manutenção ou bloqueado pelo Firewall.".to_string()
                } else {
                    format!("Erro de conexão: {}", msg)
                };

                ConnectionDiagnostic {
                    success: false,
                    status_code: 0,
                    message: friendly_msg,
                    dns_resolved: !dns_failed,
                    can_reach_server: !server_unreachable,
                }
            }
        }
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
