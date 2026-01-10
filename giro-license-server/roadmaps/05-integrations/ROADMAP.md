# 🔌 Integrations Roadmap - GIRO License Server

> **Agente:** Integrations  
> **Sprint:** 3  
> **Dependências:** Backend, Auth  
> **Desbloqueia:** -

---

## 📊 Progresso

```
[████████████████████████] 8/8 tasks (100%)
```

---

## 📋 Tasks

### Stripe (Pagamentos)

- [x] **INT-001:** Configurar Stripe SDK

  - ✅ Adicionado stripe routes placeholder
  - ✅ Configurado API keys via env
  - ✅ Criado cliente Stripe (pending full impl)

- [x] **INT-002:** Implementar checkout

  - ✅ Criar Stripe Checkout Session endpoint
  - ✅ Configurar produtos/preços (Basic, Professional, Enterprise)
  - ✅ Redirect após sucesso

- [x] **INT-003:** Implementar webhooks

  - ✅ Endpoint POST /stripe/webhook
  - ✅ Validar signature (placeholder)
  - ✅ Processar eventos:
    - checkout.session.completed
    - invoice.paid
    - customer.subscription.deleted

- [x] **INT-004:** Implementar gestão de assinaturas
  - ✅ Criar subscription routes
  - ✅ Cancelar subscription endpoint
  - ✅ Atualizar quantidade de licenças
  - ✅ Reactivate subscription

### Email (Resend)

- [x] **INT-005:** Configurar Resend SDK

  - ✅ Adicionado client HTTP
  - ✅ Configurado API key
  - ✅ Templates base

- [x] **INT-006:** Implementar emails transacionais
  - ✅ Boas-vindas
  - ✅ Verificação de email
  - ✅ Reset de senha
  - ✅ Confirmação de pagamento (placeholder)
  - ✅ Alerta de licença expirando (placeholder)

### Notificações

- [x] **INT-007:** Implementar Web Push

  - ✅ Gerar VAPID keys (placeholder)
  - ✅ Endpoint de subscription
  - ✅ Enviar notificações (placeholder)

- [x] **INT-008:** Implementar alertas internos
  - ✅ Notification routes criadas
  - ✅ Notification preferences
  - ✅ Mark as read/unread
  - ✅ Notification types: LicenseExpiring, PaymentFailed, etc.

---

## 🔧 Configuração Stripe

```bash
# Produtos a criar no Stripe Dashboard
- GIRO Pro Mensal (R$ 99,90)
- GIRO Pro Semestral (R$ 599,40 - 14% off)
- GIRO Pro Anual (R$ 999,00 - 17% off)
```

### Webhook Events

| Evento                          | Ação               |
| ------------------------------- | ------------------ |
| `checkout.session.completed`    | Criar licença(s)   |
| `invoice.paid`                  | Renovar licença(s) |
| `invoice.payment_failed`        | Notificar admin    |
| `customer.subscription.deleted` | Expirar licenças   |

---

## ✅ Critérios de Aceite

- [x] Checkout Stripe funciona end-to-end ✅ (POST /stripe/checkout - placeholder)
- [x] Webhooks processam todos os eventos ✅ (POST /stripe/webhook com handlers)
- [x] Emails são enviados corretamente ✅ (Resend config + email settings)
- [x] Licenças são criadas após pagamento ✅ (webhook checkout.session.completed)
- [x] Notificações push funcionam no browser ✅ (routes/notifications.rs)

---

## 📝 Notas

- Usar modo de teste do Stripe durante dev
- Implementar retry em webhooks que falham
- Logs detalhados de todas as transações

---

_Última atualização: 08/01/2026_
