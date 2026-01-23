# 🔥 SOLUÇÃO URGENTE - Dashboard Deploy

## ❌ Problema Atual

O Railway está rodando o **backend** ao invés do **dashboard**.

**Evidência dos logs**:
```
🚀 Starting GIRO License Server  ← Mensagem do backend Rust
Error: environment variable not found  ← Faltam vars do backend
```

---

## ✅ SOLUÇÃO

O Railway precisa de **ROOT_DIRECTORY** configurado para cada serviço.

### Passo 1: Acessar Railway Dashboard

1. Vá para: https://railway.app
2. Login com sua conta
3. Selecione projeto: `giro-license-server-production`

---

### Passo 2: Verificar Serviços

Você deve ter **2 serviços**:

```
📦 backend (API Rust)
📦 dashboard (Frontend Next.js)
```

Se só tem 1 serviço, precisa criar o segundo:

1. Click em **"New"**
2. Selecione **"Empty Service"**
3. Nome: `dashboard`
4. Click em **"Add Service"**

---

### Passo 3: Configurar ROOT_DIRECTORY

#### Para o serviço **backend**:

1. Click no serviço `backend`
2. Aba **"Settings"**
3. Scroll até **"Service Settings"**
4. Em **"Root Directory"**: `backend`
5. Click **"Update"**

#### Para o serviço **dashboard**:

1. Click no serviço `dashboard`
2. Aba **"Settings"**
3. Em **"Root Directory"**: `dashboard`
4. Click **"Update"**

---

### Passo 4: Configurar Variáveis de Ambiente

#### Dashboard precisa de:

No serviço `dashboard` → Variables:

```bash
NEXT_PUBLIC_API_URL=https://giro-license-server-production.up.railway.app/api/v1
NODE_ENV=production
PORT=3000
```

#### Backend já tem as variáveis configuradas (DATABASE_URL, REDIS_URL, etc)

---

### Passo 5: Configurar Source

#### Para ambos serviços:

1. Settings → **"Source"**
2. Connect: `jhonslife/giro-license-server`
3. Branch: `main`

---

### Passo 6: Trigger Deploy

#### Opção A - Via Railway UI:

1. Click no serviço `dashboard`
2. Aba **"Deployments"**
3. Click **"Deploy"** (botão no canto superior direito)

#### Opção B - Via Push (após config acima):

```bash
cd /home/jhonslife/giro-license-server
git add dashboard/railway.json dashboard/railway.toml
git commit -m "fix(railway): corrigir configuração do dashboard"
git push origin main
```

---

## 🎯 Checklist Pós-Deploy

Após deploy bem-sucedido, você deve ver:

**Dashboard logs**:
```
✓ Next.js 16.1.1
✓ Starting...
✓ Ready in XXms
```

**URL**:
```
https://dashboard-production-XXXX.up.railway.app
```

---

## 🔧 Alternativa RÁPIDA: Vercel

Se Railway continuar complicado, faça deploy do dashboard no **Vercel** (leva 2 minutos):

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
cd /home/jhonslife/giro-license-server/dashboard
vercel --prod

# 3. Configurar variável
# No dashboard do Vercel:
# Settings → Environment Variables:
# NEXT_PUBLIC_API_URL = https://giro-license-server-production.up.railway.app/api/v1
```

**Vantagens**:
- Deploy automático do GitHub
- CDN global grátis
- SSL automático
- Mais rápido que Railway para Next.js

---

## ⚡ Próxima Ação

**Escolha UMA opção**:

1. **"Configurei ROOT_DIRECTORY no Railway"** → Farei o push
2. **"Quero deploy no Vercel"** → Rodo `vercel --prod`
3. **"Preciso de ajuda no Railway"** → Mando capturas de tela

Qual prefere?
