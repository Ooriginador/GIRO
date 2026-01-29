//! Serviço mDNS para descoberta do Desktop
//!
//! Anuncia o GIRO Desktop na rede local para que o Mobile e outros PCs possam encontrá-lo.
//! Inclui resiliência, health checks e auto-restart em caso de falha.

use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, RwLock};
use tokio::time::interval;

/// Tipo de serviço mDNS
const SERVICE_TYPE: &str = "_giro._tcp.local.";

/// Porta padrão do WebSocket
const DEFAULT_PORT: u16 = 3847;

/// Intervalo de health check (segundos)
const HEALTH_CHECK_INTERVAL_SECS: u64 = 30;

/// Máximo de falhas antes de desistir
const MAX_CONSECUTIVE_FAILURES: u32 = 5;

/// Delay inicial de retry (ms)
const INITIAL_RETRY_DELAY_MS: u64 = 1000;

/// Delay máximo de retry (ms)
const MAX_RETRY_DELAY_MS: u64 = 60000;

/// Obtém o hostname da máquina de forma cross-platform
fn get_hostname() -> String {
    // Tentar COMPUTERNAME primeiro (Windows)
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        if !name.is_empty() {
            return name;
        }
    }

    // Tentar HOSTNAME (Linux/Mac)
    if let Ok(name) = std::env::var("HOSTNAME") {
        if !name.is_empty() {
            return name;
        }
    }

    // Fallback usando gethostname do sistema
    #[cfg(unix)]
    {
        if let Ok(hostname) = hostname::get() {
            if let Some(name) = hostname.to_str() {
                return name.to_string();
            }
        }
    }

    #[cfg(windows)]
    {
        // No Windows, tentar via winapi se env var falhar
        if let Ok(hostname) = hostname::get() {
            if let Some(name) = hostname.to_str() {
                return name.to_string();
            }
        }
    }

    "giro-desktop".to_string()
}

/// Configuração do mDNS
#[derive(Debug, Clone)]
pub struct MdnsConfig {
    /// Nome da instância (ex: "GIRO PDV - Caixa 01")
    pub instance_name: String,
    /// Porta do WebSocket
    pub port: u16,
    /// Versão do software
    pub version: String,
    /// Nome da loja (opcional)
    pub store_name: Option<String>,
    /// Habilitar auto-restart em caso de falha
    pub auto_restart: bool,
    /// Intervalo de health check (segundos)
    pub health_check_interval_secs: u64,
}

impl Default for MdnsConfig {
    fn default() -> Self {
        Self {
            instance_name: "GIRO Desktop".into(),
            port: DEFAULT_PORT,
            version: env!("CARGO_PKG_VERSION").into(),
            store_name: None,
            auto_restart: true,
            health_check_interval_secs: HEALTH_CHECK_INTERVAL_SECS,
        }
    }
}

/// Evento do serviço mDNS
#[derive(Debug, Clone)]
pub enum MdnsEvent {
    /// Serviço iniciado
    Started,
    /// Serviço parado
    Stopped,
    /// Falha detectada
    Failed(String),
    /// Tentando reconectar
    Reconnecting { attempt: u32, delay_ms: u64 },
    /// Reconectado com sucesso
    Reconnected,
    /// Health check OK
    HealthCheckOk,
    /// Health check falhou
    HealthCheckFailed(String),
}

/// Estatísticas do serviço mDNS
#[derive(Debug, Clone, Default)]
pub struct MdnsStats {
    /// Total de starts
    pub total_starts: u64,
    /// Total de restarts automáticos
    pub auto_restarts: u64,
    /// Total de falhas
    pub total_failures: u64,
    /// Falhas consecutivas atuais
    pub consecutive_failures: u32,
    /// Último erro
    pub last_error: Option<String>,
    /// Tempo rodando (segundos)
    pub uptime_secs: u64,
    /// Último health check bem sucedido
    pub last_health_check: Option<String>,
}

/// Estado do serviço mDNS
pub struct MdnsService {
    config: RwLock<MdnsConfig>,
    daemon: RwLock<Option<ServiceDaemon>>,
    is_running: RwLock<bool>,
    /// Estatísticas
    stats: RwLock<MdnsStats>,
    /// Contador de starts
    start_count: AtomicU64,
    /// Contador de restarts automáticos
    restart_count: AtomicU64,
    /// Falhas consecutivas
    consecutive_failures: AtomicU32,
    /// Timestamp de início
    started_at: RwLock<Option<Instant>>,
    /// Canal de eventos
    event_tx: broadcast::Sender<MdnsEvent>,
    /// Flag para parar health check
    shutdown_flag: RwLock<bool>,
}

impl MdnsService {
    /// Cria novo serviço mDNS
    pub fn new(config: MdnsConfig) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(64);
        Arc::new(Self {
            config: RwLock::new(config),
            daemon: RwLock::new(None),
            is_running: RwLock::new(false),
            stats: RwLock::new(MdnsStats::default()),
            start_count: AtomicU64::new(0),
            restart_count: AtomicU64::new(0),
            consecutive_failures: AtomicU32::new(0),
            started_at: RwLock::new(None),
            event_tx,
            shutdown_flag: RwLock::new(false),
        })
    }

    /// Cria com configuração padrão
    pub fn with_defaults() -> Arc<Self> {
        Self::new(MdnsConfig::default())
    }

    /// Subscreve para eventos do mDNS
    pub fn subscribe(&self) -> broadcast::Receiver<MdnsEvent> {
        self.event_tx.subscribe()
    }

    /// Emite evento
    fn emit_event(&self, event: MdnsEvent) {
        let _ = self.event_tx.send(event);
    }

    /// Inicia o broadcasting mDNS
    pub async fn start(&self) -> Result<(), MdnsError> {
        // Verificar se já está rodando
        {
            let is_running = self.is_running.read().await;
            if *is_running {
                return Ok(());
            }
        }

        let config = self.config.read().await.clone();

        // Obter hostname - Windows usa COMPUTERNAME, Linux/Mac usam HOSTNAME
        let hostname = get_hostname();
        tracing::info!("📡 Iniciando mDNS com hostname: {}", hostname);

        // Criar daemon
        let daemon = match ServiceDaemon::new() {
            Ok(d) => d,
            Err(e) => {
                // No Windows, mDNS pode falhar por firewall ou permissões
                let error_msg = e.to_string();
                tracing::warn!("⚠️ Falha ao criar daemon mDNS: {}. Em Windows, verifique se o Firewall permite multicast.", error_msg);
                return Err(MdnsError::DaemonCreation(format!(
                    "{} (Windows: verifique Firewall e permissões de rede)",
                    error_msg
                )));
            }
        };

        // Preparar propriedades TXT
        let mut properties: HashMap<String, String> = HashMap::new();
        properties.insert("version".to_string(), config.version.clone());

        if let Some(ref store) = config.store_name {
            properties.insert("store".to_string(), store.clone());
        }

        // Criar informações do serviço
        let service_info = ServiceInfo::new(
            SERVICE_TYPE,
            &config.instance_name,
            &format!("{}.local.", hostname),
            (),
            config.port,
            Some(properties),
        )
        .map_err(|e| MdnsError::ServiceCreation(e.to_string()))?;

        // Registrar serviço
        daemon
            .register(service_info)
            .map_err(|e| MdnsError::Registration(e.to_string()))?;

        tracing::info!(
            "mDNS broadcasting started: {} on port {}",
            config.instance_name,
            config.port
        );

        // Salvar daemon
        {
            let mut daemon_lock = self.daemon.write().await;
            *daemon_lock = Some(daemon);
        }

        {
            let mut is_running = self.is_running.write().await;
            *is_running = true;
        }

        // Atualizar estatísticas
        self.start_count.fetch_add(1, Ordering::SeqCst);
        self.consecutive_failures.store(0, Ordering::SeqCst);
        {
            let mut started_at = self.started_at.write().await;
            *started_at = Some(Instant::now());
        }

        self.emit_event(MdnsEvent::Started);
        Ok(())
    }

    /// Para o broadcasting mDNS
    pub async fn stop(&self) -> Result<(), MdnsError> {
        // Sinalizar shutdown para health check
        {
            let mut shutdown = self.shutdown_flag.write().await;
            *shutdown = true;
        }

        let mut daemon_lock = self.daemon.write().await;

        if let Some(daemon) = daemon_lock.take() {
            daemon
                .shutdown()
                .map_err(|e| MdnsError::Shutdown(e.to_string()))?;

            tracing::info!("mDNS broadcasting stopped");
        }

        {
            let mut is_running = self.is_running.write().await;
            *is_running = false;
        }

        {
            let mut started_at = self.started_at.write().await;
            *started_at = None;
        }

        self.emit_event(MdnsEvent::Stopped);
        Ok(())
    }

    /// Verifica se está rodando
    pub async fn is_running(&self) -> bool {
        *self.is_running.read().await
    }

    /// Atualiza configuração (requer restart)
    pub async fn update_config(&self, config: MdnsConfig) {
        let mut config_lock = self.config.write().await;
        *config_lock = config;
    }

    /// Obtém configuração atual
    pub async fn get_config(&self) -> MdnsConfig {
        self.config.read().await.clone()
    }

    /// Reinicia o serviço com nova configuração
    pub async fn restart(&self) -> Result<(), MdnsError> {
        self.stop().await?;
        tokio::time::sleep(Duration::from_millis(100)).await;
        self.start().await
    }

    /// Obtém estatísticas do serviço
    pub async fn get_stats(&self) -> MdnsStats {
        let mut stats = self.stats.read().await.clone();
        stats.total_starts = self.start_count.load(Ordering::SeqCst);
        stats.auto_restarts = self.restart_count.load(Ordering::SeqCst);
        stats.consecutive_failures = self.consecutive_failures.load(Ordering::SeqCst);

        // Calcular uptime
        if let Some(started_at) = *self.started_at.read().await {
            stats.uptime_secs = started_at.elapsed().as_secs();
        }

        stats
    }

    /// Inicia com auto-recovery (recomendado para produção)
    pub async fn start_with_recovery(self: &Arc<Self>) -> Result<(), MdnsError> {
        // Resetar shutdown flag
        {
            let mut shutdown = self.shutdown_flag.write().await;
            *shutdown = false;
        }

        // Tentar iniciar
        self.start().await?;

        // Iniciar health check em background
        let service = Arc::clone(self);
        tokio::spawn(async move {
            service.health_check_loop().await;
        });

        Ok(())
    }

    /// Loop de health check e auto-recovery
    async fn health_check_loop(self: &Arc<Self>) {
        let config = self.config.read().await.clone();
        let interval_secs = config.health_check_interval_secs;

        let mut check_interval = interval(Duration::from_secs(interval_secs));

        loop {
            check_interval.tick().await;

            // Verificar se deve parar
            {
                let shutdown = self.shutdown_flag.read().await;
                if *shutdown {
                    tracing::debug!("mDNS health check loop encerrado");
                    break;
                }
            }

            // Executar health check
            if let Err(e) = self.perform_health_check().await {
                tracing::warn!("⚠️ mDNS health check falhou: {}", e);
                self.emit_event(MdnsEvent::HealthCheckFailed(e.to_string()));

                // Tentar auto-recovery se configurado
                let config = self.config.read().await.clone();
                if config.auto_restart {
                    self.attempt_recovery().await;
                }
            } else {
                self.emit_event(MdnsEvent::HealthCheckOk);
            }
        }
    }

    /// Executa health check
    async fn perform_health_check(&self) -> Result<(), MdnsError> {
        // Verificar se o daemon ainda existe
        let daemon = self.daemon.read().await;
        if daemon.is_none() {
            return Err(MdnsError::HealthCheck("Daemon não está rodando".into()));
        }

        // Verificar se conseguimos obter o IP local
        if get_local_ip().is_none() {
            return Err(MdnsError::HealthCheck(
                "Não foi possível detectar IP local".into(),
            ));
        }

        // Atualizar timestamp do último health check
        {
            let mut stats = self.stats.write().await;
            stats.last_health_check = Some(chrono::Utc::now().to_rfc3339());
        }

        Ok(())
    }

    /// Tenta recuperar o serviço após falha
    async fn attempt_recovery(&self) {
        let failures = self.consecutive_failures.fetch_add(1, Ordering::SeqCst) + 1;

        if failures > MAX_CONSECUTIVE_FAILURES {
            tracing::error!(
                "❌ mDNS atingiu máximo de falhas consecutivas ({}). Desistindo.",
                MAX_CONSECUTIVE_FAILURES
            );
            self.emit_event(MdnsEvent::Failed(format!(
                "Máximo de {} tentativas atingido",
                MAX_CONSECUTIVE_FAILURES
            )));
            return;
        }

        // Calcular delay exponencial
        let delay_ms = std::cmp::min(
            INITIAL_RETRY_DELAY_MS * 2u64.pow(failures - 1),
            MAX_RETRY_DELAY_MS,
        );

        tracing::info!(
            "🔄 Tentando recuperar mDNS (tentativa {}/{}, delay {}ms)",
            failures,
            MAX_CONSECUTIVE_FAILURES,
            delay_ms
        );

        self.emit_event(MdnsEvent::Reconnecting {
            attempt: failures,
            delay_ms,
        });

        // Aguardar delay
        tokio::time::sleep(Duration::from_millis(delay_ms)).await;

        // Tentar restart
        match self.restart().await {
            Ok(()) => {
                tracing::info!("✅ mDNS recuperado com sucesso");
                self.consecutive_failures.store(0, Ordering::SeqCst);
                self.restart_count.fetch_add(1, Ordering::SeqCst);
                self.emit_event(MdnsEvent::Reconnected);
            }
            Err(e) => {
                tracing::warn!("⚠️ Falha ao recuperar mDNS: {}", e);
                // O próximo ciclo de health check tentará novamente
                let mut stats = self.stats.write().await;
                stats.last_error = Some(e.to_string());
                stats.total_failures += 1;
            }
        }
    }

    /// Força um health check manual
    pub async fn check_health(&self) -> Result<(), MdnsError> {
        self.perform_health_check().await
    }

    /// Reseta contadores de falha
    pub fn reset_failure_counters(&self) {
        self.consecutive_failures.store(0, Ordering::SeqCst);
    }
}

/// Erros do serviço mDNS
#[derive(Debug, thiserror::Error)]
pub enum MdnsError {
    #[error("Failed to create mDNS daemon: {0}")]
    DaemonCreation(String),

    #[error("Failed to create service info: {0}")]
    ServiceCreation(String),

    #[error("Failed to register service: {0}")]
    Registration(String),

    #[error("Failed to shutdown: {0}")]
    Shutdown(String),

    #[error("Health check failed: {0}")]
    HealthCheck(String),
}

/// Obtém o IP local da máquina
pub fn get_local_ip() -> Option<String> {
    use std::net::UdpSocket;

    // Conecta a um IP externo para descobrir o IP local
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;

    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}

/// Obtém todas as interfaces de rede locais
pub fn get_all_local_ips() -> Vec<String> {
    let mut ips = Vec::new();

    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (_, ip) in interfaces {
            if !ip.is_loopback() {
                ips.push(ip.to_string());
            }
        }
    }

    // Fallback se não conseguir
    if ips.is_empty() {
        if let Some(ip) = get_local_ip() {
            ips.push(ip);
        }
    }

    ips
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = MdnsConfig::default();
        assert_eq!(config.instance_name, "GIRO Desktop");
        assert_eq!(config.port, 3847);
    }

    #[test]
    fn test_get_local_ip() {
        let ip = get_local_ip();
        // Pode falhar em alguns ambientes de CI
        if let Some(ip) = ip {
            assert!(!ip.is_empty());
            // Deve ser um IP válido (não loopback em produção)
        }
    }

    #[tokio::test]
    async fn test_mdns_service_creation() {
        let config = MdnsConfig {
            instance_name: "Test PDV".into(),
            port: 3847,
            version: "1.0.0".into(),
            store_name: Some("Mercado Teste".into()),
        };

        let service = MdnsService::new(config);
        assert!(!service.is_running().await);
    }
}
