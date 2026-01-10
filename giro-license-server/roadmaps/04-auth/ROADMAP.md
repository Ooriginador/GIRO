# 🔐 Auth Roadmap - GIRO License Server

> **Agente:** Auth & Security  
> **Sprint:** 2  
> **Dependências:** Backend  
> **Desbloqueia:** Dashboard, Integrations

---

## 📊 Progresso

```
[████████████████████] 10/10 tasks (100%) ✅
```

---

## 📋 Tasks

### Autenticação Admin (Dashboard)

- [x] **AUTH-001:** Implementar registro de admin ✅

  - ✅ Hash senha com Argon2
  - ✅ Validar email único
  - ✅ Email service configurado (Resend placeholder)

- [x] **AUTH-002:** Implementar login ✅

  - ✅ Verificar credenciais
  - ✅ Gerar JWT access token
  - ✅ Gerar refresh token
  - ✅ Registrar em audit_logs

- [x] **AUTH-003:** Implementar refresh token ✅

  - ✅ Validar refresh token
  - ✅ Gerar novo access token
  - ✅ Rotação de refresh token

- [x] **AUTH-004:** Implementar logout ✅

  - ✅ Invalidar refresh token
  - ✅ Limpar sessão no Redis

- [x] **AUTH-005:** Implementar reset de senha ✅
  - ✅ forgot-password (POST /auth/forgot-password)
  - ✅ reset-password (POST /auth/reset-password)
  - ✅ change-password (POST /auth/change-password)
  - ✅ Token temporário Redis (1h TTL)

### Autenticação Desktop (API Key)

- [x] **AUTH-006:** Implementar middleware API Key ✅

  - ✅ Validar X-API-Key header
  - ✅ Associar licença ao request
  - ✅ Rate limiting por API key

- [x] **AUTH-007:** Implementar validação de licença ✅
  - ✅ Verificar license_key
  - ✅ Verificar hardware_id match
  - ✅ Verificar status = active
  - ✅ Verificar não expirada

### Segurança

- [x] **AUTH-008:** Implementar rate limiting ✅

  - ✅ Limite por IP (auth endpoints)
  - ✅ Limite por API key (validation)
  - ✅ Redis token bucket

- [x] **AUTH-009:** Implementar detecção de fraude ✅

  - ✅ Detectar time drift (> 5 min)
  - ✅ Detectar hardware_id conflict
  - ✅ Alertar via audit log

- [x] **AUTH-010:** Implementar audit logging ✅
  - ✅ AuditRepository implementado
  - ✅ Log de ações sensíveis
  - ✅ IP address e user agent
  - ✅ Detalhes em JSONB

---

## 🔧 Estrutura JWT

```json
{
  "sub": "admin-uuid",
  "email": "admin@example.com",
  "type": "access",
  "exp": 1736467200,
  "iat": 1736380800
}
```

### Configuração de Tokens

| Token         | Duração | Storage         |
| ------------- | ------- | --------------- |
| Access Token  | 24h     | Client (memory) |
| Refresh Token | 30d     | DB + Cookie     |
| Reset Token   | 1h      | Redis           |

---

## ✅ Critérios de Aceite

- [x] Login retorna tokens válidos ✅ (JWT access + refresh token)
- [x] Refresh token funciona ✅ (POST /auth/refresh)
- [x] API key valida licenças corretamente ✅ (X-API-Key middleware)
- [x] Rate limiting bloqueia após exceder limite ✅ (Redis token bucket)
- [x] Audit logs registram todas as ações ✅ (AuditRepository.create())
- [x] Time drift detectado e rejeitado ✅ (verificação em validation)

---

## 📝 Notas

- Usar RS256 para JWT em produção
- Refresh tokens devem ser one-time-use
- Implementar blacklist de tokens revogados

---

_Última atualização: 08/01/2026_
