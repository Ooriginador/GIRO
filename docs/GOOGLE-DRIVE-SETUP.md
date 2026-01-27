# 🔧 Guia de Configuração: Google Drive OAuth para Backup

Este guia mostra como configurar o Google Drive para que os usuários do GIRO possam fazer backup dos dados na nuvem.

---

## 📋 Pré-requisitos

- Conta Google com acesso ao [Google Cloud Console](https://console.cloud.google.com)
- License Server rodando (Railway ou local)
- Licença GIRO ativa

---

## Passo 1: Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com
2. No topo, clique em **"Selecionar projeto"** → **"Novo Projeto"**
3. Preencha:
   - **Nome do projeto**: `GIRO Backup`
   - **Organização**: (deixe em branco ou selecione sua org)
4. Clique **"Criar"**
5. Aguarde a criação e selecione o projeto

---

## Passo 2: Habilitar Google Drive API

1. No menu lateral, vá em **"APIs e serviços"** → **"Biblioteca"**
2. Pesquise: `Google Drive API`
3. Clique em **"Google Drive API"**
4. Clique **"ATIVAR"**

---

## Passo 3: Configurar Tela de Consentimento OAuth

1. Vá em **"APIs e serviços"** → **"Tela de consentimento OAuth"**
2. Selecione **"Externo"** (para qualquer conta Google)
3. Clique **"CRIAR"**
4. Preencha as informações:

   **Informações do app:**

   - Nome do app: `GIRO Backup`
   - E-mail de suporte: `seu-email@gmail.com`
   - Logo: (opcional - pode usar logo do GIRO)

   **Domínio do app:**

   - Página inicial: `https://giro.arkheion.com.br` (ou seu domínio)
   - Política de privacidade: `https://giro.arkheion.com.br/privacidade`
   - Termos de serviço: `https://giro.arkheion.com.br/termos`

   **Domínios autorizados:**

   - Adicione: `arkheion.com.br` (ou seu domínio)
   - Adicione: `railway.app` (se usar Railway)

   **Informações de contato do desenvolvedor:**

   - E-mail: `seu-email@gmail.com`

5. Clique **"SALVAR E CONTINUAR"**

---

## Passo 4: Adicionar Escopos

1. Na seção "Escopos", clique **"ADICIONAR OU REMOVER ESCOPOS"**
2. Procure e selecione:
   - `https://www.googleapis.com/auth/drive.file` (Acessar apenas arquivos criados pelo app)
   - `https://www.googleapis.com/auth/userinfo.email` (Ver e-mail do usuário)
3. Clique **"ATUALIZAR"**
4. Clique **"SALVAR E CONTINUAR"**

---

## Passo 5: Adicionar Usuários de Teste (Opcional)

> ⚠️ Enquanto o app não estiver publicado, apenas usuários de teste podem usar.

1. Clique **"ADD USERS"**
2. Adicione os e-mails dos testadores
3. Clique **"SALVAR E CONTINUAR"**

---

## Passo 6: Criar Credenciais OAuth 2.0

1. Vá em **"APIs e serviços"** → **"Credenciais"**
2. Clique **"+ CRIAR CREDENCIAIS"** → **"ID do cliente OAuth"**
3. Selecione **"Aplicativo da Web"**
4. Preencha:

   **Nome:** `GIRO License Server`

   **Origens JavaScript autorizadas:**

   ```
   https://giro-license-server-production.up.railway.app
   http://localhost:3000
   ```

   **URIs de redirecionamento autorizados:**

   ```
   https://giro-license-server-production.up.railway.app/api/v1/oauth/google/callback
   http://localhost:3000/api/v1/oauth/google/callback
   ```

5. Clique **"CRIAR"**
6. **COPIE E SALVE** o:
   - **Client ID**: `xxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxx`

---

## Passo 7: Configurar Variáveis de Ambiente

### No Railway (Produção):

1. Acesse seu projeto no [Railway](https://railway.app)
2. Selecione o serviço do License Server
3. Vá em **"Variables"**
4. Adicione:

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://giro-license-server-production.up.railway.app/api/v1/oauth/google/callback
```

5. Clique **"Deploy"** para reiniciar o serviço

### Local (Desenvolvimento):

Crie ou edite o arquivo `.env` em `giro-license-server/backend/`:

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/oauth/google/callback
```

---

## Passo 8: Testar a Conexão

### No GIRO Desktop:

1. Abra o GIRO Desktop
2. Vá em **Configurações** → **Backup**
3. Clique em **"Conectar Google Drive"**
4. O navegador abrirá a tela de login do Google
5. Faça login e clique **"Permitir"**
6. Volte ao GIRO e clique **"Verificar Conexão"**
7. Deve aparecer seu e-mail conectado ✅

### Via API (Debug):

```bash
# Verificar status da conexão
curl -X GET "https://giro-license-server-production.up.railway.app/api/v1/oauth/google/status" \
  -H "X-Api-Key: SUA_CHAVE_DE_LICENÇA"
```

---

## 🚨 Publicar o App (Produção)

Para permitir que qualquer usuário use (não apenas testadores):

1. Volte em **"Tela de consentimento OAuth"**
2. Clique **"PUBLICAR APLICATIVO"**
3. Confirme a publicação

> ⚠️ Se você solicitar escopos sensíveis, o Google pode exigir verificação. O escopo `drive.file` é considerado seguro.

---

## 📊 Arquitetura do Fluxo

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   GIRO Desktop   │────▶│  License Server  │────▶│   Google Drive   │
│                  │     │                  │     │                  │
│ 1. Clica Connect │     │ 2. Gera Auth URL │     │ 4. Retorna token │
│ 3. Abre browser  │────▶│ 5. Salva tokens  │◀────│                  │
│ 6. Upload backup │────▶│ 7. Envia p/ Drive│────▶│ 8. Salva arquivo │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## ❓ Troubleshooting

### "Error 400: redirect_uri_mismatch"

- Verifique se o `GOOGLE_REDIRECT_URI` está **exatamente** igual ao configurado nas credenciais OAuth

### "Error 403: access_denied"

- O usuário não está na lista de testadores (app não publicado)
- Adicione o e-mail em "Usuários de teste" ou publique o app

### "Token expired"

- O License Server renova tokens automaticamente
- Se persistir, peça ao usuário reconectar

### "Drive not configured" no servidor

- Verifique se as 3 variáveis estão configuradas no Railway
- Reinicie o serviço após adicionar variáveis

---

## ✅ Checklist Final

- [ ] Projeto criado no Google Cloud
- [ ] Google Drive API habilitada
- [ ] Tela de consentimento configurada
- [ ] Credenciais OAuth 2.0 criadas
- [ ] Variáveis de ambiente configuradas no Railway
- [ ] Serviço reiniciado
- [ ] Teste de conexão funcionando

---

_Guia criado em 27/01/2026 - GIRO v2.0_
