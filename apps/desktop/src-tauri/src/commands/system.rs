//! Comandos utilitários do sistema

use crate::error::AppResult;
use crate::AppState;
use std::path::PathBuf;
use tauri::State;

/// Retorna o caminho do diretório de dados do aplicativo
#[tauri::command]
#[specta::specta]
pub async fn get_app_data_path(state: State<'_, AppState>) -> AppResult<String> {
    state.session.require_authenticated()?;
    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("GIRO");

    Ok(app_data.to_string_lossy().to_string())
}

/// Retorna o caminho do banco de dados
#[tauri::command]
#[specta::specta]
pub async fn get_database_path(state: State<'_, AppState>) -> AppResult<String> {
    state.session.require_authenticated()?;
    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("GIRO")
        .join("giro.db");

    Ok(app_data.to_string_lossy().to_string())
}

/// Retorna informações sobre o uso de disco
#[tauri::command]
#[specta::specta]
pub async fn get_disk_usage(state: State<'_, AppState>) -> AppResult<DiskUsageInfo> {
    state.session.require_authenticated()?;
    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("GIRO");

    let mut info = DiskUsageInfo {
        database_size: 0.0,
        backups_size: 0.0,
        logs_size: 0.0,
        total_size: 0.0,
        database_path: String::new(),
        backups_path: String::new(),
    };

    // Banco de dados
    let db_path = app_data.join("giro.db");
    if db_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&db_path) {
            info.database_size = metadata.len() as f64;
        }
        info.database_path = db_path.to_string_lossy().to_string();
    }

    // Backups
    let backups_dir = app_data.join("backups");
    if backups_dir.exists() {
        info.backups_size = calculate_dir_size(&backups_dir) as f64;
        info.backups_path = backups_dir.to_string_lossy().to_string();
    }

    // Logs
    if let Ok(entries) = std::fs::read_dir(&app_data) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension() {
                if ext == "log" {
                    if let Ok(metadata) = entry.metadata() {
                        info.logs_size += metadata.len() as f64;
                    }
                }
            }
        }
    }

    info.total_size = info.database_size + info.backups_size + info.logs_size;

    Ok(info)
}

/// Calcula o tamanho total de um diretório
fn calculate_dir_size(path: &PathBuf) -> u64 {
    let mut total = 0u64;

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    total += metadata.len();
                } else if metadata.is_dir() {
                    total += calculate_dir_size(&entry.path());
                }
            }
        }
    }

    total
}

#[derive(serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiskUsageInfo {
    pub database_size: f64,
    pub backups_size: f64,
    pub logs_size: f64,
    pub total_size: f64,
    pub database_path: String,
    pub backups_path: String,
}

/// Tenta corrigir as regras de firewall (Windows only)
#[tauri::command]
#[specta::specta]
pub async fn fix_firewall_rules(state: State<'_, AppState>) -> AppResult<()> {
    state.session.require_authenticated()?;
    #[cfg(target_os = "windows")]
    {
        let current_exe = std::env::current_exe()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Script para adicionar regras de porta e programa
        // Usa Start-Process com -Verb RunAs para solicitar UAC uma única vez para o bloco
        let script = format!(
            r#"Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -Command "netsh advfirewall firewall add rule name=\"GIRO Mobile Sync\" dir=in action=allow protocol=TCP localport=3847 force=yes; netsh advfirewall firewall add rule name=\"GIRO Desktop App\" dir=in action=allow program=\"{}\" enable=yes force=yes"'" -Wait"#,
            current_exe
        );

        let output = std::process::Command::new("powershell")
            .args(["-Command", &script])
            .output()
            .map_err(|e| crate::error::AppError::System(format!("Erro ao invocar UAC: {}", e)))?;

        if !output.status.success() {
            return Err(crate::error::AppError::System(
                "Falha ao aplicar regras (O usuário recusou ou erro no script)".to_string(),
            ));
        }

        // Pequeno delay para garantir que o sistema processe
        std::thread::sleep(std::time::Duration::from_millis(1000));
    }

    Ok(())
}
