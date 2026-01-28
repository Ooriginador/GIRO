# 🖨️ Fluxo de Detecção de Impressoras - GIRO

> **Status**: ✅ IMPLEMENTADO  
> **Versão**: 2.4.9  
> **Data**: Janeiro 2026

## 📊 Mapa do Sistema Atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/TypeScript)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SettingsPage.tsx                                                           │
│  ├── fetchPorts() ──────────────────────────────────────────────────────┐   │
│  │   invoke<string[]>('list_hardware_ports')                            │   │
│  │                                                                       │   │
│  ├── availablePorts: string[] ◄─────────────────────────────────────────┤   │
│  │   └── Renderiza no dropdown                                          │   │
│  │                                                                       │   │
│  └── testPrinter() ─────────────────────────────────────────────────────┤   │
│      invoke('test_printer')                                              │   │
│                                                                          │   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TAURI COMMANDS (Rust)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  commands/hardware.rs                                                       │
│  ├── list_hardware_ports() ─────────────────────────────────────────────┐   │
│  │   ├── [Linux] Verifica /dev/lp*, /dev/usb/lp*                        │   │
│  │   └── [Windows] PowerShell + WMIC + Registry (PROBLEMÁTICO!)         │   │
│  │                                                                       │   │
│  ├── configure_printer(config) ─────────────────────────────────────────┤   │
│  │   └── Salva em HardwareState + SQLite                                │   │
│  │                                                                       │   │
│  └── test_printer() ────────────────────────────────────────────────────┤   │
│      └── Chama ThermalPrinter::new() + print()                          │   │
│                                                                          │   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HARDWARE MODULE (Rust)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  hardware/printer.rs                                                        │
│  ├── ThermalPrinter                                                         │
│  │   ├── new(config) ───────────────────────────────────────────────────┐   │
│  │   ├── init() → buffer ESC/POS                                        │   │
│  │   ├── text(), line(), cut(), open_drawer()                           │   │
│  │   └── print() ───────────────────────────────────────────────────────┤   │
│  │       ├── [Serial] serialport crate                                  │   │
│  │       ├── [USB/Linux] OpenOptions::write("/dev/usb/lp0")             │   │
│  │       └── [Windows] print_windows_spooler() ◄── ATUAL               │   │
│  │                                                                       │   │
│  └── print_windows_spooler()                                             │   │
│      ├── Cria arquivo temporário com dados ESC/POS                       │   │
│      ├── PowerShell + .NET RawPrinter (WritePrinter API)                 │   │
│      └── Fallback: copy /b para \\localhost\PrinterName                  │   │
│                                                                          │   │
└──────────────────────────────────────────────────────────────────────────┘
```

## ❌ Problemas Identificados

### 1. Detecção via PowerShell/WMIC Falha Silenciosamente

```rust
// PROBLEMA: Erro não é propagado, apenas logado
if let Ok(output) = run_powershell("Get-Printer | ...") {
    // Se falhar, simplesmente ignora
}
```

**Causas possíveis:**

- PowerShell não está no PATH
- Política de execução restringe scripts
- Usuário sem permissões administrativas
- Antivírus bloqueando execução de comandos

### 2. Falta de API Nativa do Windows

O código atual usa processos externos (PowerShell, WMIC) em vez das APIs nativas do Windows:

- `EnumPrinters()` - Lista todas as impressoras
- `GetDefaultPrinter()` - Obtém impressora padrão
- `OpenPrinter()` / `WritePrinter()` - Impressão RAW

### 3. Sem Conexão Automática com Impressora Padrão

O sistema não detecta automaticamente a impressora padrão do Windows e não oferece essa opção.

### 4. Sem Fallback Robusto

Se um método falha, não há retry ou método alternativo confiável.

## ✅ Solução Proposta

### Arquitetura Nova

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOVO MÓDULO: windows_printer.rs                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WindowsPrinter (usando crate `windows`)                                    │
│  ├── get_default_printer() ─────────────────────────────────────────────┐   │
│  │   └── GetDefaultPrinterW() API nativa                                │   │
│  │                                                                       │   │
│  ├── enumerate_printers() ──────────────────────────────────────────────┤   │
│  │   └── EnumPrintersW() API nativa                                     │   │
│  │       ├── PRINTER_INFO_2 (nome, porta, driver, status)              │   │
│  │       └── Filtra por tipo (local, rede, virtual)                     │   │
│  │                                                                       │   │
│  ├── get_printer_info(name) ────────────────────────────────────────────┤   │
│  │   └── OpenPrinter() + GetPrinter()                                   │   │
│  │       └── Retorna: status, porta, driver, trabalhos pendentes        │   │
│  │                                                                       │   │
│  └── print_raw(printer, data) ──────────────────────────────────────────┤   │
│      └── OpenPrinter() + StartDocPrinter() + WritePrinter()             │   │
│          └── API nativa - sem PowerShell!                                │   │
│                                                                          │   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Novo Fluxo de Detecção

```
1. INICIALIZAÇÃO
   ├── Detecta impressora padrão via GetDefaultPrinterW()
   ├── Enumera todas impressoras via EnumPrintersW()
   └── Prioriza impressoras térmicas (keywords: POS, thermal, receipt, etc)

2. SELEÇÃO AUTOMÁTICA
   ├── Se há impressora padrão térmica → usa ela
   ├── Se há impressora configurada anteriormente → valida e usa
   └── Se não há configuração → sugere impressora padrão do Windows

3. IMPRESSÃO
   ├── Usa WritePrinter API diretamente
   ├── Sem arquivos temporários
   ├── Sem processos externos
   └── Feedback de status em tempo real

4. FALLBACK (se API nativa falhar)
   ├── PowerShell como backup
   └── copy /b como último recurso
```

## 🔧 Dependências Necessárias

```toml
[target.'cfg(windows)'.dependencies]
windows = { version = "0.62", features = [
    "Win32_Graphics_Printing",
    "Win32_Foundation",
    "Win32_Security",
] }
```

## 📝 Notas de Implementação

1. **Impressora Padrão**: O Windows mantém a impressora padrão no registro. A API `GetDefaultPrinterW` é a forma mais confiável de obtê-la.

2. **EnumPrinters Flags**:

   - `PRINTER_ENUM_LOCAL` (0x2) - Impressoras locais
   - `PRINTER_ENUM_CONNECTIONS` (0x4) - Conexões de rede
   - `PRINTER_ENUM_NAME` (0x8) - Por nome

3. **WritePrinter vs copy /b**:

   - WritePrinter é síncrono e retorna bytes escritos
   - copy /b pode falhar silenciosamente
   - WritePrinter permite feedback de progresso

4. **Status da Impressora**:
   - `PRINTER_STATUS_OFFLINE` (0x80)
   - `PRINTER_STATUS_ERROR` (0x2)
   - `PRINTER_STATUS_PAPER_OUT` (0x10)
   - Permite mostrar status no UI

## 🚀 Próximos Passos

1. [ ] Adicionar crate `windows` ao Cargo.toml
2. [ ] Criar módulo `hardware/windows_printer.rs`
3. [ ] Implementar `get_default_printer()`
4. [ ] Implementar `enumerate_printers()`
5. [ ] Implementar `print_raw()`
6. [ ] Atualizar `list_hardware_ports()` para usar API nativa
7. [ ] Adicionar opção "Usar impressora padrão" no frontend
8. [ ] Testar em diferentes versões do Windows
