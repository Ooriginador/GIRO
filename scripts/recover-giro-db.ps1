# Script de Recuperação de Banco GIRO
# Execute como ADMINISTRADOR no PowerShell

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GIRO - Recuperação de Banco de Dados" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Procurar TODOS os arquivos giro.db no sistema
Write-Host "🔍 Procurando arquivos giro.db em todo o sistema..." -ForegroundColor Yellow
$found = Get-ChildItem -Path C:\ -Recurse -Filter "*giro*" -Include "*.db","*.db-wal","*.db-shm","giro","giro1" -ErrorAction SilentlyContinue 2>$null
$found | Format-Table FullName, Length, LastWriteTime -AutoSize

# 2. Verificar pasta principal
Write-Host "`n📁 Verificando pasta principal GIRO..." -ForegroundColor Yellow
$giroPath = "$env:LOCALAPPDATA\GIRO"
if (Test-Path $giroPath) {
    Get-ChildItem -Path $giroPath -Recurse | Format-Table FullName, Length, LastWriteTime
} else {
    Write-Host "   Pasta não encontrada: $giroPath" -ForegroundColor Red
}

# 3. Verificar Roaming (versão nova)
Write-Host "`n📁 Verificando AppData\Roaming..." -ForegroundColor Yellow
$roamingPath = "$env:APPDATA\com.arkheion.giro"
if (Test-Path $roamingPath) {
    Get-ChildItem -Path $roamingPath -Recurse | Format-Table FullName, Length, LastWriteTime
} else {
    Write-Host "   Pasta não encontrada: $roamingPath" -ForegroundColor Red
}

# 4. Verificar Lixeira
Write-Host "`n🗑️ Verificando Lixeira..." -ForegroundColor Yellow
$shell = New-Object -ComObject Shell.Application
$recycleBin = $shell.NameSpace(0xa)
$recycleBin.Items() | Where-Object { $_.Name -like "*giro*" } | Format-Table Name, Size, ModifyDate

# 5. Listar Shadow Copies (Versões Anteriores)
Write-Host "`n📸 Verificando Shadow Copies (Versões Anteriores)..." -ForegroundColor Yellow
vssadmin list shadows 2>$null

# 6. Verificar se há pontos de restauração
Write-Host "`n🔄 Pontos de Restauração disponíveis:" -ForegroundColor Yellow
Get-ComputerRestorePoint 2>$null | Format-Table SequenceNumber, Description, CreationTime

# 7. Verificar temp folders
Write-Host "`n📂 Verificando pastas temporárias..." -ForegroundColor Yellow
$tempPaths = @(
    "$env:TEMP",
    "$env:TMP",
    "C:\Windows\Temp",
    "$env:USERPROFILE\Downloads"
)
foreach ($path in $tempPaths) {
    $files = Get-ChildItem -Path $path -Filter "*giro*" -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "   Encontrado em: $path" -ForegroundColor Green
        $files | Format-Table Name, Length, LastWriteTime
    }
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  Pressione ENTER para sair" -ForegroundColor Cyan
Read-Host
