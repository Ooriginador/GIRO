//! Connection Manager
//!
//! Gerenciador centralizado de conexões para ambientes multi-PC.
//! Mantém estado de todos os peers, gerencia reconexões e health checks.

use crate::services::mdns_service::{get_local_ip, MdnsConfig, MdnsService};
use crate::services::network_diagnostics::NetworkDiagnosticsService;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio::time::interval;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS E ESTRUTURAS
// ════════════════════════════════════════════════════════════════════════════

/// Modo de operação do PC
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "snake_case")]
pub enum OperationMode {
    /// PC independente (não sincroniza com outros PCs locais)
    #[default]
    Standalone,
    /// PC Master (aceita conexões de satélites e mobiles)
    Master,
    /// PC Satélite (conecta ao Master para sincronização)
    Satellite,
    /// Modo híbrido (Master + conecta a outros masters para backup)
    Hybrid,
}

/// Status de um peer
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum PeerStatus {
    /// Desconhecido
    Unknown,
    /// Descoberto mas não testado
    Discovered,
    /// Testando conectividade
    Testing,
    /// Online e acessível
    Online,
    /// Offline ou inacessível
    Offline,
    /// Conectado (para satélites)
    Connected,
    /// Erro de conexão
    Error,
}

/// Informações de um peer
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PeerInfo {
    /// ID único do peer
    pub id: String,
    /// Nome do terminal
    pub name: String,
    /// Endereço IP
    pub ip: String,
    /// Porta WebSocket
    pub port: u16,
    /// Versão do GIRO
    pub version: Option<String>,
    /// Nome da loja
    pub store_name: Option<String>,
    /// Status atual
    pub status: PeerStatus,
    /// Latência em ms
    pub latency_ms: Option<u64>,
    /// Último contato
    pub last_seen: Option<String>,
    /// É o Master atual
    pub is_master: bool,
    /// Número de conexões mobile ativas
    pub mobile_connections: u32,
    /// Hardware ID (mascarado)
    pub hardware_id_masked: Option<String>,
}

/// Estatísticas de conexão
#[derive(Debug, Clone, Default, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStats {
    /// Total de peers descobertos
    pub total_peers: u32,
    /// Peers online
    pub online_peers: u32,
    /// Peers offline
    pub offline_peers: u32,
    /// Conexões mobile ativas (se Master)
    pub mobile_connections: u32,
    /// Bytes enviados (sessão atual)
    pub bytes_sent: u64,
    /// Bytes recebidos (sessão atual)
    pub bytes_received: u64,
    /// Uptime do servidor (segundos)
    pub uptime_secs: u64,
    /// Última sincronização
    pub last_sync: Option<String>,
    /// Erros recentes
    pub recent_errors: Vec<String>,
}

/// Evento do gerenciador de conexões
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "payload")]
pub enum ConnectionEvent {
    /// Peer descoberto
    PeerDiscovered(PeerInfo),
    /// Peer ficou online
    PeerOnline(String),
    /// Peer ficou offline
    PeerOffline(String),
    /// Conectado ao Master (modo Satellite)
    ConnectedToMaster(String),
    /// Desconectado do Master
    DisconnectedFromMaster,
    /// Mobile conectou (modo Master)
    MobileConnected { device_id: String, ip: String },
    /// Mobile desconectou
    MobileDisconnected { device_id: String },
    /// Sincronização concluída
    SyncCompleted { items: u32 },
    /// Erro de rede
    NetworkError { message: String, code: String },
    /// Health check falhou para um peer
    HealthCheckFailed { peer_id: String },
}

/// Configuração do Connection Manager
#[derive(Debug, Clone)]
pub struct ConnectionManagerConfig {
    /// Modo de operação
    pub mode: OperationMode,
    /// Porta WebSocket
    pub websocket_port: u16,
    /// Intervalo de health check (segundos)
    pub health_check_interval_secs: u64,
    /// Intervalo de discovery (segundos)
    pub discovery_interval_secs: u64,
    /// Timeout de conexão (segundos)
    pub connection_timeout_secs: u64,
    /// Máximo de tentativas de reconexão
    pub max_reconnect_attempts: u32,
    /// Intervalo base de backoff (segundos)
    pub backoff_base_secs: u64,
    /// IP estático do Master (para redes sem mDNS)
    pub static_master_ip: Option<String>,
    /// Habilitar auto-discovery
    pub auto_discovery: bool,
}

impl Default for ConnectionManagerConfig {
    fn default() -> Self {
        Self {
            mode: OperationMode::Standalone,
            websocket_port: 3847,
            health_check_interval_secs: 30,
            discovery_interval_secs: 60,
            connection_timeout_secs: 10,
            max_reconnect_attempts: 5,
            backoff_base_secs: 5,
            static_master_ip: None,
            auto_discovery: true,
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// GERENCIADOR DE CONEXÕES
// ════════════════════════════════════════════════════════════════════════════

/// Estado interno do gerenciador
struct ManagerState {
    /// Modo de operação atual
    mode: OperationMode,
    /// Peers conhecidos
    peers: HashMap<String, PeerInfo>,
    /// ID do Master atual (se satélite)
    current_master_id: Option<String>,
    /// Estatísticas
    stats: ConnectionStats,
    /// Timestamp de início
    started_at: Option<Instant>,
    /// Erros recentes
    recent_errors: Vec<(Instant, String)>,
}

impl Default for ManagerState {
    fn default() -> Self {
        Self {
            mode: OperationMode::Standalone,
            peers: HashMap::new(),
            current_master_id: None,
            stats: ConnectionStats::default(),
            started_at: None,
            recent_errors: Vec::new(),
        }
    }
}

/// Gerenciador de Conexões
pub struct ConnectionManager {
    config: RwLock<ConnectionManagerConfig>,
    state: RwLock<ManagerState>,
    #[allow(dead_code)]
    pool: SqlitePool,
    diagnostics: Arc<NetworkDiagnosticsService>,
    mdns_service: RwLock<Option<Arc<MdnsService>>>,
    event_tx: broadcast::Sender<ConnectionEvent>,
    shutdown_tx: RwLock<Option<mpsc::Sender<()>>>,
}

impl ConnectionManager {
    /// Cria novo gerenciador
    pub fn new(pool: SqlitePool, config: ConnectionManagerConfig) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(100);
        let diagnostics = NetworkDiagnosticsService::with_defaults();

        Arc::new(Self {
            config: RwLock::new(config),
            state: RwLock::new(ManagerState::default()),
            pool,
            diagnostics,
            mdns_service: RwLock::new(None),
            event_tx,
            shutdown_tx: RwLock::new(None),
        })
    }

    /// Inicia o gerenciador
    pub async fn start(self: &Arc<Self>) -> Result<(), String> {
        tracing::info!("🔌 Iniciando Connection Manager...");

        let config = self.config.read().await.clone();

        // Atualizar estado
        {
            let mut state = self.state.write().await;
            state.mode = config.mode;
            state.started_at = Some(Instant::now());
        }

        // Configurar canal de shutdown
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        *self.shutdown_tx.write().await = Some(shutdown_tx);

        // Iniciar com base no modo
        match config.mode {
            OperationMode::Master | OperationMode::Hybrid => {
                self.start_master_mode(&config).await?;
            }
            OperationMode::Satellite => {
                self.start_satellite_mode(&config).await?;
            }
            OperationMode::Standalone => {
                // Standalone: apenas servidor mobile para scanner
                self.start_mdns(&config).await?;
                tracing::info!("📡 Modo Standalone: mDNS ativo para scanner mobile");
            }
        }

        // Iniciar health check em background
        let me = self.clone();
        let health_interval = config.health_check_interval_secs;
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(health_interval));
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        me.run_health_check().await;
                    }
                    _ = shutdown_rx.recv() => {
                        tracing::info!("Health check encerrado");
                        break;
                    }
                }
            }
        });

        // Iniciar discovery em background (se habilitado)
        if config.auto_discovery {
            let me = self.clone();
            let discovery_interval = config.discovery_interval_secs;
            tokio::spawn(async move {
                let mut interval = interval(Duration::from_secs(discovery_interval));
                loop {
                    interval.tick().await;
                    me.run_discovery().await;
                }
            });
        }

        tracing::info!("✅ Connection Manager iniciado no modo {:?}", config.mode);
        Ok(())
    }

    /// Para o gerenciador
    pub async fn stop(&self) {
        tracing::info!("🛑 Parando Connection Manager...");

        // Enviar sinal de shutdown
        if let Some(tx) = self.shutdown_tx.read().await.as_ref() {
            let _ = tx.send(()).await;
        }

        // Parar mDNS
        if let Some(mdns) = self.mdns_service.read().await.as_ref() {
            let _ = mdns.stop().await;
        }

        // Limpar estado
        {
            let mut state = self.state.write().await;
            state.peers.clear();
            state.current_master_id = None;
            state.started_at = None;
        }

        tracing::info!("✅ Connection Manager parado");
    }

    /// Obtém modo de operação atual
    pub async fn get_mode(&self) -> OperationMode {
        self.state.read().await.mode
    }

    /// Altera modo de operação (requer restart)
    pub async fn set_mode(&self, mode: OperationMode) {
        let mut config = self.config.write().await;
        config.mode = mode;
    }

    /// Lista peers conhecidos
    pub async fn get_peers(&self) -> Vec<PeerInfo> {
        self.state.read().await.peers.values().cloned().collect()
    }

    /// Obtém peer por ID
    pub async fn get_peer(&self, id: &str) -> Option<PeerInfo> {
        self.state.read().await.peers.get(id).cloned()
    }

    /// Obtém estatísticas
    pub async fn get_stats(&self) -> ConnectionStats {
        let state = self.state.read().await;
        let mut stats = state.stats.clone();

        // Calcular uptime
        if let Some(started_at) = state.started_at {
            stats.uptime_secs = started_at.elapsed().as_secs();
        }

        // Contar peers
        stats.total_peers = state.peers.len() as u32;
        stats.online_peers = state
            .peers
            .values()
            .filter(|p| p.status == PeerStatus::Online || p.status == PeerStatus::Connected)
            .count() as u32;
        stats.offline_peers = state
            .peers
            .values()
            .filter(|p| p.status == PeerStatus::Offline)
            .count() as u32;

        // Erros recentes (últimos 5 minutos)
        let cutoff = Instant::now() - Duration::from_secs(300);
        stats.recent_errors = state
            .recent_errors
            .iter()
            .filter(|(t, _)| *t > cutoff)
            .map(|(_, e)| e.clone())
            .collect();

        stats
    }

    /// Obtém IP local
    pub fn get_local_ip(&self) -> Option<String> {
        get_local_ip()
    }

    /// Subscreve a eventos
    pub fn subscribe(&self) -> broadcast::Receiver<ConnectionEvent> {
        self.event_tx.subscribe()
    }

    /// Adiciona peer manualmente
    pub async fn add_peer(&self, ip: &str, port: u16, name: Option<&str>) {
        let peer_id = format!("{}:{}", ip, port);
        let peer = PeerInfo {
            id: peer_id.clone(),
            name: name.unwrap_or(&peer_id).to_string(),
            ip: ip.to_string(),
            port,
            version: None,
            store_name: None,
            status: PeerStatus::Discovered,
            latency_ms: None,
            last_seen: None,
            is_master: false,
            mobile_connections: 0,
            hardware_id_masked: None,
        };

        {
            let mut state = self.state.write().await;
            state.peers.insert(peer_id.clone(), peer.clone());
        }

        self.broadcast_event(ConnectionEvent::PeerDiscovered(peer));
    }

    /// Remove peer
    pub async fn remove_peer(&self, peer_id: &str) {
        let mut state = self.state.write().await;
        state.peers.remove(peer_id);
    }

    /// Conecta ao Master (modo Satellite)
    pub async fn connect_to_master(&self, master_ip: &str, port: u16) -> Result<(), String> {
        let mode = self.get_mode().await;
        if mode != OperationMode::Satellite {
            return Err("Operação só permitida no modo Satellite".into());
        }

        tracing::info!("🔌 Conectando ao Master {}:{}...", master_ip, port);

        // Testar conectividade
        let test_result = self.diagnostics.test_peer(master_ip, port).await;
        if !test_result.is_open {
            return Err(format!(
                "Não foi possível conectar ao Master: {}",
                test_result.error.unwrap_or_default()
            ));
        }

        // Registrar como Master atual
        let master_id = format!("{}:{}", master_ip, port);
        {
            let mut state = self.state.write().await;
            state.current_master_id = Some(master_id.clone());

            // Atualizar status do peer
            if let Some(peer) = state.peers.get_mut(&master_id) {
                peer.status = PeerStatus::Connected;
                peer.is_master = true;
                peer.latency_ms = test_result.latency_ms;
            }
        }

        self.broadcast_event(ConnectionEvent::ConnectedToMaster(master_id));
        tracing::info!("✅ Conectado ao Master");

        Ok(())
    }

    /// Desconecta do Master
    pub async fn disconnect_from_master(&self) {
        let mut state = self.state.write().await;

        if let Some(master_id) = state.current_master_id.take() {
            if let Some(peer) = state.peers.get_mut(&master_id) {
                peer.status = PeerStatus::Discovered;
                peer.is_master = false;
            }
        }

        drop(state);
        self.broadcast_event(ConnectionEvent::DisconnectedFromMaster);
    }

    /// Executa diagnóstico completo
    pub async fn run_diagnostics(
        &self,
    ) -> crate::services::network_diagnostics::NetworkDiagnosticsResult {
        self.diagnostics.run_full_diagnostics().await
    }

    // ════════════════════════════════════════════════════════════════════════
    // MÉTODOS PRIVADOS
    // ════════════════════════════════════════════════════════════════════════

    /// Inicia modo Master
    async fn start_master_mode(&self, config: &ConnectionManagerConfig) -> Result<(), String> {
        tracing::info!("🏠 Iniciando modo Master...");

        // Iniciar mDNS
        self.start_mdns(config).await?;

        tracing::info!("✅ Modo Master ativo na porta {}", config.websocket_port);
        Ok(())
    }

    /// Inicia modo Satellite
    async fn start_satellite_mode(&self, config: &ConnectionManagerConfig) -> Result<(), String> {
        tracing::info!("🛰️ Iniciando modo Satellite...");

        // Se tem IP estático, usar diretamente
        if let Some(ref master_ip) = config.static_master_ip {
            self.add_peer(master_ip, config.websocket_port, Some("Master (Estático)"))
                .await;
            tracing::info!("📍 Master estático configurado: {}", master_ip);
        }

        // Discovery inicial
        if config.auto_discovery {
            self.run_discovery().await;
        }

        tracing::info!("✅ Modo Satellite ativo");
        Ok(())
    }

    /// Inicia serviço mDNS
    async fn start_mdns(&self, config: &ConnectionManagerConfig) -> Result<(), String> {
        let mdns_config = MdnsConfig {
            instance_name: format!(
                "GIRO-{}",
                hostname::get().unwrap_or_default().to_string_lossy()
            ),
            port: config.websocket_port,
            version: env!("CARGO_PKG_VERSION").to_string(),
            store_name: None, // TODO: Carregar do banco
            auto_restart: true,
            health_check_interval_secs: 30,
        };

        let mdns = MdnsService::new(mdns_config);

        if let Err(e) = mdns.start().await {
            tracing::warn!("⚠️ mDNS falhou (rede sem suporte): {}", e);
            // Não é erro fatal - pode usar IP estático
        } else {
            tracing::info!("📡 mDNS broadcasting ativo");
        }

        *self.mdns_service.write().await = Some(mdns);
        Ok(())
    }

    /// Executa descoberta de peers
    async fn run_discovery(&self) {
        tracing::debug!("🔍 Executando discovery...");

        // Descobrir via mDNS
        if let Ok(mdns) = mdns_sd::ServiceDaemon::new() {
            if let Ok(receiver) = mdns.browse("_giro._tcp.local.") {
                let timeout = tokio::time::sleep(Duration::from_secs(5));
                tokio::pin!(timeout);

                loop {
                    tokio::select! {
                        event = receiver.recv_async() => {
                            if let Ok(mdns_sd::ServiceEvent::ServiceResolved(info)) = event {
                                if let Some(ip) = info.get_addresses().iter().next() {
                                    let ip_str = ip.to_string();
                                    let port = info.get_port();

                                    // Não adicionar a si mesmo
                                    if let Some(local_ip) = get_local_ip() {
                                        if ip_str == local_ip {
                                            continue;
                                        }
                                    }

                                    let name = info.get_fullname().to_string();
                                    self.add_peer(&ip_str, port, Some(&name)).await;
                                }
                            }
                        }
                        _ = &mut timeout => {
                            break;
                        }
                    }
                }
            }
        }
    }

    /// Executa health check em todos os peers
    async fn run_health_check(&self) {
        let peers: Vec<_> = { self.state.read().await.peers.values().cloned().collect() };

        for peer in peers {
            let test = self.diagnostics.test_peer(&peer.ip, peer.port).await;

            let new_status = if test.is_open {
                PeerStatus::Online
            } else {
                PeerStatus::Offline
            };

            let status_changed = {
                let mut state = self.state.write().await;
                if let Some(p) = state.peers.get_mut(&peer.id) {
                    let changed = p.status != new_status;
                    p.status = new_status;
                    p.latency_ms = test.latency_ms;
                    p.last_seen = Some(chrono::Utc::now().to_rfc3339());
                    changed
                } else {
                    false
                }
            };

            if status_changed {
                match new_status {
                    PeerStatus::Online => {
                        self.broadcast_event(ConnectionEvent::PeerOnline(peer.id.clone()));
                    }
                    PeerStatus::Offline => {
                        self.broadcast_event(ConnectionEvent::PeerOffline(peer.id.clone()));
                    }
                    _ => {}
                }
            }
        }
    }

    /// Registra erro
    #[allow(dead_code)]
    async fn log_error(&self, message: &str) {
        let mut state = self.state.write().await;
        state
            .recent_errors
            .push((Instant::now(), message.to_string()));

        // Manter apenas últimos 100 erros
        if state.recent_errors.len() > 100 {
            state.recent_errors.remove(0);
        }
    }

    /// Broadcast de evento
    fn broadcast_event(&self, event: ConnectionEvent) {
        let _ = self.event_tx.send(event);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ConnectionManagerConfig::default();
        assert_eq!(config.mode, OperationMode::Standalone);
        assert_eq!(config.websocket_port, 3847);
        assert!(config.auto_discovery);
    }

    #[test]
    fn test_peer_info() {
        let peer = PeerInfo {
            id: "192.168.1.10:3847".into(),
            name: "PC-PDV-01".into(),
            ip: "192.168.1.10".into(),
            port: 3847,
            version: Some("2.1.0".into()),
            store_name: None,
            status: PeerStatus::Online,
            latency_ms: Some(5),
            last_seen: Some(chrono::Utc::now().to_rfc3339()),
            is_master: false,
            mobile_connections: 0,
            hardware_id_masked: None,
        };

        assert_eq!(peer.status, PeerStatus::Online);
    }
}
