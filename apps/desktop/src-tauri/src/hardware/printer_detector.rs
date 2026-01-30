//! Detector Robusto de Impressoras - GIRO
//!
//! Sistema multi-estratégia para detecção confiável de impressoras no Windows:
//!
//! ## Estratégias de Detecção (em ordem de prioridade):
//!
//! 1. **API Nativa Windows (EnumPrintersW)** - Mais confiável
//!    - PRINTER_ENUM_LOCAL - Impressoras locais
//!    - PRINTER_ENUM_CONNECTIONS - Impressoras de rede conectadas
//!    - PRINTER_ENUM_SHARED - Impressoras compartilhadas
//!
//! 2. **Registry Scan** - Backup se API falhar
//!    - HKLM\SYSTEM\CurrentControlSet\Control\Print\Printers
//!    - HKCU\Printers\Connections
//!
//! 3. **WMI Query** - Informações adicionais
//!    - Win32_Printer class
//!
//! 4. **USB Device Detection** - Dispositivos USB diretos
//!    - SetupAPI para enumerar dispositivos
//!
//! ## Features:
//! - Cache inteligente com TTL
//! - Refresh automático em background
//! - Detecção de drivers instalados
//! - Health check de impressoras
//! - Sugestão automática de melhor impressora

#![cfg(target_os = "windows")]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::os::windows::process::CommandExt;
use std::sync::RwLock;
use std::time::{Duration, Instant};

use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::GetLastError;
use windows::Win32::Graphics::Printing::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, GetDefaultPrinterW,
    GetPrinterDriverW, OpenPrinterW, StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W,
    DRIVER_INFO_2W, PRINTER_DEFAULTS, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL,
    PRINTER_ENUM_NETWORK, PRINTER_ENUM_SHARED, PRINTER_HANDLE, PRINTER_INFO_2W,
};
use windows::Win32::System::Registry::{
    RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE,
    KEY_READ, REG_SZ,
};

// Constantes de Attributes da PRINTER_INFO_2
pub mod printer_attributes {
    pub const PRINTER_ATTRIBUTE_QUEUED: u32 = 0x00000001;
    pub const PRINTER_ATTRIBUTE_DIRECT: u32 = 0x00000002;
    pub const PRINTER_ATTRIBUTE_DEFAULT: u32 = 0x00000004;
    pub const PRINTER_ATTRIBUTE_SHARED: u32 = 0x00000008;
    pub const PRINTER_ATTRIBUTE_NETWORK: u32 = 0x00000010;
    pub const PRINTER_ATTRIBUTE_HIDDEN: u32 = 0x00000020;
    pub const PRINTER_ATTRIBUTE_LOCAL: u32 = 0x00000040;
    pub const PRINTER_ATTRIBUTE_ENABLE_DEVQ: u32 = 0x00000080;
    pub const PRINTER_ATTRIBUTE_KEEPPRINTEDJOBS: u32 = 0x00000100;
    pub const PRINTER_ATTRIBUTE_DO_COMPLETE_FIRST: u32 = 0x00000200;
    pub const PRINTER_ATTRIBUTE_WORK_OFFLINE: u32 = 0x00000400;
    pub const PRINTER_ATTRIBUTE_ENABLE_BIDI: u32 = 0x00000800;
    pub const PRINTER_ATTRIBUTE_RAW_ONLY: u32 = 0x00001000;
    pub const PRINTER_ATTRIBUTE_PUBLISHED: u32 = 0x00002000;
    pub const PRINTER_ATTRIBUTE_FAX: u32 = 0x00004000;
    pub const PRINTER_ATTRIBUTE_TS: u32 = 0x00008000;
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS E ESTRUTURAS
// ════════════════════════════════════════════════════════════════════════════

/// Informações completas sobre uma impressora
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterInfo {
    /// Nome da impressora (usado para impressão)
    pub name: String,
    /// Nome da porta (USB001, LPT1, IP:port, etc.)
    pub port_name: String,
    /// Nome do driver instalado
    pub driver_name: String,
    /// Status numérico (bits)
    pub status: u32,
    /// Descrição do status
    pub status_text: String,
    /// Se é a impressora padrão do Windows
    pub is_default: bool,
    /// Se parece ser uma impressora térmica/POS
    pub is_thermal: bool,
    /// Se está online e pronta
    pub is_ready: bool,
    /// Localização configurada
    pub location: String,
    /// Comentário/descrição
    pub comment: String,
    /// Tipo de conexão detectado
    pub connection_type: PrinterConnectionType,
    /// Fonte da detecção
    pub detection_source: DetectionSource,
    /// Capacidades detectadas
    pub capabilities: PrinterCapabilities,
}

/// Tipo de conexão da impressora
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrinterConnectionType {
    /// USB direto
    Usb,
    /// Porta paralela (LPT)
    Parallel,
    /// Porta serial (COM)
    Serial,
    /// Rede TCP/IP
    Network,
    /// Compartilhada via Windows
    Shared,
    /// Impressora virtual (PDF, XPS, etc.)
    Virtual,
    /// Desconhecido
    Unknown,
}

/// Fonte da detecção
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetectionSource {
    /// API EnumPrintersW
    NativeApi,
    /// Windows Registry
    Registry,
    /// WMI Query
    Wmi,
    /// SetupAPI (USB)
    SetupApi,
    /// PowerShell fallback
    PowerShell,
}

/// Capacidades detectadas da impressora
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterCapabilities {
    /// Suporta ESC/POS
    pub supports_escpos: bool,
    /// Suporta impressão RAW
    pub supports_raw: bool,
    /// Detectado via atributo RAW_ONLY
    pub raw_only_attribute: bool,
    /// Datatype padrão (RAW, NT EMF, TEXT)
    pub default_datatype: Option<String>,
    /// Tem guilhotina automática
    pub has_cutter: bool,
    /// Tem gaveta de dinheiro
    pub has_cash_drawer: bool,
    /// Largura do papel em mm
    pub paper_width_mm: Option<u16>,
    /// Atributos da impressora (bitmask)
    pub attributes: u32,
    /// Informações do driver (se disponível)
    pub driver_info: Option<DriverInfo>,
}

/// Informações do driver da impressora (via GetPrinterDriverW)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverInfo {
    /// Nome do driver
    pub name: String,
    /// Versão do driver (cVersion)
    pub version: u32,
    /// Ambiente (Windows x64, Windows NT x86, etc.)
    pub environment: String,
    /// Caminho do arquivo do driver (.dll)
    pub driver_path: String,
    /// Caminho do arquivo de dados
    pub data_file: String,
    /// Caminho do arquivo de configuração
    pub config_file: String,
    /// Fabricante detectado pelo caminho do driver
    pub detected_manufacturer: Option<String>,
    /// Se parece ser driver de impressora térmica
    pub is_thermal_driver: bool,
}

/// Status da impressora (constantes de bits)
pub mod status {
    pub const READY: u32 = 0x0;
    pub const PAUSED: u32 = 0x1;
    pub const ERROR: u32 = 0x2;
    pub const PENDING_DELETION: u32 = 0x4;
    pub const PAPER_JAM: u32 = 0x8;
    pub const PAPER_OUT: u32 = 0x10;
    pub const MANUAL_FEED: u32 = 0x20;
    pub const PAPER_PROBLEM: u32 = 0x40;
    pub const OFFLINE: u32 = 0x80;
    pub const IO_ACTIVE: u32 = 0x100;
    pub const BUSY: u32 = 0x200;
    pub const PRINTING: u32 = 0x400;
    pub const OUTPUT_BIN_FULL: u32 = 0x800;
    pub const NOT_AVAILABLE: u32 = 0x1000;
    pub const WAITING: u32 = 0x2000;
    pub const PROCESSING: u32 = 0x4000;
    pub const INITIALIZING: u32 = 0x8000;
    pub const WARMING_UP: u32 = 0x10000;
    pub const TONER_LOW: u32 = 0x20000;
    pub const NO_TONER: u32 = 0x40000;
    pub const PAGE_PUNT: u32 = 0x80000;
    pub const USER_INTERVENTION: u32 = 0x100000;
    pub const OUT_OF_MEMORY: u32 = 0x200000;
    pub const DOOR_OPEN: u32 = 0x400000;
    pub const SERVER_UNKNOWN: u32 = 0x800000;
    pub const POWER_SAVE: u32 = 0x1000000;
}

/// Resultado da detecção
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionResult {
    /// Impressoras encontradas
    pub printers: Vec<PrinterInfo>,
    /// Impressora padrão (se houver)
    pub default_printer: Option<String>,
    /// Melhor impressora sugerida
    pub suggested_printer: Option<String>,
    /// Erros durante detecção
    pub errors: Vec<String>,
    /// Warnings durante detecção
    pub warnings: Vec<String>,
    /// Tempo de detecção em ms
    pub total_time_ms: u64,
    /// Fontes utilizadas
    pub strategies_used: Vec<DetectionSource>,
    /// Veio do cache?
    pub from_cache: bool,
    /// Data da detecção
    pub detected_at: DateTime<Utc>,
}

/// Cache de impressoras
struct PrinterCache {
    result: Option<DetectionResult>,
    last_update: Option<Instant>,
    ttl: Duration,
}

impl Default for PrinterCache {
    fn default() -> Self {
        Self {
            result: None,
            last_update: None,
            ttl: Duration::from_secs(30), // Cache por 30 segundos
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// DETECTOR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/// Detector robusto de impressoras
pub struct PrinterDetector {
    cache: RwLock<PrinterCache>,
}

impl PrinterDetector {
    /// Cria novo detector
    pub fn new() -> Self {
        Self {
            cache: RwLock::new(PrinterCache::default()),
        }
    }

    /// Singleton global
    pub fn global() -> &'static PrinterDetector {
        use std::sync::OnceLock;
        static INSTANCE: OnceLock<PrinterDetector> = OnceLock::new();
        INSTANCE.get_or_init(|| PrinterDetector::new())
    }

    /// Detecta todas as impressoras (usa cache se válido)
    pub fn detect(&self) -> DetectionResult {
        // Verifica cache
        {
            let cache = self.cache.read().unwrap();
            if let (Some(ref result), Some(last_update)) = (&cache.result, cache.last_update) {
                if last_update.elapsed() < cache.ttl {
                    tracing::debug!(
                        "Usando cache de impressoras (age: {:?})",
                        last_update.elapsed()
                    );
                    let mut res = result.clone();
                    res.from_cache = true;
                    return res;
                }
            }
        }

        // Faz nova detecção
        let result = self.detect_all();

        // Atualiza cache
        {
            let mut cache = self.cache.write().unwrap();
            cache.result = Some(result.clone());
            cache.last_update = Some(Instant::now());
        }

        result
    }

    /// Força nova detecção (ignora cache)
    pub fn detect_fresh(&self) -> DetectionResult {
        let result = self.detect_all();

        // Atualiza cache
        {
            let mut cache = self.cache.write().unwrap();
            cache.result = Some(result.clone());
            cache.last_update = Some(Instant::now());
        }

        result
    }

    /// Obtém informações detalhadas do driver de uma impressora específica
    pub fn get_printer_driver(&self, printer_name: &str) -> Option<DriverInfo> {
        self.get_driver_info(printer_name)
    }

    /// Obtém informações do driver para todas as impressoras térmicas detectadas
    pub fn get_thermal_drivers(&self) -> Vec<(String, DriverInfo)> {
        let detection = self.detect();
        let mut result = Vec::new();

        for printer in detection.printers {
            if printer.is_thermal {
                if let Some(driver_info) = self.get_driver_info(&printer.name) {
                    result.push((printer.name, driver_info));
                }
            }
        }

        result
    }

    /// Invalida o cache
    pub fn invalidate_cache(&self) {
        let mut cache = self.cache.write().unwrap();
        cache.result = None;
        cache.last_update = None;
    }

    /// Executa detecção completa
    fn detect_all(&self) -> DetectionResult {
        let start = Instant::now();
        let mut printers: HashMap<String, PrinterInfo> = HashMap::new();
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut sources_used = Vec::new();

        tracing::info!("🔍 [DETECTOR] Iniciando detecção robusta de impressoras...");
        tracing::info!("🔍 [DETECTOR] Sistema: Windows (compilado com target_os = windows)");

        // 1. API Nativa - Impressoras Locais + Compartilhadas
        tracing::info!(
            "🔍 [DETECTOR] Estratégia 1: API Nativa (PRINTER_ENUM_LOCAL | PRINTER_ENUM_SHARED)..."
        );
        match self.detect_via_native_api(PRINTER_ENUM_LOCAL | PRINTER_ENUM_SHARED) {
            Ok(found) => {
                tracing::info!(
                    "  ✓ [DETECTOR] API Nativa (LOCAL+SHARED): {} impressoras",
                    found.len()
                );
                for p in found {
                    printers.entry(p.name.clone()).or_insert(p);
                }
                sources_used.push(DetectionSource::NativeApi);
            }
            Err(e) => {
                // Fallback: tentar apenas LOCAL se SHARED falhar
                tracing::warn!("  ⚠ LOCAL+SHARED falhou, tentando apenas LOCAL: {}", e);
                match self.detect_via_native_api(PRINTER_ENUM_LOCAL) {
                    Ok(found) => {
                        tracing::info!("  ✓ API Nativa (LOCAL): {} impressoras", found.len());
                        for p in found {
                            printers.entry(p.name.clone()).or_insert(p);
                        }
                        sources_used.push(DetectionSource::NativeApi);
                    }
                    Err(e2) => {
                        errors.push(format!("API Nativa (LOCAL): {}", e2));
                        tracing::warn!("  ✗ API Nativa (LOCAL) falhou: {}", e2);
                    }
                }
            }
        }

        // 2. API Nativa - Conexões de Rede
        match self.detect_via_native_api(PRINTER_ENUM_CONNECTIONS) {
            Ok(found) => {
                tracing::info!("  ✓ API Nativa (CONNECTIONS): {} impressoras", found.len());
                for p in found {
                    printers.entry(p.name.clone()).or_insert(p);
                }
            }
            Err(e) => {
                warnings.push(format!("API Nativa (CONNECTIONS): {}", e));
                tracing::debug!("  ⚠ API Nativa (CONNECTIONS): {}", e);
            }
        }

        // 3. API Nativa - Impressoras de Rede Visíveis
        match self.detect_via_native_api(PRINTER_ENUM_NETWORK) {
            Ok(found) => {
                tracing::info!("  ✓ API Nativa (NETWORK): {} impressoras", found.len());
                for p in found {
                    printers.entry(p.name.clone()).or_insert(p);
                }
            }
            Err(e) => {
                // Network enum pode falhar em alguns ambientes, é normal
                tracing::debug!("  ⚠ API Nativa (NETWORK): {}", e);
            }
        }

        // 4. SetupAPI - Detecção USB por VID/PID (NOVA ESTRATÉGIA)
        tracing::info!("🔌 [DETECTOR] Estratégia 4: SetupAPI (USB VID/PID)...");
        let usb_result = super::usb_printer_detector::detect_usb_printers();
        if !usb_result.devices.is_empty() {
            tracing::info!(
                "  ✓ SetupAPI: {} impressoras USB térmicas detectadas",
                usb_result.devices.len()
            );
            sources_used.push(DetectionSource::SetupApi);

            // Enriquecer impressoras existentes com info USB ou adicionar novas
            for usb_device in usb_result.devices {
                if let Some(lookup) = &usb_device.lookup_info {
                    // Tenta encontrar impressora correspondente pelo nome do fabricante
                    let matching_printer = printers.values_mut().find(|p| {
                        let name_lower = p.name.to_lowercase();
                        let vendor_lower = lookup.vendor.to_lowercase();
                        name_lower.contains(&vendor_lower)
                            || (lookup
                                .model
                                .as_ref()
                                .map(|m| name_lower.contains(&m.to_lowercase()))
                                .unwrap_or(false))
                    });

                    if let Some(printer) = matching_printer {
                        // Enriquece com informações do USB
                        if let Some(width) = lookup.paper_width_mm {
                            printer.capabilities.paper_width_mm = Some(width as u16);
                        }
                        printer.capabilities.has_cutter = lookup.has_cutter;
                        printer.capabilities.has_cash_drawer = lookup.has_cash_drawer;
                        tracing::debug!("  📍 Enriqueceu '{}' com info USB", printer.name);
                    }
                }
            }
        }
        for usb_err in usb_result.errors {
            warnings.push(format!("SetupAPI: {}", usb_err));
        }

        // 5. Registry Scan (se API falhou ou encontrou poucas)
        if printers.is_empty() || errors.len() > 0 {
            match self.detect_via_registry() {
                Ok(found) => {
                    tracing::info!("  ✓ Registry: {} impressoras", found.len());
                    for p in found {
                        printers.entry(p.name.clone()).or_insert(p);
                    }
                    sources_used.push(DetectionSource::Registry);
                }
                Err(e) => {
                    warnings.push(format!("Registry: {}", e));
                    tracing::debug!("  ⚠ Registry: {}", e);
                }
            }
        }

        // 5. PowerShell Fallback (último recurso)
        if printers.is_empty() {
            match self.detect_via_powershell() {
                Ok(found) => {
                    tracing::info!("  ✓ PowerShell Fallback: {} impressoras", found.len());
                    for p in found {
                        printers.entry(p.name.clone()).or_insert(p);
                    }
                    sources_used.push(DetectionSource::PowerShell);
                }
                Err(e) => {
                    errors.push(format!("PowerShell Fallback: {}", e));
                    tracing::error!("  ✗ PowerShell Fallback: {}", e);
                }
            }
        }

        // Obtém impressora padrão
        let default_printer = get_default_printer_name();
        if let Some(ref dp) = default_printer {
            tracing::info!("  📌 Impressora padrão: {}", dp);
            // Marca como padrão
            if let Some(p) = printers.get_mut(dp) {
                p.is_default = true;
            }
        }

        // Converte para Vec e ordena
        let mut printer_list: Vec<PrinterInfo> = printers.into_values().collect();

        // Ordena: térmicas primeiro, depois padrão, depois prontas, depois alfabético
        printer_list.sort_by(|a, b| {
            // Térmicas primeiro
            match (a.is_thermal, b.is_thermal) {
                (true, false) => return std::cmp::Ordering::Less,
                (false, true) => return std::cmp::Ordering::Greater,
                _ => {}
            }
            // Depois padrão
            match (a.is_default, b.is_default) {
                (true, false) => return std::cmp::Ordering::Less,
                (false, true) => return std::cmp::Ordering::Greater,
                _ => {}
            }
            // Depois prontas
            match (a.is_ready, b.is_ready) {
                (true, false) => return std::cmp::Ordering::Less,
                (false, true) => return std::cmp::Ordering::Greater,
                _ => {}
            }
            // Alfabético
            a.name.cmp(&b.name)
        });

        // Sugere melhor impressora
        let suggested = self.suggest_best_printer_internal(&printer_list);

        let detection_time = start.elapsed().as_millis() as u64;

        tracing::info!(
            "🖨️ Detecção concluída: {} impressoras em {}ms (sugerida: {:?})",
            printer_list.len(),
            detection_time,
            suggested
        );

        DetectionResult {
            printers: printer_list,
            default_printer,
            suggested_printer: suggested,
            errors,
            warnings,
            total_time_ms: detection_time,
            strategies_used: sources_used,
            from_cache: false,
            detected_at: Utc::now(),
        }
    }

    /// Detecção via API Nativa do Windows
    fn detect_via_native_api(&self, flags: u32) -> Result<Vec<PrinterInfo>, String> {
        let mut printers = Vec::new();

        tracing::info!(
            "🔍 [NATIVE_API] Iniciando detecção via EnumPrintersW (flags: {:#X})...",
            flags
        );

        unsafe {
            // Primeiro, obtém tamanho necessário
            let mut bytes_needed: u32 = 0;
            let mut count: u32 = 0;
            let level = 2u32; // PRINTER_INFO_2W tem mais detalhes

            tracing::debug!("🔍 [NATIVE_API] Primeira chamada para obter tamanho do buffer...");

            let _ = EnumPrintersW(
                flags,
                PCWSTR::null(),
                level,
                None,
                &mut bytes_needed,
                &mut count,
            );

            tracing::info!(
                "🔍 [NATIVE_API] Primeira chamada retornou: bytes_needed={}, count={}",
                bytes_needed,
                count
            );

            // Se não precisa de buffer, não há impressoras
            if bytes_needed == 0 {
                tracing::warn!("⚠️ [NATIVE_API] Nenhuma impressora encontrada (bytes_needed = 0)");
                return Ok(Vec::new());
            }

            // Aloca buffer
            let mut buffer: Vec<u8> = vec![0u8; bytes_needed as usize];

            tracing::debug!(
                "🔍 [NATIVE_API] Buffer alocado ({} bytes), segunda chamada...",
                bytes_needed
            );

            // Chama novamente com buffer
            let result = EnumPrintersW(
                flags,
                PCWSTR::null(),
                level,
                Some(&mut buffer),
                &mut bytes_needed,
                &mut count,
            );

            if result.is_err() {
                let error = GetLastError();
                let err_msg = format!("EnumPrintersW falhou: {:?}", error);
                tracing::error!("❌ [NATIVE_API] {}", err_msg);
                return Err(err_msg);
            }

            tracing::info!(
                "✅ [NATIVE_API] EnumPrintersW sucesso! count={} impressoras",
                count
            );

            // Parse das estruturas
            let printer_infos = std::slice::from_raw_parts(
                buffer.as_ptr() as *const PRINTER_INFO_2W,
                count as usize,
            );

            for info in printer_infos {
                let name = wide_to_string(info.pPrinterName);
                let port_name = wide_to_string(info.pPortName);
                let driver_name = wide_to_string(info.pDriverName);
                let location = wide_to_string(info.pLocation);
                let comment = wide_to_string(info.pComment);
                let status = info.Status;
                let attributes = info.Attributes;

                // Extrai pDatatype para verificar suporte RAW
                let datatype = wide_to_string(info.pDatatype);
                let datatype_upper = datatype.to_uppercase();
                let supports_raw_by_datatype = datatype_upper.contains("RAW");

                // Verifica atributo RAW_ONLY (0x00001000)
                let is_raw_only =
                    (attributes & printer_attributes::PRINTER_ATTRIBUTE_RAW_ONLY) != 0;

                // Detecta tipo de conexão pela porta
                let connection_type = detect_connection_type(&port_name);

                // Verifica se é térmica - agora também por RAW_ONLY attribute
                let is_thermal_by_name = is_thermal_printer(&name, &driver_name, &port_name);
                let is_thermal = is_thermal_by_name || is_raw_only;

                // Verifica se está pronta
                let is_ready = is_printer_ready_status(status);

                // Detecta capacidades (agora com info adicional)
                let mut capabilities = detect_capabilities(&name, &driver_name);
                capabilities.supports_raw = supports_raw_by_datatype || is_raw_only;
                capabilities.raw_only_attribute = is_raw_only;
                capabilities.default_datatype = if datatype.is_empty() {
                    None
                } else {
                    Some(datatype)
                };
                capabilities.attributes = attributes;

                let printer_info = PrinterInfo {
                    name: name.clone(),
                    port_name,
                    driver_name,
                    status,
                    status_text: status_to_text(status),
                    is_default: false, // Será atualizado depois
                    is_thermal,
                    is_ready,
                    location,
                    comment,
                    connection_type,
                    detection_source: DetectionSource::NativeApi,
                    capabilities,
                };

                printers.push(printer_info);
            }
        }

        Ok(printers)
    }

    /// Obtém informações do driver de uma impressora via GetPrinterDriverW
    fn get_driver_info(&self, printer_name: &str) -> Option<DriverInfo> {
        tracing::debug!(
            "🔍 [DRIVER_INFO] Obtendo informações do driver para: {}",
            printer_name
        );

        unsafe {
            let wide_name = string_to_wide(printer_name);
            let mut handle = PRINTER_HANDLE::default();

            // Abre a impressora
            let result = OpenPrinterW(PCWSTR(wide_name.as_ptr()), &mut handle, None);

            if result.is_err() {
                tracing::warn!(
                    "⚠️ [DRIVER_INFO] Falha ao abrir impressora {}: {:?}",
                    printer_name,
                    GetLastError()
                );
                return None;
            }

            // Obtém tamanho necessário
            let mut bytes_needed: u32 = 0;
            let level = 2u32; // DRIVER_INFO_2W

            let _ = GetPrinterDriverW(handle, None, level, None, &mut bytes_needed);

            if bytes_needed == 0 {
                ClosePrinter(handle).ok();
                tracing::warn!(
                    "⚠️ [DRIVER_INFO] GetPrinterDriverW retornou bytes_needed=0 para {}",
                    printer_name
                );
                return None;
            }

            // Aloca buffer
            let mut buffer: Vec<u8> = vec![0u8; bytes_needed as usize];

            let result =
                GetPrinterDriverW(handle, None, level, Some(&mut buffer), &mut bytes_needed);

            ClosePrinter(handle).ok();

            if result.is_err() {
                let error = GetLastError();
                tracing::warn!(
                    "⚠️ [DRIVER_INFO] GetPrinterDriverW falhou para {}: {:?}",
                    printer_name,
                    error
                );
                return None;
            }

            // Parse da estrutura DRIVER_INFO_2W
            let driver_info_ptr = buffer.as_ptr() as *const DRIVER_INFO_2W;
            let driver_info = &*driver_info_ptr;

            let name = wide_to_string(driver_info.pName);
            let environment = wide_to_string(driver_info.pEnvironment);
            let driver_path = wide_to_string(driver_info.pDriverPath);
            let data_file = wide_to_string(driver_info.pDataFile);
            let config_file = wide_to_string(driver_info.pConfigFile);
            let version = driver_info.cVersion;

            // Detecta fabricante pelo caminho do driver
            let detected_manufacturer = detect_manufacturer_from_path(&driver_path, &name);

            // Verifica se é driver de impressora térmica
            let is_thermal_driver = is_thermal_driver_path(&driver_path, &name, &config_file);

            tracing::info!(
                "✅ [DRIVER_INFO] Driver para {}: name={}, version={}, manufacturer={:?}",
                printer_name,
                name,
                version,
                detected_manufacturer
            );

            Some(DriverInfo {
                name,
                version,
                environment,
                driver_path,
                data_file,
                config_file,
                detected_manufacturer,
                is_thermal_driver,
            })
        }
    }

    /// Detecção via Windows Registry (versão completa)
    fn detect_via_registry(&self) -> Result<Vec<PrinterInfo>, String> {
        let mut printers = Vec::new();

        unsafe {
            // Tenta HKLM\SYSTEM\CurrentControlSet\Control\Print\Printers
            let path = string_to_wide("SYSTEM\\CurrentControlSet\\Control\\Print\\Printers");
            let mut hkey = HKEY::default();

            let result = RegOpenKeyExW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(path.as_ptr()),
                Some(0),
                KEY_READ,
                &mut hkey,
            );

            if result.is_ok() {
                let mut index = 0u32;
                let mut name_buffer: [u16; 256] = [0; 256];
                let mut name_len = 256u32;

                while RegEnumKeyExW(
                    hkey,
                    index,
                    Some(PWSTR(name_buffer.as_mut_ptr())),
                    &mut name_len,
                    None,
                    None,
                    None,
                    None,
                )
                .is_ok()
                {
                    let name = OsString::from_wide(&name_buffer[..name_len as usize])
                        .to_string_lossy()
                        .into_owned();

                    // Ignora impressoras virtuais do sistema
                    if !is_system_virtual_printer(&name) {
                        // Abre subchave da impressora para ler detalhes
                        let printer_path = format!(
                            "SYSTEM\\CurrentControlSet\\Control\\Print\\Printers\\{}",
                            name
                        );
                        let printer_path_wide = string_to_wide(&printer_path);
                        let mut printer_key = HKEY::default();

                        let mut port_name = String::new();
                        let mut driver_name = String::new();
                        let mut location = String::new();
                        let mut datatype = String::new();

                        if RegOpenKeyExW(
                            HKEY_LOCAL_MACHINE,
                            PCWSTR(printer_path_wide.as_ptr()),
                            Some(0),
                            KEY_READ,
                            &mut printer_key,
                        )
                        .is_ok()
                        {
                            // Lê Port
                            port_name = read_registry_string(printer_key, "Port");
                            // Lê Printer Driver
                            driver_name = read_registry_string(printer_key, "Printer Driver");
                            // Lê Location
                            location = read_registry_string(printer_key, "Location");
                            // Lê Datatype
                            datatype = read_registry_string(printer_key, "Datatype");

                            let _ = RegCloseKey(printer_key);
                        }

                        // Detecta tipo de conexão pela porta
                        let connection_type = detect_connection_type(&port_name);

                        // Verifica se é térmica
                        let is_thermal = is_thermal_printer(&name, &driver_name, &port_name);

                        // Detecta capacidades
                        let mut capabilities = detect_capabilities(&name, &driver_name);
                        if !datatype.is_empty() {
                            capabilities.supports_raw = datatype.to_uppercase().contains("RAW");
                            capabilities.default_datatype = Some(datatype);
                        }

                        printers.push(PrinterInfo {
                            name: name.clone(),
                            port_name,
                            driver_name,
                            status: 0,
                            status_text: "Detectado via Registry".to_string(),
                            is_default: false,
                            is_thermal,
                            is_ready: true, // Assume pronta
                            location,
                            comment: String::new(),
                            connection_type,
                            detection_source: DetectionSource::Registry,
                            capabilities,
                        });
                    }

                    index += 1;
                    name_len = 256;
                    name_buffer = [0; 256];
                }

                let _ = RegCloseKey(hkey);
            }
        }

        Ok(printers)
    }

    /// Detecção via PowerShell (fallback)
    fn detect_via_powershell(&self) -> Result<Vec<PrinterInfo>, String> {
        use std::process::Command;

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                "Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus | ConvertTo-Json",
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| format!("Erro ao executar PowerShell: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell retornou erro: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse do JSON
        let parsed: Result<Vec<serde_json::Value>, _> = serde_json::from_str(&stdout);

        match parsed {
            Ok(items) => {
                let printers = items
                    .into_iter()
                    .filter_map(|item| {
                        let name = item.get("Name")?.as_str()?.to_string();
                        let port_name = item
                            .get("PortName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let driver_name = item
                            .get("DriverName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        Some(PrinterInfo {
                            name: name.clone(),
                            port_name: port_name.clone(),
                            driver_name: driver_name.clone(),
                            status: 0,
                            status_text: "Detectado via PowerShell".to_string(),
                            is_default: false,
                            is_thermal: is_thermal_printer(&name, &driver_name, &port_name),
                            is_ready: true,
                            location: String::new(),
                            comment: String::new(),
                            connection_type: detect_connection_type(&port_name),
                            detection_source: DetectionSource::PowerShell,
                            capabilities: detect_capabilities(&name, &driver_name),
                        })
                    })
                    .collect();

                Ok(printers)
            }
            Err(_) => {
                // Pode ser um único objeto ao invés de array
                if let Ok(item) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    if let Some(name) = item.get("Name").and_then(|v| v.as_str()) {
                        let port_name = item
                            .get("PortName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let driver_name = item
                            .get("DriverName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        return Ok(vec![PrinterInfo {
                            name: name.to_string(),
                            port_name: port_name.clone(),
                            driver_name: driver_name.clone(),
                            status: 0,
                            status_text: "Detectado via PowerShell".to_string(),
                            is_default: false,
                            is_thermal: is_thermal_printer(name, &driver_name, &port_name),
                            is_ready: true,
                            location: String::new(),
                            comment: String::new(),
                            connection_type: detect_connection_type(&port_name),
                            detection_source: DetectionSource::PowerShell,
                            capabilities: detect_capabilities(name, &driver_name),
                        }]);
                    }
                }
                Err("Falha ao parsear JSON do PowerShell".to_string())
            }
        }
    }

    /// Sugere a melhor impressora para uso
    fn suggest_best_printer_internal(&self, printers: &[PrinterInfo]) -> Option<String> {
        // Prioridade 1: Térmica + Padrão + Pronta
        if let Some(p) = printers
            .iter()
            .find(|p| p.is_thermal && p.is_default && p.is_ready)
        {
            return Some(p.name.clone());
        }

        // Prioridade 2: Térmica + Pronta
        if let Some(p) = printers.iter().find(|p| p.is_thermal && p.is_ready) {
            return Some(p.name.clone());
        }

        // Prioridade 3: Térmica (qualquer status)
        if let Some(p) = printers.iter().find(|p| p.is_thermal) {
            return Some(p.name.clone());
        }

        // Prioridade 4: Padrão + Pronta (não virtual)
        if let Some(p) = printers.iter().find(|p| {
            p.is_default && p.is_ready && p.connection_type != PrinterConnectionType::Virtual
        }) {
            return Some(p.name.clone());
        }

        // Prioridade 5: Primeira não-virtual
        printers
            .iter()
            .find(|p| p.connection_type != PrinterConnectionType::Virtual)
            .map(|p| p.name.clone())
    }

    /// Sugere a melhor impressora (API pública)
    pub fn suggest_best_printer(&self) -> Option<PrinterInfo> {
        let result = self.detect();
        let suggested_name = result.suggested_printer?;
        result
            .printers
            .into_iter()
            .find(|p| p.name == suggested_name)
    }

    /// Verifica se uma impressora está pronta
    pub fn is_printer_ready(&self, printer_name: &str) -> bool {
        self.detect()
            .printers
            .iter()
            .find(|p| p.name.eq_ignore_ascii_case(printer_name))
            .map(|p| p.is_ready)
            .unwrap_or(false)
    }

    /// Obtém informações de uma impressora específica
    pub fn get_printer_info(&self, printer_name: &str) -> Option<PrinterInfo> {
        self.detect()
            .printers
            .into_iter()
            .find(|p| p.name.eq_ignore_ascii_case(printer_name))
    }
}

impl Default for PrinterDetector {
    fn default() -> Self {
        Self::new()
    }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

/// Obtém o nome da impressora padrão
pub fn get_default_printer_name() -> Option<String> {
    unsafe {
        let mut size: u32 = 0;
        let _ = GetDefaultPrinterW(None, &mut size);

        if size == 0 {
            return None;
        }

        let mut buffer: Vec<u16> = vec![0u16; size as usize];
        let result = GetDefaultPrinterW(Some(PWSTR(buffer.as_mut_ptr())), &mut size);

        if result.as_bool() {
            while buffer.last() == Some(&0) {
                buffer.pop();
            }
            Some(OsString::from_wide(&buffer).to_string_lossy().into_owned())
        } else {
            None
        }
    }
}

/// Converte wide string (UTF-16) para String
fn wide_to_string(ptr: PWSTR) -> String {
    if ptr.is_null() {
        return String::new();
    }

    unsafe {
        let len = (0..).take_while(|&i| *ptr.0.add(i) != 0).count();
        let slice = std::slice::from_raw_parts(ptr.0, len);
        OsString::from_wide(slice).to_string_lossy().into_owned()
    }
}

/// Converte String para wide string (UTF-16)
fn string_to_wide(s: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(s)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

/// Lê um valor de string do Registry
fn read_registry_string(hkey: HKEY, value_name: &str) -> String {
    unsafe {
        let value_wide = string_to_wide(value_name);
        let mut data_type: u32 = 0;
        let mut data_size: u32 = 0;

        // Primeiro, obtém o tamanho necessário
        let result = RegQueryValueExW(
            hkey,
            PCWSTR(value_wide.as_ptr()),
            None,
            Some(&mut data_type),
            None,
            Some(&mut data_size),
        );

        if result.is_err() || data_size == 0 {
            return String::new();
        }

        // Verifica se é string (REG_SZ = 1)
        if data_type != REG_SZ.0 {
            return String::new();
        }

        // Aloca buffer e lê o valor
        let mut buffer: Vec<u8> = vec![0u8; data_size as usize];
        let result = RegQueryValueExW(
            hkey,
            PCWSTR(value_wide.as_ptr()),
            None,
            Some(&mut data_type),
            Some(buffer.as_mut_ptr()),
            Some(&mut data_size),
        );

        if result.is_err() {
            return String::new();
        }

        // Converte de UTF-16 para String
        let wide_slice: &[u16] =
            std::slice::from_raw_parts(buffer.as_ptr() as *const u16, (data_size as usize) / 2);

        // Remove null terminator se presente
        let len = wide_slice
            .iter()
            .position(|&c| c == 0)
            .unwrap_or(wide_slice.len());
        OsString::from_wide(&wide_slice[..len])
            .to_string_lossy()
            .into_owned()
    }
}

/// Detecta tipo de conexão pela porta
fn detect_connection_type(port_name: &str) -> PrinterConnectionType {
    let port_upper = port_name.to_uppercase();

    if port_upper.starts_with("USB") {
        PrinterConnectionType::Usb
    } else if port_upper.starts_with("LPT") {
        PrinterConnectionType::Parallel
    } else if port_upper.starts_with("COM") {
        PrinterConnectionType::Serial
    } else if port_upper.contains(":") && port_name.contains('.') {
        // Parece ser IP:porta
        PrinterConnectionType::Network
    } else if port_upper.starts_with("\\\\") {
        PrinterConnectionType::Shared
    } else if port_upper.contains("PORTPROMPT")
        || port_upper.contains("NUL")
        || port_upper.contains("FILE:")
        || port_upper.contains("XPS")
        || port_upper.contains("PDF")
    {
        PrinterConnectionType::Virtual
    } else {
        PrinterConnectionType::Unknown
    }
}

/// Verifica se é uma impressora térmica/POS
fn is_thermal_printer(name: &str, driver: &str, port: &str) -> bool {
    let combined = format!("{} {} {}", name, driver, port).to_lowercase();

    // Keywords que indicam impressora térmica
    let thermal_keywords = [
        // Genéricos
        "pos",
        "thermal",
        "receipt",
        "cupom",
        "termica",
        "termico",
        "80mm",
        "58mm",
        "48mm",
        "recibo",
        // Marcas internacionais
        "epson tm",
        "tm-t",
        "tm-m",
        "tm-u",
        "tm-l",
        "star tsp",
        "star sp",
        "citizen",
        "ct-s",
        "xprinter",
        "sewoo",
        "lk-t",
        "zebra zd",   // Térmica de etiquetas
        "brother ql", // Térmica de etiquetas
        "sat fiscal", // Impressora SAT
        // Marcas brasileiras
        "elgin",
        "i7",
        "i9",
        "vox+",
        "bematech",
        "mp-4200",
        "mp-2800",
        "mp-4000",
        "mp-100",
        "daruma",
        "dr800",
        "dr700",
        "dr600",
        "c3tech",
        "pos-58",
        "pos-80",
        "tanca",
        "tp-620",
        "control id",
        "controlid",
        "print id",
        "sweda",
        "si-300",
        "gertec",
        "g250",
        "perto",
        "nitere",
        "itautec",
        // Marcas asiáticas
        "bixolon",
        "srp-",
        "zonerich",
        "custom",
        "posiflex",
        "partner",
        "rongta",
        "goojprt",
        "hprt",
        "gainscha",
        "munbyn",
        "netum",
    ];

    thermal_keywords.iter().any(|kw| combined.contains(kw))
}

/// Verifica se é impressora virtual do sistema
fn is_system_virtual_printer(name: &str) -> bool {
    let name_lower = name.to_lowercase();

    let virtual_printers = [
        "microsoft print to pdf",
        "microsoft xps",
        "fax",
        "send to onenote",
        "onenote",
        "adobe pdf",
        "foxit pdf",
        "cutepdf",
        "bullzip",
        "pdfcreator",
        "primopdf",
        "dopdf",
        "virtual",
    ];

    virtual_printers.iter().any(|vp| name_lower.contains(vp))
}

/// Verifica se status indica impressora pronta
fn is_printer_ready_status(status: u32) -> bool {
    if status == 0 {
        return true;
    }

    // Status problemáticos
    let problem_flags = status::ERROR
        | status::OFFLINE
        | status::PAPER_OUT
        | status::PAPER_JAM
        | status::PAUSED
        | status::NOT_AVAILABLE
        | status::DOOR_OPEN
        | status::NO_TONER
        | status::USER_INTERVENTION;

    (status & problem_flags) == 0
}

/// Converte status numérico para texto
fn status_to_text(status: u32) -> String {
    if status == 0 {
        return "Pronta".to_string();
    }

    let mut parts = Vec::new();

    if status & status::PAUSED != 0 {
        parts.push("Pausada");
    }
    if status & status::ERROR != 0 {
        parts.push("Erro");
    }
    if status & status::PAPER_JAM != 0 {
        parts.push("Papel atolado");
    }
    if status & status::PAPER_OUT != 0 {
        parts.push("Sem papel");
    }
    if status & status::OFFLINE != 0 {
        parts.push("Offline");
    }
    if status & status::BUSY != 0 {
        parts.push("Ocupada");
    }
    if status & status::PRINTING != 0 {
        parts.push("Imprimindo");
    }
    if status & status::WAITING != 0 {
        parts.push("Aguardando");
    }
    if status & status::INITIALIZING != 0 {
        parts.push("Inicializando");
    }
    if status & status::WARMING_UP != 0 {
        parts.push("Aquecendo");
    }
    if status & status::POWER_SAVE != 0 {
        parts.push("Economia de energia");
    }
    if status & status::DOOR_OPEN != 0 {
        parts.push("Tampa aberta");
    }
    if status & status::NOT_AVAILABLE != 0 {
        parts.push("Indisponível");
    }

    if parts.is_empty() {
        format!("Status: 0x{:X}", status)
    } else {
        parts.join(", ")
    }
}

/// Detecta fabricante da impressora pelo caminho do driver
fn detect_manufacturer_from_path(driver_path: &str, driver_name: &str) -> Option<String> {
    let combined = format!("{} {}", driver_path, driver_name).to_lowercase();

    // Mapeamento de keywords para fabricantes
    let manufacturers = [
        // Epson
        (&["epson", "tm-t", "tm-m", "tm-u", "epsn"][..], "Epson"),
        // Star Micronics
        (
            &["star", "tsp100", "tsp650", "starmicronics"][..],
            "Star Micronics",
        ),
        // Bematech
        (
            &["bematech", "mp-4200", "mp-2800", "mp-100"][..],
            "Bematech",
        ),
        // Elgin
        (&["elgin", "i7 ", "i9 ", "vox"][..], "Elgin"),
        // Daruma
        (&["daruma", "dr800", "dr700", "dr600"][..], "Daruma"),
        // Citizen
        (&["citizen", "ct-s", "cbm"][..], "Citizen"),
        // Bixolon
        (&["bixolon", "srp-", "lk-t"][..], "Bixolon"),
        // Xprinter
        (&["xprinter", "xp-58", "xp-80"][..], "Xprinter"),
        // C3Tech
        (&["c3tech", "pos-58", "pos-80"][..], "C3Tech"),
        // Sweda
        (&["sweda", "si-300", "si-250"][..], "Sweda"),
        // Gertec
        (&["gertec", "g250"][..], "Gertec"),
        // Tanca
        (&["tanca", "tp-620", "tp-450"][..], "Tanca"),
        // Control iD
        (&["controlid", "control id", "printid"][..], "Control iD"),
        // Rongta
        (&["rongta", "rp-80", "rp-58"][..], "Rongta"),
        // HPRT
        (&["hprt", "pos80", "tp805"][..], "HPRT"),
        // Zebra
        (&["zebra", "zd-", "zq-", "zm-"][..], "Zebra"),
        // Brother
        (&["brother", "ql-"][..], "Brother"),
        // Generic/Chinese
        (&["pos-", "pos_", "generic"][..], "Generic POS"),
    ];

    for (keywords, manufacturer) in manufacturers {
        if keywords.iter().any(|kw| combined.contains(kw)) {
            return Some(manufacturer.to_string());
        }
    }

    None
}

/// Verifica se o caminho do driver indica impressora térmica
fn is_thermal_driver_path(driver_path: &str, driver_name: &str, config_file: &str) -> bool {
    let combined = format!("{} {} {}", driver_path, driver_name, config_file).to_lowercase();

    // Indicadores de driver de impressora térmica
    let thermal_indicators = [
        // Termos genéricos
        "pos",
        "thermal",
        "receipt",
        "escpos",
        "esc/pos",
        // Drivers específicos
        "epson",
        "tm-t",
        "star",
        "tsp",
        "bematech",
        "elgin",
        "daruma",
        "citizen",
        "bixolon",
        "xprinter",
        "c3tech",
        "tanca",
        "sweda",
        "gertec",
        "controlid",
        // Fabricantes genéricos POS
        "seiko",
        "fujitsu",
        "ncr",
        "ibm pos",
        // Formatos de papel típicos
        "80mm",
        "58mm",
        "48mm",
    ];

    thermal_indicators.iter().any(|ind| combined.contains(ind))
}

/// Detecta capacidades da impressora
fn detect_capabilities(name: &str, driver: &str) -> PrinterCapabilities {
    let combined = format!("{} {}", name, driver).to_lowercase();

    // Tenta detectar largura do papel
    let paper_width = if combined.contains("80mm") || combined.contains("tm-t88") {
        Some(80)
    } else if combined.contains("58mm") {
        Some(58)
    } else if combined.contains("48mm") {
        Some(48)
    } else {
        None
    };

    PrinterCapabilities {
        supports_escpos: is_thermal_printer(name, driver, ""),
        supports_raw: true, // Windows geralmente suporta RAW, será atualizado se tiver pDatatype
        raw_only_attribute: false, // Será atualizado pelo caller
        default_datatype: None, // Será atualizado pelo caller
        has_cutter: combined.contains("tm-t")
            || combined.contains("mp-4200")
            || combined.contains("srp-350")
            || combined.contains("ct-s"),
        has_cash_drawer: is_thermal_printer(name, driver, ""),
        paper_width_mm: paper_width,
        attributes: 0,     // Será atualizado pelo caller
        driver_info: None, // Será preenchido depois se necessário
    }
}

// ════════════════════════════════════════════════════════════════════════════
// IMPRESSÃO RAW
// ════════════════════════════════════════════════════════════════════════════

/// Envia dados RAW para uma impressora
pub fn print_raw(printer_name: &str, data: &[u8], doc_name: Option<&str>) -> Result<u32, String> {
    let printer_name_wide = string_to_wide(printer_name);
    let doc_name_str = doc_name.unwrap_or("GIRO Receipt");
    let doc_name_wide = string_to_wide(doc_name_str);
    let data_type_wide = string_to_wide("RAW");

    unsafe {
        // 1. Abre a impressora
        let mut printer_handle = PRINTER_HANDLE::default();

        let result = OpenPrinterW(
            PCWSTR(printer_name_wide.as_ptr()),
            &mut printer_handle,
            None,
        );

        if result.is_err() {
            let error = GetLastError();
            return Err(format!(
                "Erro ao abrir impressora '{}': {:?}",
                printer_name, error
            ));
        }

        // Garante que o handle será fechado
        let _guard = scopeguard::guard(printer_handle, |h| {
            let _ = ClosePrinter(h);
        });

        // 2. Inicia o documento
        let doc_info = DOC_INFO_1W {
            pDocName: PWSTR(doc_name_wide.as_ptr() as *mut _),
            pOutputFile: PWSTR::null(),
            pDatatype: PWSTR(data_type_wide.as_ptr() as *mut _),
        };

        let job_id = StartDocPrinterW(printer_handle, 1, &doc_info as *const _ as *const _);

        if job_id == 0 {
            let error = GetLastError();
            return Err(format!("Erro ao iniciar documento: {:?}", error));
        }

        // 3. Inicia a página
        if !StartPagePrinter(printer_handle).as_bool() {
            let error = GetLastError();
            let _ = EndDocPrinter(printer_handle);
            return Err(format!("Erro ao iniciar página: {:?}", error));
        }

        // 4. Escreve os dados
        let mut bytes_written: u32 = 0;

        let write_result = WritePrinter(
            printer_handle,
            data.as_ptr() as *const _,
            data.len() as u32,
            &mut bytes_written,
        );

        // 5. Finaliza página e documento
        let _ = EndPagePrinter(printer_handle);
        let _ = EndDocPrinter(printer_handle);

        if !write_result.as_bool() {
            let error = GetLastError();
            return Err(format!("Erro ao escrever dados: {:?}", error));
        }

        tracing::info!(
            "✅ Impressão enviada para '{}': {} bytes",
            printer_name,
            bytes_written
        );

        Ok(bytes_written)
    }
}

// ════════════════════════════════════════════════════════════════════════════
// API PÚBLICA COMPATÍVEL
// ════════════════════════════════════════════════════════════════════════════

/// Compatibilidade: Lista nomes das impressoras
pub fn list_printer_names() -> Vec<String> {
    PrinterDetector::global()
        .detect()
        .printers
        .into_iter()
        .map(|p| p.name)
        .collect()
}

/// Compatibilidade: Obtém informações de uma impressora
pub fn get_printer_info(printer_name: &str) -> Option<PrinterInfo> {
    PrinterDetector::global()
        .detect()
        .printers
        .into_iter()
        .find(|p| p.name == printer_name)
}

/// Compatibilidade: Verifica se impressora está pronta
pub fn is_printer_ready(printer_name: &str) -> bool {
    get_printer_info(printer_name)
        .map(|p| p.is_ready)
        .unwrap_or(false)
}

/// Compatibilidade: Sugere melhor impressora
pub fn suggest_printer() -> Option<String> {
    PrinterDetector::global().detect().suggested_printer
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_connection_type() {
        assert_eq!(detect_connection_type("USB001"), PrinterConnectionType::Usb);
        assert_eq!(
            detect_connection_type("LPT1:"),
            PrinterConnectionType::Parallel
        );
        assert_eq!(
            detect_connection_type("COM3"),
            PrinterConnectionType::Serial
        );
        assert_eq!(
            detect_connection_type("192.168.1.100:9100"),
            PrinterConnectionType::Network
        );
        assert_eq!(
            detect_connection_type("\\\\SERVER\\Printer"),
            PrinterConnectionType::Shared
        );
        assert_eq!(
            detect_connection_type("PORTPROMPT:"),
            PrinterConnectionType::Virtual
        );
    }

    #[test]
    fn test_is_thermal_printer() {
        assert!(is_thermal_printer("POS-80", "", ""));
        assert!(is_thermal_printer("Epson TM-T20X", "", ""));
        assert!(is_thermal_printer("", "EPSON TM-T88V", ""));
        assert!(is_thermal_printer("Elgin i9", "", "USB001"));
        assert!(is_thermal_printer("Bematech MP-4200 TH", "", ""));
        assert!(!is_thermal_printer("HP LaserJet", "", ""));
        assert!(!is_thermal_printer("Microsoft Print to PDF", "", ""));
    }

    #[test]
    fn test_is_system_virtual_printer() {
        assert!(is_system_virtual_printer("Microsoft Print to PDF"));
        assert!(is_system_virtual_printer("Microsoft XPS Document Writer"));
        assert!(is_system_virtual_printer("Fax"));
        assert!(!is_system_virtual_printer("Epson TM-T20X"));
    }

    #[test]
    fn test_status_to_text() {
        assert_eq!(status_to_text(0), "Pronta");
        assert_eq!(status_to_text(status::OFFLINE), "Offline");
        assert_eq!(status_to_text(status::PAPER_OUT), "Sem papel");
        assert_eq!(status_to_text(status::PRINTING), "Imprimindo");
    }
}
