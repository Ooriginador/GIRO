#!/bin/bash

echo "🔍 DIAGNOSTICO GIRO"
echo "==================="
echo "Data: $(date)"
echo "User: $USER"
echo ""

APP_DIR="$HOME/.local/share/GIRO"
DB_FILE="$APP_DIR/giro.db"
LICENSE_FILE="$APP_DIR/license.json"

echo "📂 Verificando Diretórios e Arquivos:"
if [ -d "$APP_DIR" ]; then
    echo "✅ Diretório $APP_DIR existe."
    ls -la "$APP_DIR"
else
    echo "❌ Diretório $APP_DIR NÃO existe."
fi

echo ""
if [ -f "$DB_FILE" ]; then
    echo "✅ Banco de dados encontrado: $DB_FILE"
    ls -l --time-style=full-iso "$DB_FILE"
    echo "   Tamanho: $(du -h "$DB_FILE" | cut -f1)"
else
    echo "✅ Banco de dados NÃO existe (Correto se acabou de rodar nuke)"
fi

echo ""
if [ -f "$LICENSE_FILE" ]; then
    echo "⚠️ Arquivo de licença encontrado: $LICENSE_FILE"
    cat "$LICENSE_FILE"
else
    echo "✅ Arquivo de licença NÃO existe."
fi

echo ""
echo "🔄 Processos em Execução:"
pgrep -fla "giro"
pgrep -fla "tauri"

echo ""
echo "==================="
echo "FIM DO DIAGNOSTICO"
