# 🔌 Módulo Hardware - Mercearias PDV

> **Impressora Térmica • Balança • Scanner • Gaveta**  
> Stack: Rust + Tauri 2.0 + ESC/POS + Serial Protocol

---

## 📋 Visão Geral

Este módulo implementa integração completa com hardware comercial para PDV (Ponto de Venda). Desenvolvido em Rust com Tauri 2.0, oferece comunicação de baixo nível com dispositivos via serial, USB e WebSocket.

**Status**: ✅ Pronto para produção (v1.0)

---

## 🚀 Quick Start

### Instalação

```bash
cd apps/desktop/src-tauri
cargo build --release
```

### Executar Aplicação

```bash
cargo run
```

### Abrir Interface de Teste

A aplicação abre automaticamente em `http://localhost` com uma interface HTML para testar todos os comandos hardware.

---

## 🖨️ Impressora Térmica

### ✅ C3Tech IT-100 (recomendações)

- **Modo recomendado no Windows**: usar a impressora como **Serial/COM** (via driver/virtual COM, quando disponível). O backend atual envia ESC/POS por **porta serial**.
- **USB raw (Linux)**: o backend consegue imprimir em dispositivos como `/dev/usb/lp0` (quando a impressora expõe device raw). No frontend, selecione **Porta = USB**.
- **Se não imprimir no Windows via USB**: normalmente é porque a impressora está em porta `USB001` (spooler) e não em `COMx`. Nesse caso, configure/instale o driver para expor **COM** ou use um modelo/interface que suporte serial.

### Configuração

```javascript
await invoke('configure_printer', {
  config: {
    port: '/dev/usb/lp0',
    connection_type: 'Serial', // 'Serial' | 'Network'
    printer_model: 'Elgin', // 'Epson' | 'Elgin' | 'Bematech' | 'Daruma'
    paper_width: 80, // 58 ou 80 mm
    encoding: 'UTF8', // 'UTF8' | 'CP850' | 'CP437'
  },
});
```

### Imprimir Cupom

```javascript
await invoke('print_receipt', {
  receipt: {
    header: {
      store_name: 'Mercearias São José',
      address: 'Rua das Flores, 123',
      phone: '(11) 98765-4321',
      document: 'CNPJ: 12.345.678/0001-90',
    },
    items: [
      {
        description: 'Arroz Tipo 1 5kg',
        quantity: 2.0,
        unit_price: 25.9,
        total: 51.8,
      },
      {
        description: 'Feijão Carioca 1kg',
        quantity: 3.0,
        unit_price: 8.5,
        total: 25.5,
      },
    ],
    subtotal: 77.3,
    discount: 5.0,
    total: 72.3,
    payment_method: 'Dinheiro',
    amount_paid: 100.0,
    change_amount: 27.7,
    footer: 'Obrigado pela preferência!',
  },
});
```

### Teste de Impressão

```javascript
await invoke('test_printer');
```

**Imprime**:

```
================================
  TESTE DE IMPRESSORA
================================

Caracteres: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789

Acentuação: áéíóú ÁÉÍÓÚ âêô ãõ ç

Data/Hora: 2026-01-02 20:00:00

================================
  Impressão OK!
================================
```

---

## ⚖️ Balança Comercial

### Protocolos Suportados

| Marca    | Protocolo | Baud Rate | Formato    |
| -------- | --------- | --------- | ---------- |
| Toledo   | Toledo    | 4800/9600 | Binário 5B |
| Filizola | Filizola  | 9600      | ASCII 7B   |
| Elgin    | Elgin     | 9600      | Binário 6B |
| Urano    | Urano     | 4800      | Hex 8B     |

### Configuração

```javascript
await invoke('configure_scale', {
  config: {
    port: '/dev/ttyUSB0',
    protocol: 'Toledo', // 'Toledo' | 'Filizola' | 'Elgin' | 'Urano'
    baud_rate: 9600,
    timeout_ms: 2000,
  },
});
```

### Auto-Detecção

```javascript
const protocol = await invoke('auto_detect_scale', {
  port: '/dev/ttyUSB0',
});

console.log(`Protocolo detectado: ${protocol}`);
```

### Ler Peso

```javascript
const reading = await invoke('read_weight');

console.log({
  weight: reading.weight, // 1.234 (kg)
  stable: reading.stable, // true
  tare: reading.tare, // 0.000
  unit: reading.unit, // "kg"
});
```

### Código de Barras Pesável

```javascript
// EAN-13: 2 XXXXXX PPPPP C
// 2023456012347
const barcode = '2023456012347';

// Decodifica:
// Prefixo: 2
// Código produto: 023456
// Peso: 01.234 kg
// Check digit: 7
```

---

## 📱 Scanner de Código de Barras

### ✅ Leitor LB-120 (USB HID)

- Deve funcionar como **teclado USB** (keyboard wedge) sem driver.
- Teste rápido: abra um campo de texto (ou o input de código no PDV), escaneie um EAN-13 e confirme se ele envia também **Enter** ao final.
- Se o código "fica" no campo e não confirma, configure no leitor um **sufixo Enter/CRLF** (via códigos de programação do manual do LB-120).

### Modos

1. **USB HID** - Scanner USB tradicional (emula teclado)
2. **WebSocket** - Scanner móvel via celular/tablet

### Servidor WebSocket

```javascript
// Iniciar servidor
await invoke('start_scanner_server', {
  config: {
    ws_port: 3847,
    ws_host: '127.0.0.1',
  },
});

// Gerar QR para pareamento
const qr_url = await invoke('generate_pairing_qr');
console.log(qr_url); // "ws://192.168.1.100:3847/scan"
```

### Cliente Mobile (PWA)

```javascript
// Conectar ao servidor
const ws = new WebSocket('ws://192.168.1.100:3847/scan');

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'register',
      device_id: 'mobile-001',
      device_name: 'Samsung Galaxy A52',
    })
  );
};

// Enviar scan
function onScan(barcode) {
  ws.send(
    JSON.stringify({
      type: 'scan',
      barcode: barcode,
      format: 'EAN13',
      timestamp: new Date().toISOString(),
      device_id: 'mobile-001',
    })
  );
}
```

### Validação EAN

```rust
// Check digit EAN-13
fn validate_ean13(barcode: &str) -> bool {
    if barcode.len() != 13 {
        return false;
    }

    let sum: u32 = barcode.chars()
        .take(12)
        .enumerate()
        .map(|(i, c)| {
            let digit = c.to_digit(10).unwrap();
            if i % 2 == 0 { digit } else { digit * 3 }
        })
        .sum();

    let check_digit = (10 - (sum % 10)) % 10;
    check_digit == barcode.chars().last().unwrap().to_digit(10).unwrap()
}
```

---

## 💰 Gaveta de Dinheiro

### Configuração

```javascript
await invoke('configure_drawer', {
  config: {
    printer_port: '/dev/usb/lp0',
    pulse_duration_ms: 200,
    pin: 'Pin2', // 'Pin2' (Epson/Elgin) ou 'Pin5' (Bematech/Daruma)
  },
});
```

### Abrir Gaveta

```javascript
await invoke('open_drawer');
```

### Comando ESC/POS

```
ESC p pin t1 t2
0x1B 0x70 [pin] [t1] [t2]

pin:
  - 0x00 = Pin 2 (drawer kick-out connector pin 2)
  - 0x01 = Pin 5 (drawer kick-out connector pin 5)

t1: ON time (ms * 2) - Exemplo: 100ms = 200 (0xC8)
t2: OFF time (ms * 5) - Exemplo: 100ms = 500 (0x1F4)
```

---

## 🔌 Portas Seriais

### Listar Portas

```javascript
const ports = await invoke('list_serial_ports');

console.log(ports);
// [
//   { name: "/dev/ttyUSB0", type: "USB" },
//   { name: "/dev/ttyUSB1", type: "USB" },
//   { name: "/dev/usb/lp0", type: "Printer" }
// ]
```

### Verificar Porta

```javascript
const exists = await invoke('check_port_exists', {
  port: '/dev/ttyUSB0',
});

if (!exists) {
  console.error('Porta não encontrada!');
}
```

---

## 🧪 Testes

### Interface de Teste

Abra a aplicação e use a interface HTML para testar:

1. **Listar Portas** - Detecta dispositivos conectados
2. **Configurar Impressora** - Define porta e modelo
3. **Teste de Impressão** - Imprime página de teste
4. **Configurar Balança** - Define protocolo
5. **Ler Peso** - Lê peso atual em tempo real
6. **Auto-Detectar** - Descobre protocolo da balança
7. **Iniciar Scanner** - Sobe servidor WebSocket
8. **Gerar QR** - QR Code para pareamento mobile
9. **Abrir Gaveta** - Aciona pulso elétrico

### Logs

Todos os comandos exibem logs no console:

```
[20:00:00] Configurando impressora em /dev/usb/lp0...
[20:00:01] Impressora configurada com sucesso!
[20:00:02] Enviando teste de impressão...
[20:00:03] Impressão de teste enviada!
```

---

## 📦 Dependências

```toml
[dependencies]
tauri = { version = "2", features = ["shell-open", "dialog", "fs", "os", "process"] }
tokio = { version = "1", features = ["full"] }
serialport = "4.6"
tokio-tungstenite = "0.24"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = "0.4"
uuid = { version = "1.10", features = ["v4"] }
```

---

## 🛠️ Arquitetura

```
src/
├── main.rs              # Entry point Tauri
├── lib.rs               # Library exports
├── error.rs             # Error types (AppError, HardwareError)
├── commands/
│   └── hardware.rs      # Tauri commands (18 commands)
└── hardware/
    ├── mod.rs           # Hardware module root
    ├── printer.rs       # ESC/POS thermal printer
    ├── scale.rs         # Commercial scale protocols
    ├── scanner.rs       # Barcode scanner (WebSocket)
    └── drawer.rs        # Cash drawer control
```

---

## 🔧 Troubleshooting

### Impressora não imprime

```bash
# Verificar permissões
sudo chmod 666 /dev/usb/lp0

# Testar comunicação
echo "teste" > /dev/usb/lp0
```

### Balança não responde

```bash
# Verificar porta serial
ls -la /dev/ttyUSB*

# Permissões
sudo usermod -aG dialout $USER
# Logout/Login necessário
```

### Scanner WebSocket não conecta

```bash
# Verificar firewall
sudo ufw allow 3847/tcp

# Testar porta
nc -zv 127.0.0.1 3847
```

### Gaveta não abre

- Verificar conexão na impressora (RJ11/RJ12)
- Testar com pin diferente (Pin2 vs Pin5)
- Aumentar pulse_duration_ms para 500ms

---

## 📚 Referências

- [Tauri 2.0 API](https://beta.tauri.app/references/)
- [ESC/POS Commands](https://reference.epson-biz.com/modules/ref_escpos/)
- [serialport-rs](https://docs.rs/serialport/latest/serialport/)
- [tokio-tungstenite](https://docs.rs/tokio-tungstenite/latest/)
- [EAN Barcode Spec](https://en.wikipedia.org/wiki/International_Article_Number)

---

## 📄 Licença

MIT © 2026 Arkheion Corp
