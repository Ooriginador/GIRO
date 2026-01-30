# 🔌 Hardware Integration Skill

> **Integração com dispositivos de ponto de venda**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
project: GIRO Desktop (GIRO-D)
path: GIRO/apps/desktop/src-tauri/src/hardware/
stack: Rust + serialport crate
devices:
  - Thermal printers (ESC/POS)
  - Scales (Toledo, Filizola, Urano)
  - Barcode scanners (USB HID/Serial)
  - Cash drawers (via printer)
```

## 📋 Descrição

Esta skill fornece conhecimento especializado para integração com hardware de PDV, incluindo:

- Impressoras térmicas (ESC/POS)
- Balanças comerciais (Toledo, Filizola)
- Leitores de código de barras
- Gavetas de dinheiro
- Display para cliente

## 🛠️ Dispositivos Suportados

| Tipo        | Marcas                         | Protocolo            |
| ----------- | ------------------------------ | -------------------- |
| Impressoras | Epson, Elgin, Bematech, Daruma | ESC/POS              |
| Balanças    | Toledo, Filizola, Urano        | Serial RS-232        |
| Scanners    | Honeywell, Zebra, Elgin        | USB HID/Serial       |
| Gavetas     | Bematech, Elgin                | Pulso via impressora |

## 📁 Estrutura

```
apps/desktop/src-tauri/src/hardware/
├── mod.rs              # Exports
├── printer.rs          # Impressora térmica
├── scale.rs            # Balança
├── barcode_scanner.rs  # Leitor de código
├── cash_drawer.rs      # Gaveta de dinheiro
└── display.rs          # Display cliente
```

## 📐 Implementações

### Impressora Térmica (ESC/POS)

```rust
use serialport::{self, SerialPort};
use std::io::Write;

pub struct ThermalPrinter {
    port: Box<dyn SerialPort>,
}

impl ThermalPrinter {
    pub fn new(port_name: &str) -> Result<Self, PrinterError> {
        let port = serialport::new(port_name, 9600)
            .timeout(std::time::Duration::from_millis(1000))
            .open()?;

        Ok(Self { port })
    }

    /// Inicializa impressora
    pub fn init(&mut self) -> Result<(), PrinterError> {
        self.port.write_all(&[0x1B, 0x40])?; // ESC @
        Ok(())
    }

    /// Imprime texto
    pub fn print_text(&mut self, text: &str) -> Result<(), PrinterError> {
        self.port.write_all(text.as_bytes())?;
        Ok(())
    }

    /// Texto em negrito
    pub fn bold(&mut self, enabled: bool) -> Result<(), PrinterError> {
        let cmd = if enabled {
            [0x1B, 0x45, 0x01] // ESC E 1
        } else {
            [0x1B, 0x45, 0x00] // ESC E 0
        };
        self.port.write_all(&cmd)?;
        Ok(())
    }

    /// Centralizar texto
    pub fn center(&mut self) -> Result<(), PrinterError> {
        self.port.write_all(&[0x1B, 0x61, 0x01])?; // ESC a 1
        Ok(())
    }

    /// Cortar papel
    pub fn cut(&mut self) -> Result<(), PrinterError> {
        self.port.write_all(&[0x1D, 0x56, 0x00])?; // GS V 0
        Ok(())
    }

    /// Abrir gaveta
    pub fn open_drawer(&mut self) -> Result<(), PrinterError> {
        self.port.write_all(&[0x1B, 0x70, 0x00, 0x19, 0xFA])?;
        Ok(())
    }
}
```

### Balança Serial

```rust
pub struct Scale {
    port: Box<dyn SerialPort>,
    protocol: ScaleProtocol,
}

pub enum ScaleProtocol {
    Toledo,
    Filizola,
    Urano,
}

impl Scale {
    pub fn new(port_name: &str, protocol: ScaleProtocol) -> Result<Self, ScaleError> {
        let baud_rate = match protocol {
            ScaleProtocol::Toledo => 4800,
            ScaleProtocol::Filizola => 9600,
            ScaleProtocol::Urano => 9600,
        };

        let port = serialport::new(port_name, baud_rate)
            .timeout(std::time::Duration::from_millis(500))
            .open()?;

        Ok(Self { port, protocol })
    }

    pub fn read_weight(&mut self) -> Result<f64, ScaleError> {
        // Enviar comando de leitura
        self.port.write_all(&[0x05])?; // ENQ

        // Ler resposta
        let mut buffer = [0u8; 16];
        let bytes_read = self.port.read(&mut buffer)?;

        // Parsear peso baseado no protocolo
        self.parse_weight(&buffer[..bytes_read])
    }

    fn parse_weight(&self, data: &[u8]) -> Result<f64, ScaleError> {
        match self.protocol {
            ScaleProtocol::Toledo => {
                // Formato: STX + 6 dígitos + ETX
                let weight_str = std::str::from_utf8(&data[1..7])?;
                let weight: f64 = weight_str.parse()?;
                Ok(weight / 1000.0) // Converter para kg
            }
            _ => Err(ScaleError::UnsupportedProtocol),
        }
    }
}
```

### Tauri Command

```rust
#[command]
pub async fn print_receipt(
    sale: Sale,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let settings = state.settings.read().await;

    let mut printer = ThermalPrinter::new(&settings.printer_port)
        .map_err(|e| e.to_string())?;

    printer.init()?;

    // Cabeçalho
    printer.center()?;
    printer.bold(true)?;
    printer.print_text(&settings.store_name)?;
    printer.bold(false)?;
    printer.print_text(&format!("\nCNPJ: {}\n", settings.cnpj))?;

    // Itens
    for item in &sale.items {
        printer.print_text(&format!(
            "{} x {} = R$ {:.2}\n",
            item.quantity, item.product_name, item.subtotal
        ))?;
    }

    // Total
    printer.bold(true)?;
    printer.print_text(&format!("\nTOTAL: R$ {:.2}\n", sale.total))?;

    printer.cut()?;

    if settings.open_drawer_on_sale {
        printer.open_drawer()?;
    }

    Ok(())
}
```

## ⚠️ Troubleshooting

### Portas Seriais Linux

```bash
# Listar portas
ls /dev/tty*

# Permissões
sudo usermod -a -G dialout $USER

# Testar comunicação
screen /dev/ttyUSB0 9600
```

### Windows

```powershell
# Listar portas COM
Get-WmiObject Win32_SerialPort | Select-Object DeviceID, Caption
```

## ✅ Checklist

- [ ] Detectar portas disponíveis automaticamente
- [ ] Timeout configurável
- [ ] Retry em falhas de comunicação
- [ ] Log de erros
- [ ] Fallback para impressão via sistema

## 🔗 Recursos

- [ESC/POS Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [serialport crate](https://docs.rs/serialport/latest/serialport/)
