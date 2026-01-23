# 📚 GIRO License Server - Documentação Técnica

> **Versão:** 1.0.0  
> **Status:** ✅ Produção  
> **Última Atualização:** 11 de Janeiro de 2026

---

## 📋 Índice de Documentação

Esta documentação foi gerada após auditoria completa do código em produção.

### 🏗️ Arquitetura e Design

1. **[01-ARCHITECTURE.md](01-ARCHITECTURE.md)** - Arquitetura completa do sistema

   - Stack tecnológico
   - Estrutura de diretórios
   - Camadas da aplicação
   - Fluxos de dados

2. **[02-DATABASE.md](02-DATABASE.md)** - Modelagem de dados
   - Schema completo
   - Relacionamentos
   - Índices e otimizações
   - Migrations

### 🔌 API e Integrações

3. **[03-API-ENDPOINTS.md](03-API-ENDPOINTS.md)** - Referência completa da API

   - Autenticação (JWT)
   - Licenças (CRUD + Ativação/Validação)
   - Hardware Management
   - Métricas e Analytics
   - Pagamentos (Stripe)
   - API Keys

4. **[04-AUTHENTICATION.md](04-AUTHENTICATION.md)** - Sistema de autenticação
   - JWT (Access + Refresh Tokens)
   - Password Hashing (Argon2)
   - Rate Limiting
   - Token Blacklist
   - Auditoria

### 🔒 Segurança e Compliance

5. **[05-SECURITY-AUDIT.md](05-SECURITY-AUDIT.md)** - Auditoria de segurança

   - Análise de vulnerabilidades
   - Boas práticas implementadas
   - Recomendações
   - Compliance checklist

6. **[06-HARDWARE-BINDING.md](06-HARDWARE-BINDING.md)** - Vinculação de hardware
   - Sistema anti-pirataria
   - Fingerprinting
   - Validação periódica
   - Detecção de manipulação

### 🚀 Deploy e Operações

7. **[07-DEPLOYMENT.md](07-DEPLOYMENT.md)** - Guia de deploy

   - Ambiente Railway
   - Variáveis de ambiente
   - CI/CD
   - Monitoramento

8. **[08-MONITORING.md](08-MONITORING.md)** - Observabilidade
   - Health checks
   - Métricas Prometheus
   - Logs estruturados
   - Alertas

### 💻 Desenvolvimento

9. **[09-DEVELOPMENT.md](09-DEVELOPMENT.md)** - Setup de desenvolvimento

   - Pré-requisitos
   - Configuração local
   - Testes
   - Contribuição

10. **[10-DASHBOARD.md](10-DASHBOARD.md)** - Frontend (Next.js)
    - Estrutura
    - Componentes
    - Estado e API
    - Autenticação

---

## 🎯 Visão Geral do Sistema

O **GIRO License Server** é o backend central para gestão de licenças do sistema GIRO Desktop (PDV).

### Principais Funcionalidades

✅ **Autenticação JWT** com refresh tokens e blacklist  
✅ **Licenciamento** - Criação, ativação, validação e transferência  
✅ **Hardware Binding** - Vinculação SHA-256 anti-pirataria  
✅ **Rate Limiting** - Proteção Redis contra abuso  
✅ **Métricas** - Sync de dados do Desktop para Dashboard  
✅ **Pagamentos** - Integração Stripe (webhooks)  
✅ **API Keys** - Autenticação para Desktop  
✅ **Auditoria** - Logs completos de todas as ações

### Tecnologias Principais

- **Backend**: Rust 1.85 + Axum 0.7 + SQLx
- **Database**: PostgreSQL 16 + Redis 7
- **Deploy**: Railway (Produção)
- **Frontend**: Next.js 14 + TypeScript + TailwindCSS

### Endpoints Ativos

```
Base URL: https://giro-license-server-production.up.railway.app/api/v1
```

- `/health` - Health check
- `/auth/*` - Autenticação (register, login, refresh, logout)
- `/licenses/*` - CRUD + Ativação/Validação
- `/hardware/*` - Gestão de máquinas
- `/metrics/*` - Dashboard e sync
- `/api-keys/*` - Gestão de API Keys
- `/stripe/*` - Checkout e webhooks
- `/profile/*` - Gerenciamento de perfil

---

## 📊 Estatísticas do Projeto

| Métrica                 | Valor              |
| ----------------------- | ------------------ |
| Linhas de Código (Rust) | ~7.300             |
| Endpoints HTTP          | 40+                |
| Tabelas Database        | 8                  |
| Modelos Rust            | 10                 |
| Middlewares             | 3                  |
| Services                | 6                  |
| Migrations              | 2                  |
| Testes                  | Em desenvolvimento |

---

## 🔐 Segurança Implementada

- ✅ Argon2 para hash de senhas
- ✅ JWT com expiração curta (24h)
- ✅ Refresh tokens com rotação
- ✅ Token blacklist em Redis
- ✅ Rate limiting (100 req/min geral, 10 req/min auth)
- ✅ CORS configurado
- ✅ HTTPS obrigatório
- ✅ SQL Injection protection (SQLx type-safe)
- ✅ Input validation (validator crate)
- ✅ Audit logs completos

---

## 📞 Contato

- **Projeto**: GIRO License Server
- **Organização**: Arkheion Corp
- **Repositório**: Privado (GitHub)
