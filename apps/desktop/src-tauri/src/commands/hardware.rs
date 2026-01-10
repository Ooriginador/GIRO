//! Comandos Tauri para Hardware
//!
//! Expõe funcionalidades de hardware para o frontend React:
//! - Impressora térmica
//! - Balança
//! - Scanner de código de barras
//! - Gaveta de dinheiro

use crate::error::AppResult;
use crate::hardware::{
    self,
    drawer::{CashDrawer, DrawerConfig},
    printer::{PrinterConfig, Receipt, ThermalPrinter},
    scale::{Scale, ScaleConfig, ScaleReading},
    scanner::{MobileDevice, MobileScannerConfig, ScannerServerState},
    HardwareError,
};
use crate::services::mobile_server::MobileServer;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

// ════════════════════════════════════════════════════════════════════════════
// ESTADO DE HARDWARE
// ════════════════════════════════════════════════════════════════════════════

/// Estado compartilhado de hardware
pub struct HardwareState {
    pub printer_config: RwLock<PrinterConfig>,
    pub scale_config: RwLock<ScaleConfig>,
    pub drawer_config: RwLock<DrawerConfig>,
    pub scanner_server: RwLock<Option<Arc<ScannerServerState>>>,
    pub mobile_server: RwLock<Option<Arc<MobileServer>>>,
}

impl Default for HardwareState {
    fn default() -> Self {
        Self {
            printer_config: RwLock::new(PrinterConfig::default()),
            scale_config: RwLock::new(ScaleConfig::default()),
            drawer_config: RwLock::new(DrawerConfig::default()),
            scanner_server: RwLock::new(None),
            mobile_server: RwLock::new(None),
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE IMPRESSORA
// ════════════════════════════════════════════════════════════════════════════

/// Lista portas seriais disponíveis
#[tauri::command]
pub fn list_serial_ports() -> Vec<String> {
    hardware::list_serial_ports()
}

/// Verifica se uma porta existe
#[tauri::command]
pub fn check_port_exists(port: String) -> bool {
    hardware::port_exists(&port)
}

/// Configura a impressora
#[tauri::command]
pub async fn configure_printer(
    config: PrinterConfig,
    state: State<'_, HardwareState>,
) -> AppResult<()> {
    let mut printer_config = state.printer_config.write().await;
    *printer_config = config;
    Ok(())
}

/// Imprime cupom de venda
#[tauri::command]
pub async fn print_receipt(receipt: Receipt, state: State<'_, HardwareState>) -> AppResult<()> {
    let config = state.printer_config.read().await;

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.print_receipt(&receipt);
    printer.print_serial()?;

    Ok(())
}

/// Testa impressão
#[tauri::command]
pub async fn test_printer(state: State<'_, HardwareState>) -> AppResult<()> {
    let config = state.printer_config.read().await;

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.test_print()?;

    Ok(())
}

/// Retorna configuração atual da impressora
#[tauri::command]
pub async fn get_printer_config(state: State<'_, HardwareState>) -> AppResult<PrinterConfig> {
    let config = state.printer_config.read().await;
    Ok(config.clone())
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE BALANÇA
// ════════════════════════════════════════════════════════════════════════════

/// Configura a balança
#[tauri::command]
pub async fn configure_scale(
    config: ScaleConfig,
    state: State<'_, HardwareState>,
) -> AppResult<()> {
    let mut scale_config = state.scale_config.write().await;
    *scale_config = config;
    Ok(())
}

/// Lê peso da balança
#[tauri::command]
pub async fn read_weight(state: State<'_, HardwareState>) -> AppResult<ScaleReading> {
    let config = state.scale_config.read().await;

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Balança não habilitada".into()).into());
    }

    let scale = Scale::new(config.clone())?;
    let reading = scale.read_weight()?;

    Ok(reading)
}

/// Detecta automaticamente a balança
#[tauri::command]
pub async fn auto_detect_scale() -> AppResult<Option<ScaleConfig>> {
    Ok(hardware::scale::auto_detect_scale())
}

/// Retorna configuração atual da balança
#[tauri::command]
pub async fn get_scale_config(state: State<'_, HardwareState>) -> AppResult<ScaleConfig> {
    let config = state.scale_config.read().await;
    Ok(config.clone())
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE GAVETA
// ════════════════════════════════════════════════════════════════════════════

/// Configura a gaveta
#[tauri::command]
pub async fn configure_drawer(
    config: DrawerConfig,
    state: State<'_, HardwareState>,
) -> AppResult<()> {
    let mut drawer_config = state.drawer_config.write().await;
    *drawer_config = config;
    Ok(())
}

/// Abre a gaveta
#[tauri::command]
pub async fn open_drawer(state: State<'_, HardwareState>) -> AppResult<()> {
    let config = state.drawer_config.read().await;

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Gaveta não habilitada".into()).into());
    }

    let drawer = CashDrawer::new(config.clone());
    drawer.open()?;

    Ok(())
}

/// Retorna configuração atual da gaveta
#[tauri::command]
pub async fn get_drawer_config(state: State<'_, HardwareState>) -> AppResult<DrawerConfig> {
    let config = state.drawer_config.read().await;
    Ok(config.clone())
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE SCANNER
// ════════════════════════════════════════════════════════════════════════════

/// Inicia servidor WebSocket para scanner mobile
#[tauri::command]
pub async fn start_scanner_server(
    config: MobileScannerConfig,
    state: State<'_, HardwareState>,
    app_state: State<'_, crate::AppState>,
) -> AppResult<ScannerServerInfo> {
    let mut server = state.scanner_server.write().await;

    // Verifica se já está rodando
    if server.is_some() {
        return Err(HardwareError::DeviceBusy("Servidor de scanner já está rodando".into()).into());
    }

    // Obtém IP local
    let local_ip = hardware::scanner::get_local_ip().unwrap_or_else(|| "localhost".to_string());

    // Cria estado do servidor com pool de banco de dados para lookup de produtos
    let db_pool = (*app_state.db_pool).clone();
    let scanner_state = ScannerServerState::with_db_pool(config.clone(), db_pool);
    let scanner_state_clone = scanner_state.clone();

    // Inicia servidor em background
    tokio::spawn(async move {
        if let Err(e) = hardware::scanner::start_scanner_server(scanner_state_clone).await {
            tracing::error!("Erro no servidor de scanner: {}", e);
        }
    });

    *server = Some(scanner_state);

    Ok(ScannerServerInfo {
        running: true,
        ip: local_ip.clone(),
        port: config.port,
        url: format!("ws://{}:{}", local_ip, config.port),
    })
}

/// Para servidor de scanner
#[tauri::command]
pub async fn stop_scanner_server(state: State<'_, HardwareState>) -> AppResult<()> {
    let mut server = state.scanner_server.write().await;
    *server = None;
    Ok(())
}

/// Lista dispositivos mobile conectados
#[tauri::command]
pub async fn list_scanner_devices(state: State<'_, HardwareState>) -> AppResult<Vec<MobileDevice>> {
    let server = state.scanner_server.read().await;

    match server.as_ref() {
        Some(scanner_state) => {
            let devices = scanner_state.list_devices().await;
            Ok(devices)
        }
        None => Ok(vec![]),
    }
}

/// Retorna informações do servidor de scanner
#[tauri::command]
pub async fn get_scanner_server_info(
    state: State<'_, HardwareState>,
) -> AppResult<Option<ScannerServerInfo>> {
    let server = state.scanner_server.read().await;

    match server.as_ref() {
        Some(scanner_state) => {
            let local_ip =
                hardware::scanner::get_local_ip().unwrap_or_else(|| "localhost".to_string());

            Ok(Some(ScannerServerInfo {
                running: true,
                ip: local_ip.clone(),
                port: scanner_state.config.port,
                url: format!("ws://{}:{}", local_ip, scanner_state.config.port),
            }))
        }
        None => Ok(None),
    }
}

/// Gera QR Code para pareamento
#[tauri::command]
pub async fn generate_pairing_qr(state: State<'_, HardwareState>) -> AppResult<String> {
    let server = state.scanner_server.read().await;

    match server.as_ref() {
        Some(scanner_state) => {
            let local_ip =
                hardware::scanner::get_local_ip().unwrap_or_else(|| "localhost".to_string());

            Ok(hardware::scanner::generate_pairing_url(
                &local_ip,
                scanner_state.config.port,
            ))
        }
        None => {
            Err(HardwareError::NotConfigured("Servidor de scanner não está rodando".into()).into())
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

/// Informações do servidor de scanner
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannerServerInfo {
    pub running: bool,
    pub ip: String,
    pub port: u16,
    pub url: String,
}

// ════════════════════════════════════════════════════════════════════════════
// MACRO PARA REGISTRAR COMANDOS
// ════════════════════════════════════════════════════════════════════════════

/// Lista de todos os comandos de hardware
#[macro_export]
macro_rules! hardware_commands {
    () => {
        tauri::generate_handler![
            // Portas
            $crate::commands::hardware::list_serial_ports,
            $crate::commands::hardware::check_port_exists,
            // Impressora
            $crate::commands::hardware::configure_printer,
            $crate::commands::hardware::print_receipt,
            $crate::commands::hardware::test_printer,
            $crate::commands::hardware::get_printer_config,
            // Balança
            $crate::commands::hardware::configure_scale,
            $crate::commands::hardware::read_weight,
            $crate::commands::hardware::auto_detect_scale,
            $crate::commands::hardware::get_scale_config,
            // Gaveta
            $crate::commands::hardware::configure_drawer,
            $crate::commands::hardware::open_drawer,
            $crate::commands::hardware::get_drawer_config,
            // Scanner (legacy)
            $crate::commands::hardware::start_scanner_server,
            $crate::commands::hardware::stop_scanner_server,
            $crate::commands::hardware::list_scanner_devices,
            $crate::commands::hardware::get_scanner_server_info,
            $crate::commands::hardware::generate_pairing_qr,
            // Mobile Server comandos estão em mobile.rs
        ]
    };
}
