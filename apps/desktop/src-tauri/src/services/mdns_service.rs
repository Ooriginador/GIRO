//! Serviço mDNS para descoberta do Desktop
//!
//! Anuncia o GIRO Desktop na rede local para que o Mobile possa encontrá-lo.

use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Tipo de serviço mDNS
const SERVICE_TYPE: &str = "_giro._tcp.local.";

/// Porta padrão do WebSocket
const DEFAULT_PORT: u16 = 3847;

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
}

impl Default for MdnsConfig {
    fn default() -> Self {
        Self {
            instance_name: "GIRO Desktop".into(),
            port: DEFAULT_PORT,
            version: env!("CARGO_PKG_VERSION").into(),
            store_name: None,
        }
    }
}

/// Estado do serviço mDNS
pub struct MdnsService {
    config: RwLock<MdnsConfig>,
    daemon: RwLock<Option<ServiceDaemon>>,
    is_running: RwLock<bool>,
}

impl MdnsService {
    /// Cria novo serviço mDNS
    pub fn new(config: MdnsConfig) -> Arc<Self> {
        Arc::new(Self {
            config: RwLock::new(config),
            daemon: RwLock::new(None),
            is_running: RwLock::new(false),
        })
    }

    /// Cria com configuração padrão
    pub fn with_defaults() -> Arc<Self> {
        Self::new(MdnsConfig::default())
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

        Ok(())
    }

    /// Para o broadcasting mDNS
    pub async fn stop(&self) -> Result<(), MdnsError> {
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
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        self.start().await
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
