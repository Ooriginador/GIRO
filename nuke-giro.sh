#!/bin/bash
# NUKE SCRIPT - Use with caution
# Cleans ALL potential data directories for GIRO

echo "☢️  INICIANDO LIMPEZA NUCLEAR DO GIRO..."

# 1. Matar processos rodando
echo "🔪 Matando processos antigos..."
# Kill specific binaries only
killall -9 giro-desktop 2>/dev/null || true
pkill -x giro-desktop || true
# Only kill tauri-driver or related if specifically matching
pgrep -f "tauri" | grep -v "nuke" | grep -v "bash" | xargs -r kill -9 2>/dev/null || true

# 2. Definir diretórios alvo baseado no OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    BASE_DIR="$HOME/.local/share"
    CACHE_DIR="$HOME/.cache"
    CONFIG_DIR="$HOME/.config"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    BASE_DIR="$HOME/Library/Application Support"
    CACHE_DIR="$HOME/Library/Caches"
    CONFIG_DIR="$HOME/Library/Preferences"
fi

# Lista de identificadores para buscar e destruir
TARGETS=(
    "GIRO"
    "giro"
    "com.arkheion.giro"
    "giro-desktop"
    "Mercearias"
    "mercearias"
)

echo "🎯 Alvos identificados:"
for target in "${TARGETS[@]}"; do
    echo " - $target"
done

# 3. Limpeza Profunda
echo ""
echo "🔥 Destruindo dados persistentes..."

for target in "${TARGETS[@]}"; do
    # Data Dir
    if [ -d "$BASE_DIR/$target" ]; then
        echo "   💥 Removendo Data: $BASE_DIR/$target"
        rm -rf "$BASE_DIR/$target"
    fi
    # Check if still exists
    if [ -d "$BASE_DIR/$target" ]; then
        echo "   ❌ FALHA ao remover $BASE_DIR/$target"
    fi

    # Cache Dir
    if [ -d "$CACHE_DIR/$target" ]; then
        echo "   💥 Removendo Cache: $CACHE_DIR/$target"
        rm -rf "$CACHE_DIR/$target"
    fi

    # Config Dir
    if [ -d "$CONFIG_DIR/$target" ]; then
        echo "   💥 Removendo Config: $CONFIG_DIR/$target"
        rm -rf "$CONFIG_DIR/$target"
    fi

    # WebKit Storage (Sub-pastas comuns)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Às vezes o WebKit salva em pastas genéricas dentro de ~/.local/share
        echo "   💥 Removendo WebKit Data para $target..."
        rm -rf "$HOME/.local/share/webkitgtk/local-storage/$target"* 2>/dev/null
        rm -rf "$HOME/.local/share/webkitgtk/databases/$target"* 2>/dev/null
        # Também verificar WPE e outras variantes
        rm -rf "$HOME/.var/app/$target" 2>/dev/null # Flatpak leftovers
    fi
done

# REMOVE WEB VIEW LOCAL STORAGE AGGRESSIVELY
# Muitas vezes o Tauri v2 usa caminhos complexos para LocalStorage
echo ""
echo "🔥 Procurando por LocalStorage órfão do WebKit..."
find "$HOME/.local/share" -name "*$target*" -print -exec rm -rf {} + 2>/dev/null || true
find "$HOME/.cache" -name "*$target*" -print -exec rm -rf {} + 2>/dev/null || true

# 4. Limpeza de Build (Frontend e Backend)
echo ""
echo "🏗️  Limpando artefatos de build..."
rm -rf apps/desktop/dist
rm -rf apps/desktop/src-tauri/target
rm -rf apps/desktop/src-tauri/*.db*
rm -rf "apps/desktop/src-tauri/giro.db"

# 5. Verificação Final (Explicit check for standard DB path)
DB_PATH="$HOME/.local/share/GIRO/giro.db"
if [ -f "$DB_PATH" ]; then
    echo "❌ ALERTA CRÍTICO: O banco de dados principal AINDA EXISTE em $DB_PATH"
    echo "Tentando remover arquivo específico..."
    rm -f "$DB_PATH"
    if [ -f "$DB_PATH" ]; then
         echo "❌ FALHA FATAL: Não foi possível remover o banco de dados. Verifique permissões."
    else
         echo "✅ Banco de dados removido na segunda tentativa."
    fi
else
    echo "✅ Verificado: Banco de dados principal não encontrado (LIMPO)."
fi

echo ""
echo "✅ NUCLEAR CLEANUP COMPLETED."
echo "O sistema está agora como se nunca tivesse sido instalado."
