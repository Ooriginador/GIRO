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
use std::fs::OpenOptions;
use std::io::Write;
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

    /// Envia para a impressora via dispositivo USB (raw)
    ///
    /// Observação: isso funciona tipicamente em Linux via `/dev/usb/lp0`.
    /// Em Windows, recomenda-se usar interface Serial/COM (driver virtual COM).
    pub fn print_usb(&self) -> HardwareResult<()> {
        if self.config.mock_mode {
            tracing::info!("[Printer] MOCK PRINT (USB)");
            return Ok(());
        }
        if !self.config.enabled {
            return Ok(());
        }

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

    /// Imprime página de teste
    pub async fn test_print(&mut self) -> HardwareResult<()> {
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
}
