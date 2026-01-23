# 🚀 Deployment Guide

> Deploy completo em produção via Railway

---

## 🌐 Infraestrutura

### Railway Platform

- **Backend**: https://giro-license-server-production.up.railway.app
- **PostgreSQL 16**: Managed database (500 MB storage)
- **Redis 7**: Managed cache (100 MB memory)
- **Region**: US West (Oregon)

---

## 📋 Pré-requisitos

### Contas Necessárias

1. **GitHub** - Repositório privado
2. **Railway** - Hosting platform
3. **Stripe** (opcional) - Pagamentos

### Ferramentas Locais

```bash
# Railway CLI
npm install -g @railway/cli

# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Docker (para testes locais)
# https://docs.docker.com/get-docker/
```

---

## 🔧 Configuração Railway

### 1. Criar Projeto

```bash
# Login
railway login

# Link to existing project (já criado)
cd /path/to/giro-license-server
railway link
```

### 2. Adicionar Services

#### PostgreSQL

```bash
railway add --plugin postgres
```

Isso gera automaticamente:

- `DATABASE_URL` (connection string)
- Banco com 500 MB storage
- Backups automáticos

#### Redis

```bash
railway add --plugin redis
```

Gera:

- `REDIS_URL` (connection string)
- 100 MB memory
- Persistence habilitada

---

### 3. Variáveis de Ambiente

```bash
# Definir secrets
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set API_KEY_SECRET=$(openssl rand -hex 32)

# Stripe (opcional)
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."

# Frontend URL
railway variables set FRONTEND_URL="https://dashboard.giro.com.br"
```

**Variáveis Completas:**

| Variável                | Descrição             | Exemplo                          |
| ----------------------- | --------------------- | -------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `REDIS_URL`             | Redis connection      | `redis://host:6379`              |
| `JWT_SECRET`            | Secret para JWT       | 64 chars hex                     |
| `API_KEY_SECRET`        | Secret para API Keys  | 64 chars hex                     |
| `RUST_LOG`              | Log level             | `info` ou `debug`                |
| `PORT`                  | HTTP port             | `3001` (Railway auto)            |
| `STRIPE_SECRET_KEY`     | Stripe API            | `sk_live_...`                    |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks       | `whsec_...`                      |
| `FRONTEND_URL`          | CORS origin           | `https://...`                    |

---

## 📦 Deploy Backend

### railway.toml

```toml
[build]
builder = "nixpacks"
buildCommand = "cargo build --release"

[deploy]
startCommand = "./target/release/backend"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### Dockerfile (alternativo)

```dockerfile
FROM rust:1.85 AS builder

WORKDIR /app
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
COPY backend/migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend
COPY --from=builder /app/migrations /migrations

ENV RUST_LOG=info
EXPOSE 3001

CMD ["backend"]
```

### Deploy Manual

```bash
# Via Railway CLI
railway up

# Via Git Push (recomendado)
git push origin main
# Railway detecta push e faz deploy automático
```

---

## 🗄️ Database Migrations

### Executar Migrations

```bash
# Localmente (desenvolvimento)
cd backend
sqlx migrate run

# Railway (produção)
railway run sqlx migrate run
```

### Criar Nova Migration

```bash
sqlx migrate add nome_da_migration

# Isso cria: migrations/YYYYMMDD_nome_da_migration.sql
```

**Exemplo:**

```sql
-- migrations/20260115_add_email_verification.sql
ALTER TABLE admins ADD COLUMN email_verification_token VARCHAR(64);
ALTER TABLE admins ADD COLUMN email_verified_at TIMESTAMPTZ;
```

---

## 🔍 Health Checks

### Endpoint

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-11T14:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### Railway Configuration

```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100  # segundos
```

Railway verifica `/health` a cada 30 segundos. Se falhar 3 vezes consecutivas, restart automático.

---

## 📊 Monitoring

### Railway Dashboard

- **CPU Usage**: Gráfico em tempo real
- **Memory**: Uso de RAM
- **Network**: Inbound/Outbound traffic
- **Logs**: Streaming logs (últimas 24h)

### Logs em Produção

```bash
# Stream logs em tempo real
railway logs

# Logs do serviço específico
railway logs --service backend
```

**Structured Logging (tracing):**

```rust
// backend/src/main.rs
tracing_subscriber::fmt()
    .with_target(false)
    .with_level(true)
    .json()  // JSON para parsing automático
    .init();
```

**Exemplo de log:**

```json
{
  "timestamp": "2026-01-11T14:30:00Z",
  "level": "INFO",
  "message": "License activated",
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "admin_id": "d384bca6-...",
  "ip": "203.0.113.42"
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Run tests
        run: cd backend && cargo test

      - name: Check format
        run: cd backend && cargo fmt --check

      - name: Clippy
        run: cd backend && cargo clippy -- -D warnings

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --detach
```

### Workflow

```
1. Push to main branch
   ↓
2. GitHub Actions triggered
   ↓
3. Run tests (cargo test)
   ↓
4. Check format (cargo fmt)
   ↓
5. Lint (clippy)
   ↓
6. If all pass → Deploy to Railway
   ↓
7. Railway builds Docker image
   ↓
8. Run migrations
   ↓
9. Health check
   ↓
10. Switch traffic to new deployment
```

---

## 🛡️ Production Checklist

### Pré-Deploy

- [ ] Todos os testes passando
- [ ] Migrations testadas localmente
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets rotacionados (se necessário)
- [ ] Backup do banco de dados
- [ ] CORS origins configurados
- [ ] Rate limits ajustados

### Pós-Deploy

- [ ] Health check retorna 200
- [ ] Logs sem erros críticos
- [ ] Database migrations aplicadas
- [ ] Smoke test: Login + Create License + Activate
- [ ] Verificar métricas (CPU, Memory)
- [ ] Testar endpoints principais

---

## 🔧 Troubleshooting

### Build Falha

```bash
# Verificar logs de build
railway logs --build

# Comum: SQLx compile-time checks
# Solução: Rodar migrations antes do build
DATABASE_URL=postgres://... cargo sqlx prepare
```

### Health Check Timeout

```bash
# Aumentar timeout
railway variables set HEALTHCHECK_TIMEOUT=120

# Verificar se /health responde
curl https://your-app.up.railway.app/health
```

### Database Connection Error

```bash
# Verificar DATABASE_URL
railway variables get DATABASE_URL

# Testar conexão
railway run -- psql $DATABASE_URL
```

### Redis Connection Error

```bash
# Verificar REDIS_URL
railway variables get REDIS_URL

# Testar conexão
railway run -- redis-cli -u $REDIS_URL ping
```

---

## 📈 Scaling

### Horizontal Scaling (Railway Pro)

```bash
# Aumentar número de replicas
railway scale --replicas 3
```

### Vertical Scaling

```toml
[deploy]
numReplicas = 1
memoryLimit = 1024  # MB
cpuLimit = 1.0      # vCPUs
```

### Database Scaling

- Railway automaticamente escala storage
- Para mais performance: Upgrade plano (Pro/Team)
- Read replicas disponíveis no plano Team

---

## 💰 Custos Estimados

### Railway Pricing (2026)

| Plano | Preço   | Recursos                         |
| ----- | ------- | -------------------------------- |
| Free  | $0/mês  | 500h compute, 100 MB DB          |
| Hobby | $5/mês  | Ilimitado, 1 GB DB, 100 projetos |
| Pro   | $20/mês | Ilimitado, 10 GB DB, prioridade  |

**Estimativa para 1000 licenças ativas:**

- Compute: ~$10/mês
- PostgreSQL: ~$5/mês (2 GB)
- Redis: ~$3/mês (256 MB)
- **Total**: ~$18/mês (Hobby Plan)

---

## 🔄 Rollback

### Railway

```bash
# Listar deployments
railway deployments list

# Fazer rollback para deployment anterior
railway deployments rollback <deployment-id>
```

### Manual

```bash
# Reverter para commit anterior
git revert HEAD
git push origin main

# Railway detecta e faz novo deploy
```

---

## 📞 Suporte

### Railway Support

- **Docs**: https://docs.railway.app
- **Discord**: https://discord.gg/railway
- **Status**: https://status.railway.app

### Logs de Incidente

```bash
# Exportar logs para análise
railway logs --since 24h > incident-$(date +%Y%m%d).log
```
