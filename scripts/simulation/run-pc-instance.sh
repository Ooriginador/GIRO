#!/bin/bash
# GIRO/scripts/simulation/run-pc-instance.sh

# Este script simula UM ÚNICO PC isolado via software.
# Uso: ./run-pc-instance.sh "NOME-DO-PC"

PC_NAME="${1:-PC-TESTE-01}"

# Caminhos
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BIN_PATH="$SCRIPT_DIR/bin/giro-simulated"
SIM_ROOT="$SCRIPT_DIR/../../simulation_data" # Dados ficam fora da pasta de código
INSTANCE_DIR="$SIM_ROOT/$PC_NAME"

# Verificação de Segurança
if [ ! -f "$BIN_PATH" ]; then
    echo "❌ Binário de simulação não encontrado!"
    echo "   Execute primeiro: ./scripts/simulation/build-simulation.sh"
    exit 1
fi

# Criação do Ambiente Isolado (Sandbox)
# Isso garante que o app NÃO toque em ~/.local, ~/.config ou no banco de dados real
mkdir -p "$INSTANCE_DIR/data"
mkdir -p "$INSTANCE_DIR/config"
mkdir -p "$INSTANCE_DIR/cache"
mkdir -p "$INSTANCE_DIR/logs"

echo "🖥️  Iniciando Instância Isolada: $PC_NAME"
echo "   📂 Sandbox: $INSTANCE_DIR"

# ENVIRONMENT OVERRIDES - A MÁGICA ACONTECE AQUI
# Redirecionamos as chamadas de sistema para as pastas criadas acima
(
    export XDG_DATA_HOME="$INSTANCE_DIR/data"
    export XDG_CONFIG_HOME="$INSTANCE_DIR/config"
    export XDG_CACHE_HOME="$INSTANCE_DIR/cache"
    
    # Logs do Rust (RUST_LOG)
    export RUST_LOG="info,giro_desktop=debug"
    
    # Otimização para rodar múltiplos
    export WEBKIT_DISABLE_COMPOSITING_MODE=1 

    # Executa e salva log
    "$BIN_PATH" > "$INSTANCE_DIR/logs/runtime.log" 2>&1 &
    
    PID=$!
    echo "   ✅ PID: $PID"
    echo $PID > "$INSTANCE_DIR/process.pid"
)
