//! Módulo de Hardware - GIRO
//!
//! Integração com equipamentos:
//! - Impressoras térmicas (ESC/POS)
//! - Balanças (Toledo, Filizola)
//! - Scanner de código de barras (USB HID + Mobile WebSocket)
//! - Gaveta de dinheiro
//!
//! ## Arquitetura
//!
//! O módulo é organizado em:
//! - `manager.rs` - Gerenciador centralizado com autoconfig e health checks
//! - `printer.rs` - Interface ESC/POS para impressoras térmicas
//! - `printer_detector.rs` - Detector robusto de impressoras (Windows)
//! - `scale.rs` - Protocolos Toledo, Filizola, Elgin, Urano
//! - `scanner.rs` - WebSocket para scanner mobile
//! - `drawer.rs` - Controle de gaveta via impressora
//! - `device.rs` - Trait comum para dispositivos

pub mod device;
pub mod drawer;
pub mod manager;
pub mod printer;
pub mod scale;
pub mod scanner;
pub mod usb_vid_pid;

// Windows-specific native printer API
#[cfg(target_os = "windows")]
pub mod windows_printer;

// Novo detector robusto de impressoras
#[cfg(target_os = "windows")]
pub mod printer_detector;

// Detector USB via SetupAPI
#[cfg(target_os = "windows")]
pub mod usb_printer_detector;

pub use device::*;
pub use drawer::*;
pub use manager::*;
pub use printer::*;
pub use scale::*;
pub use scanner::*;

#[cfg(target_os = "windows")]
pub use windows_printer::*;

#[cfg(target_os = "windows")]
pub use printer_detector::{
    DetectionResult, DetectionSource, PrinterConnectionType, PrinterDetector,
    PrinterInfo as DetectorPrinterInfo,
};

#[cfg(target_os = "windows")]
pub use usb_printer_detector::{detect_usb_printers, UsbDetectionResult, UsbPrinterDevice};

// Exportamos apenas a função e o resultado (serializável), não a constante estática
pub use usb_vid_pid::{lookup_by_vid_pid, VidPidLookupResult};

use thiserror::Error;

/// Erros do módulo de hardware
#[derive(Error, Debug)]
pub enum HardwareError {
    #[error("Dispositivo não encontrado: {0}")]
    DeviceNotFound(String),

    #[error("Erro de comunicação: {0}")]
    CommunicationError(String),

    #[error("Falha na conexão: {0}")]
    ConnectionFailed(String),

    #[error("Dispositivo não configurado: {0}")]
    NotConfigured(String),

    #[error("Timeout de resposta")]
    Timeout,

    #[error("Porta serial inválida: {0}")]
    InvalidPort(String),

    #[error("Dispositivo ocupado: {0}")]
    DeviceBusy(String),

    #[error("Erro de protocolo: {0}")]
    ProtocolError(String),

    #[error("Impressora sem papel")]
    PrinterOutOfPaper,

    #[error("Impressora offline")]
    PrinterOffline,

    #[error("Balança instável")]
    ScaleUnstable,

    #[error("Sobrepeso na balança")]
    ScaleOverload,

    #[error("Peso inválido: {0}")]
    InvalidWeight(String),

    #[error("Erro de IO: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Erro de serialização: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Erro de parse: {0}")]
    ParseError(String),
}

impl serde::Serialize for HardwareError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Resultado padrão para operações de hardware
pub type HardwareResult<T> = Result<T, HardwareError>;

/// Lista portas seriais disponíveis no sistema
pub fn list_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
        .unwrap_or_default()
}

/// Verifica se uma porta serial existe
pub fn port_exists(port_name: &str) -> bool {
    serialport::available_ports()
        .map(|ports| ports.iter().any(|p| p.port_name == port_name))
        .unwrap_or(false)
}
