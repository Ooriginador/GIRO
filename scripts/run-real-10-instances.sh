#!/bin/bash
# scripts/run-real-10-instances.sh
# Simulation of 10 GIRO Desktop instances on the same machine

set -e

# Resolve diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_ROOT="$SCRIPT_DIR/.."
BIN_NAME="giro-desktop"

# Tenta localizar o binário compilado
BIN_PATH=$(find "$WORKSPACE_ROOT/apps/desktop/src-tauri/target/debug" -name "$BIN_NAME" -type f -executable 2>/dev/null | head -n 1)

if [ -z "$BIN_PATH" ]; then
    echo "❌ Binário '$BIN_NAME' não encontrado."
    echo "Execute primeiro: cd apps/desktop && pnpm tauri build --debug"
    exit 1
fi

# ==============================================================================
# 🧹 SANITIZAÇÃO DE AMBIENTE (VS CODE SNAP FIX)
# ==============================================================================
unset GTK_PATH
unset LD_LIBRARY_PATH
unset GIO_MODULE_DIR

# Limpar processos anteriores
echo "🧹 Limpando processos anteriores..."
pkill -f giro-desktop 2>/dev/null || true
sleep 2

# Limpar dados de simulação anterior
rm -rf /tmp/giro-sim
echo "🗑️  Dados de simulação anteriores removidos"

echo "=================================================="
echo "🚀 Iniciando simulação REAL com 10 instâncias..."
echo "📍 Binário: $BIN_PATH"
echo "📂 Base de dados simulada: /tmp/giro-sim"
echo "=================================================="

# ==============================================================================
# CONFIGURAÇÃO DOS PCs
# ==============================================================================
# PC_NAME:ROLE
declare -A PC_CONFIG
PC_CONFIG["PC-PDV-01"]="MASTER"
PC_CONFIG["PC-PDV-02"]="SATELLITE"
PC_CONFIG["PC-ESTQ"]="SATELLITE"
PC_CONFIG["PC-GER"]="SATELLITE"
PC_CONFIG["PC-VEN-01"]="SATELLITE"
PC_CONFIG["PC-VEN-02"]="SATELLITE"
PC_CONFIG["PC-ADM"]="SATELLITE"
PC_CONFIG["PC-FIN"]="SATELLITE"
PC_CONFIG["PC-CAD"]="SATELLITE"
PC_CONFIG["PC-RESERVA"]="SATELLITE"

PCS=("PC-PDV-01" "PC-PDV-02" "PC-ESTQ" "PC-GER" "PC-VEN-01" "PC-VEN-02" "PC-ADM" "PC-FIN" "PC-CAD" "PC-RESERVA")

START_INSTANCE() {
    local pc=$1
    local PC_DIR="/tmp/giro-sim/$pc"
    mkdir -p "$PC_DIR/config" "$PC_DIR/data" "$PC_DIR/cache"

    # Iniciar em subshell com ambiente isolado
    (
        export XDG_DATA_HOME="$PC_DIR/data"
        export XDG_CONFIG_HOME="$PC_DIR/config"
        export XDG_CACHE_HOME="$PC_DIR/cache"
        export WEBKIT_DISABLE_COMPOSITING_MODE=1
        export WEBKIT_DISABLE_DMABUF_RENDERER=1
        export PIN_HMAC_KEY="simulated-secret-key-123"
        
        # Reduzir uso de recursos do WebKit
        export WEBKIT_FORCE_SANDBOX=0

        nohup "$BIN_PATH" > "$PC_DIR/runtime.log" 2>&1 &
        echo $! > "$PC_DIR/pid"
    )
}

# ==============================================================================
# FASE 1: Inicialização dos Schemas (Primeiro Boot)
# ==============================================================================
echo ""
echo "🏗️  [FASE 1/3] Inicializando bancos de dados (Criando Schema)..."
echo ""

for pc in "${PCS[@]}"; do
    echo "   🔄 Booting $pc..."
    START_INSTANCE "$pc"
    sleep 1.5  # Mais delay entre boots para evitar race conditions
done

echo ""
echo "⏳ Aguardando 15 segundos para aplicação das migrations..."
sleep 15

# ==============================================================================
# FASE 2: Injeção de Dados (Seed completo)
# ==============================================================================
echo ""
echo "🌱 [FASE 2/3] Populando bancos de dados com dados de teste..."
echo ""

for pc in "${PCS[@]}"; do
    PC_DIR="/tmp/giro-sim/$pc"
    MODE="${PC_CONFIG[$pc]}"
    
    echo "   🌱 Seeding $pc ($MODE)..."
    python3 "$SCRIPT_DIR/simulation/seed_database.py" "$PC_DIR/data/GIRO/giro.db" "$MODE" "$pc" 2>&1 | grep -E "✅|❌|🔑" || true
done

# ==============================================================================
# FASE 3: Reinício (Aplicar Configurações)
# ==============================================================================
echo ""
echo "🔄 [FASE 3/3] Reiniciando enxame para aplicar configurações..."
echo ""

pkill -f giro-desktop 2>/dev/null || true
sleep 3

echo "🚀 Iniciando Enxame Definitivo..."
for pc in "${PCS[@]}"; do
    echo "   🚀 Starting $pc..."
    START_INSTANCE "$pc"
    sleep 2  # 2 segundos entre cada instância
done

# Aguardar estabilização
echo ""
echo "⏳ Aguardando 10 segundos para estabilização..."
sleep 10

# ==============================================================================
# VERIFICAÇÃO DE SAÚDE
# ==============================================================================
echo ""
echo "🏥 Verificando saúde das instâncias..."
echo ""

RUNNING=0
FAILED=0

for pc in "${PCS[@]}"; do
    PC_DIR="/tmp/giro-sim/$pc"
    if [ -f "$PC_DIR/pid" ]; then
        PID=$(cat "$PC_DIR/pid")
        if ps -p "$PID" > /dev/null 2>&1; then
            MODE="${PC_CONFIG[$pc]}"
            echo "   ✅ $pc (PID: $PID) - $MODE"
            ((RUNNING++))
        else
            echo "   ❌ $pc - CRASHED (verificar $PC_DIR/runtime.log)"
            ((FAILED++))
        fi
    else
        echo "   ❌ $pc - Não iniciou"
        ((FAILED++))
    fi
done

echo ""
echo "=================================================="
echo "📊 RESULTADO: $RUNNING/10 instâncias operacionais"
echo "=================================================="

if [ $RUNNING -gt 0 ]; then
    echo ""
    echo "📋 CREDENCIAIS DE ACESSO:"
    echo "   🔑 Admin PIN:    1234"
    echo "   🔑 Gerente PIN:  2345"
    echo "   🔑 Caixa 1 PIN:  3456"
    echo "   🔑 Caixa 2 PIN:  4567"
    echo "   🔑 Vendedor PIN: 5678"
    echo ""
    echo "📂 Dados isolados em: /tmp/giro-sim/[PC-NAME]/"
    echo "📄 Logs: /tmp/giro-sim/[PC-NAME]/runtime.log"
    echo ""
    echo "⚠️  Para fechar tudo: pkill -f $BIN_NAME"
fi
