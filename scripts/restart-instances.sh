#!/bin/bash
# scripts/restart-instances.sh
# Reinicia as instâncias SEM apagar dados existentes

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_ROOT="$SCRIPT_DIR/.."
BIN_NAME="giro-desktop"

BIN_PATH=$(find "$WORKSPACE_ROOT/apps/desktop/src-tauri/target/debug" -name "$BIN_NAME" -type f -executable 2>/dev/null | head -n 1)

if [ -z "$BIN_PATH" ]; then
    echo "❌ Binário '$BIN_NAME' não encontrado."
    exit 1
fi

# Sanitização de ambiente (VS Code Snap Fix)
unset GTK_PATH
unset LD_LIBRARY_PATH
unset GIO_MODULE_DIR

echo "🛑 Parando instâncias existentes..."
pkill -f giro-desktop 2>/dev/null || true
sleep 3

PCS=("PC-PDV-01" "PC-PDV-02" "PC-ESTQ" "PC-GER" "PC-VEN-01" "PC-VEN-02" "PC-ADM" "PC-FIN" "PC-CAD" "PC-RESERVA")

START_INSTANCE() {
    local pc=$1
    local PC_DIR="/tmp/giro-sim/$pc"

    (
        export XDG_DATA_HOME="$PC_DIR/data"
        export XDG_CONFIG_HOME="$PC_DIR/config"
        export XDG_CACHE_HOME="$PC_DIR/cache"
        export WEBKIT_DISABLE_COMPOSITING_MODE=1
        export WEBKIT_DISABLE_DMABUF_RENDERER=1
        export PIN_HMAC_KEY="simulated-secret-key-123"
        export WEBKIT_FORCE_SANDBOX=0

        nohup "$BIN_PATH" > "$PC_DIR/runtime.log" 2>&1 &
        echo $! > "$PC_DIR/pid"
    )
}

echo ""
echo "🚀 Iniciando instâncias (preservando dados)..."
echo "📍 Binário: $BIN_PATH"
echo ""

for pc in "${PCS[@]}"; do
    echo "   🚀 Starting $pc..."
    START_INSTANCE "$pc"
    sleep 2
done

echo ""
echo "⏳ Aguardando 10 segundos para estabilização..."
sleep 10

# Verificação
echo ""
echo "🏥 Verificando saúde das instâncias..."
echo ""

RUNNING=0
for pc in "${PCS[@]}"; do
    PC_DIR="/tmp/giro-sim/$pc"
    if [ -f "$PC_DIR/pid" ]; then
        PID=$(cat "$PC_DIR/pid")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   ✅ $pc (PID: $PID)"
            ((RUNNING++))
        else
            echo "   ❌ $pc - CRASHED"
        fi
    fi
done

# Verificar portas de rede
echo ""
echo "🌐 Verificando portas WebSocket..."
ss -tlnp | grep -E "384[0-9]" || echo "   ⚠️ Nenhuma porta 384x aberta"

echo ""
echo "📊 RESULTADO: $RUNNING/10 instâncias operacionais"

# Mostrar logs de network role
echo ""
echo "📋 Status de Network Role:"
for pc in "${PCS[@]}"; do
    PC_DIR="/tmp/giro-sim/$pc"
    ROLE=$(grep -E "MASTER|SATELLITE|STANDALONE" "$PC_DIR/runtime.log" 2>/dev/null | head -1 || echo "N/A")
    echo "   $pc: $ROLE"
done
