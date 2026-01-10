#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Script: Build Windows (.exe) com GNU Toolchain
# Descrição: Compila o GIRO para Windows usando MinGW-w64 (GNU)
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       GIRO - Build Windows (.exe) - GNU Toolchain                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Validações
# ────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}⚙️  Verificando dependências...${NC}"

# Verificar Rust target
if ! rustup target list | grep -q "x86_64-pc-windows-gnu (installed)"; then
    echo -e "${RED}❌ Target x86_64-pc-windows-gnu não instalado!${NC}"
    echo -e "   Instalando..."
    rustup target add x86_64-pc-windows-gnu
fi

# Verificar MinGW
if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    echo -e "${RED}❌ MinGW-w64 não encontrado!${NC}"
    echo -e "   Instale com: sudo apt install mingw-w64"
    exit 1
fi

# Verificar NSIS (para instalador)
if ! command -v makensis &> /dev/null; then
    echo -e "${YELLOW}⚠️  NSIS não encontrado (opcional para instalador)${NC}"
    echo -e "   Instale com: sudo apt install nsis"
fi

echo -e "${GREEN}✅ Todas as dependências OK!${NC}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Configurar variáveis de ambiente
# ────────────────────────────────────────────────────────────────────────────

export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER="x86_64-w64-mingw32-gcc"
export CC_x86_64_pc_windows_gnu="x86_64-w64-mingw32-gcc"
export CXX_x86_64_pc_windows_gnu="x86_64-w64-mingw32-g++"
export AR_x86_64_pc_windows_gnu="x86_64-w64-mingw32-ar"

echo -e "${BLUE}📋 Configuração do Build:${NC}"
echo -e "   Target:        x86_64-pc-windows-gnu"
echo -e "   Linker:        $(which x86_64-w64-mingw32-gcc)"
echo -e "   Compilador:    MinGW-w64 $(x86_64-w64-mingw32-gcc --version | head -n1)"
echo -e "   Profile:       Release"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Build do Frontend
# ────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}🎨 Compilando Frontend (React + Vite)...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "   Instalando dependências npm..."
    pnpm install
fi

pnpm run build

echo -e "${GREEN}✅ Frontend compilado!${NC}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Build do Backend (Rust -> Windows .exe)
# ────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}🦀 Compilando Backend (Rust -> Windows .exe)...${NC}"
echo -e "   Isso pode levar alguns minutos..."
echo ""

cd src-tauri

# Limpar build anterior (opcional)
if [ -d "target/x86_64-pc-windows-gnu/release" ]; then
    echo -e "   Limpando build anterior..."
    cargo clean --target x86_64-pc-windows-gnu
fi

# Build release para Windows
cargo build --release --target x86_64-pc-windows-gnu

echo -e "${GREEN}✅ Backend compilado!${NC}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# Build do Instalador (Tauri Bundle)
# ────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}📦 Gerando Bundle Windows (NSIS Installer)...${NC}"

cd ..
pnpm tauri build --target x86_64-pc-windows-gnu

# ────────────────────────────────────────────────────────────────────────────
# Resultado
# ────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ BUILD CONCLUÍDO COM SUCESSO!                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📂 Arquivos gerados:${NC}"
echo ""

# Localizar arquivos gerados
BUNDLE_DIR="src-tauri/target/x86_64-pc-windows-gnu/release/bundle"

if [ -d "$BUNDLE_DIR/nsis" ]; then
    echo -e "${GREEN}🎯 Instalador NSIS:${NC}"
    find "$BUNDLE_DIR/nsis" -name "*.exe" -exec ls -lh {} \; | awk '{print "   📦 " $9 " (" $5 ")"}'
    echo ""
fi

if [ -d "$BUNDLE_DIR/msi" ]; then
    echo -e "${GREEN}🎯 Instalador MSI:${NC}"
    find "$BUNDLE_DIR/msi" -name "*.msi" -exec ls -lh {} \; | awk '{print "   📦 " $9 " (" $5 ")"}'
    echo ""
fi

# Executável standalone
EXE_PATH="src-tauri/target/x86_64-pc-windows-gnu/release/giro.exe"
if [ -f "$EXE_PATH" ]; then
    echo -e "${GREEN}🎯 Executável Standalone:${NC}"
    ls -lh "$EXE_PATH" | awk '{print "   📦 " $9 " (" $5 ")"}'
    echo ""
fi

echo -e "${BLUE}💡 Dicas:${NC}"
echo -e "   • Teste o .exe em uma VM Windows antes de distribuir"
echo -e "   • O instalador NSIS inclui todos os assets e DLLs necessárias"
echo -e "   • Para distribuir, use o instalador (não o .exe standalone)"
echo ""
echo -e "${GREEN}🚀 Build finalizado em: $(date)${NC}"
