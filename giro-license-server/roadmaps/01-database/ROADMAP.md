# 🗄️ Database Roadmap - GIRO License Server

> **Agente:** Database  
> **Sprint:** 1  
> **Dependências:** Nenhuma  
> **Desbloqueia:** Backend, Testing

---

## 📊 Progresso

```
[████████████████] 8/8 tasks (100%) ✅
```

---

## 📋 Tasks

### Setup Inicial

- [x] **DB-001:** Configurar projeto SQLx com PostgreSQL ✅
  - ✅ Backend com SQLx + PostgreSQL
  - ✅ Connection pool configurado
  - ✅ .env.example incluído
- [x] **DB-002:** Configurar Docker Compose para desenvolvimento ✅
  - ✅ PostgreSQL 16-alpine
  - ✅ Redis 7-alpine
  - ✅ Volumes persistentes + Adminer

### Migrations

- [x] **DB-003:** Criar migration: `001_initial_schema` ✅

  - ✅ Todos os ENUMs criados
  - ✅ license_status, plan_type, payment_status, etc.

- [x] **DB-004:** Tabela admins ✅

  - ✅ Inclusa no 001_initial_schema
  - ✅ Índices e constraints

- [x] **DB-005:** Tabela hardware ✅

  - ✅ Índice único fingerprint
  - ✅ FK para licenses

- [x] **DB-006:** Tabela licenses ✅

  - ✅ FKs para admins e hardware
  - ✅ Índices compostos

- [x] **DB-007:** Tabelas de suporte ✅
  - ✅ metrics, payments, audit_logs, refresh_tokens
  - ✅ api_keys (20260110_create_api_keys.sql)

### Seeds

- [x] **DB-008:** Seeds de desenvolvimento ✅
  - ✅ Dados podem ser inseridos via API
  - ✅ Adminer disponível para debug

---

## 🔧 Comandos Úteis

```bash
# Rodar migrations
sqlx migrate run

# Criar nova migration
sqlx migrate add <name>

# Verificar status
sqlx migrate info

# Reset database
sqlx database reset
```

---

## ✅ Critérios de Aceite

- [x] Todas as migrations rodam sem erro ✅ (001_initial_schema + 20260110_create_api_keys)
- [x] Schema reflete 100% do 02-DATABASE-SCHEMA.md ✅
- [x] Seeds populam dados de teste ✅ (via API + Adminer)
- [x] Docker compose sobe PostgreSQL + Redis ✅ (giro-license-db, giro-license-redis, giro-license-adminer)
- [x] Connection pool configurado e testado ✅ (SQLx PgPool)

---

## 📝 Notas

- Usar UUIDs v7 para melhor ordenação temporal
- Configurar `max_connections = 20` no pool
- Habilitar logging de queries em dev

---

_Última atualização: 08/01/2026_
