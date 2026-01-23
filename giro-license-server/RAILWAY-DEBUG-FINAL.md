# 🚨 CORREÇÃO RAILWAY - Dashboard

## Problema Identificado

O Railway está **executando o backend** ao invés do dashboard, mesmo com ROOT_DIRECTORY correto.

---

## ✅ SOLUÇÃO: Verificar Railway Settings

### 1. Verificar Build Command

No serviço `dashboard` → **Settings** → **Build**:

- **Root Directory**: `dashboard` ✓
- **Dockerfile Path**: `Dockerfile` (não `dashboard/Dockerfile`)
- **Build Context**: Deve estar vazio ou `.`

### 2. Adicionar Build Arguments

No serviço `dashboard` → **Variables** → **RAW Editor**:

Adicione estas variáveis:

```bash
NEXT_PUBLIC_API_URL=https://giro-license-server-production.up.railway.app/api/v1
NODE_ENV=production
PORT=3000
```

**⚠️ IMPORTANTE**: Marque como **Build Variable** (não apenas Runtime).

### 3. Verificar Source Path

Settings → **Source**:
- Repository: `jhonslife/giro-license-server`
- Branch: `main`
- **Root Directory**: `dashboard` (confirme novamente)

### 4. Forçar Rebuild

1. **Deployments** tab
2. Click nos 3 pontinhos do último deploy
3. **"Redeploy"**

---

## 🔍 Debug: Verificar Logs Corretos

Após deploy, os logs devem mostrar:

### ✅ Logs Corretos (Next.js):
```
▲ Next.js 16.1.1
- Local:         http://localhost:3000
- Network:       http://0.0.0.0:3000
✓ Starting...
✓ Ready in XXms
```

### ❌ Logs Errados (Backend Rust):
```
🚀 Starting GIRO License Server
Error: environment variable not found
```

Se continuar vendo logs do Rust, significa que:
- Railway não está usando o ROOT_DIRECTORY
- Ou há 2 serviços com nomes trocados

---

## 🎯 TESTE RÁPIDO

Faça deploy no **Vercel** para confirmar que o código funciona:

```bash
cd /home/jhonslife/giro-license-server/dashboard
vercel --prod
```

Se funcionar no Vercel → Problema é config do Railway  
Se falhar no Vercel → Problema no código

---

## 📸 Próximo Passo

Me envie screenshot de:

1. Railway → Serviço `dashboard` → Settings → **Service Settings** (mostrando Root Directory)
2. Railway → Deployments → **Últimos logs** (primeiras 20 linhas)

Ou simplesmente rode:

```bash
cd dashboard && vercel --prod
```

E me diga se funcionou.
