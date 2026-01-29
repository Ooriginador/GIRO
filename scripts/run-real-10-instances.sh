#!/bin/bash
# scripts/run-real-10-instances.sh

# Resolve diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_ROOT="$SCRIPT_DIR/.."
BIN_NAME="giro-desktop"

# Tenta localizar o binário compilado
BIN_PATH=$(find "$WORKSPACE_ROOT/apps/desktop/src-tauri/target/debug" -name "$BIN_NAME" -type f -executable | head -n 1)

if [ -z "$BIN_PATH" ]; then
    echo "❌ Binário '$BIN_NAME' não encontrado."
    echo "Execute primeiro: ./scripts/build-debug-linux.sh"
    exit 1
fi

# ==============================================================================
# 🧹 SANITIZAÇÃO DE AMBIENTE (VS CODE SNAP FIX)
# ==============================================================================
# Remove variáveis injetadas pelo Snap que causam conflitos de glibc/pthread
# quando rodamos binários nativos de dentro do terminal do VS Code.
unset GTK_PATH
unset LD_LIBRARY_PATH
unset GIO_MODULE_DIR
# ==============================================================================

echo "🚀 Iniciando simulação REAL com 10 instâncias..."
echo "📍 Binário: $BIN_PATH"
echo "📂 Base de dados simulada: /tmp/giro-sim"

# ==============================================================================
# FASE 1: Inicialização dos Schemas (Primeiro Boot)
# ==============================================================================
echo "🏗️  [FASE 1] Inicializando bancos de dados (Criando Schema)..."

PCS=("PC-PDV-01" "PC-PDV-02" "PC-ESTQ" "PC-GER" "PC-VEN-01" "PC-VEN-02" "PC-ADM" "PC-FIN" "PC-CAD" "PC-RESERVA")

START_INSTANCE() {
    local pc=$1
    local PC_DIR="/tmp/giro-sim/$pc"
    mkdir -p "$PC_DIR/config" "$PC_DIR/data" "$PC_DIR/cache"

    (
        export XDG_DATA_HOME="$PC_DIR/data"
        export XDG_CONFIG_HOME="$PC_DIR/config"
        export XDG_CACHE_HOME="$PC_DIR/cache"
        export WEBKIT_DISABLE_COMPOSITING_MODE=1 
        export PIN_HMAC_KEY="simulated-secret-key-123"

        nohup "$BIN_PATH" > "$PC_DIR/runtime.log" 2>&1 &
    )
}

for pc in "${PCS[@]}"; do
    echo "   Booting $pc..."
    START_INSTANCE "$pc"
    sleep 0.5
done

echo "⏳ Aguardando 10 segundos para aplicação das migrations..."
sleep 10

# ==============================================================================
# FASE 2: Injeção de Dados
# ==============================================================================
echo "💉 [FASE 2] Injetando configurações e usuários..."

for pc in "${PCS[@]}"; do
    PC_DIR="/tmp/giro-sim/$pc"
    MODE="SATELLITE"
    if [ "$pc" == "PC-PDV-01" ]; then MODE="MASTER"; fi
    
    echo "   Injecting $pc ($MODE)..."
    python3 "$SCRIPT_DIR/simulation/inject_db.py" "$PC_DIR/data/GIRO/giro.db" "$MODE"
done

# ==============================================================================
# FASE 3: Reinício (Aplicar Configurações)
# ==============================================================================
echo "🔄 [FASE 3] Reiniciando enxame para aplicar configurações..."
pkill -f giro-desktop
sleep 2

echo "🚀 Iniciando Enxame Definitivo..."
for pc in "${PCS[@]}"; do
    echo "   🚀 Start $pc"
    START_INSTANCE "$pc"
    sleep 1 # Stagger start to prevent CPU spike
done

echo "=================================================="
echo "✅ Enxame Operacional!"

echo "=================================================="
echo "✅ 10 Instâncias Reais Iniciadas!"
echo "=================================================="
echo "📂 Os dados de cada PC estão isolados em: /tmp/giro-sim/[NOME-PC]"
echo "📄 Logs individuais disponíveis em: /tmp/giro-sim/[NOME-PC]/runtime.log"
echo "🗄️  Bancos de dados SQLite reais criados dentro de cada pasta de dados."
echo ""
echo "⚠️  Para fechar tudo, execute: pkill -f $BIN_NAME"
