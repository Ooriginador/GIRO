//! Detector de Impressoras USB via SetupAPI
//!
//! Este módulo usa a API SetupDiGetClassDevs do Windows para enumerar
//! dispositivos USB diretamente, permitindo detecção por VID/PID mesmo
//! antes da instalação do driver de impressão.
//!
//! ## APIs Windows utilizadas:
//! - SetupDiGetClassDevsW - Obtém lista de dispositivos
//! - SetupDiEnumDeviceInfo - Enumera dispositivos
//! - SetupDiGetDevicePropertyW - Obtém propriedades (VID/PID)
//! - SetupDiGetDeviceRegistryPropertyW - Obtém propriedades do registro

#![cfg(target_os = "windows")]

use super::usb_vid_pid::{lookup_by_vid_pid, VidPidLookupResult};
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows::core::PCWSTR;
use windows::Win32::Devices::DeviceAndDriverInstallation::{
    SetupDiDestroyDeviceInfoList, SetupDiEnumDeviceInfo, SetupDiGetClassDevsW,
    SetupDiGetDeviceInstanceIdW, SetupDiGetDeviceRegistryPropertyW, DIGCF_ALLCLASSES,
    DIGCF_PRESENT, HDEVINFO, SETUP_DI_REGISTRY_PROPERTY, SPDRP_DEVICEDESC, SPDRP_FRIENDLYNAME,
    SPDRP_HARDWAREID, SPDRP_MFG, SP_DEVINFO_DATA,
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Dispositivo USB detectado
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbPrinterDevice {
    /// Instance ID do dispositivo
    pub instance_id: String,
    /// VID (Vendor ID)
    pub vid: u16,
    /// PID (Product ID)
    pub pid: u16,
    /// Nome amigável
    pub friendly_name: Option<String>,
    /// Descrição do dispositivo
    pub description: Option<String>,
    /// Fabricante
    pub manufacturer: Option<String>,
    /// Hardware ID completo
    pub hardware_id: Option<String>,
    /// Informações do lookup VID/PID
    pub lookup_info: Option<VidPidLookupResult>,
    /// Se é uma impressora térmica conhecida
    pub is_known_thermal: bool,
}

/// Resultado da detecção USB
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbDetectionResult {
    /// Dispositivos encontrados
    pub devices: Vec<UsbPrinterDevice>,
    /// Erros durante detecção
    pub errors: Vec<String>,
    /// Tempo de detecção em ms
    pub duration_ms: u64,
}

// ════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

/// Extrai VID e PID do Hardware ID
/// Formato típico: USB\VID_04B8&PID_0E20\...
fn parse_vid_pid(hardware_id: &str) -> Option<(u16, u16)> {
    let upper = hardware_id.to_uppercase();

    // Procura VID_XXXX
    let vid_start = upper.find("VID_")?;
    let vid_str = &upper[vid_start + 4..vid_start + 8];
    let vid = u16::from_str_radix(vid_str, 16).ok()?;

    // Procura PID_XXXX
    let pid_start = upper.find("PID_")?;
    let pid_str = &upper[pid_start + 4..pid_start + 8];
    let pid = u16::from_str_radix(pid_str, 16).ok()?;

    Some((vid, pid))
}

/// Obtém propriedade de string do dispositivo
fn get_device_string_property(
    dev_info: HDEVINFO,
    dev_info_data: &mut SP_DEVINFO_DATA,
    property: SETUP_DI_REGISTRY_PROPERTY,
) -> Option<String> {
    let mut buffer: [u8; 512] = [0; 512];
    let mut required_size: u32 = 0;
    let mut reg_type: u32 = 0;

    let result = unsafe {
        SetupDiGetDeviceRegistryPropertyW(
            dev_info,
            dev_info_data,
            property,
            Some(&mut reg_type),
            Some(&mut buffer),
            Some(&mut required_size),
        )
    };

    if result.is_ok() && required_size > 0 {
        // Converte de UTF-16 para String
        let wide_chars: &[u16] =
            unsafe { std::slice::from_raw_parts(buffer.as_ptr() as *const u16, 256) };

        // Encontra o null terminator
        let end = wide_chars.iter().position(|&c| c == 0).unwrap_or(256);
        let s = OsString::from_wide(&wide_chars[..end])
            .to_string_lossy()
            .into_owned();

        if !s.is_empty() {
            return Some(s);
        }
    }

    None
}

/// Obtém Instance ID do dispositivo
fn get_device_instance_id(
    dev_info: HDEVINFO,
    dev_info_data: &mut SP_DEVINFO_DATA,
) -> Option<String> {
    let mut buffer: [u16; 512] = [0; 512];

    let result =
        unsafe { SetupDiGetDeviceInstanceIdW(dev_info, dev_info_data, Some(&mut buffer), None) };

    if result.is_ok() {
        let end = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
        let s = OsString::from_wide(&buffer[..end])
            .to_string_lossy()
            .into_owned();
        return Some(s);
    }

    None
}

// ════════════════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/// Enumera todos os dispositivos USB e filtra por VIDs de impressoras térmicas conhecidas
pub fn detect_usb_printers() -> UsbDetectionResult {
    let start = std::time::Instant::now();
    let mut devices = Vec::new();
    let mut errors = Vec::new();

    tracing::info!("🔌 [USB] Iniciando detecção de impressoras USB via SetupAPI...");

    unsafe {
        // Obtém handle para todos os dispositivos presentes
        let dev_info = match SetupDiGetClassDevsW(
            None,                             // Todas as classes
            PCWSTR::null(),                   // Nenhum enumerador específico
            None,                             // Sem janela pai
            DIGCF_ALLCLASSES | DIGCF_PRESENT, // Todas as classes, apenas presentes
        ) {
            Ok(handle) => handle,
            Err(e) => {
                errors.push(format!("SetupDiGetClassDevsW falhou: {:?}", e));
                return UsbDetectionResult {
                    devices,
                    errors,
                    duration_ms: start.elapsed().as_millis() as u64,
                };
            }
        };

        if dev_info.is_invalid() {
            errors.push("SetupDiGetClassDevsW retornou handle inválido".to_string());
            return UsbDetectionResult {
                devices,
                errors,
                duration_ms: start.elapsed().as_millis() as u64,
            };
        }

        // Enumera dispositivos
        let mut index: u32 = 0;
        loop {
            let mut dev_info_data = SP_DEVINFO_DATA {
                cbSize: std::mem::size_of::<SP_DEVINFO_DATA>() as u32,
                ..Default::default()
            };

            let enum_result = SetupDiEnumDeviceInfo(dev_info, index, &mut dev_info_data);

            if enum_result.is_err() {
                // Fim da lista ou erro
                break;
            }

            // Obtém Instance ID
            if let Some(instance_id) = get_device_instance_id(dev_info, &mut dev_info_data) {
                // Filtra apenas dispositivos USB
                if instance_id.to_uppercase().starts_with("USB\\") {
                    // Obtém Hardware ID para extrair VID/PID
                    if let Some(hardware_id) =
                        get_device_string_property(dev_info, &mut dev_info_data, SPDRP_HARDWAREID)
                    {
                        if let Some((vid, pid)) = parse_vid_pid(&hardware_id) {
                            // Faz lookup na base de VID/PID
                            let lookup_info = lookup_by_vid_pid(vid, pid);
                            let is_known_thermal = lookup_info.is_some();

                            // Se é uma impressora térmica conhecida, adiciona à lista
                            if is_known_thermal {
                                let friendly_name = get_device_string_property(
                                    dev_info,
                                    &mut dev_info_data,
                                    SPDRP_FRIENDLYNAME,
                                );

                                let description = get_device_string_property(
                                    dev_info,
                                    &mut dev_info_data,
                                    SPDRP_DEVICEDESC,
                                );

                                let manufacturer = get_device_string_property(
                                    dev_info,
                                    &mut dev_info_data,
                                    SPDRP_MFG,
                                );

                                tracing::info!(
                                    "✅ [USB] Impressora térmica detectada: VID={:#06X} PID={:#06X} ({:?})",
                                    vid,
                                    pid,
                                    lookup_info.as_ref().map(|l| &l.vendor)
                                );

                                devices.push(UsbPrinterDevice {
                                    instance_id: instance_id.clone(),
                                    vid,
                                    pid,
                                    friendly_name,
                                    description,
                                    manufacturer,
                                    hardware_id: Some(hardware_id),
                                    lookup_info,
                                    is_known_thermal,
                                });
                            }
                        }
                    }
                }
            }

            index += 1;
        }

        // Limpa o handle
        let _ = SetupDiDestroyDeviceInfoList(dev_info);
    }

    tracing::info!(
        "🔌 [USB] Detecção concluída: {} impressoras USB em {}ms",
        devices.len(),
        start.elapsed().as_millis()
    );

    UsbDetectionResult {
        devices,
        errors,
        duration_ms: start.elapsed().as_millis() as u64,
    }
}

/// Verifica se há alguma impressora térmica USB conectada
pub fn has_thermal_usb_printer() -> bool {
    let result = detect_usb_printers();
    !result.devices.is_empty()
}

/// Obtém informações de uma impressora USB específica por VID/PID
pub fn get_usb_printer_by_vid_pid(vid: u16, pid: u16) -> Option<UsbPrinterDevice> {
    detect_usb_printers()
        .devices
        .into_iter()
        .find(|d| d.vid == vid && d.pid == pid)
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_vid_pid() {
        assert_eq!(
            parse_vid_pid("USB\\VID_04B8&PID_0E20\\123456"),
            Some((0x04B8, 0x0E20))
        );

        assert_eq!(
            parse_vid_pid("USB\\VID_0DD4&PID_0102"),
            Some((0x0DD4, 0x0102))
        );

        assert_eq!(parse_vid_pid("USB\\VID_XXXX"), None);

        assert_eq!(parse_vid_pid(""), None);
    }

    #[test]
    fn test_detect_usb_printers() {
        // Este teste depende do hardware conectado
        let result = detect_usb_printers();

        // Não deve ter erros críticos
        for error in &result.errors {
            println!("Warning: {}", error);
        }

        // Lista o que foi encontrado
        for device in &result.devices {
            println!(
                "Found: {:?} - VID={:#06X} PID={:#06X}",
                device.lookup_info.as_ref().map(|l| &l.vendor),
                device.vid,
                device.pid
            );
        }
    }
}
