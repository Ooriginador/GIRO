# 🪟 Teste GIRO Desktop no Windows

## 📦 Arquivos Gerados

Após o build, você encontrará os arquivos em:

```
apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/
├── giro-desktop.exe          # Executável standalone
└── bundle/nsis/
    └── GIRO_1.0.0_x64-setup.exe   # Instalador NSIS
```

## 🚀 Como Testar

### Opção 1: Executável Direto (Portable)

1. Copie `giro-desktop.exe` para o Windows
2. Execute diretamente (não precisa instalar)
3. O banco de dados será criado em `%LOCALAPPDATA%\GIRO\giro.db`

### Opção 2: Instalador NSIS (Recomendado)

1. Copie `GIRO_1.0.0_x64-setup.exe` para o Windows
2. Execute o instalador
3. Será criado atalho no Menu Iniciar e Área de Trabalho
4. Desinstalação pelo Painel de Controle

## 🖨️ Teste de Impressão (C3Tech IT-100)

### Configuração no Windows

1. Conecte a impressora IT-100 via USB
2. Verifique no **Gerenciador de Dispositivos** qual porta COM foi atribuída (ex.: COM3)
3. No GIRO: **Configurações → Hardware → Impressora Térmica**
   - **Habilitar**: ON
   - **Modelo**: GENERIC (ou EPSON TM-T20 para melhor compatibilidade)
   - **Porta**: Selecione a COM detectada (ex.: COM3)
4. Clique em **"Testar Impressora"** (deve imprimir uma página de teste)
5. Clique em **"Imprimir Documentos de Teste"** (imprime Nota/OS/Relatório)

### Troubleshooting

- **Erro "Porta não encontrada"**: Confirme a porta COM no Gerenciador de Dispositivos
- **Não imprime nada**:
  - Verifique se a impressora está ON
  - Teste com o driver oficial da C3Tech primeiro
  - Tente outra porta COM se houver múltiplas
- **Impressão cortada**: Ajuste `paper_width` no código (padrão 48mm)

## 📱 Teste de Leitor (LB-120)

### Configuração

1. Conecte o LB-120 via USB (modo HID keyboard wedge)
2. Não precisa configurar nada no GIRO (ele funciona como teclado)
3. Teste lendo um código de barras EAN-13 em qualquer campo de entrada

### Teste QR Code (se LB-120 suportar 2D)

1. No GIRO: **Configurações → Hardware → QR Code (Teste de Leitura)**
2. Clique em **"Gerar QR de Teste"**
3. Aponte o leitor para a tela e leia o QR
4. Se funcionar, o valor deve aparecer no terminal/log

**Nota**: Se o LB-120 for apenas 1D (códigos de barras lineares), ele **NÃO** lerá QR codes.

## 🔍 Logs e Debug

### Verificar Logs

- Windows: `%LOCALAPPDATA%\GIRO\logs\` (se configurado)
- Console: Abra o executável via `cmd.exe` para ver logs em tempo real

### Banco de Dados

- Local: `%LOCALAPPDATA%\GIRO\giro.db`
- Pode abrir com DB Browser for SQLite para inspeção

## 📊 Funcionalidades Core para Testar

- [ ] Login (PIN de funcionário)
- [ ] Cadastro de produto
- [ ] Busca por código de barras (scanner)
- [ ] Venda rápida no PDV
- [ ] Impressão de cupom (IT-100)
- [ ] Abertura/fechamento de caixa
- [ ] Relatórios básicos

## ⚠️ Limitações Conhecidas

- **USB Raw Printing**: No Windows, o backend atual usa **Serial (COM)** como padrão. Impressão via USB spooler (LPT1/USB001) **não está implementada**.
- **Balança**: Não testada ainda (protocolo Toledo/Filizola via Serial).
- **NFC-e/SAT**: Módulo presente mas requer certificado A1 válido.

---

**Desenvolvido por Arkheion** | GIRO v1.0.0
