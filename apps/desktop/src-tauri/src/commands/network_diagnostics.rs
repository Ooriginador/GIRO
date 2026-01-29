//! Network Diagnostics Commands
//!
//! Comandos Tauri para diagnóstico de rede e gerenciamento de conexões multi-PC.

use crate::error::{AppError, AppResult};
use crate::models::SetSetting;
use crate::services::connection_manager::{
    ConnectionManager, ConnectionManagerConfig, ConnectionStats, OperationMode, PeerInfo,
    PeerStatus,
};
use crate::services::network_diagnostics::{
    NetworkDiagnosticsResult, NetworkDiagnosticsService, NetworkPeer, PortTestResult,
    SystemNetworkInfo,
};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

// ════════════════════════════════════════════════════════════════════════════
// ESTADO
// ════════════════════════════════════════════════════════════════════════════

/// Estado do sistema de rede multi-PC
pub struct MultiPcNetworkState {
    pub diagnostics: Arc<NetworkDiagnosticsService>,
    pub connection_manager: Option<Arc<ConnectionManager>>,
}

impl Default for MultiPcNetworkState {
    fn default() -> Self {
        Self {
            diagnostics: NetworkDiagnosticsService::with_defaults(),
            connection_manager: None,
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE RESPOSTA
// ════════════════════════════════════════════════════════════════════════════

/// Configuração do modo de rede
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkModeConfig {
    /// Modo de operação
    pub mode: OperationMode,
    /// Porta WebSocket
    pub websocket_port: u16,
    /// IP do Master (para modo Satellite)
    pub master_ip: Option<String>,
    /// Porta do Master
    pub master_port: Option<u16>,
    /// Habilitar auto-discovery
    pub auto_discovery: bool,
}

impl Default for NetworkModeConfig {
    fn default() -> Self {
        Self {
            mode: OperationMode::Standalone,
            websocket_port: 3847,
            master_ip: None,
            master_port: None,
            auto_discovery: true,
        }
    }
}

/// Status geral da rede multi-PC
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MultiPcNetworkStatus {
    /// Modo de operação atual
    pub mode: OperationMode,
    /// IP local deste PC
    pub local_ip: Option<String>,
    /// Hostname
    pub hostname: String,
    /// Connection Manager está rodando
    pub is_running: bool,
    /// Estatísticas de conexão
    pub stats: ConnectionStats,
    /// Lista de peers conhecidos
    pub peers: Vec<PeerInfo>,
    /// Conectado ao Master (se Satellite)
    pub connected_to_master: bool,
    /// ID do Master atual
    pub current_master_id: Option<String>,
}

/// Resultado do scan de rede
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkScanResult {
    /// Peers encontrados
    pub peers: Vec<NetworkPeer>,
    /// Tempo de scan (ms)
    pub duration_ms: u64,
    /// Sub-rede escaneada
    pub subnet: String,
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS - DIAGNÓSTICO
// ════════════════════════════════════════════════════════════════════════════

/// Executa diagnóstico completo de rede
#[tauri::command]
#[specta::specta]
pub async fn run_network_diagnostics(
    state: State<'_, RwLock<MultiPcNetworkState>>,
    _app_state: State<'_, AppState>,
) -> AppResult<NetworkDiagnosticsResult> {
    let network_state = state.read().await;
    let result = network_state.diagnostics.run_full_diagnostics().await;
    Ok(result)
}

/// Obtém último resultado de diagnóstico (cache)
#[tauri::command]
#[specta::specta]
pub async fn get_last_diagnostics(
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<Option<NetworkDiagnosticsResult>> {
    let network_state = state.read().await;
    Ok(network_state.diagnostics.get_last_result().await)
}

/// Testa conectividade com um IP:porta específico
#[tauri::command]
#[specta::specta]
pub async fn test_network_connection(
    ip: String,
    port: u16,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<PortTestResult> {
    let network_state = state.read().await;
    let result = network_state.diagnostics.test_peer(&ip, port).await;
    Ok(result)
}

/// Escaneia sub-rede em busca de outros GIRO
#[tauri::command]
#[specta::specta]
pub async fn scan_network_subnet(
    base_ip: Option<String>,
    start: Option<u8>,
    end: Option<u8>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<NetworkScanResult> {
    let network_state = state.read().await;

    // Detectar sub-rede local se não especificada
    let base = match base_ip {
        Some(ip) => ip,
        None => {
            let local_ip = crate::services::mdns_service::get_local_ip()
                .ok_or_else(|| AppError::Network("Não foi possível detectar IP local".into()))?;

            // Extrair base (ex: 192.168.1)
            local_ip
                .rsplit_once('.')
                .map(|(base, _)| base.to_string())
                .ok_or_else(|| AppError::Network("IP local inválido".into()))?
        }
    };

    let start_ip = start.unwrap_or(1);
    let end_ip = end.unwrap_or(254);

    let start_time = std::time::Instant::now();
    let peers = network_state
        .diagnostics
        .scan_subnet_for_peers(&base, start_ip, end_ip)
        .await;

    Ok(NetworkScanResult {
        peers,
        duration_ms: start_time.elapsed().as_millis() as u64,
        subnet: format!("{}.{}-{}", base, start_ip, end_ip),
    })
}

/// Obtém informações do sistema de rede
#[tauri::command]
#[specta::specta]
pub async fn get_system_network_info(
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<SystemNetworkInfo> {
    let network_state = state.read().await;
    let result = network_state.diagnostics.run_full_diagnostics().await;
    Ok(result.system_info)
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS - GERENCIADOR DE CONEXÕES
// ════════════════════════════════════════════════════════════════════════════

/// Obtém status geral da rede multi-PC
#[tauri::command]
#[specta::specta]
pub async fn get_multi_pc_status(
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<MultiPcNetworkStatus> {
    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        let mode = manager.get_mode().await;
        let stats = manager.get_stats().await;
        let peers = manager.get_peers().await;
        let local_ip = manager.get_local_ip();

        // Verificar se está conectado ao Master
        let connected_to_master = peers
            .iter()
            .any(|p| p.is_master && p.status == PeerStatus::Connected);
        let current_master_id = peers.iter().find(|p| p.is_master).map(|p| p.id.clone());

        Ok(MultiPcNetworkStatus {
            mode,
            local_ip,
            hostname: hostname::get()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_default(),
            is_running: true,
            stats,
            peers,
            connected_to_master,
            current_master_id,
        })
    } else {
        Ok(MultiPcNetworkStatus {
            mode: OperationMode::Standalone,
            local_ip: crate::services::mdns_service::get_local_ip(),
            hostname: hostname::get()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_default(),
            is_running: false,
            stats: ConnectionStats::default(),
            peers: vec![],
            connected_to_master: false,
            current_master_id: None,
        })
    }
}

/// Inicia o Connection Manager com configuração específica
#[tauri::command]
#[specta::specta]
pub async fn start_connection_manager(
    config: NetworkModeConfig,
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let mut network_state = state.write().await;

    // Verificar se já está rodando
    if network_state.connection_manager.is_some() {
        return Err(AppError::Validation(
            "Connection Manager já está rodando. Pare-o primeiro.".into(),
        ));
    }

    // Criar configuração
    let manager_config = ConnectionManagerConfig {
        mode: config.mode,
        websocket_port: config.websocket_port,
        static_master_ip: config.master_ip,
        auto_discovery: config.auto_discovery,
        ..Default::default()
    };

    // Criar e iniciar manager
    let manager = ConnectionManager::new(app_state.pool().clone(), manager_config);

    manager.start().await.map_err(|e| AppError::Network(e))?;

    network_state.connection_manager = Some(manager);

    tracing::info!("Connection Manager iniciado via comando");
    Ok(())
}

/// Para o Connection Manager
#[tauri::command]
#[specta::specta]
pub async fn stop_connection_manager(
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let mut network_state = state.write().await;

    if let Some(manager) = network_state.connection_manager.take() {
        manager.stop().await;
        tracing::info!("Connection Manager parado via comando");
    }

    Ok(())
}

/// Lista peers conhecidos
#[tauri::command]
#[specta::specta]
pub async fn list_network_peers(
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<Vec<PeerInfo>> {
    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        Ok(manager.get_peers().await)
    } else {
        Ok(vec![])
    }
}

/// Adiciona peer manualmente
#[tauri::command]
#[specta::specta]
pub async fn add_network_peer(
    ip: String,
    port: Option<u16>,
    name: Option<String>,
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        let port = port.unwrap_or(3847);
        manager.add_peer(&ip, port, name.as_deref()).await;
        Ok(())
    } else {
        Err(AppError::Validation(
            "Connection Manager não está rodando".into(),
        ))
    }
}

/// Remove peer
#[tauri::command]
#[specta::specta]
pub async fn remove_network_peer(
    peer_id: String,
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        manager.remove_peer(&peer_id).await;
        Ok(())
    } else {
        Err(AppError::Validation(
            "Connection Manager não está rodando".into(),
        ))
    }
}

/// Conecta ao Master (modo Satellite)
#[tauri::command]
#[specta::specta]
pub async fn connect_to_master(
    ip: String,
    port: Option<u16>,
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        let port = port.unwrap_or(3847);
        manager
            .connect_to_master(&ip, port)
            .await
            .map_err(|e| AppError::Network(e))?;
        Ok(())
    } else {
        Err(AppError::Validation(
            "Connection Manager não está rodando".into(),
        ))
    }
}

/// Desconecta do Master
#[tauri::command]
#[specta::specta]
pub async fn disconnect_from_master(
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        manager.disconnect_from_master().await;
        Ok(())
    } else {
        Err(AppError::Validation(
            "Connection Manager não está rodando".into(),
        ))
    }
}

/// Obtém estatísticas de conexão
#[tauri::command]
#[specta::specta]
pub async fn get_connection_stats(
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<ConnectionStats> {
    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        Ok(manager.get_stats().await)
    } else {
        Ok(ConnectionStats::default())
    }
}

/// Força re-discovery de peers
#[tauri::command]
#[specta::specta]
pub async fn refresh_peer_discovery(
    app_state: State<'_, AppState>,
    state: State<'_, RwLock<MultiPcNetworkState>>,
) -> AppResult<Vec<PeerInfo>> {
    app_state.session.require_authenticated()?;

    let network_state = state.read().await;

    if let Some(ref manager) = network_state.connection_manager {
        // O discovery é executado automaticamente pelo manager
        // Aqui apenas retornamos a lista atualizada
        Ok(manager.get_peers().await)
    } else {
        Err(AppError::Validation(
            "Connection Manager não está rodando".into(),
        ))
    }
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS - CONFIGURAÇÃO
// ════════════════════════════════════════════════════════════════════════════

/// Obtém configuração atual do modo de rede
#[tauri::command]
#[specta::specta]
pub async fn get_network_mode_config(
    app_state: State<'_, AppState>,
) -> AppResult<NetworkModeConfig> {
    app_state.session.require_authenticated()?;

    let settings_repo = crate::repositories::SettingsRepository::new(app_state.pool());

    let mode_str = settings_repo
        .get_value("network.mode")
        .await
        .ok()
        .flatten()
        .unwrap_or_else(|| "standalone".to_string());

    let mode = match mode_str.as_str() {
        "master" => OperationMode::Master,
        "satellite" => OperationMode::Satellite,
        "hybrid" => OperationMode::Hybrid,
        _ => OperationMode::Standalone,
    };

    let websocket_port = settings_repo
        .get_number("network.websocket_port")
        .await
        .ok()
        .flatten()
        .unwrap_or(3847.0) as u16;

    let master_ip = settings_repo
        .get_value("network.master_ip")
        .await
        .ok()
        .flatten();

    let master_port = settings_repo
        .get_number("network.master_port")
        .await
        .ok()
        .flatten()
        .map(|p| p as u16);

    let auto_discovery = settings_repo
        .get_bool("network.auto_discovery")
        .await
        .unwrap_or(true);

    Ok(NetworkModeConfig {
        mode,
        websocket_port,
        master_ip,
        master_port,
        auto_discovery,
    })
}

/// Salva configuração do modo de rede
#[tauri::command]
#[specta::specta]
pub async fn save_network_mode_config(
    config: NetworkModeConfig,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    let settings_repo = crate::repositories::SettingsRepository::new(app_state.pool());

    let mode_str = match config.mode {
        OperationMode::Standalone => "standalone",
        OperationMode::Master => "master",
        OperationMode::Satellite => "satellite",
        OperationMode::Hybrid => "hybrid",
    };

    // Salvar modo de rede
    settings_repo
        .set(SetSetting {
            key: "network.mode".to_string(),
            value: mode_str.to_string(),
            value_type: Some("STRING".to_string()),
            group_name: Some("network".to_string()),
            description: Some("Modo de operação de rede".to_string()),
        })
        .await?;

    // Salvar porta WebSocket
    settings_repo
        .set(SetSetting {
            key: "network.websocket_port".to_string(),
            value: config.websocket_port.to_string(),
            value_type: Some("NUMBER".to_string()),
            group_name: Some("network".to_string()),
            description: Some("Porta WebSocket para conexões".to_string()),
        })
        .await?;

    // Salvar IP do Master (se houver)
    if let Some(ip) = config.master_ip {
        settings_repo
            .set(SetSetting {
                key: "network.master_ip".to_string(),
                value: ip,
                value_type: Some("STRING".to_string()),
                group_name: Some("network".to_string()),
                description: Some("IP do PC Master".to_string()),
            })
            .await?;
    }

    // Salvar porta do Master (se houver)
    if let Some(port) = config.master_port {
        settings_repo
            .set(SetSetting {
                key: "network.master_port".to_string(),
                value: port.to_string(),
                value_type: Some("NUMBER".to_string()),
                group_name: Some("network".to_string()),
                description: Some("Porta do PC Master".to_string()),
            })
            .await?;
    }

    // Salvar auto-discovery
    settings_repo
        .set(SetSetting {
            key: "network.auto_discovery".to_string(),
            value: config.auto_discovery.to_string(),
            value_type: Some("BOOLEAN".to_string()),
            group_name: Some("network".to_string()),
            description: Some("Habilitar descoberta automática de peers".to_string()),
        })
        .await?;

    tracing::info!("Configuração de rede salva: {:?}", mode_str);
    Ok(())
}

// ════════════════════════════════════════════════════════════════════════════
// LISTA DE COMANDOS PARA REGISTRO
// ════════════════════════════════════════════════════════════════════════════

/// Macro para gerar lista de handlers
#[macro_export]
macro_rules! network_diagnostics_handlers {
    () => {
        [
            // Diagnóstico
            run_network_diagnostics,
            get_last_diagnostics,
            test_network_connection,
            scan_network_subnet,
            get_system_network_info,
            // Connection Manager
            get_multi_pc_status,
            start_connection_manager,
            stop_connection_manager,
            list_network_peers,
            add_network_peer,
            remove_network_peer,
            connect_to_master,
            disconnect_from_master,
            get_connection_stats,
            refresh_peer_discovery,
            // Configuração
            get_network_mode_config,
            save_network_mode_config,
        ]
    };
}
