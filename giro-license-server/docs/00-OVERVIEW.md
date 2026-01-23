# 🔐 GIRO License Server - Visão Geral

> **Versão:** 1.0.0  
> **Status:** Planejamento  
> **Última Atualização:** 8 de Janeiro de 2026

---

## 🎯 O Que É

O **GIRO License Server** é o serviço central de licenciamento do ecossistema GIRO. Responsável por:

- Validar licenças por Hardware ID
- Gerenciar ativações e transferências
- Sincronizar métricas do desktop para o dashboard
- Processar pagamentos e renovações
- Fornecer o painel web do administrador

### Proposta de Valor

> _"Licenciamento robusto, anti-fraude e transparente para o comerciante"_

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GIRO LICENSE SERVER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         API LAYER                                 │  │
│  │                                                                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │  License   │  │  Hardware  │  │   Sync     │  │  Payment   │  │  │
│  │  │    API     │  │    API     │  │    API     │  │    API     │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  │                                                                   │  │
│  │  Routes: /api/v1/licenses, /api/v1/hardware, /api/v1/sync, etc   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       SERVICE LAYER                               │  │
│  │                                                                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │ License    │  │ Hardware   │  │ Metrics    │  │ Billing    │  │  │
│  │  │ Service    │  │ Service    │  │ Service    │  │ Service    │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  │                                                                   │  │
│  │  Tech: Rust + Axum + Tokio                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       DATA LAYER                                  │  │
│  │                                                                   │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                │  │
│  │  │     PostgreSQL      │  │       Redis         │                │  │
│  │  │                     │  │                     │                │  │
│  │  │  • Licenses         │  │  • Sessions         │                │  │
│  │  │  • Admins           │  │  • Rate Limiting    │                │  │
│  │  │  • Hardware IDs     │  │  • Cache            │                │  │
│  │  │  • Metrics          │  │                     │                │  │
│  │  │  • Payments         │  │                     │                │  │
│  │  └─────────────────────┘  └─────────────────────┘                │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           DASHBOARD                                     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    NEXT.JS WEB APP (PWA)                          │  │
│  │                                                                   │  │
│  │  • Login Admin          • Gerenciar Licenças                     │  │
│  │  • Dashboard Métricas   • Transferir Máquina                     │  │
│  │  • Alertas Push         • Histórico Pagamentos                   │  │
│  │  • Configurações        • Suporte                                │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológica

### Backend (API)

| Tecnologia     | Versão | Justificativa                                    |
| -------------- | ------ | ------------------------------------------------ |
| **Rust**       | 1.75+  | Performance, segurança, consistência com Desktop |
| **Axum**       | 0.7+   | Framework web async moderno                      |
| **Tokio**      | 1.35+  | Runtime async de alta performance                |
| **SQLx**       | 0.7+   | Queries type-safe                                |
| **PostgreSQL** | 16+    | Banco robusto para produção                      |
| **Redis**      | 7+     | Cache e sessões                                  |

### Dashboard (Frontend)

| Tecnologia      | Versão | Justificativa            |
| --------------- | ------ | ------------------------ |
| **Next.js**     | 14+    | SSR, RSC, excelente DX   |
| **TypeScript**  | 5.4+   | Type safety              |
| **TailwindCSS** | 3.4+   | Consistência com Desktop |
| **Shadcn/UI**   | Latest | Mesmo design system      |

### Infraestrutura

| Tecnologia     | Uso        | Justificativa                       |
| -------------- | ---------- | ----------------------------------- |
| **Railway**    | Hosting    | Deploy simples, PostgreSQL incluído |
| **Cloudflare** | CDN + DNS  | Performance global                  |
| **Resend**     | Emails     | API simples para transacionais      |
| **Stripe**     | Pagamentos | Padrão de mercado                   |

---

## 📦 Funcionalidades Core

### 1. Gestão de Licenças

| Feature            | Descrição            | Prioridade |
| ------------------ | -------------------- | ---------- |
| Criar Licença      | Gerar chave única    | P0         |
| Ativar Licença     | Vincular Hardware ID | P0         |
| Validar Licença    | Check periódico      | P0         |
| Transferir Licença | Reset Hardware ID    | P1         |
| Revogar Licença    | Desativar permanente | P1         |
| Listar Licenças    | Por admin            | P0         |

### 2. Hardware Management

| Feature               | Descrição               | Prioridade |
| --------------------- | ----------------------- | ---------- |
| Registrar Hardware    | Salvar fingerprint      | P0         |
| Detectar Conflito     | Mesmo HW, outra licença | P0         |
| Histórico de Máquinas | Log de ativações        | P1         |
| Limpar Hardware       | Permitir reativação     | P1         |

### 3. Sync de Métricas

| Feature             | Descrição         | Prioridade |
| ------------------- | ----------------- | ---------- |
| Receber Métricas    | Endpoint de sync  | P1         |
| Agregar Dados       | Processar totais  | P1         |
| Armazenar Histórico | 30 dias rolling   | P1         |
| Servir Dashboard    | API para frontend | P1         |

### 4. Billing

| Feature              | Descrição           | Prioridade |
| -------------------- | ------------------- | ---------- |
| Criar Checkout       | Stripe Session      | P1         |
| Webhook de Pagamento | Confirmar pagamento | P1         |
| Renovação Automática | Subscription        | P2         |
| Faturas/Recibos      | PDF automático      | P2         |

### 5. Dashboard Admin

| Feature            | Descrição       | Prioridade |
| ------------------ | --------------- | ---------- |
| Login/Cadastro     | Email + Senha   | P0         |
| Ver Licenças       | Lista e status  | P0         |
| Ver Métricas       | Dashboard cards | P1         |
| Gerenciar Máquinas | Transferir      | P1         |
| Alertas Push       | Web Push API    | P2         |

---

## 🔒 Segurança

### Autenticação

- JWT com refresh tokens
- 2FA opcional (TOTP)
- Rate limiting por IP

### Comunicação

- HTTPS obrigatório
- Certificados automáticos (Let's Encrypt)
- API Keys para Desktop

### Anti-Fraude

- Validação de timestamp do servidor
- Detecção de Hardware ID duplicado
- Logs de auditoria completos

---

## 📁 Estrutura do Projeto

```
giro-license-server/
├── docs/                    # Documentação
│   ├── 00-OVERVIEW.md
│   ├── 01-ARQUITETURA.md
│   ├── 02-DATABASE-SCHEMA.md
│   └── 03-API-REFERENCE.md
├── backend/                 # API Rust
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs
│   │   ├── config.rs
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── middleware/
│   └── migrations/
├── dashboard/               # Frontend Next.js
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── public/
└── README.md
```

---

## 🚀 Endpoints Principais

### Licenciamento

```
POST   /api/v1/licenses              # Criar licença
GET    /api/v1/licenses              # Listar (admin)
GET    /api/v1/licenses/:key         # Detalhes
POST   /api/v1/licenses/:key/activate # Ativar + Hardware
POST   /api/v1/licenses/:key/validate # Validar
POST   /api/v1/licenses/:key/transfer # Transferir
DELETE /api/v1/licenses/:key         # Revogar
```

### Hardware

```
POST   /api/v1/hardware/register     # Registrar fingerprint
GET    /api/v1/hardware/:id          # Info da máquina
DELETE /api/v1/hardware/:id          # Limpar vinculo
```

### Sync

```
POST   /api/v1/sync/metrics          # Enviar métricas
GET    /api/v1/sync/time             # Hora do servidor
```

### Admin

```
POST   /api/v1/auth/register         # Criar conta
POST   /api/v1/auth/login            # Login
GET    /api/v1/admin/dashboard       # Métricas agregadas
GET    /api/v1/admin/alerts          # Alertas
```

---

## 📅 Roadmap

### Sprint 1: Core (2 semanas)

- [ ] Setup projeto Rust + Axum
- [ ] Modelo de dados (PostgreSQL)
- [ ] CRUD de licenças
- [ ] Ativação com Hardware ID

### Sprint 2: Validação (2 semanas)

- [ ] Endpoint de validação
- [ ] Detecção de conflitos
- [ ] Grace period offline
- [ ] Logs de auditoria

### Sprint 3: Dashboard (2 semanas)

- [ ] Setup Next.js
- [ ] Login/Registro
- [ ] Listagem de licenças
- [ ] Transferência de máquina

### Sprint 4: Billing (2 semanas)

- [ ] Integração Stripe
- [ ] Checkout
- [ ] Webhooks
- [ ] Renovação

---

_Este documento define o escopo do servidor de licenças GIRO._
