//! Módulo de Scanner de Código de Barras
//!
//! Suporta:
//! - USB HID (leitoras que emulam teclado)
//! - WebSocket (scanner mobile via PWA)

use super::{HardwareError, HardwareResult};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Formato de código de barras
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BarcodeFormat {
    Ean13,
    Ean8,
    Code128,
    Code39,
    Qr,
    Unknown,
}

impl BarcodeFormat {
    /// Detecta formato pelo tamanho e prefixo
    pub fn detect(code: &str) -> Self {
        let clean: String = code.chars().filter(|c| c.is_ascii_alphanumeric()).collect();

        match clean.len() {
            13 if clean.chars().all(|c| c.is_ascii_digit()) => Self::Ean13,
            8 if clean.chars().all(|c| c.is_ascii_digit()) => Self::Ean8,
            _ if clean.chars().all(|c| c.is_ascii_digit()) => Self::Code128,
            _ => Self::Unknown,
        }
    }
}

/// Evento de scan recebido
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanEvent {
    /// Código lido
    pub code: String,
    /// Formato detectado
    pub format: BarcodeFormat,
    /// Timestamp em milissegundos
    pub timestamp: i64,
    /// ID do dispositivo (para mobile)
    pub device_id: Option<String>,
    /// Origem do scan
    pub source: ScanSource,
}

/// Origem do scan
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ScanSource {
    Usb,
    Mobile,
    Manual,
}

/// Configuração do scanner mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileScannerConfig {
    pub enabled: bool,
    pub port: u16,
    pub timeout_seconds: u32,
    pub require_local_network: bool,
}

impl Default for MobileScannerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            port: 3847,
            timeout_seconds: 30,
            require_local_network: true,
        }
    }
}

/// Informações de dispositivo mobile conectado
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileDevice {
    pub id: String,
    pub name: Option<String>,
    pub ip_address: String,
    pub connected_at: i64,
    pub last_activity: i64,
}

// ════════════════════════════════════════════════════════════════════════════
// MENSAGENS WEBSOCKET
// ════════════════════════════════════════════════════════════════════════════

/// Mensagem recebida do scanner mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ScannerMessage {
    /// Código de barras escaneado
    Barcode {
        code: String,
        format: Option<String>,
        timestamp: i64,
    },
    /// Ping para manter conexão
    Ping,
    /// Registro do dispositivo
    Register {
        device_id: String,
        device_name: Option<String>,
    },
    /// Desconexão
    Disconnect,
}

/// Mensagem enviada para o scanner mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ServerMessage {
    /// Confirmação de conexão
    Connected { session_id: String },
    /// Confirmação de scan recebido
    Ack {
        code: String,
        product_name: Option<String>,
    },
    /// Erro
    Error { message: String },
    /// Pong em resposta ao ping
    Pong,
}

// ════════════════════════════════════════════════════════════════════════════
// SERVIDOR WEBSOCKET
// ════════════════════════════════════════════════════════════════════════════

/// Estado compartilhado do servidor de scanner
pub struct ScannerServerState {
    /// Dispositivos conectados
    pub devices: RwLock<HashMap<String, MobileDevice>>,
    /// Canal para broadcast de eventos
    pub event_tx: broadcast::Sender<ScanEvent>,
    /// Configuração
    pub config: MobileScannerConfig,
    /// Pool de conexão com banco de dados (opcional)
    pub db_pool: Option<SqlitePool>,
}

impl ScannerServerState {
    pub fn new(config: MobileScannerConfig) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(100);

        Arc::new(Self {
            devices: RwLock::new(HashMap::new()),
            event_tx,
            config,
            db_pool: None,
        })
    }

    /// Cria novo estado com pool de banco de dados
    pub fn with_db_pool(config: MobileScannerConfig, pool: SqlitePool) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(100);

        Arc::new(Self {
            devices: RwLock::new(HashMap::new()),
            event_tx,
            config,
            db_pool: Some(pool),
        })
    }

    /// Busca nome do produto pelo código de barras
    pub async fn lookup_product_name(&self, barcode: &str) -> Option<String> {
        if let Some(ref pool) = self.db_pool {
            let result = sqlx::query_scalar::<_, String>(
                "SELECT name FROM products WHERE barcode = ? AND is_active = 1 LIMIT 1",
            )
            .bind(barcode)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

            // Se não encontrou por barcode, tenta por internal_code
            if result.is_none() {
                return sqlx::query_scalar::<_, String>(
                    "SELECT name FROM products WHERE internal_code = ? AND is_active = 1 LIMIT 1",
                )
                .bind(barcode)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten();
            }

            result
        } else {
            None
        }
    }

    /// Registra dispositivo
    pub async fn register_device(&self, device: MobileDevice) {
        let mut devices = self.devices.write().await;
        devices.insert(device.id.clone(), device);
    }

    /// Remove dispositivo
    pub async fn unregister_device(&self, device_id: &str) {
        let mut devices = self.devices.write().await;
        devices.remove(device_id);
    }

    /// Atualiza última atividade
    pub async fn update_activity(&self, device_id: &str) {
        let mut devices = self.devices.write().await;
        if let Some(device) = devices.get_mut(device_id) {
            device.last_activity = chrono::Utc::now().timestamp_millis();
        }
    }

    /// Lista dispositivos conectados
    pub async fn list_devices(&self) -> Vec<MobileDevice> {
        let devices = self.devices.read().await;
        devices.values().cloned().collect()
    }

    /// Envia evento de scan
    pub fn send_scan_event(&self, event: ScanEvent) {
        let _ = self.event_tx.send(event);
    }

    /// Assina eventos de scan
    pub fn subscribe(&self) -> broadcast::Receiver<ScanEvent> {
        self.event_tx.subscribe()
    }
}

/// Inicia servidor WebSocket para scanner mobile
pub async fn start_scanner_server(state: Arc<ScannerServerState>) -> HardwareResult<()> {
    use tokio::net::TcpListener;

    let addr = format!("0.0.0.0:{}", state.config.port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

    tracing::info!("Scanner WebSocket server listening on {}", addr);

    while let Ok((stream, addr)) = listener.accept().await {
        let state = state.clone();
        let ip = addr.ip().to_string();

        // Verificar se é rede local
        if state.config.require_local_network && !is_local_network(&ip) {
            tracing::warn!("Rejeitando conexão de IP externo: {}", ip);
            continue;
        }

        tokio::spawn(async move {
            if let Err(e) = handle_scanner_connection(stream, state, ip).await {
                tracing::error!("Erro na conexão do scanner: {}", e);
            }
        });
    }

    Ok(())
}

/// Verifica se IP é de rede local
fn is_local_network(ip: &str) -> bool {
    ip.starts_with("192.168.")
        || ip.starts_with("10.")
        || ip.starts_with("172.16.")
        || ip.starts_with("172.17.")
        || ip.starts_with("172.18.")
        || ip.starts_with("172.19.")
        || ip.starts_with("172.2")
        || ip.starts_with("172.30.")
        || ip.starts_with("172.31.")
        || ip == "127.0.0.1"
        || ip == "::1"
        || ip == "localhost"
}

/// Handler de conexão individual
async fn handle_scanner_connection(
    stream: tokio::net::TcpStream,
    state: Arc<ScannerServerState>,
    ip: String,
) -> HardwareResult<()> {
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::tungstenite::Message;

    let ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

    let (mut write, mut read) = ws_stream.split();

    // Gera ID de sessão
    let session_id = uuid::Uuid::new_v4().to_string();
    let mut device_id: Option<String> = None;

    // Envia confirmação de conexão
    let connected = ServerMessage::Connected {
        session_id: session_id.clone(),
    };
    write
        .send(Message::Text(serde_json::to_string(&connected).unwrap()))
        .await
        .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

    // Loop de mensagens
    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                let text_str: &str = text.as_ref();
                if let Ok(scanner_msg) = serde_json::from_str::<ScannerMessage>(text_str) {
                    match scanner_msg {
                        ScannerMessage::Barcode {
                            code,
                            format,
                            timestamp,
                        } => {
                            // Atualiza atividade
                            if let Some(ref id) = device_id {
                                state.update_activity(id).await;
                            }

                            // Envia evento
                            let event = ScanEvent {
                                code: code.clone(),
                                format: format
                                    .map(|f| match f.as_str() {
                                        "EAN-13" => BarcodeFormat::Ean13,
                                        "EAN-8" => BarcodeFormat::Ean8,
                                        "CODE-128" => BarcodeFormat::Code128,
                                        "QR" => BarcodeFormat::Qr,
                                        _ => BarcodeFormat::detect(&code),
                                    })
                                    .unwrap_or_else(|| BarcodeFormat::detect(&code)),
                                timestamp,
                                device_id: device_id.clone(),
                                source: ScanSource::Mobile,
                            };

                            state.send_scan_event(event);

                            // Busca nome do produto no banco de dados
                            let product_name = state.lookup_product_name(&code).await;

                            // Envia ACK com nome do produto
                            let ack = ServerMessage::Ack { code, product_name };
                            write
                                .send(Message::Text(serde_json::to_string(&ack).unwrap()))
                                .await
                                .ok();
                        }

                        ScannerMessage::Ping => {
                            let pong = ServerMessage::Pong;
                            write
                                .send(Message::Text(serde_json::to_string(&pong).unwrap()))
                                .await
                                .ok();
                        }

                        ScannerMessage::Register {
                            device_id: id,
                            device_name,
                        } => {
                            device_id = Some(id.clone());

                            let device = MobileDevice {
                                id: id.clone(),
                                name: device_name,
                                ip_address: ip.clone(),
                                connected_at: chrono::Utc::now().timestamp_millis(),
                                last_activity: chrono::Utc::now().timestamp_millis(),
                            };

                            state.register_device(device).await;
                            tracing::info!("Scanner mobile registrado: {}", id);
                        }

                        ScannerMessage::Disconnect => {
                            if let Some(ref id) = device_id {
                                state.unregister_device(id).await;
                            }
                            break;
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                if let Some(ref id) = device_id {
                    state.unregister_device(id).await;
                }
                break;
            }
            Err(e) => {
                tracing::error!("Erro WebSocket: {}", e);
                break;
            }
            _ => {}
        }
    }

    // Cleanup
    if let Some(ref id) = device_id {
        state.unregister_device(id).await;
        tracing::info!("Scanner mobile desconectado: {}", id);
    }

    Ok(())
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE CÓDIGOS
// ════════════════════════════════════════════════════════════════════════════

/// Valida dígito verificador EAN-13
pub fn validate_ean13(code: &str) -> bool {
    let digits: Vec<u32> = code.chars().filter_map(|c| c.to_digit(10)).collect();

    if digits.len() != 13 {
        return false;
    }

    let mut sum = 0;
    for (i, &digit) in digits[..12].iter().enumerate() {
        sum += if i % 2 == 0 { digit } else { digit * 3 };
    }

    let check = (10 - (sum % 10)) % 10;
    check == digits[12]
}

/// Valida dígito verificador EAN-8
pub fn validate_ean8(code: &str) -> bool {
    let digits: Vec<u32> = code.chars().filter_map(|c| c.to_digit(10)).collect();

    if digits.len() != 8 {
        return false;
    }

    let mut sum = 0;
    for (i, &digit) in digits[..7].iter().enumerate() {
        sum += if i % 2 == 0 { digit * 3 } else { digit };
    }

    let check = (10 - (sum % 10)) % 10;
    check == digits[7]
}

/// Normaliza código de barras
pub fn normalize_barcode(code: &str) -> String {
    code.chars().filter(|c| c.is_ascii_alphanumeric()).collect()
}

// ════════════════════════════════════════════════════════════════════════════
// GERADOR DE QR CODE PARA PAREAMENTO
// ════════════════════════════════════════════════════════════════════════════

/// Gera URL para QR Code de pareamento
pub fn generate_pairing_url(server_ip: &str, port: u16) -> String {
    format!("ws://{}:{}", server_ip, port)
}

/// Obtém IP local para QR Code
pub fn get_local_ip() -> Option<String> {
    use std::net::UdpSocket;

    // Conecta a um IP externo para descobrir o IP local
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;

    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ean13_validation() {
        assert!(validate_ean13("7891234567895")); // Válido
        assert!(!validate_ean13("7891234567891")); // Inválido
        assert!(!validate_ean13("123")); // Muito curto
    }

    #[test]
    fn test_ean8_validation() {
        assert!(validate_ean8("12345670")); // Válido
        assert!(!validate_ean8("12345671")); // Inválido
    }

    #[test]
    fn test_barcode_format_detection() {
        assert_eq!(BarcodeFormat::detect("7891234567890"), BarcodeFormat::Ean13);
        assert_eq!(BarcodeFormat::detect("12345678"), BarcodeFormat::Ean8);
    }

    #[test]
    fn test_local_network_detection() {
        assert!(is_local_network("192.168.1.100"));
        assert!(is_local_network("10.0.0.1"));
        assert!(is_local_network("127.0.0.1"));
        assert!(!is_local_network("8.8.8.8"));
    }

    #[test]
    fn test_normalize_barcode() {
        assert_eq!(normalize_barcode("789 123 456"), "789123456");
        assert_eq!(normalize_barcode("ABC-123-XYZ"), "ABC123XYZ");
    }
}
