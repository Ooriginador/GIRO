# 🖨️ Windows Printer Detection - Audit Report

> **Data**: 30 de Janeiro de 2026  
> **Agente**: Hardware Agent  
> **Versão**: 1.0

---

## 📋 Sumário Executivo

Análise profunda da implementação de detecção e impressão em impressoras térmicas no Windows, identificando gaps críticos, APIs não utilizadas e propondo melhorias baseadas na documentação oficial da Microsoft.

---

## 🏗️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────────┐
│                      GIRO Desktop (Tauri)                       │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)                                               │
│  ├── PrinterSettings.tsx         → Configuração de impressora  │
│  └── stores/settings-store.ts    → Estado da configuração      │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Rust)                                                 │
│  ├── hardware/printer.rs         → ESC/POS + ThermalPrinter    │
│  ├── hardware/windows_printer.rs → API Windows (básica)        │
│  ├── hardware/printer_detector.rs→ Detector robusto            │
│  ├── hardware/manager.rs         → Gerenciador de hardware     │
│  └── commands/hardware.rs        → Tauri Commands              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Windows Print Spooler                        │
├─────────────────────────────────────────────────────────────────┤
│  APIs Utilizadas:                                               │
│  ✅ EnumPrintersW (PRINTER_ENUM_LOCAL, CONNECTIONS, NETWORK)   │
│  ✅ GetDefaultPrinterW                                          │
│  ✅ OpenPrinterW / StartDocPrinterW / WritePrinter              │
│  ❌ SetupDiGetClassDevs (USB VID/PID enumeration)              │
│  ❌ GetPrinterDriverW (driver analysis)                         │
│  ⚠️ Registry fallback (parcial)                                 │
│  ⚠️ PowerShell fallback (último recurso)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Thermal Printers (ESC/POS)                    │
├─────────────────────────────────────────────────────────────────┤
│  Suportadas:                                                    │
│  • Epson TM-T20X, TM-T88V/VI                                   │
│  • Elgin i7, i9                                                 │
│  • Bematech MP-4200 TH                                          │
│  • Daruma DR800                                                  │
│  • Star TSP100/TSP650                                           │
│  • C3Tech                                                       │
│  • Xprinter, Sewoo, Tanca                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ GAPS CRÍTICOS RESOLVIDOS

### 1. **SetupDiGetClassDevs ✅ IMPLEMENTADO**

**Severidade Original**: 🔴 ALTA → ✅ RESOLVIDO

**Localização**: [usb_printer_detector.rs](../apps/desktop/src-tauri/src/hardware/usb_printer_detector.rs)

**Solução Implementada**: Módulo completo com SetupAPI para enumerar dispositivos USB diretamente, extraindo VID/PID e correlacionando com database de fabricantes.

```rust
// IMPLEMENTADO em usb_printer_detector.rs:
pub fn detect_usb_printers() -> UsbDetectionResult {
    // SetupDiGetClassDevsW com DIGCF_ALLCLASSES | DIGCF_PRESENT
    // Extração de VID/PID de hardware IDs
    // Lookup em THERMAL_PRINTER_VENDORS
}
```

**Tauri Command**: `detect_usb_printers` registrado e disponível para frontend.

---

### 2. **Tabela VID/PID ✅ IMPLEMENTADO**

**Severidade Original**: 🔴 ALTA → ✅ RESOLVIDO

**Localização**: [usb_vid_pid.rs](../apps/desktop/src-tauri/src/hardware/usb_vid_pid.rs)

**VID/PID Conhecidos (DEVE SER IMPLEMENTADO)**:

| Fabricante          | VID (Hex) | PID (Hex) | Modelos         |
| ------------------- | --------- | --------- | --------------- |
| **Epson**           | `0x04B8`  | `0x0202`  | TM-T88III       |
| **Epson**           | `0x04B8`  | `0x0E03`  | TM-T88IV        |
| **Epson**           | `0x04B8`  | `0x0E15`  | TM-T88V         |
| **Epson**           | `0x04B8`  | `0x0E28`  | TM-T88VI        |
| **Epson**           | `0x04B8`  | `0x0E1F`  | TM-T20II        |
| **Epson**           | `0x04B8`  | `0x0E27`  | TM-T20III       |
| **Epson**           | `0x04B8`  | `0x0E20`  | TM-T20X         |
| **Epson**           | `0x04B8`  | `0x0E30`  | TM-m30          |
| **Star Micronics**  | `0x0519`  | `0x000A`  | TSP100          |
| **Star Micronics**  | `0x0519`  | `0x0001`  | TSP650/TSP700   |
| **Star Micronics**  | `0x0519`  | `0x0007`  | TSP143          |
| **Bematech**        | `0x20D1`  | `0x7008`  | MP-4200 TH      |
| **Elgin**           | `0x0DD4`  | `0x0101`  | i7              |
| **Elgin**           | `0x0DD4`  | `0x0102`  | i9              |
| **Daruma**          | `0x0888`  | `0x1000`  | DR800           |
| **Citizen**         | `0x2730`  | Vários    | CT-S series     |
| **Xprinter**        | `0x0483`  | `0x5740`  | XP-58/80        |
| **C3Tech**          | `0x0456`  | Vários    | POS-58/80       |
| **Generic (STM32)** | `0x0483`  | Vários    | Clones chineses |
| **Generic**         | `0x0416`  | Vários    | Clones POS      |

---

### 3. **PRINTER_ENUM_SHARED ✅ IMPLEMENTADO**

**Severidade Original**: 🟡 MÉDIA → ✅ RESOLVIDO

**Localização**: [printer_detector.rs](../apps/desktop/src-tauri/src/hardware/printer_detector.rs#L280-L340)

**Solução**: Flag `PRINTER_ENUM_SHARED` agora é combinado com `PRINTER_ENUM_LOCAL` na detecção principal.

```rust
// IMPLEMENTADO:
match self.detect_via_native_api(PRINTER_ENUM_LOCAL | PRINTER_ENUM_SHARED) { ... }
```

---

### 4. **GetPrinterDriverW NÃO IMPLEMENTADO**

**Severidade**: 🟡 MÉDIA

**Problema**: Não há análise do driver instalado para determinar capacidades da impressora.

```rust
// NÃO EXISTE - DEVE SER IMPLEMENTADO:
fn get_driver_info(handle: PRINTER_HANDLE) -> Option<DriverInfo> {
    // GetPrinterDriverW com level 2
    // Analisar pDriverPath, pDataFile
}
```

**Benefícios da Implementação**:

- Detectar se driver suporta RAW
- Identificar fabricante pelo caminho do driver
- Verificar versão do driver

---

### 5. **Atributo PRINTER_ATTRIBUTE_RAW_ONLY ✅ IMPLEMENTADO**

**Severidade Original**: 🟡 MÉDIA → ✅ RESOLVIDO

**Localização**: [printer_detector.rs](../apps/desktop/src-tauri/src/hardware/printer_detector.rs#L460-L500)

**Solução**: Módulo `printer_attributes` criado com constante `PRINTER_ATTRIBUTE_RAW_ONLY`. Campo `Attributes` agora é extraído e analisado.

```rust
// IMPLEMENTADO:
mod printer_attributes {
    pub const PRINTER_ATTRIBUTE_RAW_ONLY: u32 = 0x00001000;
}

// Em PrinterCapabilities:
pub raw_only_attribute: bool,
pub attributes: u32,
```

---

### 6. **Campo pDatatype ✅ IMPLEMENTADO**

**Severidade Original**: 🟡 MÉDIA → ✅ RESOLVIDO

**Solução**: Campo `pDatatype` é extraído de `PRINTER_INFO_2W` e armazenado em `PrinterCapabilities.default_datatype`.

```rust
// IMPLEMENTADO em PrinterCapabilities:
pub default_datatype: Option<String>,

// Na detecção:
let datatype = wide_to_string(info.pDatatype);
```

---

## 🟡 GAPS PENDENTES

### 7. **PRINTER_INFO_4 Para Enumeração Rápida**

**Severidade**: 🟢 BAIXA

**Status**: ❌ Pendente

**Problema**: Para listagem inicial rápida, `PRINTER_INFO_4` é mais eficiente que `PRINTER_INFO_2`.

```rust
// ATUAL - Sempre usa Level 2 (mais lento):
let level = 2u32; // PRINTER_INFO_2W

// OTIMIZAÇÃO FUTURA:
// 1. Primeiro: Level 4 para lista rápida de nomes
// 2. Depois: Level 2 apenas para impressoras selecionadas/térmicas
```

---

## 🟡 MELHORIAS RECOMENDADAS

### 1. **Keywords de Detecção ✅ ATUALIZADAS**

**Status**: ✅ IMPLEMENTADO

**Localização**: [printer_detector.rs](../apps/desktop/src-tauri/src/hardware/printer_detector.rs#L880-L920)

Adicionadas 30+ novas keywords incluindo:
- Control iD, Sweda, Perto, Gertec, Nitere
- Bixolon, Rongta, HPRT, Itautec
- Séries TM-L, LK-T, SRP, TSP
- E muitas outras marcas brasileiras e asiáticas

---

### 2. **Implementar Detecção por Registry Mais Completa**

**Chaves de Registry Importantes**:

| Path                                                               | Propósito                    |
| ------------------------------------------------------------------ | ---------------------------- |
| `HKLM\SYSTEM\CurrentControlSet\Control\Print\Printers`             | Impressoras locais           |
| `HKCU\Printers\Connections`                                        | Conexões de rede do usuário  |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Print\Printers` | Info estendida               |
| `HKLM\SYSTEM\CurrentControlSet\Enum\USB`                           | Dispositivos USB por VID/PID |

---

### 3. **Adicionar WMI Properties Faltantes**

O PowerShell fallback não consulta todas as propriedades úteis:

```powershell
# ATUAL:
Get-Printer | Select Name, PortName, DriverName, PrinterStatus

# MELHORADO:
Get-CimInstance -ClassName Win32_Printer |
Select-Object Name, PortName, DriverName, PrinterStatus,
              WorkOffline, Default, Shared, Network,
              SpoolEnabled, RawOnly, ExtendedPrinterStatus
```

---

## 📊 Status de Implementação

| Componente                  | Status          | Prioridade | Esforço |
| --------------------------- | --------------- | ---------- | ------- |
| EnumPrintersW (LOCAL)       | ✅ Implementado | -          | -       |
| EnumPrintersW (CONNECTIONS) | ✅ Implementado | -          | -       |
| EnumPrintersW (NETWORK)     | ✅ Implementado | -          | -       |
| EnumPrintersW (SHARED)      | ✅ Implementado | -          | -       |
| GetDefaultPrinterW          | ✅ Implementado | -          | -       |
| WritePrinter RAW            | ✅ Implementado | -          | -       |
| PowerShell fallback         | ✅ Implementado | -          | -       |
| Registry fallback           | ⚠️ Parcial      | 🟡 Média   | 2h      |
| SetupDiGetClassDevs         | ✅ Implementado | -          | -       |
| VID/PID lookup table        | ✅ Implementado | -          | -       |
| GetPrinterDriverW           | ❌ Faltando     | 🟡 Média   | 2h      |
| PRINTER_ATTRIBUTE_RAW_ONLY  | ✅ Implementado | -          | -       |
| pDatatype analysis          | ✅ Implementado | -          | -       |
| PRINTER_INFO_4 fast enum    | ❌ Faltando     | 🟢 Baixa   | 1h      |
| Keywords atualizadas        | ✅ Implementado | -          | -       |
| Tauri Command USB Detect    | ✅ Implementado | -          | -       |

---

## 🛠️ Plano de Implementação

### Fase 1: Quick Wins (1-2 horas)

1. Adicionar `PRINTER_ENUM_SHARED` ao detector
2. Verificar `PRINTER_ATTRIBUTE_RAW_ONLY`
3. Analisar campo `pDatatype`
4. Atualizar lista de keywords

### Fase 2: VID/PID Database (2 horas)

1. Criar módulo `usb_vid_pid.rs` com tabela de fabricantes
2. Usar para enriquecer detecção existente

### Fase 3: SetupAPI Integration (4 horas)

1. Adicionar dependência `windows-sys` com features corretas
2. Implementar `enumerate_usb_printers()` via SetupDiGetClassDevs
3. Correlacionar com VID/PID database
4. Adicionar como fonte de detecção

### Fase 4: Driver Analysis (2 horas)

1. Implementar GetPrinterDriverW
2. Analisar caminho do driver para fabricante
3. Verificar capacidades

---

## 📝 Arquivos Afetados

### Existentes (Modificados)
- [printer_detector.rs](../apps/desktop/src-tauri/src/hardware/printer_detector.rs) - Detector principal (PRINTER_ENUM_SHARED, attributes, pDatatype, keywords)
- [mod.rs](../apps/desktop/src-tauri/src/hardware/mod.rs) - Exports dos novos módulos
- [hardware.rs](../apps/desktop/src-tauri/src/commands/hardware.rs) - Tauri command `detect_usb_printers`

### Novos Arquivos
- [usb_vid_pid.rs](../apps/desktop/src-tauri/src/hardware/usb_vid_pid.rs) - Database de VID/PID (700+ linhas, 15+ fabricantes)
- [usb_printer_detector.rs](../apps/desktop/src-tauri/src/hardware/usb_printer_detector.rs) - Detector USB via SetupAPI

---

## 🔗 Referências

- [Microsoft EnumPrintersW](https://learn.microsoft.com/en-us/windows/win32/printdocs/enumprinters)
- [PRINTER_INFO_2 Structure](https://learn.microsoft.com/en-us/windows/win32/printdocs/printer-info-2)
- [SetupDiGetClassDevs](https://learn.microsoft.com/en-us/windows/win32/api/setupapi/nf-setupapi-setupdigetclassdevsw)
- [Writing to a Printer](https://learn.microsoft.com/en-us/windows/win32/printdocs/sending-data-directly-to-a-printer)
- [USB Vendor IDs](https://usb-ids.gowdy.us/read/UD)

---

_Atualizado: 30 de Janeiro de 2026_
_Gerado automaticamente pelo Hardware Agent_
