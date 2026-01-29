# Módulo de Hardware - GIRO Desktop

Este diretório contém a lógica de integração com hardware para o PDV.

## 🖨️ PrinterDetector (Windows)

O arquivo `printer_detector.rs` implementa um sistema robusto de detecção de impressoras para Windows, resolvendo problemas comuns como:

- Impressoras de rede não detectadas
- Impressoras USB virtuais
- Falha na identificação da impressora padrão

### Estratégias de Detecção

O detector tenta encontrar impressoras usando as seguintes estratégias sequenciais:

1. **Native API (Local)**: `EnumPrintersW` com flag `PRINTER_ENUM_LOCAL`
2. **Native API (Conexões)**: `EnumPrintersW` com flag `PRINTER_ENUM_CONNECTIONS` (Crucial para rede)
3. **Native API (Network)**: `EnumPrintersW` com flag `PRINTER_ENUM_NETWORK`
4. **Windows Registry**: Varredura em `HKLM\SYSTEM\CurrentControlSet\Control\Print\Printers`
5. **PowerShell**: Comando `Get-Printer` (Lento, usado apenas como fallback)

### Cache

Para evitar travamentos na interface, o detector implementa um cache com TTL de 30 segundos.
Para forçar uma atualização, use o comando `refresh_printers`.

### Priorização

Ao sugerir uma impressora (`suggest_best_printer`), o sistema prioriza:

1. Impressora Térmica + Padrão + Pronta
2. Impressora Térmica + Pronta
3. Qualquer Impressora Térmica
4. Impressora Padrão (Não-Virtual)

---

## 🛠️ Comandos Disponíveis (Frontend)

- `list_hardware_ports`: Retorna lista simples de nomes
- `detect_printers_full`: Retorna objeto detalhado com diagnóstico
- `refresh_printers`: Limpa cache e detecta novamente
- `suggest_best_printer`: Retorna o nome da melhor impressora encontrada
