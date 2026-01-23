#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Script: Capturar Screenshots 4K do GIRO Desktop
# Descrição: Aumenta resolução, abre app e tira prints profissionais
# ═══════════════════════════════════════════════════════════════════════════

set -e

OUTPUT_DIR="/home/jhonslife/giro-website/public/screenshots"
GIRO_PATH="/home/jhonslife/GIRO/apps/desktop"

mkdir -p "$OUTPUT_DIR"

echo "📸 CAPTURA DE SCREENSHOTS PROFISSIONAIS - GIRO"
echo "══════════════════════════════════════════════"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# PASSO 1: Configurar resolução alta (4K ou superior)
# ────────────────────────────────────────────────────────────────────────────
echo "⚙️  [1/5] Verificando resolução atual..."
CURRENT_RES=$(xrandr | grep "*" | awk '{print $1}' | head -1)
echo "   Resolução atual: $CURRENT_RES"

echo "⚙️  Tentando configurar 4K (3840x2160)..."
xrandr --output $(xrandr | grep " connected" | awk '{print $1}' | head -1) --mode 3840x2160 2>/dev/null || \
xrandr --output $(xrandr | grep " connected" | awk '{print $1}' | head -1) --mode 2560x1440 2>/dev/null || \
echo "⚠️  Mantendo resolução atual"

sleep 2

# ────────────────────────────────────────────────────────────────────────────
# PASSO 2: Compilar e abrir GIRO em modo dev
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "⚙️  [2/5] Iniciando GIRO Desktop..."

cd "$GIRO_PATH"

# Abrir em background
env -i \
  HOME="$HOME" \
  USER="$USER" \
  PATH="/usr/local/bin:/usr/bin:/bin" \
  DISPLAY="$DISPLAY" \
  WAYLAND_DISPLAY="$WAYLAND_DISPLAY" \
  XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" \
  LICENSE_SERVER_URL="https://giro-license-server-production.up.railway.app" \
  "$GIRO_PATH/src-tauri/target/debug/giro-desktop" &

GIRO_PID=$!
echo "   GIRO iniciado (PID: $GIRO_PID)"
echo "   Aguardando 10s para carregar..."
sleep 10

# ────────────────────────────────────────────────────────────────────────────
# PASSO 3: Capturar screenshots das telas principais
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "⚙️  [3/5] Capturando screenshots..."
echo ""
echo "📋 INSTRUÇÕES:"
echo "   1. Navegue para a tela que deseja capturar"
echo "   2. Pressione ENTER para tirar o screenshot"
echo "   3. Digite 'fim' quando terminar"
echo ""

SCREEN_NUM=1

while true; do
    echo -n "Tela ${SCREEN_NUM} - Nome da tela: "
    read SCREEN_NAME
    
    if [ "$SCREEN_NAME" = "fim" ] || [ "$SCREEN_NAME" = "FIM" ]; then
        break
    fi
    
    if [ -z "$SCREEN_NAME" ]; then
        SCREEN_NAME="tela-$SCREEN_NUM"
    fi
    
    # Sanitizar nome do arquivo
    FILENAME=$(echo "$SCREEN_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')
    
    echo "   Aguarde 3 segundos..."
    sleep 1
    echo "   3..."
    sleep 1
    echo "   2..."
    sleep 1
    echo "   1..."
    
    # Capturar screenshot
    gnome-screenshot --window --file="$OUTPUT_DIR/${FILENAME}.png" 2>/dev/null || \
    scrot -u -q 100 "$OUTPUT_DIR/${FILENAME}.png" 2>/dev/null || \
    import -window root "$OUTPUT_DIR/${FILENAME}.png"
    
    if [ -f "$OUTPUT_DIR/${FILENAME}.png" ]; then
        echo "   ✅ Capturado: ${FILENAME}.png"
    else
        echo "   ❌ Falha na captura"
    fi
    
    echo ""
    SCREEN_NUM=$((SCREEN_NUM + 1))
done

# ────────────────────────────────────────────────────────────────────────────
# PASSO 4: Otimizar e converter screenshots
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "⚙️  [4/5] Otimizando imagens..."

for img in "$OUTPUT_DIR"/*.png; do
    if [ -f "$img" ]; then
        echo "   Processando: $(basename "$img")"
        
        # Converter para WebP (melhor compressão)
        WEBP_FILE="${img%.png}.webp"
        convert "$img" -quality 90 "$WEBP_FILE"
        
        # Otimizar PNG original
        optipng -o7 -quiet "$img" 2>/dev/null || \
        pngcrush -ow "$img" 2>/dev/null || \
        echo "     (PNG optimizer não disponível)"
    fi
done

# ────────────────────────────────────────────────────────────────────────────
# PASSO 5: Fechar GIRO
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "⚙️  [5/5] Finalizando..."
kill $GIRO_PID 2>/dev/null || echo "   GIRO já foi fechado"

# ────────────────────────────────────────────────────────────────────────────
# Resumo
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "✅ CAPTURA CONCLUÍDA!"
echo ""
echo "📁 Screenshots salvos em:"
echo "   $OUTPUT_DIR"
echo ""
ls -lh "$OUTPUT_DIR"
echo ""
echo "💡 Use no Next.js:"
echo '   <Image src="/screenshots/nome.webp" alt="..." width={1920} height={1080} />'
