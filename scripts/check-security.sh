#!/bin/bash
# Script de Verificação de Segurança antes de tornar o repositório público

set -e

echo "🔐 Verificação de Segurança do Repositório GIRO"
echo "================================================"
echo ""

ERRORS=0

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_ok() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Verificar arquivos .env
echo "1. Verificando arquivos .env..."
if git ls-files | grep -E "\.env$|\.env\.local|\.env\.production|\.env\.development" | grep -v "\.env\.example"; then
    print_error "Arquivos .env encontrados no Git! Remova-os antes de tornar público."
else
    print_ok "Nenhum arquivo .env commitado"
fi
echo ""

# 2. Verificar chaves privadas
echo "2. Verificando chaves privadas..."
if git ls-files | grep -E "\.(pem|key|p12|pfx)$"; then
    print_error "Chaves privadas encontradas! Remova-as antes de tornar público."
else
    print_ok "Nenhuma chave privada commitada"
fi
echo ""

# 3. Verificar senhas no código
echo "3. Procurando possíveis senhas/secrets no código..."
SUSPICIOUS=$(git grep -i -E "password\s*=\s*['\"]|api[_-]?key\s*=\s*['\"]|secret\s*=\s*['\"]|token\s*=\s*['\"]" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.rs' || true)
if [ -n "$SUSPICIOUS" ]; then
    print_warning "Possíveis secrets encontrados no código:"
    echo "$SUSPICIOUS" | head -5
    echo "(mostrando primeiras 5 linhas)"
else
    print_ok "Nenhum secret óbvio encontrado no código"
fi
echo ""

# 4. Verificar se LICENSE existe
echo "4. Verificando LICENSE..."
if [ -f "LICENSE" ]; then
    print_ok "LICENSE encontrada"
else
    print_error "LICENSE não encontrada! Crie uma antes de tornar público."
fi
echo ""

# 5. Verificar se SECURITY.md existe
echo "5. Verificando SECURITY.md..."
if [ -f "SECURITY.md" ]; then
    print_ok "SECURITY.md encontrada"
else
    print_warning "SECURITY.md não encontrada (recomendado)"
fi
echo ""

# 6. Verificar se CODEOWNERS existe
echo "6. Verificando CODEOWNERS..."
if [ -f ".github/CODEOWNERS" ]; then
    print_ok "CODEOWNERS encontrada"
else
    print_warning "CODEOWNERS não encontrada (recomendado para proteção)"
fi
echo ""

# 7. Verificar se .gitignore cobre os principais casos
echo "7. Verificando .gitignore..."
REQUIRED_IGNORES=(".env" "*.key" "*.pem" "node_modules" "target" "dist")
MISSING_IGNORES=()

for pattern in "${REQUIRED_IGNORES[@]}"; do
    if ! grep -q "$pattern" .gitignore; then
        MISSING_IGNORES+=("$pattern")
    fi
done

if [ ${#MISSING_IGNORES[@]} -eq 0 ]; then
    print_ok ".gitignore cobre os principais arquivos sensíveis"
else
    print_warning ".gitignore pode não cobrir: ${MISSING_IGNORES[*]}"
fi
echo ""

# 8. Verificar se há commits recentes com secrets
echo "8. Verificando histórico recente (últimos 10 commits)..."
RECENT_SECRETS=$(git log -10 --all --source --full-history -S "password" -S "api_key" -S "secret" --oneline || true)
if [ -n "$RECENT_SECRETS" ]; then
    print_warning "Commits recentes mencionam 'password', 'api_key' ou 'secret':"
    echo "$RECENT_SECRETS" | head -3
else
    print_ok "Nenhum commit recente suspeito encontrado"
fi
echo ""

# 9. Verificar tamanho de arquivos grandes
echo "9. Verificando arquivos grandes (>5MB)..."
LARGE_FILES=$(git ls-files | xargs -I{} bash -c 'SIZE=$(wc -c < "{}"); if [ $SIZE -gt 5242880 ]; then echo "{}"; fi' || true)
if [ -n "$LARGE_FILES" ]; then
    print_warning "Arquivos grandes encontrados (podem conter binários):"
    echo "$LARGE_FILES"
else
    print_ok "Nenhum arquivo muito grande encontrado"
fi
echo ""

# 10. Verificar se há backups de banco commitados
echo "10. Verificando backups de banco..."
if git ls-files | grep -E "\.(db|sqlite|sqlite3|sql\.gz|dump)$"; then
    print_error "Arquivos de banco encontrados! Remova-os antes de tornar público."
else
    print_ok "Nenhum arquivo de banco commitado"
fi
echo ""

# Resumo
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Verificação concluída com sucesso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Configurar Branch Protection no GitHub"
    echo "2. Adicionar Secrets no GitHub Actions"
    echo "3. Ativar Dependabot e Secret Scanning"
    echo "4. Tornar o repositório público"
    exit 0
else
    echo -e "${RED}✗ $ERRORS erro(s) encontrado(s)!${NC}"
    echo ""
    echo "Corrija os erros antes de tornar o repositório público."
    exit 1
fi
