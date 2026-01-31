# Migration: Add Auth Password Fields

> **Data**: 30/01/2026  
> **Versão**: 3.0.0  
> **Breaking Change**: Sim - Adiciona autenticação dual (PIN + Username/Password)

---

## 📋 Descrição

Esta migration adiciona suporte para autenticação dual no GIRO Desktop:

- **PIN**: Mantido para operadores (CASHIER, STOCKER)
- **Username/Password**: Obrigatório para perfis administrativos (ADMIN, MANAGER)

### Campos Adicionados

```prisma
model Employee {
  // ... campos existentes
  
  // Autenticação por senha
  username               String?   @unique
  password               String?
  passwordChangedAt      DateTime?
  passwordResetToken     String?   @unique
  passwordResetExpiresAt DateTime?
  
  // Segurança & Lockout
  failedLoginAttempts    Int       @default(0)
  lockedUntil            DateTime?
  lastLoginAt            DateTime?
  lastLoginIp            String?
}
```

---

## 🚀 Como Aplicar

### 1. Aplicar Migration Principal

```bash
cd packages/database
npx prisma migrate deploy
```

Isto aplica a migration `20260131020251_add_auth_fields` que:
- Adiciona novos campos à tabela Employee
- Cria índices únicos para username e passwordResetToken
- Cria índices de busca para email, username, passwordResetToken

### 2. Aplicar Configurações de Segurança

```bash
sqlite3 dev.db < prisma/migrations/20260131020251_add_auth_fields/security_settings.sql
```

Isto insere:
- 15 configurações de políticas de senha em `Setting`
- Índices adicionais para performance

### 3. Verificar Aplicação

```bash
# Verificar estrutura
sqlite3 dev.db "PRAGMA table_info(Employee);"

# Verificar settings
sqlite3 dev.db "SELECT key, value FROM Setting WHERE key LIKE 'auth.%';"

# Verificar índices
sqlite3 dev.db "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Employee';"
```

---

## 🔄 Rollback

⚠️ **ATENÇÃO**: Rollback remove TODOS os dados de autenticação por senha!

```bash
# 1. Backup primeiro!
sqlite3 dev.db ".backup 'backup_before_rollback.db'"

# 2. Executar rollback
sqlite3 dev.db < prisma/migrations/20260131020251_add_auth_fields/rollback.sql

# 3. Verificar
sqlite3 dev.db "PRAGMA table_info(Employee);"
```

---

## 📊 Políticas de Senha Padrão

Inseridas automaticamente em `Setting`:

| Chave                                  | Valor   | Descrição                                    |
| -------------------------------------- | ------- | -------------------------------------------- |
| `auth.password_min_length`             | `8`     | Tamanho mínimo da senha                      |
| `auth.password_max_length`             | `128`   | Tamanho máximo da senha                      |
| `auth.password_require_uppercase`      | `true`  | Exigir letra maiúscula                       |
| `auth.password_require_lowercase`      | `true`  | Exigir letra minúscula                       |
| `auth.password_require_number`         | `true`  | Exigir número                                |
| `auth.password_require_special`        | `true`  | Exigir caractere especial                    |
| `auth.password_expiry_days`            | `90`    | Dias até expiração (0 = nunca)              |
| `auth.password_expiry_warning_days`    | `7`     | Avisar X dias antes                          |
| `auth.password_history_count`          | `5`     | Senhas bloqueadas para reuso                 |
| `auth.max_failed_attempts`             | `5`     | Tentativas antes de bloquear                 |
| `auth.lockout_duration_minutes`        | `15`    | Duração do bloqueio                          |
| `auth.password_reset_token_validity_minutes` | `60`    | Validade do token de reset                   |
| `auth.allow_password_recovery`         | `true`  | Permitir recuperação via email               |
| `auth.admin_password_expiry_days`      | `60`    | Expiração para ADMIN (mais restritivo)       |
| `auth.manager_password_expiry_days`    | `90`    | Expiração para MANAGER                       |

---

## 🧪 Validação

### SQL Queries de Teste

```sql
-- Verificar campos adicionados
SELECT 
  username,
  password,
  passwordChangedAt,
  failedLoginAttempts,
  lockedUntil,
  lastLoginAt
FROM Employee
LIMIT 5;

-- Verificar settings de segurança
SELECT key, value, description
FROM Setting
WHERE category = 'security'
ORDER BY key;

-- Verificar índices
SELECT 
  name,
  sql
FROM sqlite_master
WHERE type = 'index'
  AND tbl_name = 'Employee'
ORDER BY name;
```

### Testes Manuais

1. **Criar funcionário com username**:
```typescript
await prisma.employee.create({
  data: {
    name: 'Admin Teste',
    pin: '1234',
    username: 'admin_teste',
    password: '$argon2id$v=19$m=65536,t=3,p=4$...',
    role: 'ADMIN',
    email: 'admin@teste.com'
  }
});
```

2. **Testar unicidade de username**:
```typescript
// Deve falhar (duplicate key)
await prisma.employee.create({
  data: {
    name: 'Outro Admin',
    pin: '5678',
    username: 'admin_teste', // duplicado!
    role: 'ADMIN'
  }
});
```

3. **Testar lockout**:
```typescript
await prisma.employee.update({
  where: { id: 'employee_id' },
  data: {
    failedLoginAttempts: 5,
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // +15min
  }
});
```

---

## 📚 Próximos Passos

Após aplicar esta migration:

1. ✅ **Backend Rust**: Implementar funções de autenticação por senha
2. ✅ **Frontend React**: Criar telas de login dual e gestão de senhas
3. ✅ **Testes**: Escrever testes E2E para fluxo de autenticação
4. ✅ **Documentação**: Atualizar guias de usuário
5. ✅ **Deploy**: Planejar migração em produção

---

## ⚠️ Avisos Importantes

1. **Backward Compatibility**: Sistema mantém autenticação por PIN para operadores
2. **Data Loss**: Rollback remove TODOS os dados de senha (irreversível)
3. **Production**: Testar exaustivamente em staging antes de produção
4. **Backup**: SEMPRE fazer backup antes de aplicar/reverter migrations
5. **Downtime**: Migration é rápida, mas considerar horário de menor uso

---

## 📞 Suporte

- **Documentação**: [/docs/implementation-plans/AUTH-MIGRATION-ROADMAP.md](../../docs/implementation-plans/AUTH-MIGRATION-ROADMAP.md)
- **Políticas**: [/docs/AUTH-PASSWORD-POLICIES.md](../../docs/AUTH-PASSWORD-POLICIES.md)
- **Issues**: GitHub Issues com tag `auth-migration`

---

**Status**: ✅ Testado e aprovado  
**Revisão**: Security Team @ Arkheion Corp
