#!/bin/bash
# Script para limpar todos os dados locais do GIRO (RESET TOTAL)
# Uso: ./reset-giro-env.sh

echo "⚠️  AVISO: Isso irá apagar todo o banco de dados local e configurações!"
echo "Você tem certeza? (y/N)"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
fi

echo "🧹 Limpando dados do GIRO..."

# Determinar diretório de dados baseado no OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    DATA_DIR="$HOME/.local/share/GIRO"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    DATA_DIR="$HOME/Library/Application Support/com.arkheion.giro"
else
    # Windows (rodando via Git Bash ou similar)
    DATA_DIR="$LOCALAPPDATA/GIRO"
fi

if [ -d "$DATA_DIR" ]; then
    rm -rf "$DATA_DIR"/*
    echo "✅ Diretório de dados limpo: $DATA_DIR"
else
    echo "ℹ️  Diretório de dados não encontrado ou já está limpo."
fi

# Limpar arquivos temporários de build se solicitado
echo "Deseja também limpar o cache de build do Rust? (y/N)"
read -r build_response
if [[ "$build_response" =~ ^[Yy]$ ]]; then
    echo "🧹 Limpando target/..."
    rm -rf apps/desktop/src-tauri/target
    echo "✅ Cache de build limpo."
fi

DB_FILE="$HOME/.local/share/GIRO/giro.db"
if [ -f "$DB_FILE" ]; then
    echo "❌ AVISO: O arquivo de banco de dados $DB_FILE ainda existe. Tentando remover..."
    rm -f "$DB_FILE"
fi

echo ""
echo "✨ Ambiente resetado com sucesso! O próximo acesso solicitará a criação do primeiro administrador."
