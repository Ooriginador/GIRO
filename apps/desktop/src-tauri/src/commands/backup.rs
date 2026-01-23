//! Comandos Tauri para Backup
//!
//! Expõe o serviço de backup para o frontend.

use crate::services::backup_service::{
    BackupConfig, BackupMetadata, BackupResult, BackupService, GoogleCredentials,
};
use crate::AppState;
use std::path::PathBuf;
use tauri::State;

/// Cria um backup do banco de dados
#[tauri::command]
pub async fn create_backup(
    state: State<'_, AppState>,
    password: Option<String>,
) -> Result<BackupResult, String> {
    let db_path = state.db_path.clone();
    let backup_dir = state.backup_dir.clone();

    let service = BackupService::new(backup_dir, BackupConfig::default());
    Ok(service.create_backup(&db_path, password.as_deref()).await)
}

/// Lista backups locais
#[tauri::command]
pub async fn list_backups(state: State<'_, AppState>) -> Result<Vec<BackupMetadata>, String> {
    let backup_dir = state.backup_dir.clone();
    let service = BackupService::new(backup_dir, BackupConfig::default());
    service.list_backups().await
}

/// Restaura um backup
#[tauri::command]
pub async fn restore_backup(
    state: State<'_, AppState>,
    filename: String,
    password: Option<String>,
) -> Result<(), String> {
    let backup_dir = state.backup_dir.clone();
    let db_path = state.db_path.clone();
    let backup_path = backup_dir.join(&filename);

    let service = BackupService::new(backup_dir, BackupConfig::default());
    service
        .restore_backup(&backup_path, &db_path, password.as_deref())
        .await
}

/// Remove backups antigos
#[tauri::command]
pub async fn cleanup_old_backups(state: State<'_, AppState>) -> Result<u32, String> {
    let backup_dir = state.backup_dir.clone();
    let service = BackupService::new(backup_dir, BackupConfig::default());
    service.cleanup_old_backups().await
}

/// Obtém URL de autorização do Google
#[tauri::command]
pub fn get_google_auth_url(client_id: String, client_secret: String) -> Result<String, String> {
    let creds = GoogleCredentials {
        client_id,
        client_secret,
        refresh_token: None,
        access_token: None,
        expires_at: None,
    };

    let mut service = BackupService::new(PathBuf::new(), BackupConfig::default());
    service.set_google_credentials(creds);

    service
        .get_auth_url()
        .ok_or("Falha ao gerar URL".to_string())
}

/// Troca código OAuth por tokens
#[tauri::command]
pub async fn exchange_google_code(
    state: State<'_, AppState>,
    client_id: String,
    client_secret: String,
    code: String,
) -> Result<(), String> {
    let creds = GoogleCredentials {
        client_id,
        client_secret,
        refresh_token: None,
        access_token: None,
        expires_at: None,
    };

    let mut service = BackupService::new(state.backup_dir.clone(), BackupConfig::default());
    service.set_google_credentials(creds);
    service.exchange_code(&code).await
}

/// Faz upload de backup para Google Drive
#[tauri::command]
pub async fn upload_backup_to_drive(
    state: State<'_, AppState>,
    filename: String,
    access_token: String,
) -> Result<String, String> {
    let backup_path = state.backup_dir.join(&filename);

    let creds = GoogleCredentials {
        client_id: String::new(),
        client_secret: String::new(),
        refresh_token: None,
        access_token: Some(access_token),
        expires_at: None,
    };

    let mut service = BackupService::new(state.backup_dir.clone(), BackupConfig::default());
    service.set_google_credentials(creds);
    service.upload_to_drive(&backup_path).await
}

/// Lista backups no Google Drive
#[tauri::command]
pub async fn list_drive_backups(access_token: String) -> Result<Vec<BackupMetadata>, String> {
    let creds = GoogleCredentials {
        client_id: String::new(),
        client_secret: String::new(),
        refresh_token: None,
        access_token: Some(access_token),
        expires_at: None,
    };

    let mut service = BackupService::new(PathBuf::new(), BackupConfig::default());
    service.set_google_credentials(creds);
    service.list_drive_backups().await
}

/// Baixa backup do Google Drive
#[tauri::command]
pub async fn download_backup_from_drive(
    state: State<'_, AppState>,
    file_id: String,
    filename: String,
    access_token: String,
) -> Result<(), String> {
    let target_path = state.backup_dir.join(&filename);

    let creds = GoogleCredentials {
        client_id: String::new(),
        client_secret: String::new(),
        refresh_token: None,
        access_token: Some(access_token),
        expires_at: None,
    };

    let mut service = BackupService::new(state.backup_dir.clone(), BackupConfig::default());
    service.set_google_credentials(creds);
    service.download_from_drive(&file_id, &target_path).await
}

// ────────────────────────────────────────────────────────────────────────────
// CLOUD BACKUP (License Server)
// These commands wrap license server backup endpoints and accept a bearer token
// from the frontend (the frontend is responsible for storing the JWT).
// ────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_cloud_backups_cmd(
    state: State<'_, AppState>,
    bearer_token: String,
) -> Result<serde_json::Value, String> {
    state.license_client.list_cloud_backups(&bearer_token).await
}

#[tauri::command]
pub async fn upload_cloud_backup_cmd(
    state: State<'_, AppState>,
    bearer_token: String,
    filename: String,
) -> Result<serde_json::Value, String> {
    // Sanitize filename to prevent directory traversal
    let safe_filename = std::path::Path::new(&filename)
        .file_name()
        .ok_or("Nome de arquivo inválido")?;

    let backup_path = state.backup_dir.join(safe_filename);

    if !backup_path.exists() {
        return Err(format!("Arquivo de backup não encontrado: {}", filename));
    }

    state
        .license_client
        .upload_cloud_backup(&bearer_token, backup_path)
        .await
}

#[tauri::command]
pub async fn get_cloud_backup_cmd(
    state: State<'_, AppState>,
    bearer_token: String,
    backup_id: String,
) -> Result<serde_json::Value, String> {
    state
        .license_client
        .get_cloud_backup(&bearer_token, &backup_id)
        .await
}

#[tauri::command]
pub async fn delete_cloud_backup_cmd(
    state: State<'_, AppState>,
    bearer_token: String,
    backup_id: String,
) -> Result<(), String> {
    state
        .license_client
        .delete_cloud_backup(&bearer_token, &backup_id)
        .await
}
