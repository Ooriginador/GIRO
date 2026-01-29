---
mode: agent
description: Integra um novo dispositivo de hardware (impressora, balança, scanner)
variables:
  - name: deviceType
    description: Tipo do dispositivo (printer, scale, scanner, drawer)
  - name: brand
    description: Marca/Modelo (ex: Epson TM-T20, Toledo Prix 3)
  - name: protocol
    description: Protocolo de comunicação (ESC/POS, Serial, USB HID)
agent: Hardware
---

# Integrar Hardware: {{brand}}

## Tipo: {{deviceType}}
## Protocolo: {{protocol}}

---

## 1. Detecção Automática

### Windows
```rust
// src/hardware/detector_windows.rs
pub async fn detect_{{deviceType}}s() -> Vec<DeviceInfo> {
    // WMI query para dispositivos USB/Serial
    // Filtrar por VID/PID do fabricante
}
```

### Linux
```rust
// src/hardware/detector_linux.rs
pub async fn detect_{{deviceType}}s() -> Vec<DeviceInfo> {
    // /dev/ttyUSB* para serial
    // /dev/usb/* para USB
    // udev rules para permissões
}
```

---

## 2. Driver Implementation

### Estrutura
```
src/hardware/{{deviceType}}/
├── mod.rs           # Exports
├── driver.rs        # Trait + implementations
├── {{brand | snake_case}}.rs  # Driver específico
└── tests.rs         # Testes
```

### Trait Base
```rust
// src/hardware/{{deviceType}}/driver.rs
#[async_trait]
pub trait {{deviceType | pascal_case}}Driver: Send + Sync {
    async fn connect(&mut self) -> Result<(), HardwareError>;
    async fn disconnect(&mut self) -> Result<(), HardwareError>;
    fn is_connected(&self) -> bool;
    
    // Métodos específicos por tipo
    {{#if deviceType === 'printer'}}
    async fn print_text(&self, text: &str) -> Result<(), HardwareError>;
    async fn print_receipt(&self, receipt: &Receipt) -> Result<(), HardwareError>;
    async fn cut_paper(&self) -> Result<(), HardwareError>;
    async fn open_drawer(&self) -> Result<(), HardwareError>;
    {{/if}}
    
    {{#if deviceType === 'scale'}}
    async fn read_weight(&self) -> Result<f64, HardwareError>;
    async fn tare(&self) -> Result<(), HardwareError>;
    async fn is_stable(&self) -> Result<bool, HardwareError>;
    {{/if}}
    
    {{#if deviceType === 'scanner'}}
    async fn start_scanning(&mut self) -> Result<(), HardwareError>;
    async fn stop_scanning(&mut self) -> Result<(), HardwareError>;
    fn on_barcode(&self, callback: Box<dyn Fn(String) + Send>);
    {{/if}}
}
```

### Implementação Específica
```rust
// src/hardware/{{deviceType}}/{{brand | snake_case}}.rs
pub struct {{brand | pascal_case}}Driver {
    port: Option<Box<dyn SerialPort>>,
    config: DeviceConfig,
}

impl {{brand | pascal_case}}Driver {
    pub fn new(config: DeviceConfig) -> Self {
        Self { port: None, config }
    }
}

#[async_trait]
impl {{deviceType | pascal_case}}Driver for {{brand | pascal_case}}Driver {
    async fn connect(&mut self) -> Result<(), HardwareError> {
        let port = serialport::new(&self.config.port, self.config.baud_rate)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| HardwareError::Connection(e.to_string()))?;
        
        self.port = Some(port);
        Ok(())
    }
    
    // ... implementar outros métodos
}
```

---

## 3. Tauri Commands

```rust
// src/commands/hardware.rs
#[command]
pub async fn connect_{{deviceType}}(
    device_id: String,
    state: State<'_, HardwareState>,
) -> Result<(), String> {
    let mut manager = state.{{deviceType}}_manager.lock().await;
    manager.connect(&device_id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn list_{{deviceType}}s(
    state: State<'_, HardwareState>,
) -> Result<Vec<DeviceInfo>, String> {
    detect_{{deviceType}}s().await.map_err(|e| e.to_string())
}
```

---

## 4. Frontend Integration

```typescript
// hooks/use{{deviceType | pascal_case}}.ts
export function use{{deviceType | pascal_case}}() {
  const devices = useQuery({
    queryKey: ['{{deviceType}}s'],
    queryFn: () => invoke<DeviceInfo[]>('list_{{deviceType}}s'),
  });

  const connect = useMutation({
    mutationFn: (deviceId: string) => 
      invoke('connect_{{deviceType}}', { deviceId }),
  });

  return { devices, connect };
}
```

---

## 5. Configuração

### Settings UI
```tsx
// pages/Settings/Hardware/{{deviceType | pascal_case}}Settings.tsx
export function {{deviceType | pascal_case}}Settings() {
  const { devices } = use{{deviceType | pascal_case}}();
  
  return (
    <div>
      <h2>{{deviceType | title_case}}</h2>
      <DeviceList devices={devices.data} />
      <TestButton />
    </div>
  );
}
```

---

## Checklist
- [ ] Detecção automática implementada
- [ ] Driver específico criado
- [ ] Tauri commands registrados
- [ ] Hook React criado
- [ ] Settings UI adicionado
- [ ] Teste com dispositivo real
- [ ] Documentação atualizada
