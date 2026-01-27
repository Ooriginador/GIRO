//! Hardware Manager - Gerenciamento Centralizado de Periféricos
//!
//! Este módulo fornece:
//! - Detecção automática de dispositivos
//! - Health checks contínuos
//! - Reconexão automática com backoff
//! - Eventos de status para o frontend

use super::{
    drawer::DrawerConfig,
    printer::{PrinterConfig, PrinterConnection, PrinterModel},
    scale::{Scale, ScaleConfig, ScaleProtocol},
    HardwareError, HardwareResult,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, RwLock};
use tokio::time::interval;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Status de um dispositivo de hardware
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum DeviceStatus {
    /// Dispositivo não configurado
    NotConfigured,
    /// Desconectado/offline
    Disconnected,
    /// Conectando (tentativa de reconexão)
    Connecting,
    /// Conectado e funcionando
    Connected,
    /// Erro persistente
    Error,
    /// Modo mock ativo
    MockMode,
}

/// Informações de um dispositivo detectado
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DetectedDevice {
    /// Tipo de dispositivo
    pub device_type: DeviceType,
    /// Porta/endereço
    pub port: String,
    /// Modelo detectado (se identificável)
    pub model: Option<String>,
    /// Protocolo (para balanças)
    pub protocol: Option<String>,
    /// Confiança na detecção (0-100)
    pub confidence: u8,
    /// Detalhes adicionais
    pub details: Option<String>,
}

/// Tipo de dispositivo
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum DeviceType {
    Printer,
    Scale,
    Drawer,
    Scanner,
}

/// Status consolidado de todo hardware
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct HardwareOverview {
    pub printer: DeviceStatusInfo,
    pub scale: DeviceStatusInfo,
    pub drawer: DeviceStatusInfo,
    pub scanner: DeviceStatusInfo,
    pub last_check: String,
}

/// Informações de status de um dispositivo
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatusInfo {
    pub status: DeviceStatus,
    pub port: Option<String>,
    pub model: Option<String>,
    pub last_error: Option<String>,
    pub reconnect_attempts: u32,
    pub uptime_seconds: Option<u64>,
}

impl Default for DeviceStatusInfo {
    fn default() -> Self {
        Self {
            status: DeviceStatus::NotConfigured,
            port: None,
            model: None,
            last_error: None,
            reconnect_attempts: 0,
            uptime_seconds: None,
        }
    }
}

/// Evento de mudança de status de hardware
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct HardwareEvent {
    pub device_type: DeviceType,
    pub old_status: DeviceStatus,
    pub new_status: DeviceStatus,
    pub message: Option<String>,
    pub timestamp: i64,
}

/// Resultado de auto-detecção
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AutoDetectResult {
    pub devices: Vec<DetectedDevice>,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

// ════════════════════════════════════════════════════════════════════════════
// HARDWARE MANAGER
// ════════════════════════════════════════════════════════════════════════════

/// Gerenciador centralizado de hardware
pub struct HardwareManager {
    /// Status dos dispositivos
    printer_status: RwLock<DeviceStatusInfo>,
    scale_status: RwLock<DeviceStatusInfo>,
    drawer_status: RwLock<DeviceStatusInfo>,
    scanner_status: RwLock<DeviceStatusInfo>,

    /// Configurações atuais
    printer_config: RwLock<Option<PrinterConfig>>,
    scale_config: RwLock<Option<ScaleConfig>>,
    drawer_config: RwLock<Option<DrawerConfig>>,

    /// Canal de eventos
    event_tx: broadcast::Sender<HardwareEvent>,

    /// Flags de controle
    health_check_running: RwLock<bool>,
    last_health_check: RwLock<Option<chrono::DateTime<chrono::Utc>>>,
}

impl HardwareManager {
    /// Cria novo gerenciador de hardware
    pub fn new() -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(100);

        Arc::new(Self {
            printer_status: RwLock::new(DeviceStatusInfo::default()),
            scale_status: RwLock::new(DeviceStatusInfo::default()),
            drawer_status: RwLock::new(DeviceStatusInfo::default()),
            scanner_status: RwLock::new(DeviceStatusInfo::default()),
            printer_config: RwLock::new(None),
            scale_config: RwLock::new(None),
            drawer_config: RwLock::new(None),
            event_tx,
            health_check_running: RwLock::new(false),
            last_health_check: RwLock::new(None),
        })
    }

    /// Assina eventos de hardware
    pub fn subscribe(&self) -> broadcast::Receiver<HardwareEvent> {
        self.event_tx.subscribe()
    }

    /// Emite evento de mudança de status
    fn emit_event(
        &self,
        device_type: DeviceType,
        old: DeviceStatus,
        new: DeviceStatus,
        msg: Option<String>,
    ) {
        if old != new {
            let event = HardwareEvent {
                device_type,
                old_status: old,
                new_status: new,
                message: msg,
                timestamp: chrono::Utc::now().timestamp_millis(),
            };
            let _ = self.event_tx.send(event);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // CONFIGURAÇÃO
    // ────────────────────────────────────────────────────────────────────────

    /// Configura impressora
    pub async fn set_printer_config(&self, config: PrinterConfig) {
        let mut cfg = self.printer_config.write().await;
        *cfg = Some(config.clone());

        let mut status = self.printer_status.write().await;
        let old = status.status.clone();

        if config.mock_mode {
            status.status = DeviceStatus::MockMode;
        } else if !config.enabled {
            status.status = DeviceStatus::NotConfigured;
        } else {
            status.status = DeviceStatus::Connecting;
            status.port = Some(config.port.clone());
            status.model = Some(format!("{:?}", config.model));
        }

        self.emit_event(DeviceType::Printer, old, status.status.clone(), None);
    }

    /// Configura balança
    pub async fn set_scale_config(&self, config: ScaleConfig) {
        let mut cfg = self.scale_config.write().await;
        *cfg = Some(config.clone());

        let mut status = self.scale_status.write().await;
        let old = status.status.clone();

        if config.mock_mode {
            status.status = DeviceStatus::MockMode;
        } else if !config.enabled {
            status.status = DeviceStatus::NotConfigured;
        } else {
            status.status = DeviceStatus::Connecting;
            status.port = Some(config.port.clone());
            status.model = Some(format!("{:?}", config.protocol));
        }

        self.emit_event(DeviceType::Scale, old, status.status.clone(), None);
    }

    /// Configura gaveta
    pub async fn set_drawer_config(&self, config: DrawerConfig) {
        let mut cfg = self.drawer_config.write().await;
        *cfg = Some(config.clone());

        let mut status = self.drawer_status.write().await;
        let old = status.status.clone();

        if config.mock_mode {
            status.status = DeviceStatus::MockMode;
        } else if !config.enabled {
            status.status = DeviceStatus::NotConfigured;
        } else {
            status.status = DeviceStatus::Connecting;
            status.port = Some(config.printer_port.clone());
        }

        self.emit_event(DeviceType::Drawer, old, status.status.clone(), None);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STATUS
    // ────────────────────────────────────────────────────────────────────────

    /// Retorna visão geral do hardware
    pub async fn get_overview(&self) -> HardwareOverview {
        let printer = self.printer_status.read().await.clone();
        let scale = self.scale_status.read().await.clone();
        let drawer = self.drawer_status.read().await.clone();
        let scanner = self.scanner_status.read().await.clone();

        let last_check = self
            .last_health_check
            .read()
            .await
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| "never".to_string());

        HardwareOverview {
            printer,
            scale,
            drawer,
            scanner,
            last_check,
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // HEALTH CHECKS
    // ────────────────────────────────────────────────────────────────────────

    /// Executa health check de todos os dispositivos
    pub async fn run_health_checks(&self) -> HardwareOverview {
        // Check printer
        if let Some(config) = self.printer_config.read().await.clone() {
            self.check_printer(&config).await;
        }

        // Check scale
        if let Some(config) = self.scale_config.read().await.clone() {
            self.check_scale(&config).await;
        }

        // Check drawer (uses printer port)
        if let Some(config) = self.drawer_config.read().await.clone() {
            self.check_drawer(&config).await;
        }

        // Update last check time
        *self.last_health_check.write().await = Some(chrono::Utc::now());

        self.get_overview().await
    }

    /// Health check da impressora
    async fn check_printer(&self, config: &PrinterConfig) {
        if !config.enabled || config.mock_mode {
            return;
        }

        let result = tokio::task::spawn_blocking({
            let config = config.clone();
            move || check_printer_connection(&config)
        })
        .await;

        let mut status = self.printer_status.write().await;
        let old = status.status.clone();

        match result {
            Ok(Ok(())) => {
                status.status = DeviceStatus::Connected;
                status.last_error = None;
                status.reconnect_attempts = 0;
            }
            Ok(Err(e)) => {
                status.status = DeviceStatus::Disconnected;
                status.last_error = Some(e.to_string());
                status.reconnect_attempts += 1;
            }
            Err(e) => {
                status.status = DeviceStatus::Error;
                status.last_error = Some(format!("Task panic: {}", e));
            }
        }

        self.emit_event(
            DeviceType::Printer,
            old,
            status.status.clone(),
            status.last_error.clone(),
        );
    }

    /// Health check da balança
    async fn check_scale(&self, config: &ScaleConfig) {
        if !config.enabled || config.mock_mode {
            return;
        }

        let result = tokio::task::spawn_blocking({
            let config = config.clone();
            move || check_scale_connection(&config)
        })
        .await;

        let mut status = self.scale_status.write().await;
        let old = status.status.clone();

        match result {
            Ok(Ok(())) => {
                status.status = DeviceStatus::Connected;
                status.last_error = None;
                status.reconnect_attempts = 0;
            }
            Ok(Err(e)) => {
                status.status = DeviceStatus::Disconnected;
                status.last_error = Some(e.to_string());
                status.reconnect_attempts += 1;
            }
            Err(e) => {
                status.status = DeviceStatus::Error;
                status.last_error = Some(format!("Task panic: {}", e));
            }
        }

        self.emit_event(
            DeviceType::Scale,
            old,
            status.status.clone(),
            status.last_error.clone(),
        );
    }

    /// Health check da gaveta
    async fn check_drawer(&self, config: &DrawerConfig) {
        if !config.enabled || config.mock_mode {
            return;
        }

        // Drawer check is simpler - just verify the port exists
        let port = config.printer_port.clone();
        let exists = tokio::task::spawn_blocking(move || {
            super::port_exists(&port) || std::path::Path::new(&port).exists()
        })
        .await
        .unwrap_or(false);

        let mut status = self.drawer_status.write().await;
        let old = status.status.clone();

        if exists {
            status.status = DeviceStatus::Connected;
            status.last_error = None;
        } else {
            status.status = DeviceStatus::Disconnected;
            status.last_error = Some("Porta da impressora não encontrada".to_string());
        }

        self.emit_event(
            DeviceType::Drawer,
            old,
            status.status.clone(),
            status.last_error.clone(),
        );
    }

    /// Inicia loop de health checks em background
    pub fn start_health_check_loop(
        self: Arc<Self>,
        interval_secs: u64,
    ) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            let mut check_interval = interval(Duration::from_secs(interval_secs));

            loop {
                check_interval.tick().await;

                // Check if already running
                {
                    let running = self.health_check_running.read().await;
                    if *running {
                        continue;
                    }
                }

                // Set running flag
                *self.health_check_running.write().await = true;

                // Run checks
                self.run_health_checks().await;

                // Clear running flag
                *self.health_check_running.write().await = false;
            }
        })
    }

    // ────────────────────────────────────────────────────────────────────────
    // AUTO-DETECÇÃO
    // ────────────────────────────────────────────────────────────────────────

    /// Detecta automaticamente todos os dispositivos disponíveis
    pub async fn auto_detect_all(&self) -> AutoDetectResult {
        let start = std::time::Instant::now();
        let mut devices = Vec::new();
        let mut errors = Vec::new();

        // Detect printers
        match self.detect_printers().await {
            Ok(mut found) => devices.append(&mut found),
            Err(e) => errors.push(format!("Erro detectando impressoras: {}", e)),
        }

        // Detect scales
        match self.detect_scales().await {
            Ok(mut found) => devices.append(&mut found),
            Err(e) => errors.push(format!("Erro detectando balanças: {}", e)),
        }

        AutoDetectResult {
            devices,
            errors,
            duration_ms: start.elapsed().as_millis() as u64,
        }
    }

    /// Detecta impressoras disponíveis
    async fn detect_printers(&self) -> HardwareResult<Vec<DetectedDevice>> {
        let mut detected = Vec::new();

        // Get available ports
        let ports = super::list_serial_ports();

        // Linux USB printer devices
        #[cfg(target_os = "linux")]
        {
            for i in 0..10 {
                let paths = [format!("/dev/usb/lp{}", i), format!("/dev/lp{}", i)];

                for path in paths {
                    if std::path::Path::new(&path).exists() {
                        detected.push(DetectedDevice {
                            device_type: DeviceType::Printer,
                            port: path.clone(),
                            model: Some("USB Printer".to_string()),
                            protocol: None,
                            confidence: 70,
                            details: Some("Dispositivo USB detectado".to_string()),
                        });
                    }
                }
            }
        }

        // Windows COM ports
        #[cfg(target_os = "windows")]
        {
            for port in &ports {
                if port.starts_with("COM") {
                    // Try to open and send ESC/POS init
                    let port_clone = port.clone();
                    let result =
                        tokio::task::spawn_blocking(move || try_detect_escpos_printer(&port_clone))
                            .await;

                    if let Ok(Ok(model)) = result {
                        detected.push(DetectedDevice {
                            device_type: DeviceType::Printer,
                            port: port.clone(),
                            model: Some(model),
                            protocol: Some("ESC/POS".to_string()),
                            confidence: 90,
                            details: None,
                        });
                    }
                }
            }
        }

        // Serial ports (all platforms)
        for port in &ports {
            // Skip Bluetooth and virtual ports
            if port.contains("Bluetooth") || port.contains("ttyS") {
                continue;
            }

            let port_clone = port.clone();
            let result = tokio::time::timeout(
                Duration::from_secs(2),
                tokio::task::spawn_blocking(move || try_detect_escpos_printer(&port_clone)),
            )
            .await;

            if let Ok(Ok(Ok(model))) = result {
                // Check if already detected
                if !detected.iter().any(|d: &DetectedDevice| d.port == *port) {
                    detected.push(DetectedDevice {
                        device_type: DeviceType::Printer,
                        port: port.clone(),
                        model: Some(model),
                        protocol: Some("ESC/POS".to_string()),
                        confidence: 85,
                        details: Some("Impressora térmica detectada via serial".to_string()),
                    });
                }
            }
        }

        Ok(detected)
    }

    /// Detecta balanças disponíveis
    async fn detect_scales(&self) -> HardwareResult<Vec<DetectedDevice>> {
        let mut detected = Vec::new();
        let ports = super::list_serial_ports();

        for port in ports {
            // Skip non-scale ports
            if port.contains("Bluetooth") || port.contains("ttyS") {
                continue;
            }

            let port_clone = port.clone();
            let result = tokio::time::timeout(
                Duration::from_secs(3),
                tokio::task::spawn_blocking(move || try_detect_scale(&port_clone)),
            )
            .await;

            if let Ok(Ok(Ok((protocol, confidence)))) = result {
                detected.push(DetectedDevice {
                    device_type: DeviceType::Scale,
                    port: port.clone(),
                    model: None,
                    protocol: Some(format!("{:?}", protocol)),
                    confidence,
                    details: Some("Balança detectada".to_string()),
                });
            }
        }

        Ok(detected)
    }

    /// Aplica configuração detectada automaticamente
    pub async fn apply_detected_printer(&self, device: &DetectedDevice) -> HardwareResult<()> {
        if device.device_type != DeviceType::Printer {
            return Err(HardwareError::InvalidPort(
                "Dispositivo não é impressora".to_string(),
            ));
        }

        let connection =
            if device.port.starts_with("/dev/usb/lp") || device.port.starts_with("/dev/lp") {
                PrinterConnection::Usb
            } else if device.port.contains(":") {
                PrinterConnection::Network
            } else {
                PrinterConnection::Serial
            };

        let config = PrinterConfig {
            enabled: true,
            model: PrinterModel::Generic,
            connection,
            port: device.port.clone(),
            paper_width: 48,
            auto_cut: true,
            open_drawer_on_sale: true,
            baud_rate: 9600,
            data_bits: 8,
            parity: "none".to_string(),
            timeout_ms: 3000,
            mock_mode: false,
        };

        self.set_printer_config(config).await;
        Ok(())
    }

    /// Aplica configuração de balança detectada
    pub async fn apply_detected_scale(&self, device: &DetectedDevice) -> HardwareResult<()> {
        if device.device_type != DeviceType::Scale {
            return Err(HardwareError::InvalidPort(
                "Dispositivo não é balança".to_string(),
            ));
        }

        let protocol = device
            .protocol
            .as_ref()
            .map(|p| match p.to_lowercase().as_str() {
                "toledo" => ScaleProtocol::Toledo,
                "filizola" => ScaleProtocol::Filizola,
                "elgin" => ScaleProtocol::Elgin,
                "urano" => ScaleProtocol::Urano,
                _ => ScaleProtocol::Generic,
            })
            .unwrap_or(ScaleProtocol::Generic);

        let config = ScaleConfig {
            enabled: true,
            protocol,
            port: device.port.clone(),
            baud_rate: 9600,
            data_bits: 8,
            parity: "none".to_string(),
            stop_bits: 1,
            mock_mode: false,
        };

        self.set_scale_config(config).await;
        Ok(())
    }
}

impl Default for HardwareManager {
    fn default() -> Self {
        Arc::try_unwrap(Self::new()).unwrap_or_else(|_arc| {
            // This shouldn't happen but provide a fallback
            let (event_tx, _) = broadcast::channel(100);
            Self {
                printer_status: RwLock::new(DeviceStatusInfo::default()),
                scale_status: RwLock::new(DeviceStatusInfo::default()),
                drawer_status: RwLock::new(DeviceStatusInfo::default()),
                scanner_status: RwLock::new(DeviceStatusInfo::default()),
                printer_config: RwLock::new(None),
                scale_config: RwLock::new(None),
                drawer_config: RwLock::new(None),
                event_tx,
                health_check_running: RwLock::new(false),
                last_health_check: RwLock::new(None),
            }
        })
    }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE DETECÇÃO
// ════════════════════════════════════════════════════════════════════════════

/// Tenta detectar impressora ESC/POS em uma porta
fn try_detect_escpos_printer(port: &str) -> HardwareResult<String> {
    use std::io::{Read, Write};

    // Try to open serial port
    let mut serial = serialport::new(port, 9600)
        .timeout(Duration::from_millis(1000))
        .open()
        .map_err(|e| HardwareError::ConnectionFailed(e.to_string()))?;

    // Send ESC/POS status request: GS I n (n=1 returns printer type)
    let status_cmd = [0x1D, 0x49, 0x01]; // GS I 1
    serial
        .write_all(&status_cmd)
        .map_err(HardwareError::IoError)?;

    std::thread::sleep(Duration::from_millis(200));

    let mut buf = [0u8; 32];
    let read = serial.read(&mut buf).unwrap_or(0);

    if read > 0 {
        // Got response - likely ESC/POS printer
        // Try to identify model from response
        let model = identify_printer_model(&buf[..read]);
        return Ok(model);
    }

    // Try alternative status command: ESC v (transmit paper sensor status)
    let alt_cmd = [0x1B, 0x76]; // ESC v
    serial.write_all(&alt_cmd).map_err(HardwareError::IoError)?;

    std::thread::sleep(Duration::from_millis(200));

    let read = serial.read(&mut buf).unwrap_or(0);
    if read > 0 {
        return Ok("ESC/POS Genérica".to_string());
    }

    Err(HardwareError::Timeout)
}

/// Identifica modelo de impressora pela resposta
fn identify_printer_model(response: &[u8]) -> String {
    // Check for known model signatures
    let response_str = String::from_utf8_lossy(response);

    if response_str.contains("EPSON") || response_str.contains("TM-") {
        "Epson".to_string()
    } else if response_str.contains("ELGIN")
        || response_str.contains("i7")
        || response_str.contains("i9")
    {
        "Elgin".to_string()
    } else if response_str.contains("BEMA") || response_str.contains("MP-") {
        "Bematech".to_string()
    } else if response_str.contains("DARUMA") || response_str.contains("DR") {
        "Daruma".to_string()
    } else {
        "ESC/POS Genérica".to_string()
    }
}

/// Tenta detectar balança em uma porta
fn try_detect_scale(port: &str) -> HardwareResult<(ScaleProtocol, u8)> {
    use std::io::{Read, Write};

    // Try common baud rates
    let baud_rates = [9600, 4800, 2400];
    let protocols = [
        (ScaleProtocol::Toledo, vec![0x05u8]), // ENQ
        (ScaleProtocol::Elgin, vec![0x24u8]),  // $
        (ScaleProtocol::Filizola, vec![0x05u8]),
        (ScaleProtocol::Urano, vec![0x05u8]),
    ];

    for baud in baud_rates {
        let mut serial = match serialport::new(port, baud)
            .timeout(Duration::from_millis(500))
            .open()
        {
            Ok(s) => s,
            Err(_) => continue,
        };

        for (protocol, cmd) in &protocols {
            if serial.write_all(cmd).is_err() {
                continue;
            }

            std::thread::sleep(Duration::from_millis(150));

            let mut buf = [0u8; 32];
            if let Ok(read) = serial.read(&mut buf) {
                if read > 0 {
                    // Validate response looks like weight data
                    if is_valid_scale_response(&buf[..read], protocol) {
                        return Ok((protocol.clone(), 85));
                    }
                }
            }
        }
    }

    Err(HardwareError::DeviceNotFound(
        "Balança não detectada".to_string(),
    ))
}

/// Valida se resposta parece ser de balança
fn is_valid_scale_response(data: &[u8], protocol: &ScaleProtocol) -> bool {
    match protocol {
        ScaleProtocol::Toledo => {
            // Toledo: STX ... ETX format
            data.len() >= 9 && data.contains(&0x02) && data.contains(&0x03)
        }
        ScaleProtocol::Filizola => {
            // Filizola: starts with +/- and has digits
            let s = String::from_utf8_lossy(data);
            (s.starts_with('+') || s.starts_with('-'))
                && s.chars().filter(|c| c.is_ascii_digit()).count() >= 4
        }
        ScaleProtocol::Elgin | ScaleProtocol::Urano | ScaleProtocol::Generic => {
            // Generic: at least 4 digits in response
            data.iter().filter(|&&b| b.is_ascii_digit()).count() >= 4
        }
    }
}

/// Verifica conexão com impressora
fn check_printer_connection(config: &PrinterConfig) -> HardwareResult<()> {
    match config.connection {
        PrinterConnection::Serial => {
            let _port = serialport::new(&config.port, config.baud_rate)
                .timeout(Duration::from_millis(config.timeout_ms))
                .open()
                .map_err(|e| HardwareError::ConnectionFailed(e.to_string()))?;
            Ok(())
        }
        PrinterConnection::Usb => {
            #[cfg(target_os = "linux")]
            {
                if !std::path::Path::new(&config.port).exists() {
                    return Err(HardwareError::DeviceNotFound(config.port.clone()));
                }
            }
            Ok(())
        }
        PrinterConnection::Network => {
            use std::net::TcpStream;
            TcpStream::connect_timeout(
                &config
                    .port
                    .parse()
                    .map_err(|e| HardwareError::InvalidPort(format!("Endereço inválido: {}", e)))?,
                Duration::from_millis(config.timeout_ms),
            )
            .map_err(|e| HardwareError::ConnectionFailed(e.to_string()))?;
            Ok(())
        }
    }
}

/// Verifica conexão com balança
fn check_scale_connection(config: &ScaleConfig) -> HardwareResult<()> {
    let scale = Scale::new(config.clone())?;
    scale.test_connection()?;
    Ok(())
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_status_default() {
        let status = DeviceStatusInfo::default();
        assert_eq!(status.status, DeviceStatus::NotConfigured);
        assert_eq!(status.reconnect_attempts, 0);
    }

    #[test]
    fn test_identify_printer_model() {
        assert_eq!(identify_printer_model(b"EPSON TM-T20"), "Epson");
        assert_eq!(identify_printer_model(b"ELGIN i9"), "Elgin");
        assert_eq!(identify_printer_model(b"random data"), "ESC/POS Genérica");
    }

    #[test]
    fn test_is_valid_scale_response_toledo() {
        let data = [0x02, b'0', b'0', b'1', b'2', b'3', b'4', 0x20, 0x03];
        assert!(is_valid_scale_response(&data, &ScaleProtocol::Toledo));
    }

    #[test]
    fn test_is_valid_scale_response_filizola() {
        let data = b"+001234";
        assert!(is_valid_scale_response(data, &ScaleProtocol::Filizola));
    }
}
