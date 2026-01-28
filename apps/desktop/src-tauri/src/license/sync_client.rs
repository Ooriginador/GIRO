//! Sync Client
//!
//! Client for multi-PC data synchronization with GIRO License Server

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::LicenseClientConfig;

/// Entity types that can be synchronized
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SyncEntityType {
    Product,
    Category,
    Supplier,
    Customer,
    Employee,
    Setting,
}

/// Sync operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SyncOperation {
    Create,
    Update,
    Delete,
}

/// Sync item for push/pull operations
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct SyncItem {
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub operation: SyncOperation,
    pub data: serde_json::Value,
    pub local_version: i64,
}

/// Sync item result
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct SyncItemResult {
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub status: SyncItemStatus,
    pub server_version: i64,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SyncItemStatus {
    Ok,
    Conflict,
    Error,
}

/// Sync push request
#[derive(Debug, Clone, Serialize)]
struct SyncPushRequest {
    hardware_id: String,
    items: Vec<SyncItem>,
}

/// Sync push response
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct SyncPushResponse {
    pub success: bool,
    pub processed: usize,
    pub results: Vec<SyncItemResult>,
    pub server_time: DateTime<Utc>,
}

/// Sync pull request
#[derive(Debug, Clone, Serialize)]
struct SyncPullRequest {
    hardware_id: String,
    entity_types: Vec<SyncEntityType>,
    limit: i32,
}

/// Sync pull item
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct SyncPullItem {
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub operation: SyncOperation,
    pub data: serde_json::Value,
    pub version: i64,
    pub updated_at: DateTime<Utc>,
}

/// Sync pull response
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct SyncPullResponse {
    pub items: Vec<SyncPullItem>,
    pub has_more: bool,
    pub server_time: DateTime<Utc>,
}

/// Sync status request
#[derive(Debug, Clone, Serialize)]
struct SyncStatusRequest {
    hardware_id: String,
}

/// Entity count in sync status
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct EntityCount {
    pub entity_type: SyncEntityType,
    pub count: i64,
    pub last_version: i64,
    pub synced_version: i64,
}

/// Sync status response
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub struct SyncStatusResponse {
    pub entity_counts: Vec<EntityCount>,
    pub last_sync: Option<DateTime<Utc>>,
    pub pending_changes: i64,
}

/// Sync client
#[derive(Clone)]
pub struct SyncClient {
    config: LicenseClientConfig,
    client: reqwest::Client,
}

/// Maximum retry attempts for sync operations
const MAX_RETRIES: u32 = 3;
/// Base delay for exponential backoff (in milliseconds)
const BASE_DELAY_MS: u64 = 500;

impl SyncClient {
    /// Create new sync client
    pub fn new(config: LicenseClientConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("Failed to create HTTP client");

        Self { config, client }
    }

    /// Execute request with retry and exponential backoff
    async fn request_with_retry<T: serde::de::DeserializeOwned>(
        &self,
        method: reqwest::Method,
        url: &str,
        license_key: &str,
        payload: &impl serde::Serialize,
        operation_name: &str,
    ) -> Result<T, String> {
        let mut last_error = String::new();

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                // Exponential backoff: 500ms, 1000ms, 2000ms
                let delay = BASE_DELAY_MS * (1 << attempt);
                tracing::info!(
                    "[SyncClient] Tentativa {} de {} para {} (aguardando {}ms)",
                    attempt + 1,
                    MAX_RETRIES,
                    operation_name,
                    delay
                );
                tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
            }

            let request = self
                .client
                .request(method.clone(), url)
                .header("X-License-Key", license_key)
                .json(payload);

            match request.send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.json::<T>().await {
                            Ok(result) => return Ok(result),
                            Err(e) => {
                                last_error = format!("Erro ao processar resposta: {}", e);
                                continue;
                            }
                        }
                    } else {
                        let status = response.status();
                        let error_text = response.text().await.unwrap_or_default();

                        // Don't retry client errors (4xx) - they won't succeed on retry
                        if status.is_client_error() {
                            return Err(self.format_server_error(&error_text, status.as_u16()));
                        }

                        last_error = format!("Servidor retornou erro {}: {}", status, error_text);
                    }
                }
                Err(e) => {
                    last_error = self.format_connection_error(&e);
                    // Continue to retry for network errors
                }
            }
        }

        Err(format!(
            "Falha após {} tentativas para {}: {}",
            MAX_RETRIES, operation_name, last_error
        ))
    }

    /// Format connection error with Windows-specific hints
    fn format_connection_error(&self, error: &reqwest::Error) -> String {
        if error.is_timeout() {
            "Tempo limite excedido ao conectar com servidor de sincronização. \
             Verifique sua conexão com a internet."
                .to_string()
        } else if error.is_connect() {
            #[cfg(target_os = "windows")]
            return format!(
                "Não foi possível conectar ao servidor de licenças. \
                 Possíveis causas:\n\
                 • Sem conexão com a internet\n\
                 • Firewall do Windows bloqueando conexão\n\
                 • Antivírus bloqueando a aplicação\n\
                 Erro: {}",
                error
            );

            #[cfg(not(target_os = "windows"))]
            format!(
                "Não foi possível conectar ao servidor de licenças. \
                 Verifique sua conexão com a internet. Erro: {}",
                error
            )
        } else {
            format!("Erro de conexão: {}", error)
        }
    }

    /// Format server error response
    fn format_server_error(&self, error_text: &str, status_code: u16) -> String {
        match status_code {
            401 => "Licença inválida ou expirada. Verifique sua chave de licença.".to_string(),
            403 => "Hardware não autorizado para esta licença.".to_string(),
            404 => "Licença não encontrada no servidor.".to_string(),
            429 => "Muitas requisições. Aguarde alguns minutos e tente novamente.".to_string(),
            500..=599 => format!("Erro no servidor de licenças. Tente novamente mais tarde."),
            _ => format!("Erro do servidor ({}): {}", status_code, error_text),
        }
    }

    /// Push changes to server
    pub async fn push(
        &self,
        license_key: &str,
        hardware_id: &str,
        items: Vec<SyncItem>,
    ) -> Result<SyncPushResponse, String> {
        let url = format!(
            "{}/api/v1/sync/{}/push",
            self.config.server_url, license_key
        );

        let payload = SyncPushRequest {
            hardware_id: hardware_id.to_string(),
            items,
        };

        self.request_with_retry(
            reqwest::Method::POST,
            &url,
            license_key,
            &payload,
            "sync push",
        )
        .await
    }

    /// Pull changes from server
    pub async fn pull(
        &self,
        license_key: &str,
        hardware_id: &str,
        entity_types: Vec<SyncEntityType>,
        limit: i32,
    ) -> Result<SyncPullResponse, String> {
        let url = format!(
            "{}/api/v1/sync/{}/pull",
            self.config.server_url, license_key
        );

        let payload = SyncPullRequest {
            hardware_id: hardware_id.to_string(),
            entity_types,
            limit,
        };

        self.request_with_retry(
            reqwest::Method::POST,
            &url,
            license_key,
            &payload,
            "sync pull",
        )
        .await
    }

    /// Get sync status
    pub async fn status(
        &self,
        license_key: &str,
        hardware_id: &str,
    ) -> Result<SyncStatusResponse, String> {
        let url = format!(
            "{}/api/v1/sync/{}/status",
            self.config.server_url, license_key
        );

        let payload = SyncStatusRequest {
            hardware_id: hardware_id.to_string(),
        };

        self.request_with_retry(
            reqwest::Method::POST,
            &url,
            license_key,
            &payload,
            "sync status",
        )
        .await
    }

    /// Reset sync cursor (force full resync)
    pub async fn reset(
        &self,
        license_key: &str,
        hardware_id: &str,
        entity_type: Option<SyncEntityType>,
    ) -> Result<(), String> {
        let url = format!(
            "{}/api/v1/sync/{}/reset",
            self.config.server_url, license_key
        );

        let payload = serde_json::json!({
            "hardware_id": hardware_id,
            "entity_type": entity_type
        });

        let _: serde_json::Value = self
            .request_with_retry(
                reqwest::Method::POST,
                &url,
                license_key,
                &payload,
                "sync reset",
            )
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialization_snake_case() {
        let item = SyncItem {
            entity_type: SyncEntityType::Product,
            entity_id: "123".to_string(),
            operation: SyncOperation::Update,
            data: serde_json::json!({"name": "Test"}),
            local_version: 1,
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("product")); // product vs Product
        assert!(json.contains("update")); // update vs Update
        assert!(json.contains("entity_type")); // snake_case
    }
}
