# ============================================================================
# GIRO - Script de Correção para Windows
# ============================================================================
# Este script:
# 1. Define a variável PIN_HMAC_KEY permanentemente
# 2. Baixa SQLite se necessário
# 3. Reseta o PIN do Admin para 121905
# 4. Inicia o GIRO
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   GIRO - Script de Correção" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$PIN_HMAC_KEY = "xpdyfCw0zCN+5zSSl09S4wPeUX0+aTlJlC6vj"
$ADMIN_PIN_HASH = "d19b36c842078e28d8ed3e92e590eaf5a31ae5f131938c610e07e2fcb13b8c4f"
$DB_PATH = "$env:APPDATA\com.arkheion.giro\giro.db"
$GIRO_PATH = "C:\Program Files\GIRO\giro-desktop.exe"
$SQLITE_URL = "https://www.sqlite.org/2024/sqlite-tools-win-x64-3470200.zip"
$SQLITE_DIR = "$env:LOCALAPPDATA\sqlite"

# ============================================================================
# Passo 1: Definir PIN_HMAC_KEY permanentemente
# ============================================================================
Write-Host "[1/4] Definindo PIN_HMAC_KEY..." -ForegroundColor Yellow

try {
    [System.Environment]::SetEnvironmentVariable("PIN_HMAC_KEY", $PIN_HMAC_KEY, "User")
    $env:PIN_HMAC_KEY = $PIN_HMAC_KEY
    Write-Host "  ✓ PIN_HMAC_KEY definida com sucesso" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erro ao definir PIN_HMAC_KEY: $_" -ForegroundColor Red
    Write-Host "  Tentando definir apenas para sessão atual..." -ForegroundColor Yellow
    $env:PIN_HMAC_KEY = $PIN_HMAC_KEY
}

# ============================================================================
# Passo 2: Verificar se o banco de dados existe
# ============================================================================
Write-Host "[2/4] Verificando banco de dados..." -ForegroundColor Yellow

if (Test-Path $DB_PATH) {
    Write-Host "  ✓ Banco encontrado: $DB_PATH" -ForegroundColor Green
} else {
    Write-Host "  ! Banco não encontrado. Será criado ao iniciar o GIRO." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Iniciando GIRO para criar o banco..." -ForegroundColor Cyan
    
    if (Test-Path $GIRO_PATH) {
        Start-Process -FilePath $GIRO_PATH -Wait -ErrorAction SilentlyContinue
    } else {
        Write-Host "  ✗ GIRO não encontrado em: $GIRO_PATH" -ForegroundColor Red
        Write-Host "  Por favor, inicie o GIRO manualmente primeiro." -ForegroundColor Yellow
        Read-Host "Pressione Enter após iniciar e fechar o GIRO"
    }
}

# ============================================================================
# Passo 3: Baixar SQLite e atualizar PIN do Admin
# ============================================================================
Write-Host "[3/4] Configurando PIN do Admin (121905)..." -ForegroundColor Yellow

# Verificar se SQLite já existe
$sqlitePath = "$SQLITE_DIR\sqlite3.exe"

if (-not (Test-Path $sqlitePath)) {
    Write-Host "  Baixando SQLite..." -ForegroundColor Yellow
    
    try {
        # Criar diretório
        New-Item -ItemType Directory -Force -Path $SQLITE_DIR | Out-Null
        
        # Baixar
        $zipPath = "$env:TEMP\sqlite.zip"
        Invoke-WebRequest -Uri $SQLITE_URL -OutFile $zipPath -UseBasicParsing
        
        # Extrair
        Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP\sqlite_extract" -Force
        
        # Mover sqlite3.exe
        $extracted = Get-ChildItem "$env:TEMP\sqlite_extract" -Recurse -Filter "sqlite3.exe" | Select-Object -First 1
        if ($extracted) {
            Copy-Item $extracted.FullName -Destination $sqlitePath -Force
            Write-Host "  ✓ SQLite baixado com sucesso" -ForegroundColor Green
        } else {
            throw "sqlite3.exe não encontrado no arquivo"
        }
        
        # Limpar
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:TEMP\sqlite_extract" -Recurse -Force -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "  ✗ Erro ao baixar SQLite: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Baixe manualmente de: https://www.sqlite.org/download.html" -ForegroundColor Yellow
        Write-Host "E coloque sqlite3.exe em: $SQLITE_DIR" -ForegroundColor Yellow
        Read-Host "Pressione Enter após baixar"
    }
}

# Executar update do PIN
if ((Test-Path $sqlitePath) -and (Test-Path $DB_PATH)) {
    try {
        $query = "UPDATE employees SET pin = '$ADMIN_PIN_HASH' WHERE role = 'ADMIN';"
        & $sqlitePath $DB_PATH $query
        
        # Verificar
        $result = & $sqlitePath $DB_PATH "SELECT COUNT(*) FROM employees WHERE role = 'ADMIN' AND pin = '$ADMIN_PIN_HASH';"
        
        if ($result -gt 0) {
            Write-Host "  ✓ PIN do Admin definido como 121905" -ForegroundColor Green
        } else {
            Write-Host "  ! Nenhum admin encontrado. PIN padrão será usado." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ Erro ao atualizar PIN: $_" -ForegroundColor Red
    }
} else {
    if (-not (Test-Path $sqlitePath)) {
        Write-Host "  ✗ SQLite não disponível" -ForegroundColor Red
    }
    if (-not (Test-Path $DB_PATH)) {
        Write-Host "  ✗ Banco de dados não encontrado" -ForegroundColor Red
    }
}

# ============================================================================
# Passo 4: Iniciar GIRO
# ============================================================================
Write-Host "[4/4] Iniciando GIRO..." -ForegroundColor Yellow

if (Test-Path $GIRO_PATH) {
    Write-Host "  ✓ Iniciando: $GIRO_PATH" -ForegroundColor Green
    Start-Process -FilePath $GIRO_PATH
} else {
    # Tentar encontrar em outros locais
    $alternativePaths = @(
        "$env:LOCALAPPDATA\Programs\GIRO\giro-desktop.exe",
        "$env:LOCALAPPDATA\GIRO\giro-desktop.exe",
        "C:\Program Files (x86)\GIRO\giro-desktop.exe"
    )
    
    $found = $false
    foreach ($path in $alternativePaths) {
        if (Test-Path $path) {
            Write-Host "  ✓ Encontrado em: $path" -ForegroundColor Green
            Start-Process -FilePath $path
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Host "  ✗ GIRO não encontrado!" -ForegroundColor Red
        Write-Host "  Por favor, inicie manualmente." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Correção Concluída!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PIN do Admin: 121905" -ForegroundColor Yellow
Write-Host ""
Write-Host "Se o GIRO ainda não abrir, feche esta janela," -ForegroundColor Gray
Write-Host "abra um NOVO PowerShell e execute:" -ForegroundColor Gray
Write-Host '  & "C:\Program Files\GIRO\giro-desktop.exe"' -ForegroundColor White
Write-Host ""

Read-Host "Pressione Enter para sair"
