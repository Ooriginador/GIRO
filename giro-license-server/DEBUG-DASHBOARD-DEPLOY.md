# 🔍 Debug Completo - Deploy Dashboard Railway

**Data**: 11 de Janeiro de 2026  
**Status**: 🔴 Dashboard não está fazendo deploy

---

## 📊 Diagnóstico

### Estrutura do Projeto

```
giro-license-server/
├── backend/              # ✅ Deploy funcionando
│   ├── Dockerfile       
│   ├── railway.toml     
│   └── src/
├── dashboard/           # ❌ Deploy falhando
│   ├── Dockerfile       
│   ├── railway.toml     
│   ├── railway.json     
│   └── src/
└── .github/
    └── workflows/
        ├── railway-deploy.yml      # ✅ Deploy backend
        └── dashboard-deploy.yml    # 🆕 Criado agora
```

---

## 🔴 Problemas Identificados

### 1. Workflow Apenas para Backend

**Arquivo**: `.github/workflows/railway-deploy.yml`

```yaml
paths:
  - "backend/**"  # ❌ Só monitora backend
```

**Resultado**: Mudanças no `dashboard/` não trigam deploy.

---

### 2. Railway Precisa de Dois Serviços

O Railway deve ter 2 serviços configurados:

1. **backend** (porta 3000) - API Rust
2. **dashboard** (porta 3000) - Frontend Next.js

**Verificar no Railway**:
- Acesse: https://railway.app
- Projeto: `giro-license-server-production`
- Verifique se há 2 serviços ou apenas 1

---

### 3. Configuração do Dashboard

**`dashboard/railway.toml`** (CORRETO):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 60
```

**`dashboard/Dockerfile`** (CORRETO):
```dockerfile
# Build standalone
FROM node:20-alpine AS builder
COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS runner
COPY --from=builder /app/.next/standalone ./
CMD ["node", "server.js"]
```

---

## ✅ Soluções Aplicadas

### 1. Criado Novo Workflow

**Arquivo**: `.github/workflows/dashboard-deploy.yml`

```yaml
on:
  push:
    paths:
      - "dashboard/**"  # ✅ Monitora mudanças no dashboard
```

---

## 🚀 Próximos Passos

### Opção A: Railway com Monorepo (Recomendado)

**1. Verificar/Criar Serviço Dashboard no Railway**:

```bash
# Login
railway login

# Link projeto
cd /home/jhonslife/giro-license-server
railway link

# Listar serviços
railway service

# Se não existir "dashboard", criar:
railway service create dashboard
```

**2. Configurar ROOT_DIRECTORY**:

No Railway dashboard:
- Serviço `backend`: ROOT_DIRECTORY = `backend`
- Serviço `dashboard`: ROOT_DIRECTORY = `dashboard`

**3. Deploy Manual**:

```bash
# Backend
cd backend
railway up --service backend

# Dashboard
cd ../dashboard
railway up --service dashboard
```

---

### Opção B: Deploy Automático via GitHub

**1. Commit e Push**:

```bash
git add .github/workflows/dashboard-deploy.yml
git commit -m "feat(ci): adicionar workflow de deploy do dashboard"
git push origin main
```

**2. Trigger Manual**:

- GitHub → Actions → "Deploy Dashboard to Railway" → Run workflow

---

### Opção C: Vercel para Dashboard (Mais Simples)

O dashboard é Next.js puro, pode rodar no Vercel:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd dashboard
vercel --prod
```

**Vantagens**:
- Deploy automático do GitHub
- CDN global gratuito
- Configurar `NEXT_PUBLIC_API_URL` nas env vars

---

## 🔧 Comandos de Debug

### Testar Build Local

```bash
cd /home/jhonslife/giro-license-server/dashboard

# Build
npm run build

# Testar standalone
cd .next/standalone
node server.js

# Acessar: http://localhost:3000
```

### Testar Docker Local

```bash
cd /home/jhonslife/giro-license-server/dashboard

# Build imagem
docker build -t giro-dashboard .

# Rodar
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://giro-license-server-production.up.railway.app/api/v1 \
  giro-dashboard

# Acessar: http://localhost:3000
```

### Verificar Logs Railway

```bash
railway logs --service dashboard
```

---

## 📝 Checklist de Deploy

- [ ] Serviço `dashboard` existe no Railway
- [ ] ROOT_DIRECTORY = `dashboard` configurado
- [ ] Variável `NEXT_PUBLIC_API_URL` definida
- [ ] Healthcheck em `/` funcionando
- [ ] Workflow GitHub Actions configurado
- [ ] Build local funciona
- [ ] Docker local funciona

---

## 🎯 Recomendação Final

**Deploy via Vercel é mais simples para Next.js**:

1. Conecte repositório no Vercel
2. Root Directory: `dashboard`
3. Env var: `NEXT_PUBLIC_API_URL=https://giro-license-server-production.up.railway.app/api/v1`
4. Deploy automático em cada push

**Backend continua no Railway (ideal para Rust)**

---

## 📞 Próxima Ação

Escolha uma opção:

1. **"Configurar Railway com 2 serviços"** → Sigo com comandos Railway CLI
2. **"Deploy no Vercel"** → Faço setup do Vercel
3. **"Testar local primeiro"** → Rodamos `npm run build && cd .next/standalone && node server.js`

Qual prefere?
