//! License Commands
//!
//! Tauri commands for license management

use tauri::State;
use crate::license::MetricsPayload;
use crate::license::LicenseInfo;
use crate::AppState;

/// Get the hardware ID for this machine
/// Used by frontend to display hardware info and for activation
#[tauri::command]
pub async fn get_hardware_id(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.hardware_id.clone())
}

#[tauri::command]
pub async fn activate_license(
    license_key: String,
    state: State<'_, AppState>,
) -> Result<LicenseInfo, String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    // Normalize: Trim, uppercase, remove spaces
    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    let info = client.activate(&normalized_key, hardware_id).await?;

    // Save license key and info to config
    let config_path = state.db_path.parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    let license_data = serde_json::json!({
        "key": normalized_key,
        "activated_at": chrono::Utc::now().to_rfc3339(),
        "last_validated_at": chrono::Utc::now().to_rfc3339(),
        "info": info
    });

    if let Err(e) = std::fs::write(&config_path, serde_json::to_string_pretty(&license_data).unwrap()) {
         return Err(format!("Falha ao salvar licença: {}", e));
    }

    Ok(info)
}

#[tauri::command]
pub async fn validate_license(
    license_key: String,
    state: State<'_, AppState>,
) -> Result<LicenseInfo, String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    let info = client.validate(&normalized_key, hardware_id).await?;

    // Update last_validated_at in license.json
    let config_path = state.db_path.parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(mut data) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = data.as_object_mut() {
                    obj.insert("last_validated_at".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
                    obj.insert("info".to_string(), serde_json::to_value(&info).unwrap_or(serde_json::Value::Null));
                    let _ = std::fs::write(&config_path, serde_json::to_string_pretty(&data).unwrap());
                }
            }
        }
    }

    Ok(info)
}

#[tauri::command]
pub async fn sync_metrics(
    license_key: String,
    metrics: MetricsPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    let normalized_key = license_key.trim().to_uppercase().replace(" ", "");

    client.sync_metrics(&normalized_key, hardware_id, metrics).await
}

#[tauri::command]
pub async fn get_stored_license(state: State<'_, AppState>) -> Result<Option<serde_json::Value>, String> {
    let config_path = state.db_path.parent()
        .ok_or("Invalid DB path")?
        .join("license.json");

    if !config_path.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Falha ao ler licença: {}", e))?;
    
    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Falha ao processar licença: {}", e))?;

    Ok(Some(data))
}

#[tauri::command]
pub async fn get_server_time(state: State<'_, AppState>) -> Result<String, String> {
    let client = &state.license_client;

    let time = client.get_server_time().await?;

    Ok(time.to_rfc3339())
}
