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

impl SyncClient {
    /// Create new sync client
    pub fn new(config: LicenseClientConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("Failed to create HTTP client");

        Self { config, client }
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

        let response = self
            .client
            .post(&url)
            .header("X-License-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com servidor de sync: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("[SyncClient] Erro no push: {}", error_text);
            return Err(format!("Falha no sync push: {}", error_text));
        }

        let result = response
            .json::<SyncPushResponse>()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        Ok(result)
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

        let response = self
            .client
            .post(&url)
            .header("X-License-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com servidor de sync: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("[SyncClient] Erro no pull: {}", error_text);
            return Err(format!("Falha no sync pull: {}", error_text));
        }

        let result = response
            .json::<SyncPullResponse>()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        Ok(result)
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

        let response = self
            .client
            .post(&url)
            .header("X-License-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com servidor de sync: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("[SyncClient] Erro ao obter status: {}", error_text);
            return Err(format!("Falha ao obter status de sync: {}", error_text));
        }

        let result = response
            .json::<SyncStatusResponse>()
            .await
            .map_err(|e| format!("Erro ao processar resposta: {}", e))?;

        Ok(result)
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

        let response = self
            .client
            .post(&url)
            .header("X-License-Key", license_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com servidor de sync: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("[SyncClient] Erro ao resetar cursor: {}", error_text);
            return Err(format!("Falha ao resetar sync: {}", error_text));
        }

        Ok(())
    }
}
