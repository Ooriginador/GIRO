# 🗑️ Guia de Desinstalação - GIRO Desktop

> **Processo completo de remoção do GIRO**  
> Desenvolvido por Arkheion Corp

---

## 📋 Visão Geral

O GIRO oferece dois tipos de desinstalação:

1. **Desinstalação Padrão** - Remove apenas o programa, mantém dados
2. **Desinstalação Completa** - Remove programa E todos os dados

---

## 🔄 Processo de Desinstalação

### Método 1: Via Painel de Controle (Recomendado)

````text
1. Menu Iniciar
2. Configurações
3. Aplicativos
4. Localizar "GIRO"
5. Clicar em "Desinstalar"
6. Seguir assistente
```text
### Método 2: Via Menu Iniciar

```text
1. Menu Iniciar
2. GIRO (pasta)
3. "Desinstalar GIRO"
4. Seguir assistente
```text
### Método 3: Via Arquivo de Desinstalação

```text
Localização: C:\Program Files\GIRO\uninstall.exe
```text
---

## ⚙️ Opções de Desinstalação

### 🔹 Opção 1: Manter Dados (Padrão - Recomendado)
## O que é removido:
- ✅ Executável do programa
- ✅ DLLs e bibliotecas
- ✅ Atalhos (Desktop e Menu Iniciar)
- ✅ Entradas do registro de instalação
## O que é preservado:
- ✅ Banco de dados (`giro.db`)
- ✅ Backups automáticos
- ✅ Configurações do sistema
- ✅ Licença ativada
- ✅ Histórico completo
## Localização dos dados preservados:
```text
%LOCALAPPDATA%\GIRO\
```text
## Caminho real:
```text
C:\Users\[SeuUsuário]\AppData\Local\GIRO\
```text
## Vantagens:
- ✅ Reinstalação recupera tudo automaticamente
- ✅ Dados não são perdidos por engano
- ✅ Backup de segurança mantido
- ✅ Licença permanece ativa
## Quando usar:
- ✅ Reinstalação futura planejada
- ✅ Atualização manual do sistema
- ✅ Resolução de problemas técnicos
- ✅ Migração para outro PC (copiar pasta)

---

### 🔹 Opção 2: Remover Tudo (Limpeza Completa)

⚠️ **ATENÇÃO: Esta ação é IRREVERSÍVEL!**

Durante a desinstalação, uma mensagem será exibida:

```text
┌──────────────────────────────────────────┐
│ ⚠️ ATENÇÃO - REMOÇÃO DE DADOS            │
├──────────────────────────────────────────┤
│                                          │
│ Deseja remover TODOS os dados do GIRO?  │
│                                          │
│ Isso inclui:                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ ✓ Banco de dados completo                │
│ ✓ Vendas, produtos, clientes             │
│ ✓ Funcionários e configurações           │
│ ✓ Backups automáticos                    │
│ ✓ Licença ativada                        │
│ ✓ Histórico completo                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│ ⚠️ Esta ação NÃO pode ser desfeita!      │
│                                          │
│ Clique 'Não' para manter (recomendado)  │
│ Clique 'Sim' para apagar TUDO            │
└──────────────────────────────────────────┘
```text
## O que é removido: (cont.)
```text
📁 C:\Program Files\GIRO\
├── ❌ giro-desktop.exe
├── ❌ *.dll
├── ❌ resources/
└── ❌ Todos os arquivos do programa

📁 C:\Users\[Usuário]\AppData\Local\GIRO\
├── ❌ giro.db (Banco de dados)
├── ❌ giro.db-shm
├── ❌ giro.db-wal
├── ❌ backups/ (Todos os backups)
├── ❌ *.log (Logs do sistema)
├── ❌ config.json
├── ❌ .license (Licença ativa)
└── ❌ remover todo o conteúdo da pasta (inclui backups, logs e arquivos de configuração)

🗂️ Registro do Windows
├── ❌ HKLM\Software\GIRO
├── ❌ HKCU\Software\GIRO
└── ❌ Entradas de desinstalação

🔗 Atalhos
├── ❌ Desktop\GIRO.lnk
├── ❌ Menu Iniciar\GIRO\
└── ❌ Todos os atalhos
```text
## Quando usar: (cont.)
- ⚠️ Não vai usar o GIRO novamente
- ⚠️ Quer começar totalmente do zero
- ⚠️ Já fez backup manual dos dados importantes
- ⚠️ Mudança completa de sistema

---

## 📂 Estrutura de Dados

### Arquivos e Pastas

```text
C:\Users\[Usuário]\AppData\Local\GIRO\
│
├── giro.db                    # Banco de dados principal (SQLite)
├── giro.db-shm               # Shared memory (temporário)
├── giro.db-wal               # Write-Ahead Log (temporário)
│
├── backups/                  # Backups automáticos
│   ├── backup_2026-01-12_08-00.db
└── ❌ remover todo o conteúdo da pasta (inclui backups, logs e arquivos de configuração)
│   └── backup_2026-01-10_08-00.db
│
├── logs/                     # Logs do sistema (opcional)
│   ├── debug.log
│   └── error.log
│
├── config.json               # Configurações gerais
├── .license                  # Arquivo de licença
└── hardware.id               # ID do hardware (licenciamento)
```text
### Tamanhos Típicos

| Item        | Tamanho Médio | Observação          |
| ----------- | ------------- | ------------------- |
| **giro.db** | 10-500 MB     | Cresce com uso      |
| **Backups** | 100 MB - 5 GB | 30 dias de retenção |
| **Logs**    | 1-10 MB       | Rotacionados        |
| **Total**   | 150 MB - 6 GB | Varia muito         |

---

## 💾 Backup Manual Antes de Desinstalar

### Opção 1: Backup Completo da Pasta

```powershell
# Abrir PowerShell e executar
$source = "$env:LOCALAPPDATA\GIRO"
$destination = "$env:USERPROFILE\Desktop\GIRO_Backup_$(Get-Date -Format 'yyyy-MM-dd')"
Copy-Item -Path $source -Destination $destination -Recurse

# Arquivo será criado em
# C:\Users\[Usuário]\Desktop\GIRO_Backup_2026-01-12\
```text
### Opção 2: Backup Apenas do Banco

```powershell
# Copiar apenas o banco de dados
Copy-Item "$env:LOCALAPPDATA\GIRO\giro.db" "$env:USERPROFILE\Desktop\giro_backup.db"
```text
### Opção 3: Via Interface Gráfica

```text
1. Win + R
2. Digite: %LOCALAPPDATA%\GIRO
3. Copiar pasta inteira para local seguro
4. Ex: Desktop, Pendrive, Nuvem
```text
---

## 🔄 Restauração de Dados

### Se Manteve os Dados

Reinstale o GIRO normalmente. Os dados serão detectados automaticamente.

### Se Fez Backup Manual

```powershell
# Após reinstalar o GIRO, feche-o e restaure
# 1. Fechar GIRO completamente
taskkill /F /IM "giro-desktop.exe"

# 2. Restaurar backup
$backup = "$env:USERPROFILE\Desktop\GIRO_Backup_2026-01-12"
$destination = "$env:LOCALAPPDATA\GIRO"

# Remover pasta atual (se existir)
Remove-Item -Path $destination -Recurse -Force

# Restaurar backup
Copy-Item -Path $backup -Destination $destination -Recurse

# 3. Reiniciar GIRO
```text
---

## 🐛 Problemas Comuns

### Erro: "Arquivo em uso"

**Causa:** GIRO ainda está executando
## Solução:
```text
1. Ctrl + Shift + Esc (Gerenciador de Tarefas)
2. Procurar "giro-desktop.exe"
3. Finalizar tarefa
4. Tentar desinstalar novamente
```text
### Erro: "Acesso negado"

**Causa:** Falta de permissões de administrador
## Solução: (cont.)
```text
1. Localizar desinstalador
2. Botão direito → "Executar como Administrador"
3. Confirmar UAC
```text
### Dados Não Aparecem Após Reinstalar

**Causa:** Banco em local diferente ou corrompido
## Diagnóstico:
```text
1. Win + R
2. %LOCALAPPDATA%\GIRO
3. Verificar se giro.db existe
4. Tamanho > 0 bytes
```text
## Solução: (cont.)
```text
Se arquivo existe mas não carrega:
→ Restaurar de backup
→ Contatar suporte técnico
```text
---

## 📊 Checklist de Desinstalação

### Antes de Desinstalar

- [ ] Fazer backup completo dos dados
- [ ] Exportar relatórios importantes
- [ ] Anotar dados da licença
- [ ] Fechar o GIRO completamente
- [ ] Fazer logout de todos os usuários

### Durante Desinstalação

- [ ] Executar desinstalador como Admin
- [ ] Decidir sobre remoção de dados
- [ ] Aguardar conclusão completa
- [ ] Verificar mensagens de sucesso

### Após Desinstalação

- [ ] Verificar se pasta foi removida (se optou por remover)
- [ ] Confirmar remoção dos atalhos
- [ ] Validar backup (se fez)
- [ ] Deletar manualmente se necessário

---

## 🗑️ Remoção Manual (Se Necessário)

Se o desinstalador falhar, remova manualmente:

### 1. Fechar Processos

```powershell
taskkill /F /IM "giro-desktop.exe" /T
```text
### 2. Remover Programa

```powershell
Remove-Item "C:\Program Files\GIRO" -Recurse -Force
```text
### 3. Remover Dados (OPCIONAL)

```powershell
Remove-Item "$env:LOCALAPPDATA\GIRO" -Recurse -Force
```text
### 4. Limpar Registro

```powershell
# Execute como Administrador
Remove-Item "HKLM:\Software\GIRO" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "HKCU:\Software\GIRO" -Recurse -Force -ErrorAction SilentlyContinue
```text
### 5. Remover Atalhos

```powershell
Remove-Item "$env:USERPROFILE\Desktop\GIRO.lnk" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\GIRO" -Recurse -Force -ErrorAction SilentlyContinue
```text
---

## 📞 Suporte

### Antes de Desinstalar (cont.)

Se está desinstalando por problemas técnicos, considere:

- 📧 Contatar suporte: suporte@arkheion-tiktrend.com.br
- 💬 Chat: Sistema pode ter solução mais simples
- 🔧 Diagnóstico: Pode ser configuração apenas

### Após Desinstalação (cont.)
## Dados removidos acidentalmente?
- ⚠️ Sem backup = Irrecuperável
- ✅ Com backup = Restaurável
- 📞 Contate suporte para orientação
## Problemas na remoção?
- 📧 Email: suporte@arkheion-tiktrend.com.br
- 📄 Anexar: Capturas de tela do erro
- 📝 Descrever: Passos realizados

---

## ✅ Confirmação de Remoção Completa

Execute para verificar:

```powershell
# Verificar programa
Test-Path "C:\Program Files\GIRO"
# Retorno: False = Removido ✅

# Verificar dados
Test-Path "$env:LOCALAPPDATA\GIRO"
# Retorno: False = Removido ✅ | True = Preservado ✅

# Verificar atalhos
Test-Path "$env:USERPROFILE\Desktop\GIRO.lnk"
# Retorno: False = Removido ✅ (cont.)
```text
---
## Desenvolvido com ❤️ por Arkheion Corp
_GIRO - Sistema de Gestão Comercial_
````
