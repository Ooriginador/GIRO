# 📧 GIRO - Sistema de Email

Documentação completa do sistema de email do GIRO usando Resend.

---

## 🌐 Domínio Configurado

**Domínio**: `arkheion-tiktrend.com.br`  
**Região**: São Paulo (sa-east-1)  
**Status**: ✅ Verificado

### DNS Records Configurados

| Tipo | Nome               | Conteúdo                              | TTL  | Status      |
| ---- | ------------------ | ------------------------------------- | ---- | ----------- |
| TXT  | resend.\_domainkey | p=MIGfMA0GCS... (DKIM)                | Auto | ✅ Verified |
| MX   | send               | feedback-smtp.sa-east-1.amazonses.com | 60   | ✅ Verified |
| TXT  | send               | v=spf1 include:amazonses.com ~all     | 60   | ✅ Verified |
| MX   | @                  | inbound-smtp.sa-east-1.amazonaws.com  | 60   | ✅ Verified |

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx      # API Key do Resend
EMAIL_FROM=noreply@arkheion-tiktrend.com.br
EMAIL_FROM_NAME=GIRO Sistema
```

### Railway (Produção)

Adicione no Railway → Backend Service → Variables:

| Variável          | Valor                              |
| ----------------- | ---------------------------------- |
| `RESEND_API_KEY`  | Sua API Key do Resend              |
| `EMAIL_FROM`      | `noreply@arkheion-tiktrend.com.br` |
| `EMAIL_FROM_NAME` | `GIRO Sistema`                     |

### Obter API Key do Resend

1. Acesse [resend.com/api-keys](https://resend.com/api-keys)
2. Clique em **Create API Key**
3. Nome: `giro-production`
4. Permission: **Full access**
5. Copie e configure como `RESEND_API_KEY`

---

## 📨 Templates de Email Disponíveis

### 1. Boas-vindas (`send_welcome`)

- **Quando**: Usuário cria conta no dashboard
- **Assunto**: "Bem-vindo ao GIRO!"
- **Cor**: Verde (#10b981)

### 2. Redefinição de Senha (`send_password_reset`)

- **Quando**: Usuário solicita reset
- **Assunto**: "Redefinir Senha - GIRO"
- **Cor**: Roxo (#667eea)
- **Expira**: 1 hora

### 3. Licença Emitida (`send_license_issued`)

- **Quando**: Pagamento confirmado
- **Assunto**: "Sua Licença GIRO Chegou! 🎫"
- **Cor**: Azul (#3b82f6)
- **Contém**: Chave de licença formatada

### 4. Licença Expirando (`send_license_expiring`)

- **Quando**: Job automático detecta expiração próxima
- **Assunto**: "⚠️ Sua licença GIRO expira em X dias"
- **Cor**: Amarelo (#f59e0b)

---

## 🧪 Testar Envio de Email

### Via API (curl)

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_xxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "GIRO Sistema <noreply@arkheion-tiktrend.com.br>",
    "to": ["seu@email.com"],
    "subject": "Teste de Email GIRO",
    "html": "<h1>Email de teste</h1><p>Sistema funcionando!</p>"
  }'
```

---

## 📁 Estrutura de Arquivos

```
giro-license-server/backend/src/
├── config/
│   └── settings.rs          # EmailSettings struct
├── services/
│   └── email_service.rs     # EmailService + Templates
└── state.rs                  # Inicialização do serviço
```

---

## 📊 Endereços de Email Sugeridos

| Endereço                            | Uso                   |
| ----------------------------------- | --------------------- |
| `noreply@arkheion-tiktrend.com.br`  | Emails automáticos    |
| `suporte@arkheion-tiktrend.com.br`  | Suporte ao cliente    |
| `licencas@arkheion-tiktrend.com.br` | Licenças e pagamentos |
| `vendas@arkheion-tiktrend.com.br`   | Comercial             |

---

## ✅ Checklist de Configuração

- [x] Domínio verificado no Resend
- [x] DKIM configurado
- [x] SPF configurado
- [x] MX records configurados
- [ ] API Key gerada e configurada no Railway
- [ ] Teste de envio realizado
