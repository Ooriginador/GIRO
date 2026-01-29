//! Comandos Tauri para Servidor Mobile

use crate::error::{AppError, AppResult};
use crate::repositories::SettingsRepository;
use crate::services::{
    MdnsConfig, MdnsService, MobileEventService, MobileServer, MobileServerConfig,
};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Status do servidor mobile
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MobileServerStatus {
    pub is_running: bool,
    pub port: u16,
    #[specta(type = i32)]
    pub connected_devices: usize,
    pub local_ip: Option<String>,
    pub version: String,
}

/// Dispositivo conectado
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedDevice {
    pub id: String,
    pub device_name: String,
    pub employee_name: Option<String>,
    pub connected_at: String,
    pub last_activity: String,
}

/// Config para iniciar servidor
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct StartServerConfig {
    pub port: u16,
    #[specta(type = i32)]
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
#[specta::specta]
pub async fn get_mobile_server_status(
    mobile_state: State<'_, RwLock<MobileServerState>>,
    app_state: State<'_, AppState>,
) -> AppResult<MobileServerStatus> {
    app_state.session.require_authenticated()?;
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
#[specta::specta]
pub async fn get_mobile_server_info(
    mobile_state: State<'_, RwLock<MobileServerState>>,
    app_state: State<'_, AppState>,
) -> AppResult<MobileServerStatus> {
    get_mobile_server_status(mobile_state, app_state).await
}

/// Lista dispositivos conectados
#[tauri::command]
#[specta::specta]
pub async fn get_connected_devices(
    mobile_state: State<'_, RwLock<MobileServerState>>,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<ConnectedDevice>> {
    app_state.session.require_authenticated()?;
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

/// Inicia o servidor mobile (requer autenticação)
#[tauri::command]
#[specta::specta]
pub async fn start_mobile_server(
    config: StartServerConfig,
    app_state: State<'_, AppState>,
    mobile_state: State<'_, RwLock<MobileServerState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    start_mobile_server_internal(config, &app_state, &mobile_state).await
}

/// Versão interna sem verificação de autenticação (para auto-start no setup)
pub async fn start_mobile_server_internal(
    config: StartServerConfig,
    app_state: &AppState,
    mobile_state: &RwLock<MobileServerState>,
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

    // Buscar configurações da loja
    let settings_repo = SettingsRepository::new(app_state.pool());
    let store_name = settings_repo
        .get_value("store.name")
        .await
        .ok()
        .flatten()
        .unwrap_or_else(|| "GIRO PDV".to_string());
    let store_document = settings_repo
        .get_value("store.document")
        .await
        .ok()
        .flatten();
    let pdv_name = settings_repo
        .get_value("pdv.name")
        .await
        .ok()
        .flatten()
        .unwrap_or_else(|| "Principal".to_string());

    // Criar serviço de eventos compartilhado
    let event_service = Arc::new(MobileEventService::new());

    // Criar servidor
    let server = Arc::new(MobileServer::new(
        app_state.pool().clone(),
        server_config,
        event_service.clone(),
        pdv_name,
        store_name,
        store_document,
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
        auto_restart: true,
        health_check_interval_secs: 30,
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
#[specta::specta]
pub async fn stop_mobile_server(
    mobile_state: State<'_, RwLock<MobileServerState>>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
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
#[specta::specta]
pub async fn disconnect_mobile_device(
    device_id: String,
    mobile_state: State<'_, RwLock<MobileServerState>>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let state = mobile_state.read().await;

    if let Some(ref server) = state.server {
        server.disconnect(&device_id).await;
        Ok(())
    } else {
        Err(AppError::Validation("Servidor não está rodando".into()))
    }
}
