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

    let info = client.activate(&license_key, hardware_id).await?;

    // Save license key to config
    // TODO: Implement secure storage

    Ok(info)
}

#[tauri::command]
pub async fn validate_license(
    license_key: String,
    state: State<'_, AppState>,
) -> Result<LicenseInfo, String> {
    let client = &state.license_client;
    let hardware_id = &state.hardware_id;

    let info = client.validate(&license_key, hardware_id).await?;

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

    client.sync_metrics(&license_key, hardware_id, metrics).await
}

#[tauri::command]
pub async fn get_server_time(state: State<'_, AppState>) -> Result<String, String> {
    let client = &state.license_client;

    let time = client.get_server_time().await?;

    Ok(time.to_rfc3339())
}
