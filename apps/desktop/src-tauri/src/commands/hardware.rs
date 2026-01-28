//! Comandos Tauri para Hardware
//!
//! Expõe funcionalidades de hardware para o frontend React:
//! - Impressora térmica
//! - Balança
//! - Scanner de código de barras
//! - Gaveta de dinheiro

use crate::error::AppResult;
use crate::hardware::device::HardwareDevice;
use crate::hardware::{
    self,
    drawer::{CashDrawer, DrawerConfig},
    printer::{PrinterConfig, Receipt, ThermalPrinter},
    scale::{Scale, ScaleConfig, ScaleReading},
    scanner::{MobileDevice, MobileScannerConfig, ScannerServerState},
    HardwareError,
};
use crate::services::mobile_server::MobileServer;
use crate::AppState;
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
    pub scanner_task_started_at: RwLock<Option<f64>>,
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
#[specta::specta]
pub fn list_serial_ports() -> Vec<String> {
    hardware::list_serial_ports()
}

/// Lista todas as portas de hardware relevantes (Serial + USB Printer no Linux + Impressoras Windows)
#[tauri::command]
#[specta::specta]
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

    #[cfg(target_os = "windows")]
    {
        use crate::utils::windows::{run_powershell, run_wmic};

        // Método 1: PowerShell Get-Printer (Windows 8+)
        if let Ok(output) = run_powershell("Get-Printer | Select-Object -ExpandProperty Name") {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines() {
                    let name = line.trim();
                    if !name.is_empty() {
                        // Formata como caminho UNC local
                        ports.push(format!("\\\\localhost\\{}", name));
                    }
                }
            }
        }

        // Método 2: WMIC (compatibilidade com Windows mais antigos)
        if let Ok(output) = run_wmic(["printer", "get", "name"]) {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines().skip(1) {
                    // Skip header
                    let name = line.trim();
                    if !name.is_empty() && name != "Name" {
                        let unc_path = format!("\\\\localhost\\{}", name);
                        if !ports.contains(&unc_path) {
                            ports.push(unc_path);
                        }
                    }
                }
            }
        }

        // Método 3: Verificar portas USB virtuais comuns criadas por drivers de impressora
        // Muitas impressoras térmicas USB criam portas virtuais USB001, USB002, etc.
        for i in 1..=10 {
            let usb_port = format!("USB{:03}", i);
            ports.push(usb_port);
        }

        // Adiciona opções comuns de LPT
        for i in 1..=3 {
            ports.push(format!("LPT{}", i));
        }
    }

    ports.sort();
    ports.dedup();

    // Check for thermal candidates and mark/sort them
    let mut prioritized_ports = Vec::new();
    let mut other_ports = Vec::new();

    for port in ports {
        if ThermalPrinter::is_thermal_candidate(&port) {
            prioritized_ports.push(port);
        } else {
            other_ports.push(port);
        }
    }

    // Return prioritized first
    [prioritized_ports, other_ports].concat()
}

/// Verifica se uma porta existe
#[tauri::command]
#[specta::specta]
pub fn check_port_exists(port: String) -> bool {
    hardware::port_exists(&port)
}

/// Configura a impressora
#[tauri::command]
#[specta::specta]
pub async fn configure_printer(
    config: PrinterConfig,
    state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
) -> AppResult<()> {
    state.session.require_authenticated()?;
    let mut printer_config = hw_state.printer_config.write().await;
    *printer_config = config.clone();

    // Persist to database
    let repo = crate::repositories::SettingsRepository::new(state.pool());
    repo.set(crate::models::SetSetting {
        key: "hardware.printer.config".into(),
        value: serde_json::to_string(&config).unwrap_or_default(),
        value_type: Some("JSON".into()),
        group_name: Some("hardware".into()),
        description: Some("Configuração da impressora térmica".into()),
    })
    .await?;

    Ok(())
}

/// Imprime cupom de venda
#[tauri::command]
#[specta::specta]
pub async fn print_receipt(
    receipt: Receipt,
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.printer_config.read().await;
        (*guard).clone()
    };

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.print_receipt(&receipt);
    // Clone config to owned value for the thread
    let printer_config = config.clone();

    if printer_config.connection == crate::hardware::printer::PrinterConnection::Network {
        printer.print_network().await?;
    } else {
        // Run blocking IO in a separate thread
        tokio::task::spawn_blocking(move || -> AppResult<()> {
            match printer_config.connection {
                crate::hardware::printer::PrinterConnection::Usb => {
                    printer.print_usb()?;
                }
                crate::hardware::printer::PrinterConnection::Serial => {
                    printer.print_serial()?;
                }
                _ => {}
            }
            Ok(())
        })
        .await
        .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;
    }

    Ok(())
}

/// Imprime cupom de venda buscando pelo ID
#[tauri::command]
#[specta::specta]
pub async fn print_sale_by_id(
    sale_id: String,
    state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
) -> AppResult<()> {
    state.session.require_authenticated()?;
    // 1. Buscar Venda
    let sale_repo = crate::repositories::SaleRepository::new(state.pool());
    let sale = sale_repo
        .find_with_details(&sale_id)
        .await?
        .ok_or_else(|| crate::error::AppError::NotFound {
            entity: "Sale".into(),
            id: sale_id,
        })?;

    // 2. Buscar Informações da Empresa
    let settings_repo = crate::repositories::SettingsRepository::new(state.pool());
    let company_name = settings_repo
        .get_value("company.name")
        .await?
        .unwrap_or_else(|| "Minha Empresa".into());
    let company_address = settings_repo
        .get_value("company.address")
        .await?
        .unwrap_or_else(|| "".into());
    let company_cnpj = settings_repo.get_value("company.cnpj").await?;
    let company_phone = settings_repo.get_value("company.phone").await?;

    // 3. Construir Recibo
    // 3. Construir Recibo
    let items = sale
        .items
        .iter()
        .map(|item| crate::hardware::printer::ReceiptItem {
            code: item.product_barcode.clone().unwrap_or_default(),
            name: item.product_name.clone(),
            quantity: item.quantity,
            unit: item.product_unit.clone(),
            unit_price: item.unit_price,
            total: item.total,
        })
        .collect();

    let receipt = Receipt {
        company_name,
        company_address,
        company_cnpj,
        company_phone,
        sale_number: sale.sale.daily_number,
        operator_name: sale
            .employee_name
            .clone()
            .unwrap_or_else(|| "Operador".into()),
        date_time: sale.sale.created_at.clone(),
        items,
        subtotal: sale.sale.subtotal,
        discount: sale.sale.discount_value,
        total: sale.sale.total,
        payment_method: sale.sale.payment_method.clone(),
        amount_paid: sale.sale.amount_paid,
        change: sale.sale.change,
    };

    // 4. Imprimir
    print_receipt(receipt, hw_state, state).await
}

/// Imprime ordem de serviço
#[tauri::command]
#[specta::specta]
pub async fn print_service_order(
    os: crate::hardware::printer::ServiceOrderReceipt,
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.printer_config.read().await;
        (*guard).clone()
    };

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.print_service_order(&os);
    let printer_config = config.clone();

    if printer_config.connection == crate::hardware::printer::PrinterConnection::Network {
        printer.print_network().await?;
    } else {
        tokio::task::spawn_blocking(move || -> AppResult<()> {
            match printer_config.connection {
                crate::hardware::printer::PrinterConnection::Usb => {
                    printer.print_usb()?;
                }
                crate::hardware::printer::PrinterConnection::Serial => {
                    printer.print_serial()?;
                }
                _ => {}
            }
            Ok(())
        })
        .await
        .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;
    }

    Ok(())
}

/// Imprime pedido do atendente (para cliente apresentar no caixa)
#[tauri::command]
#[specta::specta]
pub async fn print_attendant_order(
    order: crate::hardware::printer::AttendantOrderReceipt,
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.printer_config.read().await;
        (*guard).clone()
    };

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.print_attendant_order(&order);
    let printer_config = config.clone();

    if printer_config.connection == crate::hardware::printer::PrinterConnection::Network {
        printer.print_network().await?;
    } else {
        tokio::task::spawn_blocking(move || -> AppResult<()> {
            match printer_config.connection {
                crate::hardware::printer::PrinterConnection::Usb => {
                    printer.print_usb()?;
                }
                crate::hardware::printer::PrinterConnection::Serial => {
                    printer.print_serial()?;
                }
                _ => {}
            }
            Ok(())
        })
        .await
        .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;
    }

    Ok(())
}

/// Testa impressão
#[tauri::command]
#[specta::specta]
pub async fn test_printer(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.printer_config.read().await;
        (*guard).clone()
    };

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Impressora não habilitada".into()).into());
    }

    let mut printer = ThermalPrinter::new(config.clone());
    printer.build_test_page();
    let printer_config = config.clone();

    if printer_config.connection == crate::hardware::printer::PrinterConnection::Network {
        printer.print_network().await?;
    } else {
        tokio::task::spawn_blocking(move || -> AppResult<()> {
            match printer_config.connection {
                crate::hardware::printer::PrinterConnection::Usb => {
                    printer.print_usb()?;
                }
                crate::hardware::printer::PrinterConnection::Serial => {
                    printer.print_serial()?;
                }
                _ => {}
            }
            Ok(())
        })
        .await
        .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;
    }

    Ok(())
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn test_printer_connection(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<bool> {
    match test_printer(state, app_state).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Imprime múltiplos documentos de teste (nota, ordem de serviço, relatório)
#[tauri::command]
#[specta::specta]
pub async fn print_test_documents(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.printer_config.read().await;
        (*guard).clone()
    };

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

    if config.connection == crate::hardware::printer::PrinterConnection::Network {
        printer.print_network().await?;
    } else {
        tokio::task::spawn_blocking(move || -> AppResult<()> {
            match config.connection {
                crate::hardware::printer::PrinterConnection::Usb => {
                    printer.print_usb()?;
                }
                crate::hardware::printer::PrinterConnection::Serial => {
                    printer.print_serial()?;
                }
                _ => {}
            }
            Ok(())
        })
        .await
        .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;
    }

    Ok(())
}

/// Retorna configuração atual da impressora
#[tauri::command]
#[specta::specta]
pub async fn get_printer_config(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<PrinterConfig> {
    app_state.session.require_authenticated()?;
    let config = state.printer_config.read().await;
    Ok(config.clone())
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE BALANÇA
// ════════════════════════════════════════════════════════════════════════════

/// Configura a balança
#[tauri::command]
#[specta::specta]
pub async fn configure_scale(
    config: ScaleConfig,
    state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
) -> AppResult<()> {
    state.session.require_authenticated()?;
    let mut scale_config = hw_state.scale_config.write().await;
    *scale_config = config.clone();

    // Persist to database
    let repo = crate::repositories::SettingsRepository::new(state.pool());
    repo.set(crate::models::SetSetting {
        key: "hardware.scale.config".into(),
        value: serde_json::to_string(&config).unwrap_or_default(),
        value_type: Some("JSON".into()),
        group_name: Some("hardware".into()),
        description: Some("Configuração da balança serial".into()),
    })
    .await?;

    Ok(())
}

/// Lê peso da balança
#[tauri::command]
#[specta::specta]
pub async fn read_weight(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<ScaleReading> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.scale_config.read().await;
        (*guard).clone()
    };

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Balança não habilitada".into()).into());
    }

    let scale = Scale::new(config.clone())?;

    // Scale read is blocking, wrap in spawn_blocking
    let reading = tokio::task::spawn_blocking(move || -> AppResult<ScaleReading> {
        Ok(scale.read_weight()?)
    })
    .await
    .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;

    Ok(reading)
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn read_scale_weight(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<f64> {
    let reading = read_weight(state, app_state).await?;
    Ok(reading.weight_kg)
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn test_scale_connection(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<bool> {
    match read_weight(state, app_state).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Detecta automaticamente a balança
#[tauri::command]
#[specta::specta]
pub async fn auto_detect_scale(state: State<'_, AppState>) -> AppResult<ScaleAutoDetectInfo> {
    state.session.require_authenticated()?;
    // Calls the async detector and returns detected config plus failures
    let result = hardware::scale::auto_detect_scale_async().await;

    Ok(ScaleAutoDetectInfo {
        config: result.config,
        failures: result.failures,
    })
}

/// Detecta automaticamente a impressora (Windows)
#[tauri::command]
#[specta::specta]
pub async fn auto_detect_printer_async(
    state: State<'_, AppState>,
) -> AppResult<PrinterAutoDetectInfo> {
    state.session.require_authenticated()?;

    let mut config: Option<PrinterConfig> = None;
    let mut candidates = Vec::new();
    let mut logs = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use crate::utils::windows::run_powershell;

        logs.push("Iniciando busca de impressoras via PowerShell...".to_string());

        // Busca todas as impressoras
        match run_powershell(
            "Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus",
        ) {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines().skip(3) {
                    // Skip headers
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }

                    // A saída do PowerShell pode variar, mas geralmente o Name é o primeiro
                    // Vamos tentar uma abordagem mais robusta buscando nomes conhecidos

                    if ThermalPrinter::is_thermal_candidate(line) {
                        // Extrai o nome da impressora (simplificado)
                        // Em uma saída formatada do PS, o nome é o primeiro campo
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if let Some(name) = parts.first() {
                            let printer_name = name.to_string();
                            logs.push(format!("Candidato encontrado: {}", printer_name));
                            candidates.push(printer_name);
                        }
                    }
                }
            }
            Err(e) => logs.push(format!("Erro ao executar PowerShell: {}", e)),
        }

        // Se encontrou candidatos, pega o primeiro
        if let Some(best_match) = candidates.first() {
            logs.push(format!("Selecionando melhor candidato: {}", best_match));

            // Tenta determinar o modelo
            let model = if best_match.to_lowercase().contains("epson") {
                crate::hardware::printer::PrinterModel::Epson
            } else if best_match.to_lowercase().contains("bematech") {
                crate::hardware::printer::PrinterModel::Bematech
            } else if best_match.to_lowercase().contains("elgin") {
                crate::hardware::printer::PrinterModel::Elgin
            } else if best_match.to_lowercase().contains("c3tech") {
                crate::hardware::printer::PrinterModel::C3Tech
            } else {
                crate::hardware::printer::PrinterModel::Generic
            };

            config = Some(PrinterConfig {
                enabled: true,
                model,
                connection: crate::hardware::printer::PrinterConnection::Usb, // Windows Spooler usa "USB" ou direto
                port: best_match.clone(), // Nome da impressora para Spooler
                ..Default::default()
            });
        } else {
            logs.push("Nenhuma impressora térmica detectada.".to_string());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        logs.push("Auto-detecção disponível apenas para Windows no momento.".to_string());
    }

    Ok(PrinterAutoDetectInfo {
        config,
        candidates,
        logs,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PrinterAutoDetectInfo {
    pub config: Option<PrinterConfig>,
    pub candidates: Vec<String>,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScaleAutoDetectInfo {
    pub config: Option<ScaleConfig>,
    pub failures: Vec<String>,
}

/// Retorna configuração atual da balança
#[tauri::command]
#[specta::specta]
pub async fn get_scale_config(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<ScaleConfig> {
    app_state.session.require_authenticated()?;
    let config = state.scale_config.read().await;
    Ok(config.clone())
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE GAVETA
// ════════════════════════════════════════════════════════════════════════════

/// Configura a gaveta
#[tauri::command]
#[specta::specta]
pub async fn configure_drawer(
    config: DrawerConfig,
    state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
) -> AppResult<()> {
    state.session.require_authenticated()?;
    let mut drawer_config = hw_state.drawer_config.write().await;
    *drawer_config = config.clone();

    // Persist to database
    let repo = crate::repositories::SettingsRepository::new(state.pool());
    repo.set(crate::models::SetSetting {
        key: "hardware.drawer.config".into(),
        value: serde_json::to_string(&config).unwrap_or_default(),
        value_type: Some("JSON".into()),
        group_name: Some("hardware".into()),
        description: Some("Configuração da gaveta de dinheiro".into()),
    })
    .await?;

    Ok(())
}

/// Abre a gaveta
#[tauri::command]
#[specta::specta]
pub async fn open_drawer(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let config = {
        let guard = state.drawer_config.read().await;
        (*guard).clone()
    };

    if !config.enabled {
        return Err(HardwareError::NotConfigured("Gaveta não habilitada".into()).into());
    }

    let drawer = CashDrawer::new(config.clone());

    // Drawer open can be blocking depending on connection (Serial/USB)
    // Network is async but currently CashDrawer::open_network is not used here?
    // Wait, let's check if we need to split network.
    // CashDrawer::open handles its own logic, but let's assume valid config.
    // If it's a printer-driven drawer, it shares printer connection logic.
    // `drawer.open()` is sync.

    tokio::task::spawn_blocking(move || -> AppResult<()> {
        drawer.open()?;
        Ok(())
    })
    .await
    .map_err(|e| HardwareError::CommunicationError(format!("Task error: {}", e)))??;

    Ok(())
}

// Alias para compatibilidade com frontend
#[tauri::command]
#[specta::specta]
pub async fn open_cash_drawer(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    open_drawer(state, app_state).await
}

/// Retorna configuração atual da gaveta
#[tauri::command]
#[specta::specta]
pub async fn get_drawer_config(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<DrawerConfig> {
    app_state.session.require_authenticated()?;
    let config = state.drawer_config.read().await;
    Ok(config.clone())
}

/// Health check agregado de hardware (impressora, balança, scanner)
#[tauri::command]
#[specta::specta]
pub async fn hardware_health_check(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<crate::hardware::HardwareStatus>> {
    app_state.session.require_authenticated()?;
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
        Err(msg) => results.push(crate::hardware::HardwareStatus {
            name: "printer".into(),
            ok: false,
            message: Some(msg),
        }),
    }

    // Scale
    let scale_cfg = { (*state.scale_config.read().await).clone() };
    let scale_status =
        tokio::task::spawn_blocking(move || {
            match crate::hardware::scale::Scale::new(scale_cfg.clone()) {
                Ok(scale) => scale.health_check(),
                Err(e) => Err(format!("init error: {}", e)),
            }
        })
        .await
        .map_err(|e| HardwareError::CommunicationError(format!("task join error: {}", e)))?;

    match scale_status {
        Ok(s) => results.push(s),
        Err(msg) => results.push(crate::hardware::HardwareStatus {
            name: "scale".into(),
            ok: false,
            message: Some(msg),
        }),
    }

    // Scanner
    let scanner_server_opt = state.scanner_server.read().await.clone();
    let task_id_opt = state.scanner_task_id.read().await.clone();

    if let Some(scanner) = scanner_server_opt {
        let devices = scanner.list_devices().await;
        results.push(crate::hardware::HardwareStatus {
            name: "scanner:ws".to_string(),
            ok: true,
            message: Some(format!(
                "running devices={} task_id={:?}",
                devices.len(),
                task_id_opt
            )),
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
#[specta::specta]
pub async fn start_scanner_server(
    config: MobileScannerConfig,
    state: State<'_, HardwareState>,
    app_state: State<'_, crate::AppState>,
) -> AppResult<ScannerServerInfo> {
    app_state.session.require_authenticated()?;
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
        *started_slot = Some(chrono::Utc::now().timestamp_millis() as f64);
    }

    Ok(ScannerServerInfo {
        running: true,
        ip: local_ip.clone(),
        port: config.port,
        url: format!("ws://{}:{}", local_ip, config.port),
        started_at: chrono::Utc::now().timestamp_millis() as f64,
        task_id: Some(task_id),
    })
}

/// Para servidor de scanner
#[tauri::command]
#[specta::specta]
pub async fn stop_scanner_server(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
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
#[specta::specta]
pub async fn list_scanner_devices(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<MobileDevice>> {
    app_state.session.require_authenticated()?;
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
#[specta::specta]
pub async fn get_scanner_server_info(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<Option<ScannerServerInfo>> {
    app_state.session.require_authenticated()?;
    let server = state.scanner_server.read().await;

    match server.as_ref() {
        Some(scanner_state) => {
            let local_ip =
                hardware::scanner::get_local_ip().unwrap_or_else(|| "localhost".to_string());

            let task_id = state.scanner_task_id.read().await.clone();
            let started_at = (*state.scanner_task_started_at.read().await).unwrap_or(0.0);

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
#[specta::specta]
pub async fn generate_pairing_qr(
    state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<String> {
    app_state.session.require_authenticated()?;
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
#[specta::specta]
pub async fn start_serial_scanner(
    port: String,
    baud: u32,
    state: State<'_, HardwareState>,
    app_state: State<'_, crate::AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
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
#[specta::specta]
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
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScannerServerInfo {
    pub running: bool,
    pub ip: String,
    pub port: u16,
    pub url: String,
    pub started_at: f64,
    pub task_id: Option<String>,
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS DE AUTO-DETECÇÃO E GERENCIAMENTO
// ════════════════════════════════════════════════════════════════════════════

/// Detecta automaticamente todos os dispositivos de hardware
#[tauri::command]
#[specta::specta]
pub async fn auto_detect_hardware(
    app_state: State<'_, AppState>,
) -> AppResult<hardware::AutoDetectResult> {
    app_state.session.require_authenticated()?;

    // Wrap in catch_unwind to prevent panics from crashing the app
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tokio::runtime::Handle::current().block_on(async {
            let manager = hardware::HardwareManager::new();
            manager.auto_detect_all().await
        })
    }));

    match result {
        Ok(r) => Ok(r),
        Err(_) => {
            tracing::error!("Hardware auto-detection panicked");
            Ok(hardware::AutoDetectResult {
                devices: vec![],
                errors: vec!["Erro interno na detecção de hardware".to_string()],
                duration_ms: 0,
            })
        }
    }
}

/// Retorna visão geral do status de todos os dispositivos
#[tauri::command]
#[specta::specta]
pub async fn get_hardware_overview(
    hw_state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<HardwareOverviewResponse> {
    app_state.session.require_authenticated()?;

    // Build overview from current HardwareState
    let printer_cfg = hw_state.printer_config.read().await;
    let scale_cfg = hw_state.scale_config.read().await;
    let drawer_cfg = hw_state.drawer_config.read().await;
    let scanner_server = hw_state.scanner_server.read().await;

    let printer_status = if printer_cfg.mock_mode {
        "mock"
    } else if printer_cfg.enabled {
        "configured"
    } else {
        "not_configured"
    };

    let scale_status = if scale_cfg.mock_mode {
        "mock"
    } else if scale_cfg.enabled {
        "configured"
    } else {
        "not_configured"
    };

    let drawer_status = if drawer_cfg.mock_mode {
        "mock"
    } else if drawer_cfg.enabled {
        "configured"
    } else {
        "not_configured"
    };

    let scanner_status = if scanner_server.is_some() {
        "running"
    } else {
        "stopped"
    };

    Ok(HardwareOverviewResponse {
        printer: DeviceOverview {
            status: printer_status.to_string(),
            port: if printer_cfg.port.is_empty() {
                None
            } else {
                Some(printer_cfg.port.clone())
            },
            model: Some(format!("{:?}", printer_cfg.model)),
            enabled: printer_cfg.enabled,
            mock_mode: printer_cfg.mock_mode,
        },
        scale: DeviceOverview {
            status: scale_status.to_string(),
            port: if scale_cfg.port.is_empty() {
                None
            } else {
                Some(scale_cfg.port.clone())
            },
            model: Some(format!("{:?}", scale_cfg.protocol)),
            enabled: scale_cfg.enabled,
            mock_mode: scale_cfg.mock_mode,
        },
        drawer: DeviceOverview {
            status: drawer_status.to_string(),
            port: if drawer_cfg.printer_port.is_empty() {
                None
            } else {
                Some(drawer_cfg.printer_port.clone())
            },
            model: None,
            enabled: drawer_cfg.enabled,
            mock_mode: drawer_cfg.mock_mode,
        },
        scanner: DeviceOverview {
            status: scanner_status.to_string(),
            port: None,
            model: None,
            enabled: true,
            mock_mode: false,
        },
        available_ports: hardware::list_serial_ports(),
    })
}

/// Resposta do overview de hardware
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct HardwareOverviewResponse {
    pub printer: DeviceOverview,
    pub scale: DeviceOverview,
    pub drawer: DeviceOverview,
    pub scanner: DeviceOverview,
    pub available_ports: Vec<String>,
}

/// Overview de um dispositivo
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeviceOverview {
    pub status: String,
    pub port: Option<String>,
    pub model: Option<String>,
    pub enabled: bool,
    pub mock_mode: bool,
}

/// Aplica configuração detectada automaticamente
#[tauri::command]
#[specta::specta]
pub async fn apply_detected_device(
    device: hardware::DetectedDevice,
    hw_state: State<'_, HardwareState>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;

    match device.device_type {
        hardware::DeviceType::Printer => {
            let connection =
                if device.port.starts_with("/dev/usb/lp") || device.port.starts_with("/dev/lp") {
                    hardware::PrinterConnection::Usb
                } else if device.port.contains(':') {
                    hardware::PrinterConnection::Network
                } else {
                    hardware::PrinterConnection::Serial
                };

            let config = hardware::PrinterConfig {
                enabled: true,
                model: hardware::PrinterModel::Generic,
                connection,
                port: device.port,
                paper_width: 48,
                auto_cut: true,
                open_drawer_on_sale: true,
                baud_rate: 9600,
                data_bits: 8,
                parity: "none".to_string(),
                timeout_ms: 3000,
                mock_mode: false,
            };

            configure_printer(config, app_state.clone(), hw_state.clone()).await?;
        }
        hardware::DeviceType::Scale => {
            let protocol = device
                .protocol
                .as_ref()
                .map(|p| match p.to_lowercase().as_str() {
                    "toledo" => hardware::ScaleProtocol::Toledo,
                    "filizola" => hardware::ScaleProtocol::Filizola,
                    "elgin" => hardware::ScaleProtocol::Elgin,
                    "urano" => hardware::ScaleProtocol::Urano,
                    _ => hardware::ScaleProtocol::Generic,
                })
                .unwrap_or(hardware::ScaleProtocol::Generic);

            let config = hardware::ScaleConfig {
                enabled: true,
                protocol,
                port: device.port,
                baud_rate: 9600,
                data_bits: 8,
                parity: "none".to_string(),
                stop_bits: 1,
                mock_mode: false,
            };

            configure_scale(config, app_state.clone(), hw_state.clone()).await?;
        }
        hardware::DeviceType::Drawer => {
            let config = hardware::DrawerConfig {
                enabled: true,
                printer_port: device.port,
                pin: hardware::DrawerPin::Pin2,
                pulse_duration: 200,
                mock_mode: false,
            };

            configure_drawer(config, app_state.clone(), hw_state.clone()).await?;
        }
        hardware::DeviceType::Scanner => {
            // Scanner doesn't need port configuration, it's WebSocket based
        }
    }

    Ok(())
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
            $crate::commands::hardware::print_sale_by_id,
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
            // Auto-detecção e gerenciamento
            $crate::commands::hardware::auto_detect_hardware,
            $crate::commands::hardware::get_hardware_overview,
            $crate::commands::hardware::apply_detected_device,
            $crate::commands::hardware::load_hardware_configs,
            // Mobile Server comandos estão em mobile.rs
        ]
    };
}

/// Carrega configurações de hardware do banco de dados
#[tauri::command]
#[specta::specta]
pub async fn load_hardware_configs(
    state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
) -> AppResult<()> {
    state.session.require_authenticated()?;
    load_hardware_configs_internal(&state, &hw_state).await
}

/// Versão interna sem verificação de autenticação (usada no startup)
pub async fn load_hardware_configs_internal(
    state: &AppState,
    hw_state: &HardwareState,
) -> AppResult<()> {
    let repo = crate::repositories::SettingsRepository::new(state.pool());

    // Printer
    if let Ok(Some(val)) = repo.get_value("hardware.printer.config").await {
        if let Ok(config) = serde_json::from_str::<PrinterConfig>(&val) {
            let mut printer_config = hw_state.printer_config.write().await;
            *printer_config = config;
        }
    }

    // Scale
    if let Ok(Some(val)) = repo.get_value("hardware.scale.config").await {
        if let Ok(config) = serde_json::from_str::<ScaleConfig>(&val) {
            let mut scale_config = hw_state.scale_config.write().await;
            *scale_config = config;
        }
    }

    // Drawer
    if let Ok(Some(val)) = repo.get_value("hardware.drawer.config").await {
        if let Ok(config) = serde_json::from_str::<DrawerConfig>(&val) {
            let mut drawer_config = hw_state.drawer_config.write().await;
            *drawer_config = config;
        }
    }

    Ok(())
}
