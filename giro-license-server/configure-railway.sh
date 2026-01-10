#!/bin/bash
set -e

echo "🔧 Configuração Automática - GIRO License Server no Railway"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Navegar para o diretório correto
cd "$(dirname "$0")"

echo -e "${BLUE}📍 Working Directory:${NC} $(pwd)"
echo ""

# Linkar ao serviço Mercearias
echo -e "${YELLOW}🔗 Linkando ao serviço Mercearias...${NC}"
railway link -p 1e5725e4-9fec-445f-aba1-2365ed26d8d6 -e production -s Mercearias

echo ""
echo -e "${GREEN}✅ Linkado ao serviço Mercearias${NC}"
echo ""

# Configurar variáveis de ambiente
echo -e "${BLUE}⚙️  Configurando variáveis de ambiente...${NC}"
echo ""

# Gerar secrets
echo -e "${YELLOW}Gerando APP_SECRET...${NC}"
APP_SECRET=$(openssl rand -base64 32)
railway variables --set "APP_SECRET=$APP_SECRET" --skip-deploys
echo -e "${GREEN}✅ APP_SECRET configurado${NC}"

echo -e "${YELLOW}Gerando JWT_SECRET...${NC}"
JWT_SECRET=$(openssl rand -base64 32)
railway variables --set "JWT_SECRET=$JWT_SECRET" --skip-deploys
echo -e "${GREEN}✅ JWT_SECRET configurado${NC}"

# Configurações básicas
echo ""
echo -e "${YELLOW}Configurando variáveis de aplicação...${NC}"

railway variables --set "APP_ENV=production" --skip-deploys
echo -e "${GREEN}✅ APP_ENV=production${NC}"

railway variables --set "APP_PORT=3000" --skip-deploys
echo -e "${GREEN}✅ APP_PORT=3000${NC}"

railway variables --set "APP_HOST=0.0.0.0" --skip-deploys
echo -e "${GREEN}✅ APP_HOST=0.0.0.0${NC}"

railway variables --set "JWT_EXPIRATION=86400" --skip-deploys
echo -e "${GREEN}✅ JWT_EXPIRATION=86400${NC}"

railway variables --set "RUST_LOG=info,giro_license_server=debug" --skip-deploys
echo -e "${GREEN}✅ RUST_LOG configurado${NC}"

railway variables --set "RATE_LIMIT_REQUESTS=100" --skip-deploys
echo -e "${GREEN}✅ RATE_LIMIT_REQUESTS=100${NC}"

railway variables --set "RATE_LIMIT_WINDOW=60" --skip-deploys
echo -e "${GREEN}✅ RATE_LIMIT_WINDOW=60${NC}"

railway variables --set "DATABASE_MAX_CONNECTIONS=20" --skip-deploys
echo -e "${GREEN}✅ DATABASE_MAX_CONNECTIONS=20${NC}"

echo ""
echo -e "${GREEN}✅ Todas as variáveis configuradas!${NC}"
echo ""

# Mostrar variáveis configuradas
echo -e "${BLUE}📋 Variáveis Atuais:${NC}"
railway variables | grep -E "APP_|JWT_|RUST_|RATE_|DATABASE_MAX"

echo ""
echo -e "${YELLOW}⚠️  ATENÇÃO:${NC}"
echo ""
echo "As seguintes variáveis precisam ser configuradas MANUALMENTE no Dashboard:"
echo ""
echo "  1. DATABASE_URL → \${{Postgres.DATABASE_URL}}"
echo "  2. REDIS_URL → \${{Redis.REDIS_URL}}"
echo ""
echo "Vá para:"
echo "  https://railway.app/project/1e5725e4-9fec-445f-aba1-2365ed26d8d6"
echo "  → Serviço 'Mercearias'"
echo "  → Variables"
echo "  → Adicione as referências acima"
echo ""

echo -e "${BLUE}📝 Próximos Passos:${NC}"
echo ""
echo "1. Configure DATABASE_URL e REDIS_URL no Dashboard (ver acima)"
echo "2. Configure Root Directory no Dashboard:"
echo "   Settings → Source → Root Directory: giro-license-server"
echo "3. Configure Dockerfile Path:"
echo "   Settings → Source → Dockerfile Path: backend/Dockerfile"
echo "4. Faça o deploy:"
echo "   railway up"
echo "5. Execute migrations:"
echo "   railway run bash -c 'cd backend && sqlx migrate run'"
echo ""

echo -e "${GREEN}🎉 Configuração de variáveis concluída!${NC}"
echo ""
echo "Consulte RAILWAY-ANALISE-COMPLETA.md para mais detalhes."
