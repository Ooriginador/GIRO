//! License Commands
//!
//! Tauri commands for license management

use crate::license::LicenseInfo;
use crate::license::MetricsPayload;
use crate::license::UpdateAdminRequest;
use crate::models::SetSetting;
use crate::repositories::{EmployeeRepository, SettingsRepository};
use crate::AppState;
use tauri::State;

/// Payload for login-based recovery
#[derive(Debug, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

/// Used by frontend to display hardware info and for activation
#[tauri::command]
#[specta::specta]
pub async fn get_hardware_id(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.hardware_id.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn activate_license(
    license_key: String,
    state: State<'_, AppState>,
) -> Result<LicenseInfo, String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    // Normalize: Trim, uppercase, remove spaces
    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    let info = client.activate(&normalized_key, hardware_id, None).await?;

    // Save license key and info to config
    let config_path = state
        .db_path
        .parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    let license_data = serde_json::json!({
        "key": normalized_key,
        "activated_at": chrono::Utc::now().to_rfc3339(),
        "last_validated_at": chrono::Utc::now().to_rfc3339(),
        "info": info
    });

    // Write license.json atomically using tokio async I/O
    let tmp_path = config_path.with_extension("json.tmp");
    let data_str = serde_json::to_string_pretty(&license_data)
        .map_err(|e| format!("Falha ao serializar licença: {}", e))?;

    if let Err(e) = tokio::fs::write(&tmp_path, data_str.as_bytes()).await {
        return Err(format!("Falha ao salvar licença temporária: {}", e));
    }

    if let Err(e) = tokio::fs::rename(&tmp_path, &config_path).await {
        return Err(format!("Falha ao mover arquivo de licença: {}", e));
    }

    // Sync Admin Account if present in response
    // DEPRECATED: Automatic sync was causing developer data to leak into new installs.
    // Admin sync must now be explicitly triggered by the user in the setup wizard.
    /*
    if let Some(admin_data) = info.admin_user.clone() {
        let repo = EmployeeRepository::new(state.pool());
        if let Err(e) = repo.sync_admin_from_server(admin_data).await {
            tracing::error!("Erro ao sincronizar administrador do servidor: {:?}", e);
        }
    }
    */

    // Sync Company Data
    sync_company_data(&info, state.pool()).await;

    Ok(info)
}

#[tauri::command]
#[specta::specta]
pub async fn validate_license(
    license_key: String,
    state: State<'_, AppState>,
) -> Result<LicenseInfo, String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    let info = client.validate(&normalized_key, hardware_id).await?;

    // Update last_validated_at in license.json
    let config_path = state
        .db_path
        .parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    if let Ok(content) = tokio::fs::read_to_string(&config_path).await {
        if let Ok(mut data) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = data.as_object_mut() {
                obj.insert(
                    "last_validated_at".to_string(),
                    serde_json::json!(chrono::Utc::now().to_rfc3339()),
                );
                obj.insert(
                    "info".to_string(),
                    serde_json::to_value(&info).unwrap_or(serde_json::Value::Null),
                );

                // Write atomically
                let tmp_path = config_path.with_extension("json.tmp");
                let data_str = serde_json::to_string_pretty(&data).unwrap_or_default();
                let _ = tokio::fs::write(&tmp_path, data_str.as_bytes()).await;
                let _ = tokio::fs::rename(&tmp_path, &config_path).await;
            }
        }
    }

    Ok(info)
}

#[tauri::command]
#[specta::specta]
pub async fn recover_license_from_login(
    payload: LoginPayload,
    state: State<'_, AppState>,
) -> Result<LicenseInfo, String> {
    let client = &state.license_client;

    // 1. Authenticate with server
    let token = client
        .login(&payload.email, &payload.password)
        .await
        .map_err(|e| format!("Falha na autenticação: {}", e))?;

    // 2. Fetch licenses
    let licenses = client
        .list_licenses(&token)
        .await
        .map_err(|e| format!("Falha ao buscar licenças: {}", e))?;

    if licenses.is_empty() {
        return Err("Nenhuma licença encontrada nesta conta.".to_string());
    }

    // 3. Find a valid license to activate
    // Prioritize active, then pending.
    let license_to_activate = licenses
        .iter()
        .find(|l| {
            matches!(
                l.status,
                crate::license::client::LicenseStatus::Active
                    | crate::license::client::LicenseStatus::Pending
            )
        })
        .or(licenses.first())
        .ok_or("Nenhuma licença válida encontrada.".to_string())?;

    tracing::info!(
        "Recuperando licença via login: {} ({:?})",
        license_to_activate.license_key,
        license_to_activate.status
    );

    // 4. Activate the selected license
    let info = activate_license(license_to_activate.license_key.clone(), state.clone()).await?;

    // 5. Explicitly sync admin during recovery flow
    if let Some(admin_data) = info.admin_user.clone() {
        let repo = EmployeeRepository::new(state.pool());
        if let Err(e) = repo.sync_admin_from_server(admin_data).await {
            tracing::error!(
                "Erro ao sincronizar administrador durante recuperação: {:?}",
                e
            );
        }
    }

    Ok(info)
}

#[tauri::command]
#[specta::specta]
pub async fn license_server_login(
    payload: LoginPayload,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let client = &state.license_client;

    client
        .login(&payload.email, &payload.password)
        .await
        .map_err(|e| format!("Falha na autenticação: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn sync_metrics(
    license_key: String,
    metrics: MetricsPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    client
        .sync_metrics(&normalized_key, hardware_id, metrics)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_stored_license(
    state: State<'_, AppState>,
) -> Result<Option<serde_json::Value>, String> {
    let config_path = state
        .db_path
        .parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    // Read asynchronously. If file missing or unreadable, return None.
    let content = match tokio::fs::read_to_string(&config_path).await {
        Ok(c) => c,
        Err(_) => return Ok(None),
    };

    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Falha ao processar licença: {}", e))?;

    Ok(Some(data))
}

#[tauri::command]
#[specta::specta]
pub async fn get_server_time(state: State<'_, AppState>) -> Result<String, String> {
    let client = &state.license_client;

    let time = client.get_server_time().await?;

    Ok(time.to_rfc3339())
}

#[tauri::command]
#[specta::specta]
pub async fn restore_license(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    let license_key = client.restore(hardware_id).await?;

    Ok(license_key)
}

#[tauri::command]
#[specta::specta]
pub async fn update_license_admin(
    license_key: String,
    data: UpdateAdminRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let client = &state.license_client;
    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    client.update_admin(&normalized_key, data).await
}

#[tauri::command]
#[specta::specta]
pub async fn test_license_connection(
    state: State<'_, AppState>,
) -> Result<crate::license::ConnectionDiagnostic, String> {
    Ok(state.license_client.test_connection().await)
}

/// Helper to sync company data from license info to local settings
async fn sync_company_data(info: &LicenseInfo, pool: &sqlx::SqlitePool) {
    let repo = SettingsRepository::new(pool);

    // Sync Name
    let _ = repo
        .set(SetSetting {
            key: "company.name".into(),
            value: info.company_name.clone(),
            value_type: Some("STRING".into()),
            group_name: Some("company".into()),
            description: Some("Nome da Empresa (Sincronizado)".into()),
        })
        .await;

    // Sync CNPJ
    if let Some(ref cnpj) = info.company_cnpj {
        let _ = repo
            .set(SetSetting {
                key: "company.cnpj".into(),
                value: cnpj.clone(),
                value_type: Some("STRING".into()),
                group_name: Some("company".into()),
                description: Some("CNPJ da Empresa (Sincronizado)".into()),
            })
            .await;
    }

    // Sync Address
    if let Some(ref address) = info.company_address {
        let _ = repo
            .set(SetSetting {
                key: "company.address".into(),
                value: address.clone(),
                value_type: Some("STRING".into()),
                group_name: Some("company".into()),
                description: Some("Endereço da Empresa (Sincronizado)".into()),
            })
            .await;
    }

    // Sync City
    if let Some(ref city) = info.company_city {
        let _ = repo
            .set(SetSetting {
                key: "company.city".into(),
                value: city.clone(),
                value_type: Some("STRING".into()),
                group_name: Some("company".into()),
                description: Some("Cidade da Empresa (Sincronizado)".into()),
            })
            .await;
    }

    // Sync State
    if let Some(ref state) = info.company_state {
        let _ = repo
            .set(SetSetting {
                key: "company.state".into(),
                value: state.clone(),
                value_type: Some("STRING".into()),
                group_name: Some("company".into()),
                description: Some("Estado da Empresa (Sincronizado)".into()),
            })
            .await;
    }
}

/// Response for connected devices command
pub use crate::license::client::{ConnectedDeviceInfo, ConnectedDevicesResponse};

/// Get all devices connected to the current license
/// This allows users to see which PCs are using the same license
#[tauri::command]
#[specta::specta]
pub async fn get_license_devices(
    state: State<'_, AppState>,
) -> Result<ConnectedDevicesResponse, String> {
    // Read license key from config
    let config_path = state
        .db_path
        .parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    let content = tokio::fs::read_to_string(&config_path)
        .await
        .map_err(|_| "Licença não encontrada. Ative primeiro.")?;

    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|_| "Arquivo de licença corrompido.")?;

    let license_key = data["key"]
        .as_str()
        .ok_or("Chave de licença não encontrada.")?;

    // Fetch connected devices from server
    let client = &state.license_client;
    let devices = client.get_connected_devices(license_key).await?;

    Ok(devices)
}
