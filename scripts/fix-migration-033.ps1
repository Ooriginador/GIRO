# Script de Emergência - Fix Migration 033
# Corrige o erro: "migration 33 was previously applied but has been modified"
#
# USO: Execute este script como Administrador no PowerShell
# Ou clique com botão direito > "Executar com PowerShell"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GIRO - Fix Migration 033 Checksum" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Localizar o banco de dados
$AppDataPath = [Environment]::GetFolderPath('ApplicationData')
$DbPath = Join-Path $AppDataPath "com.arkheion.giro\giro.db"

if (-not (Test-Path $DbPath)) {
    Write-Host "❌ Banco de dados não encontrado em:" -ForegroundColor Red
    Write-Host "   $DbPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verifique se o GIRO já foi executado pelo menos uma vez." -ForegroundColor Yellow
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Write-Host "✅ Banco de dados encontrado" -ForegroundColor Green
Write-Host "   $DbPath" -ForegroundColor Gray
Write-Host ""

# Fazer backup
$BackupPath = "$DbPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "📦 Criando backup..." -ForegroundColor Yellow
Copy-Item $DbPath $BackupPath
Write-Host "✅ Backup criado em:" -ForegroundColor Green
Write-Host "   $BackupPath" -ForegroundColor Gray
Write-Host ""

# Verificar se SQLite está disponível
$SqliteExe = "sqlite3.exe"
$HasSqlite = $null -ne (Get-Command $SqliteExe -ErrorAction SilentlyContinue)

if (-not $HasSqlite) {
    Write-Host "⚠️  SQLite não encontrado no PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPÇÃO 1 - Usar DB Browser for SQLite (Recomendado):" -ForegroundColor Cyan
    Write-Host "  1. Baixe: https://sqlitebrowser.org/dl/" -ForegroundColor White
    Write-Host "  2. Abra o arquivo: $DbPath" -ForegroundColor White
    Write-Host "  3. Vá em 'Execute SQL'" -ForegroundColor White
    Write-Host "  4. Cole e execute:" -ForegroundColor White
    Write-Host ""
    Write-Host "     DELETE FROM _sqlx_migrations WHERE version = 33;" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  5. Clique em 'Write Changes'" -ForegroundColor White
    Write-Host "  6. Feche o DB Browser e abra o GIRO" -ForegroundColor White
    Write-Host ""
    Write-Host "OPÇÃO 2 - Deletar o banco (PERDE TODOS OS DADOS):" -ForegroundColor Cyan
    Write-Host "  Apague o arquivo: $DbPath" -ForegroundColor White
    Write-Host "  O GIRO criará um novo banco ao iniciar" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "🔧 Corrigindo migration 033..." -ForegroundColor Yellow
    
    $SqlCommand = "DELETE FROM _sqlx_migrations WHERE version = 33;"
    
    & $SqliteExe $DbPath $SqlCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 033 removida com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Agora você pode abrir o GIRO normalmente." -ForegroundColor Cyan
        Write-Host "A migration 033 será reaplicada com o checksum correto." -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erro ao executar comando SQLite" -ForegroundColor Red
        Write-Host "Use a OPÇÃO 1 descrita acima." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Read-Host "Pressione ENTER para sair"
