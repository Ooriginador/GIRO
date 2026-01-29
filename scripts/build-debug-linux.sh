#!/bin/bash
# scripts/build-debug-linux.sh

echo "🏗️  Iniciando Build de Debug para Linux..."
cd apps/desktop || exit 1

# Garante dependências do Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo não encontrado. Instale o Rust."
    exit 1
fi

# Instala deps do frontend se precisar
if [ ! -d "node_modules" ]; then
    pnpm install
fi

# Compila em modo debug (mais rápido que release e permite logs)
# O binário final ficará em src-tauri/target/debug/bundle/deb/ ou apenas o executável em target/debug/
echo "⚙️  Compilando (isso pode demorar alguns minutos)..."
pnpm tauri build --debug

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    # Localiza o binário gerado
    BIN_PATH=$(find src-tauri/target/debug -name "giro-desktop" -type f -executable | head -n 1)
    echo "📍 Binário localizado em: $BIN_PATH"
else
    echo "❌ Falha no build."
fi
