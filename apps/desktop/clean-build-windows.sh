#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Script: Clean Build Windows - GIRO Desktop
# Descrição: Limpeza completa e build de produção do instalador Windows
# Autor: Arkheion Corp
# Data: 12 de Janeiro de 2026
# ═══════════════════════════════════════════════════════════════════════════

set -e

# ────────────────────────────────────────────────────────────────────────────
# Cores e Símbolos
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────────────────────
# Header
# ────────────────────────────────────────────────────────────────────────────

clear
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}║  ${BOLD}${CYAN}GIRO Desktop - Build Windows Completo${NC}${BLUE}                            ║${NC}"
echo -e "${BLUE}║  ${MAGENTA}Desenvolvido por Arkheion Corp${NC}${BLUE}                                    ║${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🕐 Iniciado em: $(date '+%d/%m/%Y às %H:%M:%S')${NC}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Funções Auxiliares
# ────────────────────────────────────────────────────────────────────────────

log_step() {
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}▶ $1${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

log_info() {
    echo -e "   ${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "   ${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "   ${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "   ${RED}✗${NC}  $1"
}

# ────────────────────────────────────────────────────────────────────────────
# Validação de Dependências
# ────────────────────────────────────────────────────────────────────────────

log_step "1. Validando Dependências"

# Rust e Cargo
if ! command -v rustc &> /dev/null; then
    log_error "Rust não encontrado!"
    echo ""
    echo "   Instale via: https://rustup.rs/"
    exit 1
fi
log_success "Rust $(rustc --version)"

# Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado!"
    exit 1
fi
log_success "Node.js $(node --version)"

# pnpm
if ! command -v pnpm &> /dev/null; then
    log_error "pnpm não encontrado!"
    echo ""
    echo "   Instale via: npm install -g pnpm"
    exit 1
fi
log_success "pnpm $(pnpm --version)"

# Target Windows
if ! rustup target list | grep -q "x86_64-pc-windows-gnu (installed)"; then
    log_warning "Target x86_64-pc-windows-gnu não instalado"
    log_info "Instalando target Windows..."
    rustup target add x86_64-pc-windows-gnu
    log_success "Target instalado!"
fi
log_success "Target x86_64-pc-windows-gnu disponível"

# MinGW-w64
if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    log_error "MinGW-w64 não encontrado!"
    echo ""
    echo "   Instale via: sudo apt install mingw-w64"
    exit 1
fi
log_success "MinGW-w64 $(x86_64-w64-mingw32-gcc -dumpversion)"

# NSIS (opcional)
if command -v makensis &> /dev/null; then
    log_success "NSIS $(makensis -VERSION)"
else
    log_warning "NSIS não encontrado (opcional para instalador)"
    log_info "Instale com: sudo apt install nsis"
fi

# ────────────────────────────────────────────────────────────────────────────
# Limpeza de Builds Antigos
# ────────────────────────────────────────────────────────────────────────────

log_step "2. Limpeza de Builds Antigos"

CLEANED=0

# Frontend dist
if [ -d "dist" ]; then
    log_info "Removendo dist do frontend..."
    rm -rf dist
    CLEANED=$((CLEANED+1))
fi

# Node modules cache (opcional)
if [ -d "node_modules/.vite" ]; then
    log_info "Limpando cache do Vite..."
    rm -rf node_modules/.vite
    CLEANED=$((CLEANED+1))
fi

# Rust target completo
if [ -d "src-tauri/target" ]; then
    log_info "Removendo target do Rust (pode levar alguns segundos)..."
    cd src-tauri
    cargo clean
    cd ..
    CLEANED=$((CLEANED+1))
fi

# Bundle antigos
if [ -d "src-tauri/target/x86_64-pc-windows-gnu/release/bundle" ]; then
    log_info "Removendo bundles antigos..."
    rm -rf src-tauri/target/x86_64-pc-windows-gnu/release/bundle
    CLEANED=$((CLEANED+1))
fi

# Arquivos temporários e bancos de dados persistentes (LIMPEZA AGRESSIVA)
if [ -d ".tauri" ]; then
    log_info "Removendo diretório .tauri..."
    rm -rf .tauri
    CLEANED=$((CLEANED+1))
fi

log_info "Limpando diretórios de dados locais (Removendo DBs e Logs)..."
rm -f src-tauri/giro.db*
rm -rf src-tauri/logs
# No Windows, os dados ficam em %LOCALAPPDATA%\GIRO. No Linux simulando build, limpamos o local
CLEANED=$((CLEANED+1))


if [ $CLEANED -eq 0 ]; then
    log_info "Nenhum arquivo antigo encontrado. Ambiente limpo!"
else
    log_success "Limpeza concluída! $CLEANED item(ns) removido(s)."
fi

# ────────────────────────────────────────────────────────────────────────────
# Verificação de Segurança
# ────────────────────────────────────────────────────────────────────────────

log_step "3. Verificação de Segurança"

WARNINGS=0

# Verificar seed.sql
if [ -f "src-tauri/seed.sql" ]; then
    if grep -q "emp-admin-001" src-tauri/seed.sql; then
        log_warning "seed.sql contém admin de desenvolvimento!"
        log_info "Em produção, o admin deve ser criado no primeiro acesso"
        WARNINGS=$((WARNINGS+1))
    fi
fi

# Verificar .env
if [ -f "src-tauri/.env" ]; then
    if grep -q "DATABASE_URL.*giro.db" src-tauri/.env; then
        log_info "Configuração de banco local detectada (OK para desktop)"
    fi
fi

# Verificar versão
VERSION=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
log_info "Versão do instalador: ${BOLD}${GREEN}${VERSION}${NC}"

if [ $WARNINGS -eq 0 ]; then
    log_success "Nenhum problema de segurança detectado"
else
    log_warning "$WARNINGS aviso(s) de segurança encontrado(s)"
    echo ""
    echo -e "${YELLOW}Deseja continuar? (S/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Nn]$ ]]; then
        log_error "Build cancelado pelo usuário"
        exit 1
    fi
fi

# ────────────────────────────────────────────────────────────────────────────
# Instalação de Dependências
# ────────────────────────────────────────────────────────────────────────────

log_step "4. Instalação de Dependências"

if [ ! -d "node_modules" ]; then
    log_info "Instalando dependências npm..."
    pnpm install
    log_success "Dependências instaladas!"
else
    log_info "Verificando dependências..."
    pnpm install --frozen-lockfile
    log_success "Dependências atualizadas!"
fi

# ────────────────────────────────────────────────────────────────────────────
# Preparação de Dependências Nativas (Windows)
# ────────────────────────────────────────────────────────────────────────────

log_step "4b. Baixando WebView2Loader.dll"

cd src-tauri
if [ ! -f "libs/x64/WebView2Loader.dll" ]; then
    log_info "Baixando DLL necessária para o target GNU..."
    chmod +x download-webview2-dll.sh
    ./download-webview2-dll.sh
else
    log_info "WebView2Loader.dll já presente."
fi
cd ..


# ────────────────────────────────────────────────────────────────────────────
# Build do Frontend
# ────────────────────────────────────────────────────────────────────────────

log_step "5. Compilação do Frontend (React + Vite)"

log_info "Executando type-checking..."
pnpm run typecheck

log_info "Compilando frontend para produção..."
pnpm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    log_error "Frontend não foi compilado corretamente!"
    exit 1
fi

BUNDLE_SIZE=$(du -sh dist | cut -f1)
log_success "Frontend compilado! (Tamanho: ${BUNDLE_SIZE})"

# ────────────────────────────────────────────────────────────────────────────
# Configuração do Build Rust para Windows
# ────────────────────────────────────────────────────────────────────────────

log_step "6. Configuração do Toolchain Windows"

export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER="x86_64-w64-mingw32-gcc"
export CC_x86_64_pc_windows_gnu="x86_64-w64-mingw32-gcc"
export CXX_x86_64_pc_windows_gnu="x86_64-w64-mingw32-g++"
export AR_x86_64_pc_windows_gnu="x86_64-w64-mingw32-ar"

log_info "Target:     ${CYAN}x86_64-pc-windows-gnu${NC}"
log_info "Linker:     ${CYAN}$(which x86_64-w64-mingw32-gcc)${NC}"
log_info "Compiler:   ${CYAN}MinGW-w64${NC}"
log_info "Profile:    ${CYAN}Release (otimizado)${NC}"

# ────────────────────────────────────────────────────────────────────────────
# Build do Backend (Rust)
# ────────────────────────────────────────────────────────────────────────────

log_step "7. Compilação do Backend (Rust -> Windows .exe)"

log_warning "Esta etapa pode levar de 5 a 15 minutos..."
log_info "Aguarde enquanto o Rust compila o backend para Windows..."

cd src-tauri

START_TIME=$(date +%s)

cargo build --release --target x86_64-pc-windows-gnu

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

cd ..

if [ -f "src-tauri/target/x86_64-pc-windows-gnu/release/giro-desktop.exe" ]; then
    EXE_SIZE=$(du -h src-tauri/target/x86_64-pc-windows-gnu/release/giro-desktop.exe | cut -f1)
    log_success "Backend compilado em ${MINUTES}m ${SECONDS}s (Tamanho: ${EXE_SIZE})"
else
    log_error "Falha ao compilar o backend!"
    exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# Build do Instalador (Tauri Bundle)
# ────────────────────────────────────────────────────────────────────────────

log_step "8. Geração do Instalador Windows (NSIS)"

log_info "Criando bundle com Tauri..."
pnpm tauri build --target x86_64-pc-windows-gnu

# ────────────────────────────────────────────────────────────────────────────
# Verificação e Resultados
# ────────────────────────────────────────────────────────────────────────────

log_step "9. Resultados do Build"

BUNDLE_DIR="src-tauri/target/x86_64-pc-windows-gnu/release/bundle"
FOUND_INSTALLERS=0

# NSIS Installer
if [ -d "$BUNDLE_DIR/nsis" ]; then
    NSIS_FILES=$(find "$BUNDLE_DIR/nsis" -name "*.exe" 2>/dev/null)
    if [ -n "$NSIS_FILES" ]; then
        echo -e "${GREEN}${BOLD}📦 Instalador NSIS:${NC}"
        find "$BUNDLE_DIR/nsis" -name "*.exe" -exec ls -lh {} \; | while read -r line; do
            SIZE=$(echo "$line" | awk '{print $5}')
            FILE=$(echo "$line" | awk '{print $9}')
            FILENAME=$(basename "$FILE")
            echo -e "   ${CYAN}▶${NC} ${BOLD}${FILENAME}${NC} ${YELLOW}(${SIZE})${NC}"
            echo -e "   ${BLUE}↳${NC} $FILE"
        done
        FOUND_INSTALLERS=$((FOUND_INSTALLERS+1))
        echo ""
    fi
fi

# MSI Installer
if [ -d "$BUNDLE_DIR/msi" ]; then
    MSI_FILES=$(find "$BUNDLE_DIR/msi" -name "*.msi" 2>/dev/null)
    if [ -n "$MSI_FILES" ]; then
        echo -e "${GREEN}${BOLD}📦 Instalador MSI:${NC}"
        find "$BUNDLE_DIR/msi" -name "*.msi" -exec ls -lh {} \; | while read -r line; do
            SIZE=$(echo "$line" | awk '{print $5}')
            FILE=$(echo "$line" | awk '{print $9}')
            FILENAME=$(basename "$FILE")
            echo -e "   ${CYAN}▶${NC} ${BOLD}${FILENAME}${NC} ${YELLOW}(${SIZE})${NC}"
            echo -e "   ${BLUE}↳${NC} $FILE"
        done
        FOUND_INSTALLERS=$((FOUND_INSTALLERS+1))
        echo ""
    fi
fi

# Executável standalone
EXE_PATH="src-tauri/target/x86_64-pc-windows-gnu/release/giro-desktop.exe"
if [ -f "$EXE_PATH" ]; then
    EXE_SIZE=$(du -h "$EXE_PATH" | cut -f1)
    echo -e "${GREEN}${BOLD}🎯 Executável Standalone:${NC}"
    echo -e "   ${CYAN}▶${NC} ${BOLD}giro-desktop.exe${NC} ${YELLOW}(${EXE_SIZE})${NC}"
    echo -e "   ${BLUE}↳${NC} $EXE_PATH"
    echo ""
fi

# ────────────────────────────────────────────────────────────────────────────
# Recomendações
# ────────────────────────────────────────────────────────────────────────────

echo -e "${BOLD}${MAGENTA}💡 Próximos Passos:${NC}"
echo ""
echo -e "   ${BLUE}1.${NC} Teste o instalador em uma VM Windows limpa"
echo -e "   ${BLUE}2.${NC} Verifique se todas as funcionalidades estão operando"
echo -e "   ${BLUE}3.${NC} Teste impressoras térmicas e hardware"
echo -e "   ${BLUE}4.${NC} Valide o processo de instalação do zero"
echo -e "   ${BLUE}5.${NC} Gere hash SHA256 para distribuição segura"
echo ""

echo -e "${BOLD}${YELLOW}⚠️  Importante:${NC}"
echo -e "   ${YELLOW}•${NC} Sempre distribua o ${BOLD}instalador${NC} (não o .exe standalone)"
echo -e "   ${YELLOW}•${NC} O instalador NSIS inclui todas as DLLs e dependências"
echo -e "   ${YELLOW}•${NC} Versão detectada: ${BOLD}${VERSION}${NC}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Final
# ────────────────────────────────────────────────────────────────────────────

if [ $FOUND_INSTALLERS -eq 0 ]; then
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ⚠️  NENHUM INSTALADOR GERADO                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_error "Verifique os logs acima para identificar problemas"
    exit 1
else
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                       ║${NC}"
    echo -e "${GREEN}║           ${BOLD}✅ BUILD CONCLUÍDO COM SUCESSO! 🎉${NC}${GREEN}                        ║${NC}"
    echo -e "${GREEN}║                                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🕐 Finalizado em: $(date '+%d/%m/%Y às %H:%M:%S')${NC}"
    echo -e "${MAGENTA}🏛️  Desenvolvido por Arkheion Corp${NC}"
    echo ""
fi
