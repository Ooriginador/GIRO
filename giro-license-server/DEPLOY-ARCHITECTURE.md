# 🏗️ GIRO License Server - Arquitetura de Deploy Railway

**Data**: 11 de Janeiro de 2026  
**Objetivo**: Deploy de 2 serviços separados no Railway a partir de um monorepo

---

## 📂 Estrutura do Monorepo

```
giro-license-server/
├── railway.json              # ⚠️ Config RAIZ (Railway usa por padrão)
├── railway.toml              # ⚠️ Config RAIZ (Railway usa por padrão)
│
├── backend/                  # 🦀 API Rust
│   ├── Dockerfile           # Build backend
│   ├── railway.toml         # ❌ IGNORADO (Railway usa raiz)
│   ├── .railwayignore       # Ignora dashboard
│   ├── src/
│   └── migrations/
│
└── dashboard/               # ⚛️ Frontend Next.js
    ├── Dockerfile          # Build dashboard
    ├── railway.toml        # ❌ IGNORADO (Railway usa raiz)
    ├── railway.json        # ❌ IGNORADO (Railway usa raiz)
    ├── .railwayignore      # Ignora backend
    └── src/
```

---

## 🔴 PROBLEMA IDENTIFICADO

### Railway SEMPRE lê configuração da RAIZ do repositório!

Não importa qual `ROOT_DIRECTORY` você configure, o Railway:

1. Clona o repositório completo
2. Lê `railway.json` / `railway.toml` **da raiz**
3. Executa o Dockerfile especificado na configuração da raiz
4. **Ignora** as configurações dentro das subpastas

### Configuração Atual (RAIZ):

```json
// railway.json (RAIZ)
{
  "build": {
    "dockerfilePath": "backend/Dockerfile"  // ← SEMPRE backend!
  }
}
```

**Resultado**: AMBOS os serviços usam `backend/Dockerfile` 😱

---

## ✅ SOLUÇÃO: Remover Configuração da Raiz

O Railway precisa:
- **Sem** `railway.json` / `railway.toml` na raiz
- Configuração **via UI do Railway** para cada serviço
- Ou usar **variável de ambiente** `RAILWAY_SERVICE_ROOT_DIRECTORY`

---

## 🔧 CONFIGURAÇÃO CORRETA

### Serviço 1: giro-license-server (Backend)

**Railway UI → Settings:**

| Campo | Valor |
|-------|-------|
| **Root Directory** | `backend` |
| **Dockerfile Path** | `Dockerfile` |
| **Watch Paths** | `backend/**` |

**Variáveis de Ambiente:**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
APP_SECRET=...
```

### Serviço 2: giro-dashboard (Dashboard)

**Railway UI → Settings:**

| Campo | Valor |
|-------|-------|
| **Root Directory** | `dashboard` |
| **Dockerfile Path** | `Dockerfile` |
| **Watch Paths** | `dashboard/**` |

**Variáveis de Ambiente:**
```bash
NEXT_PUBLIC_API_URL=https://giro-license-server-production.up.railway.app/api/v1
NODE_ENV=production
PORT=3000
```

---

## 🚀 AÇÃO: Reorganizar Configurações

### Passo 1: Mover configs da raiz para backend/

```bash
mv railway.json backend/
mv railway.toml backend/
```

### Passo 2: Atualizar paths nos arquivos

**backend/railway.json:**
```json
{
  "build": {
    "dockerfilePath": "Dockerfile"  // Relativo ao ROOT_DIRECTORY
  }
}
```

**backend/Dockerfile** - Mudar paths de:
```dockerfile
COPY backend/Cargo.toml ./Cargo.toml
COPY backend/migrations ./migrations
```

Para:
```dockerfile
COPY Cargo.toml ./Cargo.toml
COPY migrations ./migrations
```

### Passo 3: Configurar Railway via UI

Para cada serviço, definir **Root Directory** manualmente.

---

## 📊 FLUXO DE DEPLOY ESPERADO

### Backend

```
1. Push para main (alteração em backend/**)
2. Railway detecta mudança
3. ROOT_DIRECTORY = backend
4. Executa: backend/Dockerfile
5. Build: cargo build --release
6. Deploy: giro-license-server binary
7. Healthcheck: /api/v1/health ✓
```

### Dashboard

```
1. Push para main (alteração em dashboard/**)
2. Railway detecta mudança
3. ROOT_DIRECTORY = dashboard
4. Executa: dashboard/Dockerfile
5. Build: npm run build
6. Deploy: node server.js
7. Healthcheck: / ✓
```

---

## 🧪 VALIDAÇÃO

### Logs Corretos - Backend:
```
Using Detected Dockerfile
FROM rust:1.85-slim
cargo build --release
Finished `release` profile in 1m 17s
Starting GIRO License Server
✓ Connected to database
✓ Connected to Redis
```

### Logs Corretos - Dashboard:
```
Using Detected Dockerfile
FROM node:20-alpine
npm ci --legacy-peer-deps
npm run build
▲ Next.js 16.1.1
✓ Ready in 51ms
```

---

## 🎯 COMANDOS PARA EXECUTAR AGORA

```bash
# 1. Remover configs da raiz
cd /home/jhonslife/giro-license-server
rm railway.json railway.toml

# 2. Atualizar backend/Dockerfile (remover prefixo backend/)
# Ver seção abaixo

# 3. Atualizar dashboard/Dockerfile (já está correto)

# 4. Commit e push
git add -A
git commit -m "fix(railway): usar ROOT_DIRECTORY corretamente sem config na raiz"
git push origin main

# 5. No Railway UI:
#    - giro-license-server: Root Directory = backend
#    - giro-dashboard: Root Directory = dashboard
#    - Redeploy ambos
```

---

## 📝 MUDANÇAS NO DOCKERFILE DO BACKEND

**DE:**
```dockerfile
COPY backend/Cargo.toml ./Cargo.toml
COPY backend/migrations ./migrations
COPY backend/.sqlx ./.sqlx
COPY backend/src ./src
```

**PARA:**
```dockerfile
COPY Cargo.toml ./Cargo.toml
COPY migrations ./migrations
COPY .sqlx ./.sqlx
COPY src ./src
```

---

## ⚡ ALTERNATIVA: Usar variável RAILWAY_DOCKERFILE_PATH

Se não quiser modificar Dockerfiles, pode definir via variável:

**Serviço backend:**
```bash
RAILWAY_DOCKERFILE_PATH=backend/Dockerfile
```

**Serviço dashboard:**
```bash
RAILWAY_DOCKERFILE_PATH=dashboard/Dockerfile
```

Mas isso ainda requer que os caminhos dentro do Dockerfile estejam corretos!

---

## 🏆 CONCLUSÃO

O problema é que a **configuração da raiz sobrescreve as configurações das subpastas**.

A solução é:
1. **Remover** `railway.json` e `railway.toml` da raiz
2. **Configurar** Root Directory via UI do Railway
3. **Atualizar** Dockerfiles para usar caminhos relativos ao Root Directory

**Próximo passo**: Executar os comandos acima?
