//! Módulo de Impressoras Windows - APIs Nativas
//!
//! Este módulo fornece acesso direto às APIs do Windows Print Spooler
//! para detecção e impressão, sem depender de PowerShell ou WMIC.
//!
//! APIs utilizadas:
//! - GetDefaultPrinterW - Obtém impressora padrão
//! - EnumPrintersW - Lista todas as impressoras
//! - OpenPrinterW - Abre handle para impressora
//! - StartDocPrinterW - Inicia documento de impressão
//! - WritePrinter - Envia dados RAW
//! - EndDocPrinter - Finaliza documento
//! - ClosePrinter - Fecha handle

#![cfg(target_os = "windows")]

use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::GetLastError;
use windows::Win32::Graphics::Printing::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, GetDefaultPrinterW, OpenPrinterW,
    StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W, PRINTER_ENUM_LOCAL,
    PRINTER_HANDLE, PRINTER_INFO_2W,
};

use serde::{Deserialize, Serialize};

/// Informações sobre uma impressora Windows
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsPrinterInfo {
    /// Nome da impressora
    pub name: String,
    /// Nome da porta (USB001, LPT1, etc)
    pub port_name: String,
    /// Nome do driver
    pub driver_name: String,
    /// Status da impressora (códigos de bits)
    pub status: u32,
    /// Se é a impressora padrão
    pub is_default: bool,
    /// Se parece ser uma impressora térmica/POS
    pub is_thermal: bool,
    /// Descrição do status em texto
    pub status_text: String,
    /// Localização configurada
    pub location: String,
    /// Comentário/descrição
    pub comment: String,
}

/// Status da impressora (bits)
pub mod printer_status {
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

/// Converte status numérico para texto legível
fn status_to_text(status: u32) -> String {
    if status == 0 {
        return "Pronta".to_string();
    }

    let mut parts = Vec::new();

    if status & printer_status::PAUSED != 0 {
        parts.push("Pausada");
    }
    if status & printer_status::ERROR != 0 {
        parts.push("Erro");
    }
    if status & printer_status::PAPER_JAM != 0 {
        parts.push("Papel atolado");
    }
    if status & printer_status::PAPER_OUT != 0 {
        parts.push("Sem papel");
    }
    if status & printer_status::OFFLINE != 0 {
        parts.push("Offline");
    }
    if status & printer_status::BUSY != 0 {
        parts.push("Ocupada");
    }
    if status & printer_status::PRINTING != 0 {
        parts.push("Imprimindo");
    }
    if status & printer_status::WAITING != 0 {
        parts.push("Aguardando");
    }
    if status & printer_status::INITIALIZING != 0 {
        parts.push("Inicializando");
    }
    if status & printer_status::WARMING_UP != 0 {
        parts.push("Aquecendo");
    }
    if status & printer_status::POWER_SAVE != 0 {
        parts.push("Economia de energia");
    }

    if parts.is_empty() {
        format!("Status: 0x{:X}", status)
    } else {
        parts.join(", ")
    }
}

/// Verifica se o nome sugere uma impressora térmica/POS
fn is_thermal_printer(name: &str) -> bool {
    let name_lower = name.to_lowercase();
    let thermal_keywords = [
        "pos",
        "thermal",
        "receipt",
        "cupom",
        "termica",
        "80mm",
        "58mm",
        "mp-4200",
        "tm-t",
        "tm-m",
        "c3tech",
        "elgin",
        "daruma",
        "bematech",
        "epson tm",
        "star tsp",
        "citizen",
        "xprinter",
        "sewoo",
        "tanca",
        "control id",
    ];

    thermal_keywords.iter().any(|k| name_lower.contains(k))
}

/// Converte wide string (UTF-16) para String Rust
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

/// Converte String Rust para wide string (UTF-16) null-terminated
fn string_to_wide(s: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(s)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

/// Obtém o nome da impressora padrão do Windows
///
/// # Returns
/// Some(nome) se houver impressora padrão, None caso contrário
pub fn get_default_printer() -> Option<String> {
    unsafe {
        // Primeiro, obtém o tamanho necessário
        let mut size: u32 = 0;
        let _ = GetDefaultPrinterW(None, &mut size);

        if size == 0 {
            tracing::debug!("Nenhuma impressora padrão configurada");
            return None;
        }

        // Aloca buffer e obtém o nome
        let mut buffer: Vec<u16> = vec![0u16; size as usize];
        let result = GetDefaultPrinterW(Some(PWSTR(buffer.as_mut_ptr())), &mut size);

        if result.as_bool() {
            // Remove null terminator
            while buffer.last() == Some(&0) {
                buffer.pop();
            }
            let name = OsString::from_wide(&buffer).to_string_lossy().into_owned();
            tracing::info!("Impressora padrão do Windows: {}", name);
            Some(name)
        } else {
            let error = GetLastError();
            tracing::warn!("Erro ao obter impressora padrão: {:?}", error);
            None
        }
    }
}

/// Lista todas as impressoras instaladas no Windows
///
/// # Returns
/// Vec de WindowsPrinterInfo com informações detalhadas de cada impressora
pub fn enumerate_printers() -> Vec<WindowsPrinterInfo> {
    let mut printers = Vec::new();
    let default_printer = get_default_printer();

    unsafe {
        // Primeiro, obtém o tamanho necessário
        let mut bytes_needed: u32 = 0;
        let mut count: u32 = 0;

        // Flags: PRINTER_ENUM_LOCAL enumera impressoras locais
        let flags = PRINTER_ENUM_LOCAL;
        let level = 2u32; // PRINTER_INFO_2

        let _ = EnumPrintersW(
            flags,
            PCWSTR::null(),
            level,
            None,
            &mut bytes_needed,
            &mut count,
        );

        if bytes_needed == 0 {
            tracing::debug!("Nenhuma impressora encontrada");
            return printers;
        }

        // Aloca buffer
        let mut buffer: Vec<u8> = vec![0u8; bytes_needed as usize];

        let result = EnumPrintersW(
            flags,
            PCWSTR::null(),
            level,
            Some(&mut buffer),
            &mut bytes_needed,
            &mut count,
        );

        if !result.as_bool() {
            let error = GetLastError();
            tracing::error!("Erro ao enumerar impressoras: {:?}", error);
            return printers;
        }

        tracing::info!("Encontradas {} impressoras", count);

        // Parse das estruturas PRINTER_INFO_2W
        let printer_infos =
            std::slice::from_raw_parts(buffer.as_ptr() as *const PRINTER_INFO_2W, count as usize);

        for info in printer_infos {
            let name = wide_to_string(info.pPrinterName);
            let port_name = wide_to_string(info.pPortName);
            let driver_name = wide_to_string(info.pDriverName);
            let location = wide_to_string(info.pLocation);
            let comment = wide_to_string(info.pComment);
            let status = info.Status;

            let is_default = default_printer
                .as_ref()
                .map(|d| d == &name)
                .unwrap_or(false);

            let is_thermal = is_thermal_printer(&name) || is_thermal_printer(&driver_name);

            let printer_info = WindowsPrinterInfo {
                name: name.clone(),
                port_name,
                driver_name,
                status,
                is_default,
                is_thermal,
                status_text: status_to_text(status),
                location,
                comment,
            };

            tracing::debug!(
                "Impressora: {} (porta: {}, driver: {}, padrão: {}, térmica: {})",
                printer_info.name,
                printer_info.port_name,
                printer_info.driver_name,
                printer_info.is_default,
                printer_info.is_thermal
            );

            printers.push(printer_info);
        }
    }

    // Ordena: térmicas primeiro, depois padrão, depois alfabético
    printers.sort_by(|a, b| match (a.is_thermal, b.is_thermal) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => match (a.is_default, b.is_default) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        },
    });

    printers
}

/// Envia dados RAW para uma impressora
///
/// # Arguments
/// * `printer_name` - Nome da impressora
/// * `data` - Dados binários (ESC/POS) para enviar
/// * `doc_name` - Nome do documento (opcional)
///
/// # Returns
/// Ok(bytes_written) ou Err com descrição do erro
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
            "Impressão enviada para '{}': {} bytes",
            printer_name,
            bytes_written
        );

        Ok(bytes_written)
    }
}

/// Obtém informações detalhadas de uma impressora específica
///
/// # Arguments
/// * `printer_name` - Nome da impressora
///
/// # Returns
/// Some(WindowsPrinterInfo) ou None se não encontrada
pub fn get_printer_info(printer_name: &str) -> Option<WindowsPrinterInfo> {
    let printers = enumerate_printers();
    printers.into_iter().find(|p| p.name == printer_name)
}

/// Verifica se uma impressora está online e pronta
///
/// # Arguments
/// * `printer_name` - Nome da impressora
///
/// # Returns
/// true se a impressora está pronta, false caso contrário
pub fn is_printer_ready(printer_name: &str) -> bool {
    if let Some(info) = get_printer_info(printer_name) {
        // Status 0 significa pronta
        // Alguns status são aceitáveis (WAITING, PROCESSING, IO_ACTIVE)
        let problem_flags = printer_status::ERROR
            | printer_status::OFFLINE
            | printer_status::PAPER_OUT
            | printer_status::PAPER_JAM
            | printer_status::PAUSED;

        (info.status & problem_flags) == 0
    } else {
        false
    }
}

/// Sugere a melhor impressora para usar (térmica padrão ou qualquer térmica)
///
/// # Returns
/// Some(nome da impressora) ou None se não houver impressoras
pub fn suggest_printer() -> Option<String> {
    let printers = enumerate_printers();

    // Prioridade 1: Impressora térmica que é padrão
    if let Some(p) = printers.iter().find(|p| p.is_thermal && p.is_default) {
        return Some(p.name.clone());
    }

    // Prioridade 2: Qualquer impressora térmica
    if let Some(p) = printers.iter().find(|p| p.is_thermal) {
        return Some(p.name.clone());
    }

    // Prioridade 3: Impressora padrão
    if let Some(p) = printers.iter().find(|p| p.is_default) {
        return Some(p.name.clone());
    }

    // Prioridade 4: Primeira impressora disponível
    printers.first().map(|p| p.name.clone())
}

/// Lista apenas os nomes das impressoras (para compatibilidade com código existente)
pub fn list_printer_names() -> Vec<String> {
    enumerate_printers().into_iter().map(|p| p.name).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_thermal_printer() {
        assert!(is_thermal_printer("POS-80"));
        assert!(is_thermal_printer("Epson TM-T20X"));
        assert!(is_thermal_printer("C3Tech Térmica"));
        assert!(is_thermal_printer("Elgin i9"));
        assert!(!is_thermal_printer("HP LaserJet"));
        assert!(!is_thermal_printer("Microsoft Print to PDF"));
    }

    #[test]
    fn test_status_to_text() {
        assert_eq!(status_to_text(0), "Pronta");
        assert_eq!(status_to_text(printer_status::OFFLINE), "Offline");
        assert_eq!(status_to_text(printer_status::PAPER_OUT), "Sem papel");
    }
}
