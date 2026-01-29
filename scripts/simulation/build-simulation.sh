#!/bin/bash
# GIRO/scripts/simulation/build-simulation.sh

echo "🏗️  [BUIILD] Iniciando compilação segura para Simulação..."

# Caminhos Absolutos
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../apps/desktop"
OUTPUT_DIR="$SCRIPT_DIR/bin"

mkdir -p "$OUTPUT_DIR"

cd "$PROJECT_ROOT" || exit 1

# Garante deps
if [ ! -d "node_modules" ]; then
    pnpm install
fi

# Compila em DEBUG via Cargo direto (ignora bundling do Tauri e appindicator check)
echo "⚙️  Compilando binário (Cargo Build)..."
cd src-tauri || exit 1
cargo build
BUILD_STATUS=$?
cd ..

if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Falha na compilação do Cargo."
    exit 1
fi

# Localiza o binário gerado pelo Cargo
BINARY_SOURCE="src-tauri/target/debug/giro-desktop"

if [ -f "$BINARY_SOURCE" ]; then
    cp "$BINARY_SOURCE" "$OUTPUT_DIR/giro-simulated"
    echo "✅ Binário isolado criado com sucesso em:"
    echo "   📍 $OUTPUT_DIR/giro-simulated"
    echo "   🛡️  Este binário é independente da sua versão instalada."
else
    echo "❌ Binário não encontrado em $BINARY_SOURCE"
    exit 1
fi
