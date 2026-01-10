#!/bin/bash
set -e

echo "🚀 Iniciando GIRO License Server..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Subir containers
echo -e "${YELLOW}📦 Iniciando containers Docker...${NC}"
docker compose up -d db redis adminer

# Aguardar serviços estarem prontos
echo -e "${YELLOW}⏳ Aguardando PostgreSQL...${NC}"
until docker compose exec -T db pg_isready -U giro > /dev/null 2>&1; do
  echo "   PostgreSQL ainda não está pronto..."
  sleep 2
done
echo -e "${GREEN}✓ PostgreSQL pronto!${NC}"

echo -e "${YELLOW}⏳ Aguardando Redis...${NC}"
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  echo "   Redis ainda não está pronto..."
  sleep 1
done
echo -e "${GREEN}✓ Redis pronto!${NC}"

# Rodar migrations
echo -e "${YELLOW}🔄 Executando migrations...${NC}"
cd backend && sqlx migrate run
cd ..

echo -e "${GREEN}✅ Setup completo!${NC}"
echo ""
echo "Serviços disponíveis:"
echo "  • Backend API: http://localhost:3000"
echo "  • PostgreSQL: localhost:5433 (user: giro, password: giro_dev_password)"
echo "  • Redis: localhost:6379"
echo "  • Adminer (DB UI): http://localhost:8080"
echo ""
echo "Para iniciar o backend:"
echo "  cd backend && cargo run"
echo ""
echo "Para parar os serviços:"
echo "  docker compose down"
