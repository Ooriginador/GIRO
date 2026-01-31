#!/bin/bash
# Script de teste para debug do login flow

echo "=== TESTE DE FLUXO DE LOGIN ===="
echo ""

echo "1. Verificando migração do banco de dados..."
sqlite3 ~/.local/share/GIRO/giro.db "SELECT name FROM pragma_table_info('employees') WHERE name = 'username';"

if [ $? -eq 0 ]; then
    echo "✅ Coluna 'username' existe"
else
    echo "❌ Coluna 'username' NÃO existe"
fi

echo ""
echo "2. Verificando settings de autenticação..."
COUNT=$(sqlite3 ~/.local/share/GIRO/giro.db "SELECT COUNT(*) FROM settings WHERE key LIKE 'auth.%';")
echo "   Configurações de auth encontradas: $COUNT"

echo ""
echo "3. Verificando usuários no banco..."
sqlite3 ~/.local/share/GIRO/giro.db "SELECT id, name, email, role, username FROM employees LIMIT 5;"

echo ""
echo "4. Iniciando app em modo debug..."
echo "   Logs serão salvos em /tmp/giro-login-test.log"
echo "   Pressione Ctrl+C quando o app abrir"
echo ""

cd /home/jhonslife/CICLOGIRO/GIRO/apps/desktop
RUST_LOG=debug npm run tauri dev > /tmp/giro-login-test.log 2>&1
