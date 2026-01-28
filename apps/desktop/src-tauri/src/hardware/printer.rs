//! Módulo de Impressora Térmica - ESC/POS
//!
//! Suporta:
//! - Epson TM-T20X, TM-T88V
//! - Elgin i7, i9
//! - Bematech MP-4200 TH
//! - Daruma DR800
//! - Genéricas 58mm/80mm

use super::{HardwareError, HardwareResult};
use serde::{Deserialize, Serialize};
#[cfg(any(target_os = "linux", target_os = "windows"))]
use std::fs::OpenOptions;
use std::io::Write;
#[cfg(target_os = "linux")]
use std::path::Path;
use std::time::Duration;

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS ESC/POS
// ════════════════════════════════════════════════════════════════════════════

/// Comandos ESC/POS padrão
pub mod escpos {
    // Caracteres de controle
    pub const ESC: u8 = 0x1B;
    pub const GS: u8 = 0x1D;
    pub const LF: u8 = 0x0A;
    pub const CR: u8 = 0x0D;
    pub const HT: u8 = 0x09;

    // Inicialização
    pub const INIT: [u8; 2] = [ESC, b'@'];

    // Corte de papel
    pub const CUT_PARTIAL: [u8; 4] = [GS, b'V', 0x41, 0x03];
    pub const CUT_FULL: [u8; 4] = [GS, b'V', 0x00, 0x00];

    // Gaveta de dinheiro
    pub const CASH_DRAWER_PIN2: [u8; 5] = [ESC, b'p', 0x00, 0x19, 0xFA];
    pub const CASH_DRAWER_PIN5: [u8; 5] = [ESC, b'p', 0x01, 0x19, 0xFA];

    // Formatação de texto
    pub const BOLD_ON: [u8; 3] = [ESC, b'E', 0x01];
    pub const BOLD_OFF: [u8; 3] = [ESC, b'E', 0x00];
    pub const UNDERLINE_ON: [u8; 3] = [ESC, b'-', 0x01];
    pub const UNDERLINE_OFF: [u8; 3] = [ESC, b'-', 0x00];
    pub const DOUBLE_HEIGHT_ON: [u8; 3] = [GS, b'!', 0x01];
    pub const DOUBLE_WIDTH_ON: [u8; 3] = [GS, b'!', 0x10];
    pub const DOUBLE_SIZE_ON: [u8; 3] = [GS, b'!', 0x11];
    pub const NORMAL_SIZE: [u8; 3] = [GS, b'!', 0x00];

    // Alinhamento
    pub const ALIGN_LEFT: [u8; 3] = [ESC, b'a', 0x00];
    pub const ALIGN_CENTER: [u8; 3] = [ESC, b'a', 0x01];
    pub const ALIGN_RIGHT: [u8; 3] = [ESC, b'a', 0x02];

    // Espaçamento entre linhas
    pub const LINE_SPACING_DEFAULT: [u8; 2] = [ESC, b'2'];
    pub const LINE_SPACING_SET: [u8; 3] = [ESC, b'3', 0x18]; // 24 pontos

    // Código de barras
    pub const BARCODE_HEIGHT: [u8; 3] = [GS, b'h', 80]; // Altura 80 pontos
    pub const BARCODE_WIDTH: [u8; 3] = [GS, b'w', 2]; // Largura 2
    pub const BARCODE_HRI_BELOW: [u8; 3] = [GS, b'H', 2]; // Texto abaixo
    pub const BARCODE_EAN13: [u8; 3] = [GS, b'k', 67];

    // QR Code
    pub const QRCODE_MODEL: [u8; 8] = [GS, b'(', b'k', 4, 0, 49, 65, 50];
    pub const QRCODE_SIZE: [u8; 8] = [GS, b'(', b'k', 3, 0, 49, 67, 6];
    pub const QRCODE_ERROR: [u8; 8] = [GS, b'(', b'k', 3, 0, 49, 69, 48];
    pub const QRCODE_PRINT: [u8; 8] = [GS, b'(', b'k', 3, 0, 49, 81, 48];
}

// Implementação da trait HardwareDevice para ThermalPrinter
impl crate::hardware::HardwareDevice for ThermalPrinter {
    fn health_check(&self) -> Result<crate::hardware::HardwareStatus, String> {
        let name = format!("printer:{:?}", self.config.model);

        if self.config.mock_mode {
            return Ok(crate::hardware::HardwareStatus {
                name,
                ok: true,
                message: Some("mock mode enabled".to_string()),
            });
        }

        if !self.config.enabled {
            return Ok(crate::hardware::HardwareStatus {
                name,
                ok: false,
                message: Some("disabled".to_string()),
            });
        }

        match self.config.connection {
            PrinterConnection::Usb => {
                // Check if any candidate device exists
                let candidates: Vec<String> = if !self.config.port.trim().is_empty() {
                    vec![self.config.port.clone()]
                } else {
                    let mut c = vec!["/dev/lp0".to_string(), "/dev/lp1".to_string()];
                    for i in 0..10 {
                        c.push(format!("/dev/usb/lp{}", i));
                    }
                    c
                };

                let found = candidates
                    .into_iter()
                    .any(|p| std::path::Path::new(&p).exists());
                if found {
                    Ok(crate::hardware::HardwareStatus {
                        name,
                        ok: true,
                        message: Some("usb device present".to_string()),
                    })
                } else {
                    Ok(crate::hardware::HardwareStatus {
                        name,
                        ok: false,
                        message: Some("usb device not found".to_string()),
                    })
                }
            }
            PrinterConnection::Serial => {
                // Try open serial port with configured params
                let mut builder = serialport::new(&self.config.port, self.config.baud_rate);
                builder = match self.config.data_bits {
                    7 => builder.data_bits(serialport::DataBits::Seven),
                    _ => builder.data_bits(serialport::DataBits::Eight),
                };
                builder = match self.config.parity.as_str() {
                    "odd" => builder.parity(serialport::Parity::Odd),
                    "even" => builder.parity(serialport::Parity::Even),
                    _ => builder.parity(serialport::Parity::None),
                };
                builder = builder.stop_bits(serialport::StopBits::One);

                match builder
                    .timeout(Duration::from_millis(self.config.timeout_ms))
                    .open()
                {
                    Ok(mut p) => {
                        // quick flush
                        let _ = p.flush();
                        Ok(crate::hardware::HardwareStatus {
                            name,
                            ok: true,
                            message: Some("serial open".to_string()),
                        })
                    }
                    Err(e) => Ok(crate::hardware::HardwareStatus {
                        name,
                        ok: false,
                        message: Some(format!("serial error: {}", e)),
                    }),
                }
            }
            PrinterConnection::Network => {
                // Try connect TCP
                match std::net::TcpStream::connect_timeout(
                    &self.config.port.parse().unwrap_or_else(|_| {
                        // fallback to socket addr parse fail
                        "0.0.0.0:0".parse().unwrap()
                    }),
                    Duration::from_millis(self.config.timeout_ms),
                ) {
                    Ok(_) => Ok(crate::hardware::HardwareStatus {
                        name,
                        ok: true,
                        message: Some("network reachable".to_string()),
                    }),
                    Err(e) => Ok(crate::hardware::HardwareStatus {
                        name,
                        ok: false,
                        message: Some(format!("network error: {}", e)),
                    }),
                }
            }
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Tipo de conexão da impressora
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PrinterConnection {
    Usb,
    Serial,
    Network,
}

/// Modelo de impressora
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PrinterModel {
    Epson,
    Elgin,
    Bematech,
    Daruma,
    C3Tech,
    Generic,
}

/// Configuração da impressora
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PrinterConfig {
    pub enabled: bool,
    pub model: PrinterModel,
    pub connection: PrinterConnection,
    pub port: String,
    pub paper_width: u16,
    pub auto_cut: bool,
    pub open_drawer_on_sale: bool,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub parity: String,
    #[specta(type = i32)]
    pub timeout_ms: u64,
    pub mock_mode: bool,
}

impl Default for PrinterConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            model: PrinterModel::Generic,
            connection: PrinterConnection::Usb,
            port: String::new(),
            paper_width: 48,
            auto_cut: true,
            open_drawer_on_sale: true,
            baud_rate: 9600,
            data_bits: 8,
            parity: "none".to_string(),
            timeout_ms: 3000,
            mock_mode: false,
        }
    }
}

/// Alinhamento de texto
#[derive(Debug, Clone, Copy)]
pub enum TextAlign {
    Left,
    Center,
    Right,
}

/// Estilo de texto
#[derive(Debug, Clone, Copy, Default)]
pub struct TextStyle {
    pub bold: bool,
    pub underline: bool,
    pub double_height: bool,
    pub double_width: bool,
}

// ════════════════════════════════════════════════════════════════════════════
// IMPRESSORA
// ════════════════════════════════════════════════════════════════════════════

/// Interface da impressora térmica
pub struct ThermalPrinter {
    config: PrinterConfig,
    buffer: Vec<u8>,
}

impl ThermalPrinter {
    /// Cria nova instância da impressora
    pub fn new(config: PrinterConfig) -> Self {
        Self {
            config,
            buffer: Vec::with_capacity(4096),
        }
    }

    /// Verifica se o nome da impressora sugere ser uma impressora térmica
    pub fn is_thermal_candidate(name: &str) -> bool {
        let name_lower = name.to_lowercase();
        // Palavras-chave comuns em drivers de impressoras térmicas
        let keywords = [
            "pos", "thermal", "receipt", "cupom", "termica", "80mm", "58mm", "mp-4200", "tm-t",
            "c3tech", "elgin", "daruma", "bematech", "epson",
        ];
        keywords.iter().any(|k| name_lower.contains(k))
    }

    /// Inicializa a impressora
    pub fn init(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&escpos::INIT);
        self.buffer.extend_from_slice(&escpos::LINE_SPACING_DEFAULT);
        self
    }

    /// Define alinhamento
    pub fn align(&mut self, align: TextAlign) -> &mut Self {
        let cmd = match align {
            TextAlign::Left => &escpos::ALIGN_LEFT,
            TextAlign::Center => &escpos::ALIGN_CENTER,
            TextAlign::Right => &escpos::ALIGN_RIGHT,
        };
        self.buffer.extend_from_slice(cmd);
        self
    }

    /// Define estilo de texto
    pub fn style(&mut self, style: TextStyle) -> &mut Self {
        // Reset para normal
        self.buffer.extend_from_slice(&escpos::NORMAL_SIZE);
        self.buffer.extend_from_slice(&escpos::BOLD_OFF);
        self.buffer.extend_from_slice(&escpos::UNDERLINE_OFF);

        // Aplica estilos
        if style.bold {
            self.buffer.extend_from_slice(&escpos::BOLD_ON);
        }
        if style.underline {
            self.buffer.extend_from_slice(&escpos::UNDERLINE_ON);
        }
        if style.double_height && style.double_width {
            self.buffer.extend_from_slice(&escpos::DOUBLE_SIZE_ON);
        } else if style.double_height {
            self.buffer.extend_from_slice(&escpos::DOUBLE_HEIGHT_ON);
        } else if style.double_width {
            self.buffer.extend_from_slice(&escpos::DOUBLE_WIDTH_ON);
        }
        self
    }

    /// Escreve texto convertendo para encoding compatível com impressoras térmicas
    pub fn text(&mut self, text: &str) -> &mut Self {
        // `encoding_rs` fornece `WINDOWS_1252` para a maior compatibilidade
        // com caracteres latinos. CP850 nem sempre está disponível.
        use encoding_rs::WINDOWS_1252;

        let (bytes, _, _) = WINDOWS_1252.encode(text);
        self.buffer.extend_from_slice(&bytes);
        self
    }

    /// Escreve linha com quebra
    pub fn line(&mut self, text: &str) -> &mut Self {
        self.text(text);
        self.buffer.push(escpos::LF);
        self
    }

    /// Linha vazia
    pub fn feed(&mut self, lines: u8) -> &mut Self {
        for _ in 0..lines {
            self.buffer.push(escpos::LF);
        }
        self
    }

    /// Linha separadora
    pub fn separator(&mut self, char: char) -> &mut Self {
        let sep = char.to_string().repeat(self.config.paper_width as usize);
        self.line(&sep)
    }

    /// Imprime código de barras EAN-13
    pub fn barcode_ean13(&mut self, code: &str) -> &mut Self {
        if code.len() != 13 {
            return self;
        }

        self.buffer.extend_from_slice(&escpos::BARCODE_HEIGHT);
        self.buffer.extend_from_slice(&escpos::BARCODE_WIDTH);
        self.buffer.extend_from_slice(&escpos::BARCODE_HRI_BELOW);
        self.buffer.extend_from_slice(&escpos::BARCODE_EAN13);
        self.buffer.push(13); // Tamanho do código
        self.buffer.extend_from_slice(code.as_bytes());
        self.buffer.push(escpos::LF);
        self
    }

    /// Imprime QR Code
    pub fn qrcode(&mut self, data: &str) -> &mut Self {
        // Modelo QR
        self.buffer.extend_from_slice(&escpos::QRCODE_MODEL);
        // Tamanho
        self.buffer.extend_from_slice(&escpos::QRCODE_SIZE);
        // Nível de correção de erro
        self.buffer.extend_from_slice(&escpos::QRCODE_ERROR);

        // Armazena dados
        let len = data.len() + 3;
        let pl = (len & 0xFF) as u8;
        let ph = ((len >> 8) & 0xFF) as u8;
        self.buffer
            .extend_from_slice(&[escpos::GS, b'(', b'k', pl, ph, 49, 80, 48]);
        self.buffer.extend_from_slice(data.as_bytes());

        // Imprime
        self.buffer.extend_from_slice(&escpos::QRCODE_PRINT);
        self.buffer.push(escpos::LF);
        self
    }

    /// Corta o papel
    pub fn cut(&mut self, partial: bool) -> &mut Self {
        self.feed(3);
        if partial {
            self.buffer.extend_from_slice(&escpos::CUT_PARTIAL);
        } else {
            self.buffer.extend_from_slice(&escpos::CUT_FULL);
        }
        self
    }

    /// Abre a gaveta de dinheiro
    pub fn open_drawer(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&escpos::CASH_DRAWER_PIN2);
        self
    }

    /// Obtém o buffer construído
    pub fn get_buffer(&self) -> &[u8] {
        &self.buffer
    }

    /// Limpa o buffer
    pub fn clear(&mut self) {
        self.buffer.clear();
    }

    /// Envia para a impressora via porta serial
    pub fn print_serial(&self) -> HardwareResult<()> {
        if self.config.mock_mode {
            tracing::info!("[Printer] MOCK PRINT (Serial)");
            return Ok(());
        }
        if !self.config.enabled {
            return Ok(());
        }
        let mut builder = serialport::new(&self.config.port, self.config.baud_rate);
        // data bits
        builder = match self.config.data_bits {
            7 => builder.data_bits(serialport::DataBits::Seven),
            _ => builder.data_bits(serialport::DataBits::Eight),
        };
        // parity
        builder = match self.config.parity.as_str() {
            "odd" => builder.parity(serialport::Parity::Odd),
            "even" => builder.parity(serialport::Parity::Even),
            _ => builder.parity(serialport::Parity::None),
        };
        // stop bits - default 1
        builder = builder.stop_bits(serialport::StopBits::One);
        let mut port = builder
            .timeout(Duration::from_millis(self.config.timeout_ms))
            .open()
            .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;
        port.write_all(&self.buffer)
            .map_err(HardwareError::IoError)?;

        port.flush().map_err(HardwareError::IoError)?;

        Ok(())
    }

    /// Busca o nome da impressora configurada em uma porta específica (LPT1, COM1, USB001, etc.)
    #[cfg(target_os = "windows")]
    fn find_printer_by_port(port_name: &str) -> Option<String> {
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        // PowerShell: busca impressora pela porta
        let ps_command = format!(
            "Get-Printer | Where-Object {{ $_.PortName -eq '{}' }} | Select-Object -ExpandProperty Name",
            port_name
        );

        let mut cmd = Command::new("powershell");
        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        if let Ok(output) = cmd.args(["-NoProfile", "-Command", &ps_command]).output() {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let name = stdout.trim();
                if !name.is_empty() {
                    tracing::info!("Impressora encontrada na porta {}: {}", port_name, name);
                    return Some(name.to_string());
                }
            }
        }

        // Fallback: WMIC (também com CREATE_NO_WINDOW)
        use crate::utils::windows::run_wmic;
        if let Ok(output) = run_wmic([
            "printer",
            "where",
            &format!("PortName='{}'", port_name),
            "get",
            "Name",
        ]) {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines().skip(1) {
                    let name = line.trim();
                    if !name.is_empty() && name != "Name" {
                        tracing::info!(
                            "Impressora encontrada (WMIC) na porta {}: {}",
                            port_name,
                            name
                        );
                        return Some(name.to_string());
                    }
                }
            }
        }

        None
    }

    /// Envia dados RAW para impressora via Windows Print Spooler
    /// Usa PowerShell com .NET para enviar dados RAW diretamente via WritePrinter API
    #[cfg(target_os = "windows")]
    fn print_windows_spooler(&self, printer_name: &str) -> HardwareResult<()> {
        use std::io::Write;
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        // Cria arquivo temporário com os dados ESC/POS
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("giro_print_{}.bin", std::process::id()));

        // Escreve os dados binários no arquivo temporário
        let mut file = std::fs::File::create(&temp_file).map_err(|e| HardwareError::IoError(e))?;
        file.write_all(&self.buffer)
            .map_err(|e| HardwareError::IoError(e))?;
        file.flush().map_err(|e| HardwareError::IoError(e))?;
        drop(file);

        let temp_path = temp_file.to_string_lossy().to_string();

        // Método 1: PowerShell usando .NET para impressão RAW (mais confiável)
        // Este método usa a API nativa do Windows para enviar dados RAW
        let ps_script = format!(
            r#"
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinter {{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {{
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }}
    
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string printerName, byte[] bytes) {{
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "GIRO RAW Document";
        di.pDataType = "RAW";
        
        if (!OpenPrinter(printerName.Normalize(), out hPrinter, IntPtr.Zero)) {{
            return false;
        }}
        
        if (!StartDocPrinter(hPrinter, 1, di)) {{
            ClosePrinter(hPrinter);
            return false;
        }}
        
        if (!StartPagePrinter(hPrinter)) {{
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return false;
        }}
        
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        
        int dwWritten;
        bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
        
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        
        return success && dwWritten == bytes.Length;
    }}
}}
'@ -Language CSharp -ErrorAction Stop

$bytes = [System.IO.File]::ReadAllBytes("{temp_path}")
$result = [RawPrinter]::SendBytesToPrinter("{printer_name}", $bytes)
if ($result) {{ exit 0 }} else {{ exit 1 }}
"#,
            temp_path = temp_path.replace("\\", "\\\\"),
            printer_name = printer_name.replace("\"", "\\\"")
        );

        let mut cmd = Command::new("powershell");
        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let result = cmd
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &ps_script,
            ])
            .output();

        // Limpa arquivo temporário
        let _ = std::fs::remove_file(&temp_file);

        match result {
            Ok(output) => {
                if output.status.success() {
                    tracing::info!(
                        "Impressão RAW via WritePrinter bem-sucedida: {}",
                        printer_name
                    );
                    Ok(())
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let stdout = String::from_utf8_lossy(&output.stdout);

                    // Fallback: tentar método copy /b
                    tracing::warn!(
                        "WritePrinter falhou, tentando copy /b: {} {}",
                        stdout,
                        stderr
                    );
                    self.print_windows_copy_fallback(printer_name)
                }
            }
            Err(e) => {
                tracing::warn!("PowerShell falhou, tentando copy /b: {}", e);
                self.print_windows_copy_fallback(printer_name)
            }
        }
    }

    /// Fallback: usa copy /b para enviar dados RAW
    #[cfg(target_os = "windows")]
    fn print_windows_copy_fallback(&self, printer_name: &str) -> HardwareResult<()> {
        use std::io::Write;
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("giro_print_fb_{}.bin", std::process::id()));

        let mut file = std::fs::File::create(&temp_file).map_err(|e| HardwareError::IoError(e))?;
        file.write_all(&self.buffer)
            .map_err(|e| HardwareError::IoError(e))?;
        file.flush().map_err(|e| HardwareError::IoError(e))?;
        drop(file);

        let upper = printer_name.to_uppercase();

        // Determina o caminho de destino correto
        // LPT1, LPT2, COM1, etc são portas físicas - usar diretamente
        // Nomes de impressora precisam do caminho UNC
        let dest_path = if upper.starts_with("LPT") || upper.starts_with("COM") {
            // Porta física - usar diretamente
            printer_name.to_string()
        } else if printer_name.starts_with("\\\\") {
            // Já é caminho UNC
            printer_name.to_string()
        } else {
            // Nome de impressora - converter para UNC
            format!("\\\\localhost\\{}", printer_name)
        };

        let mut cmd = Command::new("cmd");
        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000);
        }

        // Usa aspas ao redor do caminho para lidar com espaços
        let result = cmd
            .args([
                "/C",
                "copy",
                "/b",
                &temp_file.to_string_lossy(),
                &format!("\"{}\"", dest_path),
            ])
            .output();

        let _ = std::fs::remove_file(&temp_file);

        match result {
            Ok(output) => {
                if output.status.success() {
                    tracing::info!("Impressão via copy /b bem-sucedida: {}", dest_path);
                    Ok(())
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    Err(HardwareError::CommunicationError(format!(
                        "Falha ao enviar para impressora '{}': {} {}",
                        dest_path, stdout, stderr
                    )))
                }
            }
            Err(e) => Err(HardwareError::CommunicationError(format!(
                "Erro ao executar copy: {}",
                e
            ))),
        }
    }

    /// Envia para a impressora via dispositivo USB (raw)
    ///
    /// Observação: isso funciona tipicamente em Linux via `/dev/usb/lp0`.
    /// Em Windows, recomenda-se usar interface Serial/COM (driver virtual COM).
    /// Envia para a impressora via dispositivo USB (raw)
    /// e.g. Linux: `/dev/usb/lp0`
    /// e.g. Windows: `\\localhost\printer` ou `LPT1`
    pub fn print_usb(&self) -> HardwareResult<()> {
        if self.config.mock_mode {
            tracing::info!("[Printer] MOCK PRINT (USB/Raw)");
            return Ok(());
        }
        if !self.config.enabled {
            return Ok(());
        }

        #[cfg(target_os = "linux")]
        {
            let candidates: Vec<String> = if !self.config.port.trim().is_empty() {
                vec![self.config.port.clone()]
            } else {
                let mut c = vec!["/dev/lp0".to_string(), "/dev/lp1".to_string()];
                for i in 0..10 {
                    c.push(format!("/dev/usb/lp{}", i));
                }
                c
            };

            let Some(device_path) = candidates.into_iter().find(|p| Path::new(p).exists()) else {
                return Err(HardwareError::DeviceNotFound(
                    "Dispositivo USB da impressora não encontrado (tente configurar a porta, ex: /dev/usb/lp0)".into(),
                ));
            };

            let mut dev = OpenOptions::new()
                .write(true)
                .open(&device_path)
                .map_err(HardwareError::IoError)?;

            dev.write_all(&self.buffer)
                .map_err(HardwareError::IoError)?;
            dev.flush().map_err(HardwareError::IoError)?;

            Ok(())
        }

        #[cfg(target_os = "windows")]
        {
            let port = self.config.port.trim();
            if port.is_empty() {
                return Err(HardwareError::NotConfigured(
                    "Windows: Nome da impressora ou porta não configurada.".into(),
                ));
            }

            let upper = port.to_uppercase();

            // Estratégia de conexão para Windows (USB/RAW):
            // 1. Se for porta física (LPT1, COM1, USB001), busca a impressora nessa porta
            // 2. Se for caminho UNC (\\...) ou nome de impressora, usa spooler diretamente

            // Se for porta física, tenta descobrir a impressora configurada nela
            if upper.starts_with("LPT") || upper.starts_with("USB") {
                tracing::info!("Buscando impressora na porta física: {}", port);

                if let Some(printer_name) = Self::find_printer_by_port(port) {
                    tracing::info!("Impressora '{}' encontrada na porta {}", printer_name, port);
                    return self.print_windows_spooler(&printer_name);
                }

                // Não encontrou impressora na porta via WMI/PowerShell
                // Tenta enviar diretamente para a porta física (LPT1, etc)
                tracing::info!(
                    "Impressora não encontrada via spooler na porta {}, tentando acesso direto",
                    port
                );

                // Para LPT, tenta copy /b diretamente para a porta
                if upper.starts_with("LPT") {
                    return self.print_windows_copy_fallback(port);
                }

                // Para USB, tenta buscar pelo modelo configurado
                let model_name = format!("{:?}", self.config.model);
                tracing::info!(
                    "Porta USB {} sem impressora mapeada, tentando modelo: {}",
                    port,
                    model_name
                );

                // Tenta buscar pelo modelo configurado
                // (Removido fallback forçado para C3Tech/LPT1 em favor de detecção via Spooler)
                let _ = model_name;
            }

            // Se for caminho UNC ou nome de impressora, usa o spooler do Windows
            if port.contains("\\")
                || !upper.starts_with("LPT")
                    && !upper.starts_with("COM")
                    && !upper.starts_with("USB")
            {
                // Extrai o nome da impressora do caminho UNC
                let printer_name = if port.starts_with("\\\\localhost\\") {
                    port.strip_prefix("\\\\localhost\\").unwrap_or(port)
                } else if port.starts_with("\\\\127.0.0.1\\") {
                    port.strip_prefix("\\\\127.0.0.1\\").unwrap_or(port)
                } else if port.starts_with("\\\\") {
                    // Caminho de rede: \\servidor\impressora
                    port
                } else {
                    // Nome simples da impressora
                    port
                };

                return self.print_windows_spooler(printer_name);
            }

            // Para COM (serial), tenta abrir diretamente
            if upper.starts_with("COM") {
                let device_path = format!("\\\\.\\{}", port);
                match OpenOptions::new()
                    .write(true)
                    .create(false)
                    .open(&device_path)
                {
                    Ok(mut dev) => {
                        dev.write_all(&self.buffer)
                            .map_err(HardwareError::IoError)?;
                        dev.flush().map_err(HardwareError::IoError)?;
                        return Ok(());
                    }
                    Err(e) => {
                        return Err(HardwareError::ConnectionFailed(format!(
                            "Falha ao abrir porta serial '{}': {}. \
                            DICA: Verifique se a porta está correta e não está em uso.",
                            port, e
                        )));
                    }
                }
            }

            // Fallback: tenta usar spooler com o valor da porta como nome
            tracing::info!("Tentando via Windows Spooler como fallback: {}", port);
            self.print_windows_spooler(port)
        }

        #[cfg(not(any(target_os = "linux", target_os = "windows")))]
        {
            Err(HardwareError::NotConfigured(
                "Sistema operacional não suportado para impressão USB/Raw".into(),
            ))
        }
    }

    /// Envia para impressora via rede
    pub async fn print_network(&self) -> HardwareResult<()> {
        if self.config.mock_mode {
            tracing::info!("[Printer] MOCK PRINT (Network)");
            return Ok(());
        }
        if !self.config.enabled {
            return Ok(());
        }

        use tokio::io::AsyncWriteExt;
        use tokio::net::TcpStream;

        let mut stream = TcpStream::connect(&self.config.port)
            .await
            .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

        stream
            .write_all(&self.buffer)
            .await
            .map_err(HardwareError::IoError)?;

        Ok(())
    }

    /// Envia para a impressora usando a conexão configurada
    pub async fn print(&self) -> HardwareResult<()> {
        match self.config.connection {
            PrinterConnection::Usb => self.print_usb(),
            PrinterConnection::Serial => self.print_serial(),
            PrinterConnection::Network => self.print_network().await,
        }
    }

    /// Constrói página de teste no buffer
    pub fn build_test_page(&mut self) -> &mut Self {
        self.init();

        self.align(TextAlign::Center);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            ..Default::default()
        });
        self.line("=== TESTE DE IMPRESSAO ===");

        self.style(TextStyle::default());
        self.feed(1);
        self.line("GIRO PDV");
        self.line("Impressora configurada com sucesso!");
        self.feed(1);

        // Teste de caracteres
        self.align(TextAlign::Left);
        self.line("Caracteres especiais:");
        self.line("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        self.line("abcdefghijklmnopqrstuvwxyz");
        self.line("0123456789");
        self.line("!@#$%^&*()_+-=[]{}|;':\",./<>?");
        self.line("Acentos: áéíóú ÁÉÍÓÚ ãõ ç");
        self.feed(1);

        // Teste de largura
        let cols = self.config.paper_width as usize;
        self.separator('-');
        self.line(&format!("Largura: {} colunas", cols));
        self.separator('-');

        self.feed(1);
        self.align(TextAlign::Center);
        self.line(&format!(
            "Data/Hora: {}",
            chrono::Local::now().format("%d/%m/%Y %H:%M:%S")
        ));

        if self.config.auto_cut {
            self.cut(true);
        } else {
            self.feed(4);
        }

        self
    }

    /// Imprime página de teste
    pub async fn test_print(&mut self) -> HardwareResult<()> {
        self.build_test_page();
        self.print().await
    }
}

// ════════════════════════════════════════════════════════════════════════════
// CUPOM DE VENDA
// ════════════════════════════════════════════════════════════════════════════

/// Item do cupom
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptItem {
    pub code: String,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub total: f64,
}

/// Dados do cupom
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub company_name: String,
    pub company_address: String,
    pub company_cnpj: Option<String>,
    pub company_phone: Option<String>,

    pub sale_number: i32,
    pub operator_name: String,
    pub date_time: String,

    pub items: Vec<ReceiptItem>,
    pub subtotal: f64,
    pub discount: f64,
    pub total: f64,

    pub payment_method: String,
    pub amount_paid: f64,
    pub change: f64,
}

/// Dados para impressão de Ordem de Serviço
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderReceipt {
    pub company_name: String,
    pub company_address: String,
    pub company_cnpj: Option<String>,
    pub company_phone: Option<String>,

    pub order_number: i32,
    pub date_time: String,
    pub status: String,
    pub mechanic_name: String,

    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub vehicle_display_name: String,
    pub vehicle_plate: Option<String>,
    pub vehicle_km: Option<i32>,
    pub symptoms: Option<String>,

    pub items: Vec<ReceiptItem>,
    pub labor_cost: f64,
    pub parts_cost: f64,
    pub discount: f64,
    pub total: f64,

    pub warranty_days: i32,
    pub notes: Option<String>,
}

/// Dados para impressão de Pedido do Atendente
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AttendantOrderReceipt {
    pub company_name: String,
    pub company_address: String,
    pub company_phone: Option<String>,

    pub order_number: String,
    pub date_time: String,
    pub attendant_name: String,

    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,

    pub items: Vec<ReceiptItem>,
    pub subtotal: f64,
    pub discount: f64,
    pub total: f64,

    pub notes: Option<String>,
}

impl ThermalPrinter {
    /// Imprime cupom de venda completo
    pub fn print_receipt(&mut self, receipt: &Receipt) -> &mut Self {
        self.init();

        // Cabeçalho
        self.align(TextAlign::Center);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            double_width: true,
            ..Default::default()
        });
        self.line(&receipt.company_name);

        self.style(TextStyle::default());
        if let Some(ref cnpj) = receipt.company_cnpj {
            self.line(&format!("CNPJ: {}", cnpj));
        }
        self.line(&receipt.company_address);
        if let Some(ref phone) = receipt.company_phone {
            self.line(&format!("Tel: {}", phone));
        }

        self.feed(1);
        self.separator('=');
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line("CUPOM NÃO FISCAL");
        self.style(TextStyle::default());
        self.separator('=');

        // Info da venda
        self.align(TextAlign::Left);
        self.line(&format!("VENDA: #{:06}", receipt.sale_number));
        self.line(&format!("DATA:  {}", receipt.date_time));
        self.line(&format!("OPER:  {}", receipt.operator_name));
        self.separator('-');

        // Itens - Cabeçalho
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line("ITEM   DESC   QTD   UN   VL.UNIT   TOTAL");
        self.style(TextStyle::default());
        self.separator('-');

        // Itens
        for (i, item) in receipt.items.iter().enumerate() {
            let name = if item.name.len() > 30 {
                &item.name[..30]
            } else {
                &item.name
            };

            self.line(&format!("{:03} {}", i + 1, name));

            let detail = format!(
                "      {:.3}{} x R$ {:.2}",
                item.quantity, item.unit, item.unit_price
            );
            let total_str = format!("R$ {:.2}", item.total);
            let spaces =
                (self.config.paper_width as usize).saturating_sub(detail.len() + total_str.len());

            self.line(&format!(
                "{}{:>width$}",
                detail,
                total_str,
                width = spaces + total_str.len()
            ));
        }

        self.separator('-');

        // Totais
        self.align(TextAlign::Right);

        let subtotal_line = format!("SUBTOTAL: R$ {:.2}", receipt.subtotal);
        self.line(&subtotal_line);

        if receipt.discount > 0.0 {
            let discount_line = format!("DESCONTO: -R$ {:.2}", receipt.discount);
            self.line(&discount_line);
        }

        self.feed(1);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            double_width: true,
            ..Default::default()
        });
        self.line(&format!("TOTAL: R$ {:.2}", receipt.total));

        self.style(TextStyle::default());
        self.separator('=');

        // Pagamento
        self.align(TextAlign::Left);
        self.line(&format!("FORMA PGTO: {}", receipt.payment_method));
        self.line(&format!("VALOR PAGO: R$ {:.2}", receipt.amount_paid));

        if receipt.change > 0.0 {
            self.style(TextStyle {
                bold: true,
                double_height: true,
                ..Default::default()
            });
            self.line(&format!("TROCO: R$ {:.2}", receipt.change));
            self.style(TextStyle::default());
        }

        // Rodapé
        self.feed(2);
        self.align(TextAlign::Center);
        self.line("Obrigado pela preferência!");
        self.line("Volte sempre!");
        self.feed(1);

        // QR Code de autenticidade (simulado)
        let qr_data = format!("SALE:{:06}:{}", receipt.sale_number, receipt.date_time);
        self.qrcode(&qr_data);

        // Corte
        if self.config.auto_cut {
            self.cut(true);
        } else {
            self.feed(4);
        }

        self
    }

    /// Imprime Ordem de Serviço completa
    pub fn print_service_order(&mut self, os: &ServiceOrderReceipt) -> &mut Self {
        self.init();
        let width = self.config.paper_width as usize;

        // Cabeçalho
        self.align(TextAlign::Center);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            double_width: true,
            ..Default::default()
        });
        self.line(&os.company_name);

        self.style(TextStyle::default());
        if let Some(ref cnpj) = os.company_cnpj {
            self.line(&format!("CNPJ: {}", cnpj));
        }
        self.line(&os.company_address);
        if let Some(ref phone) = os.company_phone {
            self.line(&format!("TEL: {}", phone));
        }

        self.feed(1);
        self.separator('=');
        self.style(TextStyle {
            bold: true,
            double_height: true,
            ..Default::default()
        });
        self.line("ORDEM DE SERVIÇO");
        self.style(TextStyle::default());
        self.separator('=');

        // Info da OS
        self.align(TextAlign::Left);
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line(&format!("OS NÚMERO: #{:06}", os.order_number));
        self.style(TextStyle::default());

        self.line(&format!("STATUS: {}", os.status.to_uppercase()));
        self.line(&format!("DATA:   {}", os.date_time));
        self.line(&format!("MECÂNICO: {}", os.mechanic_name));
        self.separator('-');

        // Info do Cliente/Veículo
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line("DADOS DO CLIENTE / VEÍCULO");
        self.style(TextStyle::default());

        self.line(&format!("CLIENTE: {}", os.customer_name));
        if let Some(ref phone) = os.customer_phone {
            self.line(&format!("FONE:    {}", phone));
        }
        self.line(&format!("VEÍCULO: {}", os.vehicle_display_name));
        if let Some(ref plate) = os.vehicle_plate {
            self.line(&format!("PLACA:   {}", plate));
        }
        if let Some(km) = os.vehicle_km {
            self.line(&format!("KM:      {}", km));
        }

        // Garantia (Em destaque)
        if os.warranty_days > 0 {
            self.feed(1);
            self.align(TextAlign::Center);
            self.style(TextStyle {
                bold: true,
                underline: true,
                ..Default::default()
            });
            self.line(&format!("GARANTIA: {} DIAS", os.warranty_days));
            self.style(TextStyle::default());
            self.align(TextAlign::Left);
        }

        if let Some(ref symptoms) = os.symptoms {
            self.feed(1);
            self.line("SINTOMAS / RELATO:");
            self.line(symptoms);
        }

        self.separator('-');

        // Itens
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line("PEÇAS E SERVIÇOS");
        self.style(TextStyle::default());
        self.separator('-');

        for item in &os.items {
            let name = if item.name.len() > 30 {
                &item.name[..30]
            } else {
                &item.name
            };

            self.line(name);

            let detail = format!(
                "  {:.2}{} x R$ {:.2}",
                item.quantity, item.unit, item.unit_price
            );
            let total_str = format!("R$ {:.2}", item.total);
            let spaces = width.saturating_sub(detail.len() + total_str.len());

            self.line(&format!(
                "{}{:>width$}",
                detail,
                total_str,
                width = spaces + total_str.len()
            ));
        }

        self.separator('-');

        // Totais
        self.align(TextAlign::Right);
        if os.labor_cost > 0.0 {
            self.line(&format!("MÃO DE OBRA: R$ {:.2}", os.labor_cost));
        }
        if os.parts_cost > 0.0 {
            self.line(&format!("PEÇAS:       R$ {:.2}", os.parts_cost));
        }
        if os.discount > 0.0 {
            self.style(TextStyle {
                bold: true,
                ..Default::default()
            });
            self.line(&format!("DESCONTO:   -R$ {:.2}", os.discount));
            self.style(TextStyle::default());
        }

        self.feed(1);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            double_width: true,
            ..Default::default()
        });
        self.line(&format!("TOTAL: R$ {:.2}", os.total));
        self.style(TextStyle::default());
        self.separator('=');

        // Rodapé
        if let Some(ref notes) = os.notes {
            self.align(TextAlign::Left);
            self.line("OBSERVAÇÕES:");
            self.line(notes);
            self.feed(1);
        }

        self.feed(2);
        self.align(TextAlign::Center);

        let signature_label = "ASSINATURA DO CLIENTE";
        let underscores = "_".repeat(24);
        self.line(&underscores);
        self.line(signature_label);

        self.feed(1);
        self.line("Obrigado pela confiança!");

        let qr_data = format!("OS:{:06}:{}", os.order_number, os.date_time);
        self.qrcode(&qr_data);

        // Corte
        if self.config.auto_cut {
            self.cut(true);
        } else {
            self.feed(4);
        }

        self
    }

    /// Imprime Pedido do Atendente (para cliente levar ao caixa)
    pub fn print_attendant_order(&mut self, order: &AttendantOrderReceipt) -> &mut Self {
        self.init();
        let width = self.config.paper_width as usize;

        // Cabeçalho
        self.align(TextAlign::Center);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            double_width: true,
            ..Default::default()
        });
        self.line(&order.company_name);

        self.style(TextStyle::default());
        self.line(&order.company_address);
        if let Some(ref phone) = order.company_phone {
            self.line(&format!("TEL: {}", phone));
        }

        self.feed(1);
        self.separator('=');
        self.style(TextStyle {
            bold: true,
            double_height: true,
            ..Default::default()
        });
        self.line("*** PEDIDO ***");
        self.style(TextStyle::default());
        self.separator('=');

        // Info do Pedido
        self.align(TextAlign::Left);
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line(&format!("PEDIDO: #{}", order.order_number));
        self.style(TextStyle::default());
        self.line(&order.date_time);
        self.line(&format!("ATENDENTE: {}", order.attendant_name));

        if let Some(ref customer) = order.customer_name {
            self.line(&format!("CLIENTE: {}", customer));
        }
        if let Some(ref phone) = order.customer_phone {
            self.line(&format!("TELEFONE: {}", phone));
        }

        self.separator('-');

        // Itens
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line("ITENS DO PEDIDO");
        self.style(TextStyle::default());
        self.separator('-');

        for (i, item) in order.items.iter().enumerate() {
            let name = if item.name.len() > 28 {
                &item.name[..28]
            } else {
                &item.name
            };

            self.line(&format!("{:02}. {}", i + 1, name));

            let detail = format!(
                "    {:.2}{} x R$ {:.2}",
                item.quantity, item.unit, item.unit_price
            );
            let total_str = format!("R$ {:.2}", item.total);
            let spaces = width.saturating_sub(detail.len() + total_str.len());

            self.line(&format!(
                "{}{:>width$}",
                detail,
                total_str,
                width = spaces + total_str.len()
            ));
        }

        self.separator('-');

        // Totais
        self.align(TextAlign::Right);
        self.line(&format!("SUBTOTAL: R$ {:.2}", order.subtotal));

        if order.discount > 0.0 {
            self.style(TextStyle {
                bold: true,
                ..Default::default()
            });
            self.line(&format!("DESCONTO: -R$ {:.2}", order.discount));
            self.style(TextStyle::default());
        }

        self.feed(1);
        self.style(TextStyle {
            bold: true,
            double_height: true,
            double_width: true,
            ..Default::default()
        });
        self.line(&format!("TOTAL: R$ {:.2}", order.total));
        self.style(TextStyle::default());
        self.separator('=');

        // Aviso para ir ao caixa
        self.align(TextAlign::Center);
        self.feed(1);
        self.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        self.line(">>> APRESENTAR NO CAIXA <<<");
        self.style(TextStyle::default());
        self.feed(1);

        // Observações
        if let Some(ref notes) = order.notes {
            self.align(TextAlign::Left);
            self.line("OBS:");
            self.line(notes);
            self.feed(1);
        }

        // QR Code com ID do pedido
        self.align(TextAlign::Center);
        let qr_data = format!("PEDIDO:{}", order.order_number);
        self.qrcode(&qr_data);

        self.feed(1);
        self.line("Obrigado pela preferência!");

        // Corte
        if self.config.auto_cut {
            self.cut(true);
        } else {
            self.feed(4);
        }

        self
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_printer_init() {
        let config = PrinterConfig::default();
        let mut printer = ThermalPrinter::new(config);
        printer.init();

        assert!(!printer.buffer.is_empty());
        assert_eq!(&printer.buffer[0..2], &escpos::INIT);
    }

    #[test]
    fn test_receipt_builder() {
        let config = PrinterConfig {
            paper_width: 48,
            ..Default::default()
        };
        let mut printer = ThermalPrinter::new(config);

        let receipt = Receipt {
            company_name: "MERCEARIA TESTE".to_string(),
            company_address: "Rua Teste, 123".to_string(),
            company_cnpj: Some("00.000.000/0001-00".to_string()),
            company_phone: Some("(11) 9999-9999".to_string()),
            sale_number: 1,
            operator_name: "Admin".to_string(),
            date_time: "07/01/2026 12:00".to_string(),
            items: vec![ReceiptItem {
                code: "MRC-00001".to_string(),
                name: "Refrigerante Cola 2L".to_string(),
                quantity: 2.0,
                unit: "UN".to_string(),
                unit_price: 9.99,
                total: 19.98,
            }],
            subtotal: 19.98,
            discount: 0.0,
            total: 19.98,
            payment_method: "DINHEIRO".to_string(),
            amount_paid: 20.0,
            change: 0.02,
        };

        printer.print_receipt(&receipt);

        assert!(printer.buffer.len() > 100);
    }

    #[test]
    fn test_formatting_commands() {
        let config = PrinterConfig::default();
        let mut printer = ThermalPrinter::new(config);

        // Test Alignment
        printer.align(TextAlign::Center);
        // Look for ESC 'a' 1 (Center) -> [0x1B, 0x61, 0x01]
        assert!(printer.buffer.ends_with(&[0x1B, 0x61, 0x01]));

        // Test Bold
        printer.style(TextStyle {
            bold: true,
            ..Default::default()
        });
        // Look for ESC 'E' 1 (Bold On) -> [0x1B, 0x45, 0x01]
        // Note: style() first resets, so we check if it contains the bold command closer to end
        assert!(printer.buffer.windows(3).any(|w| w == [0x1B, 0x45, 0x01]));
    }

    #[test]
    fn test_print_service_order_content() {
        let config = PrinterConfig {
            paper_width: 48,
            ..Default::default()
        };
        let mut printer = ThermalPrinter::new(config);

        let os = ServiceOrderReceipt {
            company_name: "OFICINA".to_string(),
            company_address: "Rua Mecanica".to_string(),
            company_cnpj: None,
            company_phone: None,
            order_number: 100,
            date_time: "01/01/2026".to_string(),
            status: "ABERTO".to_string(),
            mechanic_name: "Joao".to_string(),
            customer_name: "Maria".to_string(),
            customer_phone: None,
            vehicle_display_name: "Honda Civic".to_string(),
            vehicle_plate: Some("ABC-1234".to_string()),
            vehicle_km: Some(50000),
            symptoms: Some("Barulho no motor".to_string()),
            items: vec![],
            labor_cost: 100.0,
            parts_cost: 50.0,
            discount: 0.0,
            total: 150.0,
            warranty_days: 90,
            notes: None,
        };

        printer.print_service_order(&os);

        // Check content conversion to bytes (using simple check)
        // Since encoding is WINDOWS_1252, ASCII chars are preserved 1:1
        // We can inspect the buffer safely for ASCII substrings

        fn has_sequence(buffer: &[u8], sub: &[u8]) -> bool {
            buffer.windows(sub.len()).any(|w| w == sub)
        }

        assert!(has_sequence(&printer.buffer, b"Honda Civic"));
        assert!(has_sequence(&printer.buffer, b"ABC-1234"));
        assert!(has_sequence(&printer.buffer, b"Barulho no motor"));
        assert!(has_sequence(&printer.buffer, b"TOTAL: R$ 150.00"));
    }
}
