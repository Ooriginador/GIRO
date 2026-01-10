//! Comandos Tauri para Servidor Mobile

use crate::error::{AppError, AppResult};
use crate::services::{MdnsConfig, MdnsService, MobileServer, MobileServerConfig};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Status do servidor mobile
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MobileServerStatus {
    pub is_running: bool,
    pub port: u16,
    pub connected_devices: usize,
    pub local_ip: Option<String>,
    pub version: String,
}

/// Dispositivo conectado
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedDevice {
    pub id: String,
    pub device_name: String,
    pub employee_name: Option<String>,
    pub connected_at: String,
    pub last_activity: String,
}

/// Config para iniciar servidor
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartServerConfig {
    pub port: u16,
    pub max_connections: usize,
}

/// Estado do servidor mobile (gerenciado globalmente)
#[derive(Default)]
pub struct MobileServerState {
    pub server: Option<Arc<MobileServer>>,
    pub mdns: Option<Arc<MdnsService>>,
    pub is_running: bool,
}

/// Obtém status do servidor mobile
#[tauri::command]
pub async fn get_mobile_server_status(
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<MobileServerStatus> {
    let state = mobile_state.read().await;

    let local_ip = crate::services::mdns_service::get_local_ip();

    let connected_devices = if let Some(ref server) = state.server {
        server.connection_count().await
    } else {
        0
    };

    Ok(MobileServerStatus {
        is_running: state.is_running,
        port: 3847,
        connected_devices,
        local_ip,
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Alias para compatibilidade com código antigo
#[tauri::command]
pub async fn get_mobile_server_info(
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<MobileServerStatus> {
    get_mobile_server_status(mobile_state).await
}

/// Lista dispositivos conectados
#[tauri::command]
pub async fn get_connected_devices(
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<Vec<ConnectedDevice>> {
    let state = mobile_state.read().await;

    if let Some(ref server) = state.server {
        let connections = server.list_connections().await;
        let devices: Vec<ConnectedDevice> = connections
            .into_iter()
            .map(|conn| ConnectedDevice {
                id: conn.id,
                device_name: format!("Mobile {}", conn.addr),
                employee_name: conn.employee_id.clone(),
                connected_at: conn.connected_at.to_rfc3339(),
                last_activity: conn.last_ping.to_rfc3339(),
            })
            .collect();
        Ok(devices)
    } else {
        Ok(vec![])
    }
}

/// Inicia o servidor mobile
#[tauri::command]
pub async fn start_mobile_server(
    config: StartServerConfig,
    app_state: State<'_, AppState>,
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<()> {
    let mut state = mobile_state.write().await;

    if state.is_running {
        return Err(AppError::Validation("Servidor já está rodando".into()));
    }

    // Configuração do servidor
    let server_config = MobileServerConfig {
        host: "0.0.0.0".to_string(),
        port: config.port,
        max_connections: config.max_connections,
        connection_timeout_secs: 300,
    };

    // Criar servidor
    let server = Arc::new(MobileServer::new(
        app_state.pool().clone(),
        server_config,
        "GIRO PDV".to_string(),
        "Loja".to_string(),
        None,
    ));

    // Iniciar servidor em background
    let server_clone = server.clone();
    tokio::spawn(async move {
        if let Err(e) = server_clone.start().await {
            tracing::error!("Erro no servidor mobile: {}", e);
        }
    });

    // Iniciar mDNS
    let mdns_config = MdnsConfig {
        instance_name: "GIRO PDV".to_string(),
        port: config.port,
        version: env!("CARGO_PKG_VERSION").to_string(),
        store_name: None,
    };
    let mdns = MdnsService::new(mdns_config);
    if let Err(e) = mdns.start().await {
        tracing::warn!("Erro ao iniciar mDNS: {}", e);
    }

    state.server = Some(server);
    state.mdns = Some(mdns);
    state.is_running = true;

    tracing::info!("Servidor mobile iniciado na porta {}", config.port);
    Ok(())
}

/// Para o servidor mobile
#[tauri::command]
pub async fn stop_mobile_server(
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<()> {
    let mut state = mobile_state.write().await;

    if !state.is_running {
        return Err(AppError::Validation("Servidor não está rodando".into()));
    }

    // Parar servidor
    if let Some(ref server) = state.server {
        server.stop().await;
    }

    // Parar mDNS
    if let Some(ref mdns) = state.mdns {
        let _ = mdns.stop().await;
    }

    state.server = None;
    state.mdns = None;
    state.is_running = false;

    tracing::info!("Servidor mobile parado");
    Ok(())
}

/// Desconecta um dispositivo específico
#[tauri::command]
pub async fn disconnect_mobile_device(
    device_id: String,
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<()> {
    let state = mobile_state.read().await;

    if let Some(ref server) = state.server {
        server.disconnect(&device_id).await;
        Ok(())
    } else {
        Err(AppError::Validation("Servidor não está rodando".into()))
    }
}
