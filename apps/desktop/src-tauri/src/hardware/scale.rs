//! Módulo de Balança Serial
//!
//! Suporta:
//! - Toledo Prix 3, Prix 4, Prix 5
//! - Filizola CS15, Platina
//! - Elgin DP, SM100
//! - Urano US15, US20
//! - Genéricas

use super::{HardwareError, HardwareResult};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::time::Duration;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Protocolo da balança
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ScaleProtocol {
    Toledo,
    Filizola,
    Elgin,
    Urano,
    Generic,
}

/// Configuração da balança
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScaleConfig {
    pub enabled: bool,
    pub protocol: ScaleProtocol,
    pub port: String,   // COM1, /dev/ttyUSB0
    pub baud_rate: u32, // Geralmente 2400, 4800 ou 9600
    pub data_bits: u8,  // 7 ou 8
    pub parity: String, // none, odd, even
    pub stop_bits: u8,  // 1 ou 2
}

impl Default for ScaleConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            protocol: ScaleProtocol::Toledo,
            port: String::new(),
            baud_rate: 9600,
            data_bits: 8,
            parity: "none".to_string(),
            stop_bits: 1,
        }
    }
}

/// Resposta de leitura da balança
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScaleReading {
    /// Peso em quilogramas
    pub weight_kg: f64,
    /// Peso em gramas
    pub weight_grams: u32,
    /// Se o peso está estável
    pub stable: bool,
    /// Se houve sobrecarga
    pub overload: bool,
    /// Se o peso é negativo (tara)
    pub negative: bool,
    /// Protocolo usado
    pub protocol: ScaleProtocol,
}

impl ScaleReading {
    pub fn new(weight_grams: u32, stable: bool) -> Self {
        Self {
            weight_kg: weight_grams as f64 / 1000.0,
            weight_grams,
            stable,
            overload: false,
            negative: false,
            protocol: ScaleProtocol::Generic,
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// PROTOCOLOS
// ════════════════════════════════════════════════════════════════════════════

/// Caracteres de controle
mod control {
    pub const STX: u8 = 0x02;
    pub const ETX: u8 = 0x03;
    pub const ENQ: u8 = 0x05;
    // Constantes removidas por não serem usadas
}

/// Parser para protocolo Toledo
///
/// Formato: STX [6 bytes peso] [status] ETX
/// Exemplo: 0x02 "001234" 0x20 0x03 = 1.234 kg, estável
mod toledo {
    use super::*;

    pub fn parse(data: &[u8]) -> HardwareResult<ScaleReading> {
        // Tamanho mínimo: STX + 6 peso + 1 status + ETX = 9 bytes
        if data.len() < 9 {
            return Err(HardwareError::ProtocolError(
                "Resposta Toledo muito curta".to_string(),
            ));
        }

        // Encontrar STX e ETX
        let start = data.iter().position(|&b| b == control::STX);
        let end = data.iter().position(|&b| b == control::ETX);

        match (start, end) {
            (Some(s), Some(e)) if e > s + 6 => {
                let payload = &data[s + 1..e];

                // 6 bytes de peso (ASCII)
                let weight_str = String::from_utf8_lossy(&payload[0..6]).trim().to_string();

                let weight_grams: u32 = weight_str.parse().unwrap_or(0);

                // Status byte
                let status = if payload.len() > 6 { payload[6] } else { 0x20 };

                let stable = (status & 0x20) != 0 || status == 0x20;
                let negative = (status & 0x40) != 0;
                let overload = (status & 0x80) != 0;

                Ok(ScaleReading {
                    weight_kg: weight_grams as f64 / 1000.0,
                    weight_grams,
                    stable,
                    negative,
                    overload,
                    protocol: ScaleProtocol::Toledo,
                })
            }
            _ => Err(HardwareError::ProtocolError(
                "Formato Toledo inválido".to_string(),
            )),
        }
    }

    pub fn command_read() -> &'static [u8] {
        &[control::ENQ]
    }
}

/// Parser para protocolo Filizola
///
/// Formato: [sinal][5 bytes peso inteiro][1 byte decimal][status]CR
/// Exemplo: "+00123401" = 1.234 kg (1234 * 0.001)
mod filizola {
    use super::*;

    pub fn parse(data: &[u8]) -> HardwareResult<ScaleReading> {
        // Limpar caracteres de controle
        let clean: Vec<u8> = data
            .iter()
            .filter(|&&b| (0x20..=0x7E).contains(&b))
            .copied()
            .collect();

        if clean.len() < 7 {
            return Err(HardwareError::ProtocolError(
                "Resposta Filizola muito curta".to_string(),
            ));
        }

        let response = String::from_utf8_lossy(&clean);

        // Primeiro caractere é sinal (+/-)
        let negative = response.starts_with('-');

        // Próximos 5-6 caracteres são peso
        let weight_str: String = response
            .chars()
            .skip(1)
            .take(6)
            .filter(|c| c.is_ascii_digit())
            .collect();

        let weight_grams: u32 = weight_str.parse().unwrap_or(0);

        // Status geralmente indica estabilidade
        let last_char = response.chars().last().unwrap_or(' ');
        let stable = last_char == '1' || last_char == ' ' || last_char.is_ascii_digit();

        Ok(ScaleReading {
            weight_kg: weight_grams as f64 / 1000.0,
            weight_grams,
            stable,
            negative,
            overload: false,
            protocol: ScaleProtocol::Filizola,
        })
    }

    pub fn command_read() -> &'static [u8] {
        &[control::ENQ]
    }
}

/// Parser para protocolo Elgin
///
/// Similar ao Toledo mas com pequenas variações
mod elgin {
    use super::*;

    pub fn parse(data: &[u8]) -> HardwareResult<ScaleReading> {
        // Tenta parser Toledo primeiro (compatível)
        toledo::parse(data).map(|mut r| {
            r.protocol = ScaleProtocol::Elgin;
            r
        })
    }

    pub fn command_read() -> &'static [u8] {
        &[0x24] // $ para Elgin
    }
}

/// Parser para protocolo Urano
mod urano {
    use super::*;

    pub fn parse(data: &[u8]) -> HardwareResult<ScaleReading> {
        // Formato: PPPPPP onde P é peso em gramas
        let clean: String = data
            .iter()
            .filter(|&&b| b.is_ascii_digit())
            .map(|&b| b as char)
            .collect();

        if clean.len() < 4 {
            return Err(HardwareError::ProtocolError(
                "Resposta Urano muito curta".to_string(),
            ));
        }

        let weight_grams: u32 = clean.parse().unwrap_or(0);

        Ok(ScaleReading {
            weight_kg: weight_grams as f64 / 1000.0,
            weight_grams,
            stable: true,
            negative: false,
            overload: false,
            protocol: ScaleProtocol::Urano,
        })
    }

    pub fn command_read() -> &'static [u8] {
        &[control::ENQ]
    }
}

// ════════════════════════════════════════════════════════════════════════════
// BALANÇA
// ════════════════════════════════════════════════════════════════════════════

/// Interface da balança
pub struct Scale {
    config: ScaleConfig,
}

impl Scale {
    /// Cria nova instância da balança
    pub fn new(config: ScaleConfig) -> HardwareResult<Self> {
        if config.port.is_empty() {
            return Err(HardwareError::NotConfigured(
                "Porta da balança não configurada".into(),
            ));
        }
        Ok(Self { config })
    }

    /// Lê o peso da balança
    pub fn read_weight(&self) -> HardwareResult<ScaleReading> {
        if !self.config.enabled {
            return Err(HardwareError::NotConfigured(
                "Balança não habilitada".to_string(),
            ));
        }

        // Abre porta serial
        let mut port = serialport::new(&self.config.port, self.config.baud_rate)
            .data_bits(serialport::DataBits::Eight)
            .parity(serialport::Parity::None)
            .stop_bits(serialport::StopBits::One)
            .timeout(Duration::from_millis(500))
            .open()
            .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

        // Envia comando de leitura
        let cmd = match self.config.protocol {
            ScaleProtocol::Toledo => toledo::command_read(),
            ScaleProtocol::Filizola => filizola::command_read(),
            ScaleProtocol::Elgin => elgin::command_read(),
            ScaleProtocol::Urano => urano::command_read(),
            ScaleProtocol::Generic => &[control::ENQ],
        };

        port.write_all(cmd).map_err(HardwareError::IoError)?;

        // Aguarda resposta
        std::thread::sleep(Duration::from_millis(100));

        // Lê resposta
        let mut buffer = [0u8; 32];
        let bytes_read = port.read(&mut buffer).map_err(|e| {
            if e.kind() == std::io::ErrorKind::TimedOut {
                HardwareError::Timeout
            } else {
                HardwareError::IoError(e)
            }
        })?;

        let data = &buffer[..bytes_read];

        // Parse de acordo com protocolo
        match self.config.protocol {
            ScaleProtocol::Toledo => toledo::parse(data),
            ScaleProtocol::Filizola => filizola::parse(data),
            ScaleProtocol::Elgin => elgin::parse(data),
            ScaleProtocol::Urano => urano::parse(data),
            ScaleProtocol::Generic => {
                // Tenta todos os protocolos
                toledo::parse(data)
                    .or_else(|_| filizola::parse(data))
                    .or_else(|_| elgin::parse(data))
                    .or_else(|_| urano::parse(data))
            }
        }
    }

    /// Lê peso aguardando estabilização
    pub fn read_stable_weight(&self, max_attempts: u8) -> HardwareResult<ScaleReading> {
        for _ in 0..max_attempts {
            let reading = self.read_weight()?;

            if reading.stable && !reading.overload {
                return Ok(reading);
            }

            std::thread::sleep(Duration::from_millis(200));
        }

        Err(HardwareError::ScaleUnstable)
    }

    /// Testa conexão com a balança
    pub fn test_connection(&self) -> HardwareResult<bool> {
        match self.read_weight() {
            Ok(_) => Ok(true),
            Err(HardwareError::Timeout) => Ok(false),
            Err(e) => Err(e),
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// DETECÇÃO AUTOMÁTICA
// ════════════════════════════════════════════════════════════════════════════

/// Tenta detectar balança automaticamente
use tokio::time::{timeout, Duration as TokioDuration};

/// Resultado da detecção automática de balança
pub struct AutoDetectResult {
    pub config: Option<ScaleConfig>,
    pub failures: Vec<String>,
}

/// Versão assíncrona e tolerante a timeouts da detecção de balança
pub async fn auto_detect_scale_async() -> AutoDetectResult {
    let ports = super::list_serial_ports();
    let mut failures: Vec<String> = Vec::new();

    for port in ports {
        if port.contains("Bluetooth") || port.contains("ttyS") {
            failures.push(format!("Skipped port {}: unsupported name", port));
            continue;
        }

        // For each port, try detection in a blocking task with timeout
        let port_clone = port.clone();
        let timeout_res = timeout(TokioDuration::from_secs(3), tokio::task::spawn_blocking(move || {
            // Try known protocols
            for protocol in [
                ScaleProtocol::Toledo,
                ScaleProtocol::Filizola,
                ScaleProtocol::Elgin,
                ScaleProtocol::Urano,
            ] {
                let config = ScaleConfig {
                    enabled: true,
                    protocol: protocol.clone(),
                    port: port_clone.clone(),
                    baud_rate: 9600,
                    ..Default::default()
                };

                if let Ok(scale) = Scale::new(config.clone()) {
                    if let Ok(reading) = scale.read_weight() {
                        if reading.weight_grams < 50000 {
                            return Ok::<_, String>(Some(config));
                        }
                    }
                }
            }

            Ok::<_, String>(None)
        }))
        .await;

        match timeout_res {
            Ok(join_result) => match join_result {
                Ok(Ok(Some(config))) => return AutoDetectResult { config: Some(config), failures },
                Ok(Ok(None)) => failures.push(format!("No protocol matched on port {}", port)),
                Ok(Err(e)) => failures.push(format!("Error testing port {}: {}", port, e)),
                Err(join_err) => failures.push(format!("Join error testing port {}: {}", port, join_err)),
            },
            Err(_) => failures.push(format!("Timeout testing port {}", port)),
        }
    }

    AutoDetectResult { config: None, failures }
}

// ════════════════════════════════════════════════════════════════════════════
// CÓDIGOS PESADOS
// ════════════════════════════════════════════════════════════════════════════

/// Parser para código de barras pesado (prefixo 2)
///
/// Formato: 2PPPPP KKKKK C
/// - 2: Prefixo indicando produto pesado
/// - PPPPP: Código do produto (5 dígitos)
/// - KKKKK: Peso em gramas ou preço em centavos (5 dígitos)
/// - C: Dígito verificador
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightedBarcode {
    pub product_code: String,
    pub weight_grams: u32,
    pub price_cents: Option<u32>,
    pub is_weight: bool,
}

impl WeightedBarcode {
    /// Decodifica código de barras pesado
    pub fn decode(barcode: &str) -> Option<Self> {
        let clean: String = barcode.chars().filter(|c| c.is_ascii_digit()).collect();

        if clean.len() != 13 || !clean.starts_with('2') {
            return None;
        }

        let product_code = clean[1..6].to_string();
        let value: u32 = clean[6..11].parse().ok()?;

        // Detecta se é peso ou preço pelo primeiro dígito do código do produto
        // Códigos que começam com 0-4: peso
        // Códigos que começam com 5-9: preço
        let first_digit: u32 = clean[1..2].parse().ok()?;
        let is_weight = first_digit < 5;

        Some(Self {
            product_code,
            weight_grams: if is_weight { value } else { 0 },
            price_cents: if is_weight { None } else { Some(value) },
            is_weight,
        })
    }

    /// Peso em kg
    pub fn weight_kg(&self) -> f64 {
        self.weight_grams as f64 / 1000.0
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toledo_parse() {
        // STX + "001234" + status + ETX
        let data = [0x02, b'0', b'0', b'1', b'2', b'3', b'4', 0x20, 0x03];
        let reading = toledo::parse(&data).unwrap();

        assert_eq!(reading.weight_grams, 1234);
        assert_eq!(reading.weight_kg, 1.234);
        assert!(reading.stable);
    }

    #[test]
    fn test_weighted_barcode() {
        // Código pesado: produto 12345, peso 1.234kg
        let barcode = "2123451234050";
        let parsed = WeightedBarcode::decode(barcode).unwrap();

        assert_eq!(parsed.product_code, "12345");
        assert_eq!(parsed.weight_grams, 12340);
        assert!(parsed.is_weight);
    }

    #[test]
    fn test_weighted_barcode_price() {
        // Código de preço: produto 51234, preço R$ 12,34
        let barcode = "2512341234051";
        let parsed = WeightedBarcode::decode(barcode).unwrap();

        assert_eq!(parsed.product_code, "51234");
        assert!(!parsed.is_weight);
        assert_eq!(parsed.price_cents, Some(12340));
    }
}

// Implementação da trait HardwareDevice para Scale
impl crate::hardware::HardwareDevice for Scale {
    fn health_check(&self) -> Result<crate::hardware::HardwareStatus, String> {
        let name = format!("scale:{:?}", self.config.protocol);

        if !self.config.enabled {
            return Ok(crate::hardware::HardwareStatus {
                name,
                ok: false,
                message: Some("disabled".to_string()),
            });
        }

        match self.test_connection() {
            Ok(true) => Ok(crate::hardware::HardwareStatus { name, ok: true, message: Some("ok".to_string()) }),
            Ok(false) => Ok(crate::hardware::HardwareStatus { name, ok: false, message: Some("timeout or no response".to_string()) }),
            Err(e) => Ok(crate::hardware::HardwareStatus { name, ok: false, message: Some(format!("error: {}", e)) }),
        }
    }
}
