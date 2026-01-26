; ═══════════════════════════════════════════════════════════════════════════
; GIRO - Installer Hooks (NSIS)
; Descrição: Hooks customizados para instalação e desinstalação
; Version: 2.0.0 - Windows Hardening
; ═══════════════════════════════════════════════════════════════════════════

!include "WinVer.nsh"
!include "x64.nsh"

; ═══════════════════════════════════════════════════════════════════════════
; SYSTEM REQUIREMENTS CHECK
; ═══════════════════════════════════════════════════════════════════════════

!macro CheckSystemRequirements
    ; Check Windows Version (minimum Windows 10)
    ${IfNot} ${AtLeastWin10}
        MessageBox MB_OK|MB_ICONSTOP \
            "GIRO requer Windows 10 ou superior.$\r$\n$\r$\n\
            Seu sistema operacional não é compatível.$\r$\n\
            Por favor, atualize o Windows e tente novamente."
        Abort
    ${EndIf}
    
    ; Check 64-bit
    ${IfNot} ${RunningX64}
        MessageBox MB_OK|MB_ICONSTOP \
            "GIRO requer um sistema operacional de 64 bits.$\r$\n$\r$\n\
            Seu sistema é de 32 bits e não é compatível."
        Abort
    ${EndIf}
!macroend

!macro customInit
    ; Executado antes da instalação
    DetailPrint "Verificando requisitos do sistema..."
    
    ; Check system requirements
    !insertmacro CheckSystemRequirements
    
    ; Verificar se já existe instalação
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{com.arkheion.giro}" "UninstallString"
    ${If} $0 != ""
        MessageBox MB_YESNO|MB_ICONQUESTION \
            "Uma versão anterior do GIRO foi detectada.$\r$\n$\r$\n\
            Deseja desinstalá-la antes de continuar?" \
            IDYES UninstallPrevious IDNO SkipUninstall
        
        UninstallPrevious:
            DetailPrint "Desinstalando versão anterior..."
            ; Kill running process first
            nsExec::ExecToLog 'taskkill /F /IM "giro-desktop.exe" /T'
            Sleep 2000
            ExecWait '$0 _?=$INSTDIR'
            Delete $0
            RMDir $INSTDIR
        
        SkipUninstall:
    ${EndIf}
    
    ; Check and warn about WebView2 (informational - Tauri handles installation)
    DetailPrint "Verificando WebView2..."
    ReadRegStr $1 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ${If} $1 == ""
        ReadRegStr $1 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ${EndIf}
    
    ${If} $1 == ""
        DetailPrint "WebView2 não detectado - será instalado automaticamente"
    ${Else}
        DetailPrint "✓ WebView2 versão $1 detectado"
    ${EndIf}
!macroend

!macro customInstall
    ; Executado após a instalação dos arquivos
    DetailPrint "Configurando GIRO..."
    
    ; ═══════════════════════════════════════════════════════════════════════════
    ; VERIFY WEBVIEW2 INSTALLATION (Post-install check)
    ; ═══════════════════════════════════════════════════════════════════════════
    DetailPrint "Verificando instalação do WebView2..."
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ${If} $0 == ""
        ReadRegStr $0 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ${EndIf}
    
    ${If} $0 == ""
        MessageBox MB_OK|MB_ICONWARNING \
            "⚠️ ATENÇÃO: WebView2 Runtime$\r$\n$\r$\n\
            O WebView2 não foi detectado após a instalação.$\r$\n$\r$\n\
            O GIRO tentará instalar automaticamente na primeira execução,$\r$\n\
            mas se houver problemas, baixe manualmente em:$\r$\n$\r$\n\
            https://developer.microsoft.com/microsoft-edge/webview2/$\r$\n$\r$\n\
            Selecione 'Evergreen Bootstrapper' e execute."
    ${Else}
        DetailPrint "✓ WebView2 Runtime versão $0 confirmado"
    ${EndIf}
    
    ; ═══════════════════════════════════════════════════════════════════════════
    ; CREATE USER DATA DIRECTORIES
    ; ═══════════════════════════════════════════════════════════════════════════
    SetShellVarContext current
    CreateDirectory "$LOCALAPPDATA\GIRO"
    CreateDirectory "$LOCALAPPDATA\GIRO\backups"
    CreateDirectory "$LOCALAPPDATA\GIRO\logs"
    
    ; Set proper permissions (allow write for current user)
    DetailPrint "Configurando permissões..."
    nsExec::ExecToLog 'icacls "$LOCALAPPDATA\GIRO" /grant:r "%USERNAME%":(OI)(CI)F /T /Q'
    
    ; ═══════════════════════════════════════════════════════════════════════════
    ; CREATE DESKTOP SHORTCUT
    ; ═══════════════════════════════════════════════════════════════════════════
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Deseja criar um atalho no Desktop?" \
        IDYES CreateDesktopShortcut IDNO SkipDesktopShortcut
    
    CreateDesktopShortcut:
        DetailPrint "Criando atalho no Desktop..."
        CreateShortcut "$DESKTOP\GIRO.lnk" "$INSTDIR\giro-desktop.exe" \
            "" "$INSTDIR\giro-desktop.exe" 0 SW_SHOWNORMAL \
            "" "GIRO - Sistema de Gestão Comercial"
    
    SkipDesktopShortcut:
    
    ; ═══════════════════════════════════════════════════════════════════════════
    ; REGISTER APPLICATION
    ; ═══════════════════════════════════════════════════════════════════════════
    DetailPrint "Registrando aplicação no sistema..."
    WriteRegStr HKLM "Software\GIRO" "InstallPath" "$INSTDIR"
    WriteRegStr HKLM "Software\GIRO" "Version" "${VERSION}"
    WriteRegStr HKLM "Software\GIRO" "DataPath" "$LOCALAPPDATA\GIRO"

    ; ═══════════════════════════════════════════════════════════════════════════
    ; CONFIGURE WINDOWS FIREWALL (Silent, no prompts)
    ; ═══════════════════════════════════════════════════════════════════════════
    DetailPrint "Configurando Firewall do Windows..."

    ; Remove old rules first (if exist)
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="GIRO Mobile Sync" 2>nul'
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="GIRO Desktop App" 2>nul'
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="GIRO Desktop App Out" 2>nul'

    ; Add inbound rule for port 3847 (TCP) - Mobile Sync
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="GIRO Mobile Sync" dir=in action=allow protocol=TCP localport=3847 profile=private,public'

    ; Add inbound rule for the application
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="GIRO Desktop App" dir=in action=allow program="$INSTDIR\giro-desktop.exe" profile=private,public'

    ; Add outbound rule (for updates and license server)
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="GIRO Desktop App Out" dir=out action=allow program="$INSTDIR\giro-desktop.exe" profile=private,public'

    DetailPrint "✓ Firewall configurado!"

    ; ═══════════════════════════════════════════════════════════════════════════
    ; ADD WINDOWS DEFENDER EXCLUSION (Prevents false positives)
    ; ═══════════════════════════════════════════════════════════════════════════
    DetailPrint "Adicionando exclusão no Windows Defender..."
    nsExec::ExecToLog 'powershell -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
    nsExec::ExecToLog 'powershell -Command "Add-MpPreference -ExclusionPath \"$LOCALAPPDATA\GIRO\" -ErrorAction SilentlyContinue"'
    
    ; ═══════════════════════════════════════════════════════════════════════════
    ; CREATE START MENU SHORTCUTS
    ; ═══════════════════════════════════════════════════════════════════════════
    CreateDirectory "$SMPROGRAMS\GIRO"
    CreateShortcut "$SMPROGRAMS\GIRO\GIRO.lnk" "$INSTDIR\giro-desktop.exe" \
        "" "$INSTDIR\giro-desktop.exe" 0 SW_SHOWNORMAL \
        "" "GIRO - Sistema de Gestão Comercial"
    CreateShortcut "$SMPROGRAMS\GIRO\Desinstalar GIRO.lnk" "$INSTDIR\uninstall.exe" \
        "" "$INSTDIR\uninstall.exe" 0 SW_SHOWNORMAL \
        "" "Desinstalar GIRO"
    
    DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DetailPrint "✓ Instalação concluída com sucesso!"
    DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
!macroend

!macro customUnInstall
    ; Executado antes da desinstalação
    DetailPrint "Preparando desinstalação..."
    
    ; Encerrar processo se estiver rodando
    nsExec::ExecToLog 'taskkill /F /IM "giro-desktop.exe" /T'
    Sleep 2000
    
    ; Perguntar sobre dados do usuário
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
        "⚠️ ATENÇÃO - REMOÇÃO DE DADOS$\r$\n$\r$\n\
        Deseja remover TODOS os dados do GIRO?$\r$\n$\r$\n\
        Isso inclui:$\r$\n\
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n\
        ✓ Banco de dados completo$\r$\n\
        ✓ Vendas, produtos, clientes$\r$\n\
        ✓ Funcionários e configurações$\r$\n\
        ✓ Backups automáticos$\r$\n\
        ✓ Licença ativada$\r$\n\
        ✓ Histórico completo$\r$\n\
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n$\r$\n\
        ⚠️ Esta ação NÃO pode ser desfeita!$\r$\n$\r$\n\
        Clique 'Não' para manter os dados (recomendado)$\r$\n\
        Clique 'Sim' para apagar TUDO permanentemente" \
        IDYES RemoveUserData IDNO KeepUserData
    
    RemoveUserData:
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        DetailPrint "REMOVENDO TODOS OS DADOS DO GIRO"
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        SetShellVarContext current
        
        ; Banco de dados principal
        DetailPrint "  ▶ Removendo banco de dados principal..."
        Delete "$LOCALAPPDATA\GIRO\giro.db"
        Delete "$LOCALAPPDATA\GIRO\giro.db-shm"
        Delete "$LOCALAPPDATA\GIRO\giro.db-wal"
        Delete "$LOCALAPPDATA\GIRO\giro.db-journal"
        
        ; Banco de dados de debug (versões anteriores)
        DetailPrint "  ▶ Removendo bancos de dados de debug..."
        Delete "$LOCALAPPDATA\GIRO\giro_debug_reconstructed_v1.db"
        Delete "$LOCALAPPDATA\GIRO\giro_debug_reconstructed_v1.db-shm"
        Delete "$LOCALAPPDATA\GIRO\giro_debug_reconstructed_v1.db-wal"
        Delete "$LOCALAPPDATA\GIRO\giro_debug_reconstructed_v1.db-journal"
        
        ; Qualquer outro arquivo .db
        DetailPrint "  ▶ Removendo outros arquivos de banco de dados..."
        Delete "$LOCALAPPDATA\GIRO\*.db"
        Delete "$LOCALAPPDATA\GIRO\*.db-shm"
        Delete "$LOCALAPPDATA\GIRO\*.db-wal"
        Delete "$LOCALAPPDATA\GIRO\*.db-journal"
        
        ; Backups
        DetailPrint "  ▶ Removendo backups ($LOCALAPPDATA\GIRO\backups)..."
        RMDir /r "$LOCALAPPDATA\GIRO\backups"
        
        ; Logs
        DetailPrint "  ▶ Removendo logs..."
        Delete "$LOCALAPPDATA\GIRO\*.log"
        Delete "$LOCALAPPDATA\GIRO\debug.log"
        Delete "$LOCALAPPDATA\GIRO\error.log"
        
        ; Configurações e cache
        DetailPrint "  ▶ Removendo configurações..."
        Delete "$LOCALAPPDATA\GIRO\config.json"
        Delete "$LOCALAPPDATA\GIRO\settings.json"
        Delete "$LOCALAPPDATA\GIRO\.env"
        Delete "$LOCALAPPDATA\GIRO\.license"
        Delete "$LOCALAPPDATA\GIRO\hardware.id"
        
        ; Arquivos temporários
        DetailPrint "  ▶ Removendo arquivos temporários..."
        Delete "$LOCALAPPDATA\GIRO\*.tmp"
        Delete "$LOCALAPPDATA\GIRO\temp\*.*"
        RMDir "$LOCALAPPDATA\GIRO\temp"
        
        ; Diretório raiz
        DetailPrint "  ▶ Removendo diretório principal..."
        RMDir /r "$LOCALAPPDATA\GIRO"
        
        ; Registro do Windows
        DetailPrint "  ▶ Limpando registro..."
        DeleteRegKey HKCU "Software\GIRO"
        DeleteRegKey HKLM "Software\GIRO"
        
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        DetailPrint "✓ TODOS OS DADOS FORAM REMOVIDOS!"
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        MessageBox MB_OK|MB_ICONINFORMATION \
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n\
            ✓ LIMPEZA COMPLETA REALIZADA$\r$\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n$\r$\n\
            Todos os dados do GIRO foram removidos permanentemente.$\r$\n$\r$\n\
            Caso faça uma nova instalação:$\r$\n\
            • Você precisará ativar uma nova licença$\r$\n\
            • Será necessário configurar o sistema do zero$\r$\n\
            • Todo o histórico foi apagado$\r$\n$\r$\n\
            Obrigado por usar o GIRO!$\r$\n\
            Arkheion Corp"
        
        Goto EndDataRemoval
    
    KeepUserData:
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        DetailPrint "MANTENDO DADOS DO USUÁRIO"
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        DetailPrint "  ✓ Banco de dados preservado"
        DetailPrint "  ✓ Backups mantidos"
        DetailPrint "  ✓ Configurações salvas"
        DetailPrint "  ✓ Licença preservada"
        DetailPrint ""
        DetailPrint "Localização: $LOCALAPPDATA\GIRO"
        DetailPrint "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        MessageBox MB_OK|MB_ICONINFORMATION \
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n\
            ✓ DADOS PRESERVADOS$\r$\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n$\r$\n\
            Os dados do GIRO foram mantidos em:$\r$\n\
            $LOCALAPPDATA\GIRO$\r$\n$\r$\n\
            Se reinstalar o GIRO, seus dados serão$\r$\n\
            recuperados automaticamente, incluindo:$\r$\n$\r$\n\
            ✓ Banco de dados completo$\r$\n\
            ✓ Vendas e histórico$\r$\n\
            ✓ Produtos e clientes$\r$\n\
            ✓ Configurações$\r$\n\
            ✓ Licença ativa$\r$\n$\r$\n\
            💡 Dica: Para remover manualmente os dados,$\r$\n\
            acesse a pasta acima e delete-a."
    
    EndDataRemoval:
    
    ; Remover atalhos
    DetailPrint "Removendo atalhos..."
    Delete "$DESKTOP\GIRO.lnk"
    Delete "$SMPROGRAMS\GIRO\GIRO.lnk"
    Delete "$SMPROGRAMS\GIRO\Desinstalar GIRO.lnk"
    RMDir "$SMPROGRAMS\GIRO"
    
    ; Limpar registro de desinstalação
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{com.arkheion.giro}"

    ; ═══════════════════════════════════════════════════════════════════════════
    ; REMOVE FIREWALL RULES
    ; ═══════════════════════════════════════════════════════════════════════════
    DetailPrint "Removendo regras do Firewall..."
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="GIRO Mobile Sync"'
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="GIRO Desktop App"'

!macroend

!macro customUnInstallSuccess
    MessageBox MB_OK|MB_ICONINFORMATION \
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n\
        ✓ DESINSTALAÇÃO CONCLUÍDA$\r$\n\
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$\r$\n$\r$\n\
        O GIRO foi desinstalado com sucesso!$\r$\n$\r$\n\
        Obrigado por usar nosso sistema.$\r$\n$\r$\n\
        🏛️ Arkheion Corp$\r$\n\
        Desenvolvendo soluções inteligentes$\r$\n$\r$\n\
        www.arkheion.com"
!macroend
