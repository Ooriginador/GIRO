//! Network Diagnostics Service
//!
//! Serviço completo de diagnóstico de rede para ambientes multi-PC.
//! Detecta problemas comuns e incomuns, sugere soluções.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS E ESTRUTURAS
// ════════════════════════════════════════════════════════════════════════════

/// Resultado do diagnóstico completo
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkDiagnosticsResult {
    /// Timestamp do diagnóstico
    pub timestamp: String,
    /// Status geral (ok, warning, error)
    pub overall_status: DiagnosticStatus,
    /// Resumo textual
    pub summary: String,
    /// Testes individuais
    pub tests: Vec<DiagnosticTest>,
    /// Problemas detectados
    pub problems: Vec<NetworkProblem>,
    /// Sugestões de correção
    pub suggestions: Vec<String>,
    /// Informações do sistema
    pub system_info: SystemNetworkInfo,
}

/// Status do diagnóstico
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosticStatus {
    Ok,
    Warning,
    Error,
    Unknown,
}

/// Teste individual
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticTest {
    /// Nome do teste
    pub name: String,
    /// Descrição
    pub description: String,
    /// Status
    pub status: DiagnosticStatus,
    /// Tempo de execução (ms)
    pub duration_ms: u64,
    /// Detalhes adicionais
    pub details: Option<String>,
    /// Código de erro (se falhou)
    pub error_code: Option<String>,
}

/// Problema de rede detectado
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkProblem {
    /// Código único do problema
    pub code: String,
    /// Título curto
    pub title: String,
    /// Descrição detalhada
    pub description: String,
    /// Severidade
    pub severity: ProblemSeverity,
    /// Categoria
    pub category: ProblemCategory,
    /// Solução sugerida
    pub solution: String,
    /// Link para documentação
    pub doc_link: Option<String>,
}

/// Severidade do problema
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ProblemSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Categoria do problema
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ProblemCategory {
    Firewall,
    Dns,
    Connectivity,
    Configuration,
    Hardware,
    Protocol,
    Permission,
    Performance,
}

/// Informações do sistema de rede
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SystemNetworkInfo {
    /// Hostname da máquina
    pub hostname: String,
    /// Interfaces de rede ativas
    pub interfaces: Vec<NetworkInterface>,
    /// Gateway padrão
    pub default_gateway: Option<String>,
    /// Servidores DNS
    pub dns_servers: Vec<String>,
    /// Perfil de rede Windows (Private/Public)
    pub network_profile: Option<String>,
    /// Porta WebSocket disponível
    pub websocket_port_available: bool,
    /// mDNS funcionando
    pub mdns_available: bool,
}

/// Interface de rede
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    /// Nome da interface
    pub name: String,
    /// Endereço IP
    pub ip_address: String,
    /// Máscara de sub-rede
    pub netmask: String,
    /// Endereço MAC
    pub mac_address: Option<String>,
    /// É a interface primária
    pub is_primary: bool,
    /// Tipo (ethernet, wifi, virtual)
    pub interface_type: InterfaceType,
    /// Status (up/down)
    pub is_up: bool,
}

/// Tipo de interface
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum InterfaceType {
    Ethernet,
    Wifi,
    Virtual,
    Loopback,
    Unknown,
}

/// Resultado de ping
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub target: String,
    pub success: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

/// Resultado de teste de porta
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PortTestResult {
    pub address: String,
    pub port: u16,
    pub is_open: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

/// Peer (outro PC na rede)
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkPeer {
    pub ip: String,
    pub port: u16,
    pub name: Option<String>,
    pub version: Option<String>,
    pub is_reachable: bool,
    pub latency_ms: Option<u64>,
    pub last_seen: String,
}

// ════════════════════════════════════════════════════════════════════════════
// SERVIÇO DE DIAGNÓSTICO
// ════════════════════════════════════════════════════════════════════════════

/// Configuração do serviço
#[derive(Debug, Clone)]
pub struct NetworkDiagnosticsConfig {
    /// Porta WebSocket para testar
    pub websocket_port: u16,
    /// Timeout para testes de conectividade
    pub connectivity_timeout: Duration,
    /// Hosts para testar internet
    pub internet_test_hosts: Vec<String>,
    /// Porta para teste de mDNS
    pub mdns_port: u16,
}

impl Default for NetworkDiagnosticsConfig {
    fn default() -> Self {
        Self {
            websocket_port: 3847,
            connectivity_timeout: Duration::from_secs(5),
            internet_test_hosts: vec![
                "api.giro.app".to_string(),
                "8.8.8.8".to_string(),
                "1.1.1.1".to_string(),
            ],
            mdns_port: 5353,
        }
    }
}

/// Serviço de Diagnóstico de Rede
pub struct NetworkDiagnosticsService {
    config: NetworkDiagnosticsConfig,
    last_result: RwLock<Option<NetworkDiagnosticsResult>>,
    known_peers: RwLock<HashMap<String, NetworkPeer>>,
}

impl NetworkDiagnosticsService {
    /// Cria novo serviço
    pub fn new(config: NetworkDiagnosticsConfig) -> Arc<Self> {
        Arc::new(Self {
            config,
            last_result: RwLock::new(None),
            known_peers: RwLock::new(HashMap::new()),
        })
    }

    /// Cria com configuração padrão
    pub fn with_defaults() -> Arc<Self> {
        Self::new(NetworkDiagnosticsConfig::default())
    }

    /// Executa diagnóstico completo
    pub async fn run_full_diagnostics(&self) -> NetworkDiagnosticsResult {
        let start = Instant::now();
        let mut tests = Vec::new();
        let mut problems = Vec::new();
        let mut suggestions = Vec::new();

        tracing::info!("🔍 Iniciando diagnóstico completo de rede...");

        // 1. Coletar informações do sistema
        let system_info = self.collect_system_info().await;

        // 2. Testar conectividade local
        tests.push(self.test_local_network().await);

        // 3. Testar porta WebSocket
        let ws_test = self.test_websocket_port().await;
        if ws_test.status != DiagnosticStatus::Ok {
            problems.push(NetworkProblem {
                code: "WS_PORT_BLOCKED".into(),
                title: "Porta WebSocket bloqueada".into(),
                description: format!(
                    "A porta {} não está disponível para conexões Mobile.",
                    self.config.websocket_port
                ),
                severity: ProblemSeverity::Error,
                category: ProblemCategory::Firewall,
                solution: "Libere a porta no Windows Firewall ou altere a porta nas configurações."
                    .into(),
                doc_link: Some(
                    "docs/NETWORK-TOPOLOGY-10PC.md#52-regras-de-firewall-windows".into(),
                ),
            });
            suggestions.push(format!(
                "Execute como Admin: netsh advfirewall firewall add rule name=\"GIRO WebSocket\" dir=in action=allow protocol=tcp localport={}",
                self.config.websocket_port
            ));
        }
        tests.push(ws_test);

        // 4. Testar mDNS
        let mdns_test = self.test_mdns().await;
        if mdns_test.status != DiagnosticStatus::Ok {
            problems.push(NetworkProblem {
                code: "MDNS_UNAVAILABLE".into(),
                title: "mDNS não disponível".into(),
                description: "A descoberta automática de dispositivos não funcionará.".into(),
                severity: ProblemSeverity::Warning,
                category: ProblemCategory::Protocol,
                solution: "Configure a rede como 'Private' no Windows ou use IP estático.".into(),
                doc_link: Some("docs/NETWORK-TOPOLOGY-10PC.md#62-mdns-não-funciona".into()),
            });
            suggestions.push("Configure o IP do Master manualmente em Configurações → Rede".into());
        }
        tests.push(mdns_test);

        // 5. Testar conectividade com internet (License Server)
        let internet_test = self.test_internet_connectivity().await;
        if internet_test.status != DiagnosticStatus::Ok {
            problems.push(NetworkProblem {
                code: "NO_INTERNET".into(),
                title: "Sem conexão com servidor de licenças".into(),
                description: "Não foi possível conectar ao api.giro.app.".into(),
                severity: ProblemSeverity::Critical,
                category: ProblemCategory::Connectivity,
                solution: "Verifique a conexão com a internet e as configurações de proxy.".into(),
                doc_link: None,
            });
        }
        tests.push(internet_test);

        // 6. Testar DNS
        let dns_test = self.test_dns_resolution().await;
        if dns_test.status != DiagnosticStatus::Ok {
            problems.push(NetworkProblem {
                code: "DNS_FAILURE".into(),
                title: "Falha na resolução DNS".into(),
                description: "O sistema não consegue resolver nomes de domínio.".into(),
                severity: ProblemSeverity::Error,
                category: ProblemCategory::Dns,
                solution: "Verifique as configurações de DNS ou use DNS público (8.8.8.8).".into(),
                doc_link: None,
            });
            suggestions.push("Execute: ipconfig /flushdns".into());
        }
        tests.push(dns_test);

        // 7. Verificar perfil de rede Windows
        if let Some(ref profile) = system_info.network_profile {
            if profile.to_lowercase().contains("public") {
                problems.push(NetworkProblem {
                    code: "PUBLIC_NETWORK".into(),
                    title: "Rede configurada como Pública".into(),
                    description:
                        "Redes públicas têm restrições de firewall que podem bloquear o mDNS."
                            .into(),
                    severity: ProblemSeverity::Warning,
                    category: ProblemCategory::Configuration,
                    solution:
                        "Altere o perfil de rede para 'Private' nas configurações do Windows."
                            .into(),
                    doc_link: Some("docs/connectivity_troubleshooting.md".into()),
                });
            }
        }

        // 8. Verificar interfaces virtuais
        let virtual_count = system_info
            .interfaces
            .iter()
            .filter(|i| i.interface_type == InterfaceType::Virtual)
            .count();
        if virtual_count > 0 {
            problems.push(NetworkProblem {
                code: "VIRTUAL_ADAPTERS".into(),
                title: format!("{} adaptador(es) virtual(is) detectado(s)", virtual_count),
                description: "Adaptadores virtuais (VPN, Docker, VirtualBox) podem interferir na descoberta de rede.".into(),
                severity: ProblemSeverity::Info,
                category: ProblemCategory::Configuration,
                solution: "Se houver problemas, desabilite adaptadores virtuais desnecessários.".into(),
                doc_link: Some("docs/NETWORK-TOPOLOGY-10PC.md#73-adaptador-de-rede-virtual".into()),
            });
        }

        // 9. Verificar múltiplas interfaces
        let active_interfaces: Vec<_> = system_info
            .interfaces
            .iter()
            .filter(|i| i.is_up && i.interface_type != InterfaceType::Loopback)
            .collect();
        if active_interfaces.len() > 1 {
            suggestions.push(format!(
                "Múltiplas interfaces ativas: {}. Certifique-se que a interface correta tem prioridade.",
                active_interfaces.iter().map(|i| i.name.as_str()).collect::<Vec<_>>().join(", ")
            ));
        }

        // Calcular status geral
        let overall_status = if problems
            .iter()
            .any(|p| p.severity == ProblemSeverity::Critical)
        {
            DiagnosticStatus::Error
        } else if problems
            .iter()
            .any(|p| p.severity == ProblemSeverity::Error)
        {
            DiagnosticStatus::Error
        } else if problems
            .iter()
            .any(|p| p.severity == ProblemSeverity::Warning)
        {
            DiagnosticStatus::Warning
        } else {
            DiagnosticStatus::Ok
        };

        let summary = match overall_status {
            DiagnosticStatus::Ok => "✅ Rede configurada corretamente".into(),
            DiagnosticStatus::Warning => format!("⚠️ {} problema(s) detectado(s)", problems.len()),
            DiagnosticStatus::Error => format!("❌ {} erro(s) crítico(s)", problems.len()),
            DiagnosticStatus::Unknown => "❓ Status desconhecido".into(),
        };

        let duration_total = start.elapsed();
        tracing::info!(
            "🔍 Diagnóstico concluído em {:?}: {}",
            duration_total,
            summary
        );

        let result = NetworkDiagnosticsResult {
            timestamp: chrono::Utc::now().to_rfc3339(),
            overall_status,
            summary,
            tests,
            problems,
            suggestions,
            system_info,
        };

        // Cache do resultado
        let mut cache = self.last_result.write().await;
        *cache = Some(result.clone());

        result
    }

    /// Obtém último resultado (se disponível)
    pub async fn get_last_result(&self) -> Option<NetworkDiagnosticsResult> {
        self.last_result.read().await.clone()
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTES INDIVIDUAIS
    // ════════════════════════════════════════════════════════════════════════

    /// Coleta informações do sistema de rede
    async fn collect_system_info(&self) -> SystemNetworkInfo {
        let hostname = get_hostname();
        let interfaces = self.get_network_interfaces();
        let default_gateway = self.get_default_gateway();
        let dns_servers = self.get_dns_servers();
        let network_profile = self.get_network_profile();
        let websocket_port_available = self.is_port_available(self.config.websocket_port);
        let mdns_available = self.check_mdns_available().await;

        SystemNetworkInfo {
            hostname,
            interfaces,
            default_gateway,
            dns_servers,
            network_profile,
            websocket_port_available,
            mdns_available,
        }
    }

    /// Testa rede local
    async fn test_local_network(&self) -> DiagnosticTest {
        let start = Instant::now();

        // Verificar se temos pelo menos uma interface com IP válido
        let interfaces = self.get_network_interfaces();
        let valid_interfaces: Vec<_> = interfaces
            .iter()
            .filter(|i| i.is_up && !i.ip_address.starts_with("127."))
            .collect();

        let (status, details) = if valid_interfaces.is_empty() {
            (
                DiagnosticStatus::Error,
                Some("Nenhuma interface de rede válida encontrada".into()),
            )
        } else if valid_interfaces.len() == 1 {
            (
                DiagnosticStatus::Ok,
                Some(format!(
                    "Interface ativa: {} ({})",
                    valid_interfaces[0].name, valid_interfaces[0].ip_address
                )),
            )
        } else {
            (
                DiagnosticStatus::Warning,
                Some(format!(
                    "Múltiplas interfaces: {}",
                    valid_interfaces
                        .iter()
                        .map(|i| format!("{} ({})", i.name, i.ip_address))
                        .collect::<Vec<_>>()
                        .join(", ")
                )),
            )
        };

        DiagnosticTest {
            name: "local_network".into(),
            description: "Verificar interfaces de rede locais".into(),
            status,
            duration_ms: start.elapsed().as_millis() as u64,
            details,
            error_code: None,
        }
    }

    /// Testa porta WebSocket
    async fn test_websocket_port(&self) -> DiagnosticTest {
        let start = Instant::now();
        let port = self.config.websocket_port;

        let (status, details, error_code) = if self.is_port_available(port) {
            (
                DiagnosticStatus::Ok,
                Some(format!("Porta {} disponível para binding", port)),
                None,
            )
        } else {
            // Porta em uso - verificar se é o GIRO
            let is_listening = self.is_port_listening(port);
            if is_listening {
                (
                    DiagnosticStatus::Ok,
                    Some(format!("Porta {} em uso (provavelmente GIRO)", port)),
                    None,
                )
            } else {
                (
                    DiagnosticStatus::Error,
                    Some(format!(
                        "Porta {} bloqueada ou em uso por outro programa",
                        port
                    )),
                    Some("WS_PORT_UNAVAILABLE".into()),
                )
            }
        };

        DiagnosticTest {
            name: "websocket_port".into(),
            description: format!("Verificar porta WebSocket ({})", port),
            status,
            duration_ms: start.elapsed().as_millis() as u64,
            details,
            error_code,
        }
    }

    /// Testa mDNS
    async fn test_mdns(&self) -> DiagnosticTest {
        let start = Instant::now();

        let (status, details, error_code) = match self.check_mdns_available().await {
            true => (
                DiagnosticStatus::Ok,
                Some("mDNS disponível para descoberta".into()),
                None,
            ),
            false => (
                DiagnosticStatus::Warning,
                Some("mDNS indisponível - use IP estático".into()),
                Some("MDNS_UNAVAILABLE".into()),
            ),
        };

        DiagnosticTest {
            name: "mdns".into(),
            description: "Verificar disponibilidade mDNS".into(),
            status,
            duration_ms: start.elapsed().as_millis() as u64,
            details,
            error_code,
        }
    }

    /// Testa conectividade com internet
    async fn test_internet_connectivity(&self) -> DiagnosticTest {
        let start = Instant::now();

        // Tentar conectar ao License Server
        let client = reqwest::Client::builder()
            .timeout(self.config.connectivity_timeout)
            .build()
            .unwrap_or_default();

        let result = client.get("https://api.giro.app/health").send().await;

        let (status, details, error_code) = match result {
            Ok(resp) if resp.status().is_success() => (
                DiagnosticStatus::Ok,
                Some("Conexão com api.giro.app OK".into()),
                None,
            ),
            Ok(resp) => (
                DiagnosticStatus::Warning,
                Some(format!("api.giro.app retornou status {}", resp.status())),
                None,
            ),
            Err(e) => {
                let err_str = e.to_string();
                let error_code = if err_str.contains("timeout") {
                    "TIMEOUT"
                } else if err_str.contains("dns") || err_str.contains("resolve") {
                    "DNS_ERROR"
                } else if err_str.contains("connect") {
                    "CONNECTION_REFUSED"
                } else {
                    "NETWORK_ERROR"
                };
                (
                    DiagnosticStatus::Error,
                    Some(format!("Falha: {}", err_str)),
                    Some(error_code.into()),
                )
            }
        };

        DiagnosticTest {
            name: "internet".into(),
            description: "Verificar conexão com License Server".into(),
            status,
            duration_ms: start.elapsed().as_millis() as u64,
            details,
            error_code,
        }
    }

    /// Testa resolução DNS
    async fn test_dns_resolution(&self) -> DiagnosticTest {
        let start = Instant::now();

        let result = tokio::task::spawn_blocking(|| {
            use std::net::ToSocketAddrs;
            "api.giro.app:443".to_socket_addrs()
        })
        .await;

        let (status, details, error_code) = match result {
            Ok(Ok(addrs)) => {
                let addrs_vec: Vec<_> = addrs.collect();
                if addrs_vec.is_empty() {
                    (
                        DiagnosticStatus::Error,
                        Some("DNS não retornou endereços".into()),
                        Some("DNS_NO_RESULTS".into()),
                    )
                } else {
                    (
                        DiagnosticStatus::Ok,
                        Some(format!("Resolvido para {:?}", addrs_vec)),
                        None,
                    )
                }
            }
            Ok(Err(e)) => (
                DiagnosticStatus::Error,
                Some(format!("Falha DNS: {}", e)),
                Some("DNS_RESOLUTION_FAILED".into()),
            ),
            Err(e) => (
                DiagnosticStatus::Error,
                Some(format!("Erro interno: {}", e)),
                Some("INTERNAL_ERROR".into()),
            ),
        };

        DiagnosticTest {
            name: "dns".into(),
            description: "Verificar resolução DNS".into(),
            status,
            duration_ms: start.elapsed().as_millis() as u64,
            details,
            error_code,
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // TESTES DE PEER (OUTROS PCs)
    // ════════════════════════════════════════════════════════════════════════

    /// Testa conectividade com um peer específico
    pub async fn test_peer(&self, ip: &str, port: u16) -> PortTestResult {
        let start = Instant::now();
        let addr = format!("{}:{}", ip, port);

        let result = tokio::task::spawn_blocking(move || {
            TcpStream::connect_timeout(&addr.parse::<SocketAddr>().unwrap(), Duration::from_secs(3))
        })
        .await;

        match result {
            Ok(Ok(_)) => PortTestResult {
                address: ip.to_string(),
                port,
                is_open: true,
                latency_ms: Some(start.elapsed().as_millis() as u64),
                error: None,
            },
            Ok(Err(e)) => PortTestResult {
                address: ip.to_string(),
                port,
                is_open: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(e) => PortTestResult {
                address: ip.to_string(),
                port,
                is_open: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
        }
    }

    /// Escaneia sub-rede em busca de peers GIRO
    pub async fn scan_subnet_for_peers(
        &self,
        base_ip: &str,
        start: u8,
        end: u8,
    ) -> Vec<NetworkPeer> {
        let port = self.config.websocket_port;
        let mut peers = Vec::new();

        tracing::info!(
            "🔍 Escaneando {}.{}-{} na porta {}...",
            base_ip,
            start,
            end,
            port
        );

        // Escanear em paralelo (batches de 10)
        for chunk_start in (start..=end).step_by(10) {
            let chunk_end = std::cmp::min(chunk_start + 9, end);
            let mut handles = Vec::new();

            for i in chunk_start..=chunk_end {
                let ip = format!("{}.{}", base_ip, i);
                let port = port;
                let timeout = Duration::from_millis(500);

                handles.push(tokio::spawn(async move {
                    let addr = format!("{}:{}", ip, port);
                    let start_time = Instant::now();

                    let result = tokio::time::timeout(timeout, async {
                        tokio::task::spawn_blocking(move || {
                            TcpStream::connect_timeout(
                                &addr.parse::<SocketAddr>().unwrap(),
                                Duration::from_millis(300),
                            )
                        })
                        .await
                    })
                    .await;

                    match result {
                        Ok(Ok(Ok(_))) => Some(NetworkPeer {
                            ip: ip.clone(),
                            port,
                            name: None,
                            version: None,
                            is_reachable: true,
                            latency_ms: Some(start_time.elapsed().as_millis() as u64),
                            last_seen: chrono::Utc::now().to_rfc3339(),
                        }),
                        _ => None,
                    }
                }));
            }

            for handle in handles {
                if let Ok(Some(peer)) = handle.await {
                    peers.push(peer);
                }
            }
        }

        // Atualizar cache de peers conhecidos
        let mut known = self.known_peers.write().await;
        for peer in &peers {
            known.insert(peer.ip.clone(), peer.clone());
        }

        tracing::info!("🔍 Encontrados {} peers GIRO na sub-rede", peers.len());
        peers
    }

    /// Lista peers conhecidos
    pub async fn get_known_peers(&self) -> Vec<NetworkPeer> {
        self.known_peers.read().await.values().cloned().collect()
    }

    /// Adiciona peer conhecido
    pub async fn add_known_peer(&self, peer: NetworkPeer) {
        let mut known = self.known_peers.write().await;
        known.insert(peer.ip.clone(), peer);
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════

    /// Obtém interfaces de rede
    fn get_network_interfaces(&self) -> Vec<NetworkInterface> {
        let mut interfaces = Vec::new();

        if let Ok(net_interfaces) = local_ip_address::list_afinet_netifas() {
            for (name, ip) in net_interfaces {
                let interface_type = if name.to_lowercase().contains("virtual")
                    || name.to_lowercase().contains("vmware")
                    || name.to_lowercase().contains("vbox")
                    || name.to_lowercase().contains("docker")
                    || name.to_lowercase().contains("veth")
                    || name.to_lowercase().contains("tap")
                {
                    InterfaceType::Virtual
                } else if name.to_lowercase().contains("wi-fi")
                    || name.to_lowercase().contains("wifi")
                    || name.to_lowercase().contains("wlan")
                {
                    InterfaceType::Wifi
                } else if name.to_lowercase().contains("lo")
                    || name.to_lowercase().contains("loopback")
                {
                    InterfaceType::Loopback
                } else if name.to_lowercase().contains("eth")
                    || name.to_lowercase().contains("ethernet")
                {
                    InterfaceType::Ethernet
                } else {
                    InterfaceType::Unknown
                };

                interfaces.push(NetworkInterface {
                    name: name.clone(),
                    ip_address: ip.to_string(),
                    netmask: "255.255.255.0".into(), // Simplificado
                    mac_address: None,               // Requer crate adicional
                    is_primary: false,               // Será calculado depois
                    interface_type,
                    is_up: !ip.is_loopback(),
                });
            }
        }

        // Marcar interface primária
        if let Some(primary_ip) = super::mdns_service::get_local_ip() {
            for iface in &mut interfaces {
                if iface.ip_address == primary_ip {
                    iface.is_primary = true;
                    break;
                }
            }
        }

        interfaces
    }

    /// Obtém gateway padrão
    fn get_default_gateway(&self) -> Option<String> {
        // Em Windows, podemos usar netsh ou route print
        // Simplificado: assumir .1 da sub-rede
        if let Some(ip) = super::mdns_service::get_local_ip() {
            if let Some(pos) = ip.rfind('.') {
                return Some(format!("{}.1", &ip[..pos]));
            }
        }
        None
    }

    /// Obtém servidores DNS
    fn get_dns_servers(&self) -> Vec<String> {
        // Simplificado - em produção usaria netsh ou registry
        vec!["8.8.8.8".into(), "1.1.1.1".into()]
    }

    /// Obtém perfil de rede Windows
    fn get_network_profile(&self) -> Option<String> {
        // Em Windows real, usaria PowerShell: Get-NetConnectionProfile
        // Simplificado por agora
        #[cfg(windows)]
        {
            Some("Private".into()) // Placeholder
        }
        #[cfg(not(windows))]
        {
            None
        }
    }

    /// Verifica se porta está disponível para binding
    fn is_port_available(&self, port: u16) -> bool {
        std::net::TcpListener::bind(format!("0.0.0.0:{}", port)).is_ok()
    }

    /// Verifica se porta está escutando
    fn is_port_listening(&self, port: u16) -> bool {
        TcpStream::connect_timeout(
            &format!("127.0.0.1:{}", port).parse().unwrap(),
            Duration::from_millis(100),
        )
        .is_ok()
    }

    /// Verifica disponibilidade mDNS
    async fn check_mdns_available(&self) -> bool {
        match mdns_sd::ServiceDaemon::new() {
            Ok(_) => true,
            Err(_) => false,
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS GLOBAIS
// ════════════════════════════════════════════════════════════════════════════

/// Obtém hostname da máquina
fn get_hostname() -> String {
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        if !name.is_empty() {
            return name;
        }
    }
    if let Ok(name) = std::env::var("HOSTNAME") {
        if !name.is_empty() {
            return name;
        }
    }
    if let Ok(hostname) = hostname::get() {
        if let Some(name) = hostname.to_str() {
            return name.to_string();
        }
    }
    "unknown".to_string()
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = NetworkDiagnosticsConfig::default();
        assert_eq!(config.websocket_port, 3847);
        assert_eq!(config.mdns_port, 5353);
    }

    #[tokio::test]
    async fn test_service_creation() {
        let service = NetworkDiagnosticsService::with_defaults();
        assert!(service.get_last_result().await.is_none());
    }

    #[test]
    fn test_hostname() {
        let hostname = get_hostname();
        assert!(!hostname.is_empty());
    }
}
