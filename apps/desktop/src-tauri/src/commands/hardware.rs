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
use crate::hardware::device::HardwareDevice;
use crate::services::mobile_server::MobileServer;
use qrcode::render::svg;
use qrcode::QrCode;
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
    // Handle do task do servidor de scanner (para permitir parada limpa)
    pub scanner_task: RwLock<Option<tokio::task::JoinHandle<()>>>,
    // ID da task do scanner (UUID) para monitoramento
    pub scanner_task_id: RwLock<Option<String>>,
    pub scanner_task_started_at: RwLock<Option<i64>>,
    pub mobile_server: RwLock<Option<Arc<MobileServer>>>,
}

impl Default for HardwareState {
    fn default() -> Self {
        Self {
            printer_config: RwLock::new(PrinterConfig::default()),
            scale_config: RwLock::new(ScaleConfig::default()),
            drawer_config: RwLock::new(DrawerConfig::default()),
            scanner_server: RwLock::new(None),
            scanner_task: RwLock::new(None),
            scanner_task_id: RwLock::new(None),
            scanner_task_started_at: RwLock::new(None),
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

/// Lista todas as portas de hardware relevantes (Serial + USB Printer no Linux)
#[tauri::command]
pub fn list_hardware_ports() -> Vec<String> {
    let mut ports = hardware::list_serial_ports();

    #[cfg(target_os = "linux")]
    {
        for i in 0..10 {
            let path = format!("/dev/usb/lp{}", i);
            if std::path::Path::new(&path).exists() {
                ports.push(path);
            }
            let path_lp = format!("/dev/lp{}", i);
            if std::path::Path::new(&path_lp).exists() {
                ports.push(path_lp);
            }
        }
    }

    ports.sort();
    ports.dedup();
    ports
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

    match config.connection {
        crate::hardware::printer::PrinterConnection::Usb => {
            printer.print_usb()?;
        }
        crate::hardware::printer::PrinterConnection::Serial => {
            printer.print_serial()?;
        }
        crate::hardware::printer::PrinterConnection::Network => {
            printer.print_network().await?;
        }
    }

    Ok(())
}

/// Imprime ordem de serviço
#[tauri::command]
pub async fn print_service_order(
    os: crate::hardware::printer::ServiceOrderReceipt,
    state: State<'_, HardwareState>,
) -> AppResult<()> {
    let config = state.printer_config.read().await;

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.print_service_order(&os);

    match config.connection {
        crate::hardware::printer::PrinterConnection::Usb => {
            printer.print_usb()?;
        }
        crate::hardware::printer::PrinterConnection::Serial => {
            printer.print_serial()?;
        }
        crate::hardware::printer::PrinterConnection::Network => {
            printer.print_network().await?;
        }
    }

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
    printer.test_print().await?;

    match config.connection {
        crate::hardware::printer::PrinterConnection::Usb => {
            printer.print_usb()?;
        }
        crate::hardware::printer::PrinterConnection::Serial => {
            printer.print_serial()?;
        }
        crate::hardware::printer::PrinterConnection::Network => {
            printer.print_network().await?;
        }
    }

    Ok(())
}

/// Imprime múltiplos documentos de teste (nota, ordem de serviço, relatório)
#[tauri::command]
pub async fn print_test_documents(state: State<'_, HardwareState>) -> AppResult<()> {
    let config = state.printer_config.read().await;

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let now = chrono::Local::now();
    let test_id = now.format("%Y%m%d-%H%M%S").to_string();

    let mut printer = ThermalPrinter::new(config.clone());
    printer.init();

    // NOTA (TESTE)
    printer.align(crate::hardware::printer::TextAlign::Center);
    printer.line("=== NOTA (TESTE) ===");
    printer.align(crate::hardware::printer::TextAlign::Left);
    printer.line("MERCEARIAS - TESTE DE IMPRESSAO");
    printer.line(&format!("ID: {}", test_id));
    printer.line(&format!("Data/Hora: {}", now.format("%d/%m/%Y %H:%M:%S")));
    printer.separator('-');
    printer.line("1x  Arroz 5kg                 25,90");
    printer.line("2x  Feijao 1kg                17,00");
    printer.line("1x  Cafe 500g                 14,50");
    printer.separator('-');
    printer.line("TOTAL                         57,40");
    printer.feed(1);
    printer.line("Barcode (EAN-13):");
    printer.barcode_ean13("7894900011517");
    printer.feed(1);
    printer.align(crate::hardware::printer::TextAlign::Center);
    printer.line("QR (TESTE):");
    printer.qrcode(&format!("TESTE-NOTA:{}", test_id));
    printer.feed(1);

    if config.auto_cut {
        printer.cut(true);
    } else {
        printer.feed(4);
    }

    // ORDEM DE SERVIÇO (TESTE)
    printer.init();
    printer.align(crate::hardware::printer::TextAlign::Center);
    printer.line("=== ORDEM DE SERVICO (TESTE) ===");
    printer.align(crate::hardware::printer::TextAlign::Left);
    printer.line(&format!("OS: {}", test_id));
    printer.line("Cliente: Joao da Silva");
    printer.line("Telefone: (11) 99999-9999");
    printer.separator('-');
    printer.line("Descricao:");
    printer.line("- Troca de cabo e revisao");
    printer.line("- Limpeza e testes gerais");
    printer.feed(1);
    printer.line("Itens:");
    printer.line("1x Cabo USB-C                19,90");
    printer.line("1x Mao de obra               50,00");
    printer.separator('-');
    printer.line("TOTAL                         69,90");
    printer.feed(1);
    printer.align(crate::hardware::printer::TextAlign::Center);
    printer.qrcode(&format!("TESTE-OS:{}", test_id));
    printer.feed(1);

    if config.auto_cut {
        printer.cut(true);
    } else {
        printer.feed(4);
    }

    // RELATÓRIO (TESTE)
    printer.init();
    printer.align(crate::hardware::printer::TextAlign::Center);
    printer.line("=== RELATORIO (TESTE) ===");
    printer.align(crate::hardware::printer::TextAlign::Left);
    printer.line("Vendas (exemplo):");
    printer.line("- Dinheiro:  R$ 150,00");
    printer.line("- Pix:       R$ 320,50");
    printer.line("- Cartao:    R$ 980,00");
    printer.separator('-');
    printer.line("Total:       R$ 1.450,50");
    printer.feed(1);
    printer.align(crate::hardware::printer::TextAlign::Center);
    printer.line("FIM DO TESTE");
    printer.feed(2);

    if config.auto_cut {
        printer.cut(true);
    } else {
        printer.feed(4);
    }

    match config.connection {
        crate::hardware::printer::PrinterConnection::Usb => {
            printer.print_usb()?;
        }
        crate::hardware::printer::PrinterConnection::Serial => {
            printer.print_serial()?;
        }
        crate::hardware::printer::PrinterConnection::Network => {
            printer.print_network().await?;
        }
    }

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
pub async fn auto_detect_scale() -> AppResult<ScaleAutoDetectInfo> {
    // Calls the async detector and returns detected config plus failures
    let result = hardware::scale::auto_detect_scale_async().await;

    Ok(ScaleAutoDetectInfo {
        config: result.config,
        failures: result.failures,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScaleAutoDetectInfo {
    pub config: Option<ScaleConfig>,
    pub failures: Vec<String>,
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

/// Health check agregado de hardware (impressora, balança, scanner)
#[tauri::command]
pub async fn hardware_health_check(
    state: State<'_, HardwareState>,
) -> AppResult<Vec<crate::hardware::HardwareStatus>> {
    let mut results: Vec<crate::hardware::HardwareStatus> = Vec::new();

    // Printer
    let printer_cfg = { (*state.printer_config.read().await).clone() };
    let printer_status = tokio::task::spawn_blocking(move || {
        let printer = crate::hardware::printer::ThermalPrinter::new(printer_cfg);
        printer.health_check()
    })
    .await
    .map_err(|e| HardwareError::CommunicationError(format!("task join error: {}", e)))?;

    match printer_status {
        Ok(s) => results.push(s),
        Err(msg) => results.push(crate::hardware::HardwareStatus { name: "printer".into(), ok: false, message: Some(msg) }),
    }

    // Scale
    let scale_cfg = { (*state.scale_config.read().await).clone() };
    let scale_status = tokio::task::spawn_blocking(move || {
        match crate::hardware::scale::Scale::new(scale_cfg.clone()) {
            Ok(scale) => scale.health_check(),
            Err(e) => Err(format!("init error: {}", e)),
        }
    })
    .await
    .map_err(|e| HardwareError::CommunicationError(format!("task join error: {}", e)))?;

    match scale_status {
        Ok(s) => results.push(s),
        Err(msg) => results.push(crate::hardware::HardwareStatus { name: "scale".into(), ok: false, message: Some(msg) }),
    }

    // Scanner
    let scanner_server_opt = state.scanner_server.read().await.clone();
    let task_id_opt = state.scanner_task_id.read().await.clone();

    if let Some(scanner) = scanner_server_opt {
        let devices = scanner.list_devices().await;
        results.push(crate::hardware::HardwareStatus {
            name: "scanner:ws".to_string(),
            ok: true,
            message: Some(format!("running devices={} task_id={:?}", devices.len(), task_id_opt)),
        });
    } else {
        results.push(crate::hardware::HardwareStatus {
            name: "scanner:ws".into(),
            ok: false,
            message: Some("not running".into()),
        });
    }

    Ok(results)
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

    // Spawn server task and keep handle + id to allow clean shutdown and monitoring
    let task_id = uuid::Uuid::new_v4().to_string();
    let task_id_move = task_id.clone();
    let handle = tokio::spawn(async move {
        tracing::info!("Scanner server task {} started", task_id_move);
        if let Err(e) = hardware::scanner::start_scanner_server(scanner_state_clone).await {
            tracing::error!("Erro no servidor de scanner: {}", e);
        }
        tracing::info!("Scanner server task {} ended", task_id_move);
    });

    *server = Some(scanner_state);

    // Store the JoinHandle and id so we can abort it on stop
    {
        let mut task_slot = state.scanner_task.write().await;
        *task_slot = Some(handle);
    }
    {
        let mut id_slot = state.scanner_task_id.write().await;
        *id_slot = Some(task_id.clone());
    }
    {
        let mut started_slot = state.scanner_task_started_at.write().await;
        *started_slot = Some(chrono::Utc::now().timestamp_millis());
    }

    Ok(ScannerServerInfo {
        running: true,
        ip: local_ip.clone(),
        port: config.port,
        url: format!("ws://{}:{}", local_ip, config.port),
        started_at: chrono::Utc::now().timestamp_millis(),
        task_id: Some(task_id),
    })
}

/// Para servidor de scanner
#[tauri::command]
pub async fn stop_scanner_server(state: State<'_, HardwareState>) -> AppResult<()> {
    // Abort task if running
    {
        let mut task_slot = state.scanner_task.write().await;
        if let Some(handle) = task_slot.take() {
            // Abort and detach
            handle.abort();
        }
    }

    // Clear task id and started_at
    {
        let mut id_slot = state.scanner_task_id.write().await;
        *id_slot = None;
    }
    {
        let mut started_slot = state.scanner_task_started_at.write().await;
        *started_slot = None;
    }

    // Clear server state
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

            let task_id = state.scanner_task_id.read().await.clone();
            let started_at = (*state.scanner_task_started_at.read().await).unwrap_or(0);

            Ok(Some(ScannerServerInfo {
                running: true,
                ip: local_ip.clone(),
                port: scanner_state.config.port,
                url: format!("ws://{}:{}", local_ip, scanner_state.config.port),
                started_at,
                task_id,
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

/// Inicia leitor serial
#[tauri::command]
pub async fn start_serial_scanner(
    port: String,
    baud: u32,
    state: State<'_, HardwareState>,
    app_state: State<'_, crate::AppState>,
) -> AppResult<()> {
    let mut scanner_server = state.scanner_server.write().await;

    // Se o estado não existir, inicializa um padrão (sem servidor WS)
    if scanner_server.is_none() {
        let db_pool = (*app_state.db_pool).clone();
        let config = MobileScannerConfig {
            enabled: true,
            ..Default::default()
        };
        *scanner_server = Some(ScannerServerState::with_db_pool(config, db_pool));
    }

    if let Some(scanner_state) = scanner_server.as_ref() {
        hardware::scanner::start_serial_scanner(scanner_state.clone(), &port, baud)?;
        Ok(())
    } else {
        Err(HardwareError::NotConfigured("Falha ao inicializar estado do scanner".into()).into())
    }
}

/// Gera QR Code em SVG para exibir no frontend (teste de leitura)
#[tauri::command]
pub fn generate_qr_svg(data: String) -> AppResult<String> {
    let code = QrCode::new(data.as_bytes())
        .map_err(|e| HardwareError::ProtocolError(format!("Erro ao gerar QR Code: {}", e)))?;

    let svg = code
        .render()
        .min_dimensions(220, 220)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .build();

    Ok(svg)
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
    pub started_at: i64,
    pub task_id: Option<String>,
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
            $crate::commands::hardware::list_hardware_ports,
            $crate::commands::hardware::check_port_exists,
            // Impressora
            $crate::commands::hardware::configure_printer,
            $crate::commands::hardware::print_receipt,
            $crate::commands::hardware::print_service_order,
            $crate::commands::hardware::test_printer,
            $crate::commands::hardware::print_test_documents,
            $crate::commands::hardware::get_printer_config,
            // Balança
            $crate::commands::hardware::configure_scale,
            $crate::commands::hardware::read_weight,
            $crate::commands::hardware::hardware_health_check,
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
            $crate::commands::hardware::generate_qr_svg,
            $crate::commands::hardware::start_serial_scanner,
            // Mobile Server comandos estão em mobile.rs
        ]
    };
}
