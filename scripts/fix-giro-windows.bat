@echo off
chcp 65001 >nul
title GIRO - Script de Correção

echo ============================================
echo    GIRO - Script de Correção
echo ============================================
echo.

:: Configurações
set "PIN_HMAC_KEY=xpdyfCw0zCN+5zSSl09S4wPeUX0+aTlJlC6vj"
set "ADMIN_PIN_HASH=d19b36c842078e28d8ed3e92e590eaf5a31ae5f131938c610e07e2fcb13b8c4f"
set "DB_PATH=%APPDATA%\com.arkheion.giro\giro.db"
set "GIRO_PATH=C:\Program Files\GIRO\giro-desktop.exe"
set "SQLITE_DIR=%LOCALAPPDATA%\sqlite"
set "SQLITE_EXE=%SQLITE_DIR%\sqlite3.exe"

:: ============================================
:: Passo 1: Definir PIN_HMAC_KEY permanentemente
:: ============================================
echo [1/4] Definindo PIN_HMAC_KEY...
setx PIN_HMAC_KEY "%PIN_HMAC_KEY%" >nul 2>&1
if %errorlevel%==0 (
    echo   √ PIN_HMAC_KEY definida com sucesso
) else (
    echo   ! Aviso: Execute como Administrador para definir permanentemente
)
set "PIN_HMAC_KEY=%PIN_HMAC_KEY%"
echo.

:: ============================================
:: Passo 2: Verificar banco de dados
:: ============================================
echo [2/4] Verificando banco de dados...
if exist "%DB_PATH%" (
    echo   √ Banco encontrado: %DB_PATH%
) else (
    echo   ! Banco nao encontrado. Inicie o GIRO primeiro para criar.
    echo.
    if exist "%GIRO_PATH%" (
        echo Iniciando GIRO para criar o banco...
        start "" "%GIRO_PATH%"
        echo.
        echo Aguarde o GIRO abrir, depois FECHE-O e pressione qualquer tecla.
        pause >nul
    )
)
echo.

:: ============================================
:: Passo 3: Baixar SQLite se necessario
:: ============================================
echo [3/4] Verificando SQLite...
if not exist "%SQLITE_DIR%" mkdir "%SQLITE_DIR%"

if not exist "%SQLITE_EXE%" (
    echo   Baixando SQLite...
    
    :: Usar PowerShell para baixar (mais confiável)
    powershell -Command "Invoke-WebRequest -Uri 'https://www.sqlite.org/2024/sqlite-tools-win-x64-3470200.zip' -OutFile '%TEMP%\sqlite.zip'" 2>nul
    
    if exist "%TEMP%\sqlite.zip" (
        echo   Extraindo...
        powershell -Command "Expand-Archive -Path '%TEMP%\sqlite.zip' -DestinationPath '%TEMP%\sqlite_extract' -Force" 2>nul
        
        :: Copiar sqlite3.exe
        copy "%TEMP%\sqlite_extract\sqlite-tools-win-x64-3470200\sqlite3.exe" "%SQLITE_EXE%" >nul 2>&1
        
        if exist "%SQLITE_EXE%" (
            echo   √ SQLite baixado com sucesso
        ) else (
            echo   X Erro ao extrair SQLite
            goto :manual_sqlite
        )
        
        :: Limpar
        del "%TEMP%\sqlite.zip" >nul 2>&1
        rmdir /s /q "%TEMP%\sqlite_extract" >nul 2>&1
    ) else (
        echo   X Erro ao baixar SQLite
        goto :manual_sqlite
    )
) else (
    echo   √ SQLite ja instalado
)
echo.

:: ============================================
:: Passo 4: Atualizar PIN do Admin
:: ============================================
echo [4/4] Configurando PIN do Admin (121905)...

if exist "%SQLITE_EXE%" (
    if exist "%DB_PATH%" (
        "%SQLITE_EXE%" "%DB_PATH%" "UPDATE employees SET pin = '%ADMIN_PIN_HASH%' WHERE role = 'ADMIN';"
        
        :: Verificar
        for /f %%i in ('"%SQLITE_EXE%" "%DB_PATH%" "SELECT COUNT(*) FROM employees WHERE role = 'ADMIN' AND pin = '%ADMIN_PIN_HASH%';"') do set result=%%i
        
        if "%result%"=="1" (
            echo   √ PIN do Admin definido como 121905
        ) else (
            echo   ! Nenhum admin encontrado ou PIN ja estava correto
        )
    ) else (
        echo   X Banco de dados nao encontrado
    )
) else (
    echo   X SQLite nao disponivel
)
echo.

:: ============================================
:: Iniciar GIRO
:: ============================================
echo ============================================
echo    Iniciando GIRO...
echo ============================================
echo.

if exist "%GIRO_PATH%" (
    echo Executando: %GIRO_PATH%
    start "" "%GIRO_PATH%"
) else (
    :: Tentar locais alternativos
    if exist "%LOCALAPPDATA%\Programs\GIRO\giro-desktop.exe" (
        start "" "%LOCALAPPDATA%\Programs\GIRO\giro-desktop.exe"
    ) else if exist "%LOCALAPPDATA%\GIRO\giro-desktop.exe" (
        start "" "%LOCALAPPDATA%\GIRO\giro-desktop.exe"
    ) else (
        echo X GIRO nao encontrado! Inicie manualmente.
    )
)

echo.
echo ============================================
echo    Correcao Concluida!
echo ============================================
echo.
echo PIN do Admin: 121905
echo.
echo Se o GIRO nao abrir, feche esta janela,
echo abra um NOVO CMD e execute:
echo   "%GIRO_PATH%"
echo.
pause
goto :eof

:manual_sqlite
echo.
echo ============================================
echo    DOWNLOAD MANUAL NECESSARIO
echo ============================================
echo.
echo 1. Acesse: https://www.sqlite.org/download.html
echo 2. Baixe: sqlite-tools-win-x64-3470200.zip
echo 3. Extraia sqlite3.exe para: %SQLITE_DIR%
echo 4. Execute este script novamente
echo.
pause
goto :eof
