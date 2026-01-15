#!/bin/bash
# Script para resetar o banco de dados local do GIRO e restaurar o Admin padrão

DB_PATH="$HOME/.local/share/GIRO/giro.db"

echo "Removendo banco de dados atual..."
rm -f "$DB_PATH"

echo "Banco removido com sucesso."
echo "Ao iniciar o GIRO novamente, ele recriará o banco com o usuário Admin padrão."
echo "PIN Padrão: 8899"
