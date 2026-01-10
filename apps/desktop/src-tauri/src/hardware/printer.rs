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

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Tipo de conexão da impressora
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PrinterConnection {
    Usb,
    Serial,
    Network,
}

/// Modelo de impressora
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PrinterModel {
    Epson,
    Elgin,
    Bematech,
    Daruma,
    Generic,
}

/// Configuração da impressora
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterConfig {
    pub enabled: bool,
    pub model: PrinterModel,
    pub connection: PrinterConnection,
    pub port: String,    // COM3, /dev/ttyUSB0, ou 192.168.1.100:9100
    pub paper_width: u8, // 48 (58mm) ou 42 (80mm) caracteres
    pub auto_cut: bool,
    pub open_drawer_on_sale: bool,
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

    /// Escreve texto
    pub fn text(&mut self, text: &str) -> &mut Self {
        self.buffer.extend_from_slice(text.as_bytes());
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
        let sep: String = std::iter::repeat(char)
            .take(self.config.paper_width as usize)
            .collect();
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
        if !self.config.enabled {
            return Ok(());
        }

        let mut port = serialport::new(&self.config.port, 9600)
            .timeout(Duration::from_millis(3000))
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
        if !self.config.enabled {
            return Ok(());
        }

        let candidates: Vec<String> = if !self.config.port.trim().is_empty() {
            vec![self.config.port.clone()]
        } else {
            vec!["/dev/usb/lp0".to_string(), "/dev/lp0".to_string()]
        };

        let Some(device_path) = candidates
            .into_iter()
            .find(|p| Path::new(p).exists())
        else {
            return Err(HardwareError::DeviceNotFound(
                "Dispositivo USB da impressora não encontrado (tente configurar a porta, ex: /dev/usb/lp0)".into(),
            ));
        };

        let mut dev = OpenOptions::new()
            .write(true)
            .open(&device_path)
            .map_err(HardwareError::IoError)?;

        dev.write_all(&self.buffer).map_err(HardwareError::IoError)?;
        dev.flush().map_err(HardwareError::IoError)?;

        Ok(())
    }

    /// Envia para impressora via rede
    pub async fn print_network(&self) -> HardwareResult<()> {
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

    /// Imprime página de teste
    pub fn test_print(&mut self) -> HardwareResult<()> {
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

        self.print_serial()
    }
}

// ════════════════════════════════════════════════════════════════════════════
// CUPOM DE VENDA
// ════════════════════════════════════════════════════════════════════════════

/// Item do cupom
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceiptItem {
    pub code: String,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub total: f64,
}

/// Dados do cupom
#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl ThermalPrinter {
    /// Imprime cupom de venda completo
    pub fn print_receipt(&mut self, receipt: &Receipt) -> &mut Self {
        self.init();

        // Cabeçalho
        self.align(TextAlign::Center);
        self.style(TextStyle {
            bold: true,
            double_height: true,
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
        self.separator('-');
        self.line("CUPOM NÃO FISCAL");
        self.separator('-');

        // Info da venda
        self.align(TextAlign::Left);
        self.line(&format!("Venda: #{:06}", receipt.sale_number));
        self.line(&format!("Data: {}", receipt.date_time));
        self.line(&format!("Operador: {}", receipt.operator_name));
        self.separator('-');

        // Itens
        for item in &receipt.items {
            let name = if item.name.len() > 24 {
                &item.name[..24]
            } else {
                &item.name
            };

            if item.quantity == 1.0 {
                // Formato simples: PRODUTO                    R$ 9,99
                let price_str = format!("R$ {:.2}", item.total);
                let spaces = self.config.paper_width as usize - name.len() - price_str.len();
                self.line(&format!(
                    "{}{:>width$}",
                    name,
                    price_str,
                    width = spaces + price_str.len()
                ));
            } else {
                // Formato com quantidade
                self.line(name);
                let detail = format!(
                    "  {} {} x R$ {:.2} = R$ {:.2}",
                    item.quantity, item.unit, item.unit_price, item.total
                );
                self.line(&detail);
            }
        }

        self.separator('-');

        // Totais
        let _width = self.config.paper_width as usize;

        let subtotal_line = format!("SUBTOTAL: R$ {:.2}", receipt.subtotal);
        self.align(TextAlign::Right);
        self.line(&subtotal_line);

        if receipt.discount > 0.0 {
            let discount_line = format!("DESCONTO: -R$ {:.2}", receipt.discount);
            self.line(&discount_line);
        }

        self.separator('=');

        self.style(TextStyle {
            bold: true,
            double_height: true,
            ..Default::default()
        });
        let total_line = format!("TOTAL: R$ {:.2}", receipt.total);
        self.line(&total_line);

        self.style(TextStyle::default());
        self.feed(1);

        // Pagamento
        self.align(TextAlign::Left);
        self.line(&format!("Pagamento: {}", receipt.payment_method));
        if receipt.change > 0.0 {
            self.line(&format!("Valor recebido: R$ {:.2}", receipt.amount_paid));
            self.style(TextStyle {
                bold: true,
                ..Default::default()
            });
            self.line(&format!("TROCO: R$ {:.2}", receipt.change));
            self.style(TextStyle::default());
        }

        // Rodapé
        self.feed(1);
        self.separator('-');
        self.align(TextAlign::Center);
        self.line("Obrigado pela preferência!");
        self.line("Volte sempre!");

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
