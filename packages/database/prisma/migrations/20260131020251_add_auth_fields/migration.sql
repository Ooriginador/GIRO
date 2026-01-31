-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: add_auth_fields
-- ════════════════════════════════════════════════════════════════════════════
-- Adiciona campos de autenticação dual (PIN + Username/Password)
-- Implementa políticas de senha, lockout e recuperação
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Adicionar campo notes em Product (não relacionado, veio junto)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE "Product" ADD COLUMN "notes" TEXT;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Recriar tabela Employee com novos campos de autenticação
-- ════════════════════════════════════════════════════════════════════════════
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "pin" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "passwordChangedAt" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- Migrar dados existentes (password antiga → null, será configurada depois)
INSERT INTO "new_Employee" (
    "cpf", "createdAt", "deletedAt", "email", "id", "isActive", 
    "name", "phone", "pin", "role", "updatedAt"
) 
SELECT 
    "cpf", "createdAt", "deletedAt", "email", "id", "isActive", 
    "name", "phone", "pin", "role", "updatedAt" 
FROM "Employee";

DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Criar índices para performance e unicidade
-- ════════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");
CREATE UNIQUE INDEX "Employee_username_key" ON "Employee"("username");
CREATE UNIQUE INDEX "Employee_passwordResetToken_key" ON "Employee"("passwordResetToken");

CREATE INDEX "Employee_cpf_idx" ON "Employee"("cpf");
CREATE INDEX "Employee_pin_idx" ON "Employee"("pin");
CREATE INDEX "Employee_username_idx" ON "Employee"("username");
CREATE INDEX "Employee_email_idx" ON "Employee"("email");
CREATE INDEX "Employee_passwordResetToken_idx" ON "Employee"("passwordResetToken");
CREATE INDEX "Employee_role_idx" ON "Employee"("role");
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Inserir configurações de política de senha
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO "Setting" ("id", "key", "value", "category", "description", "createdAt", "updatedAt")
VALUES
  -- Complexidade de senha
  (lower(hex(randomblob(16))), 'auth.password_min_length', '8', 'security', 'Tamanho mínimo da senha', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_max_length', '128', 'security', 'Tamanho máximo da senha', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_uppercase', 'true', 'security', 'Exigir letras maiúsculas', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_lowercase', 'true', 'security', 'Exigir letras minúsculas', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_numbers', 'true', 'security', 'Exigir números', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_special', 'true', 'security', 'Exigir caracteres especiais', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_min_strength', '3', 'security', 'Força mínima da senha (0-4)', datetime('now'), datetime('now')),
  
  -- Expiração de senha
  (lower(hex(randomblob(16))), 'auth.password_expiry_days', '90', 'security', 'Validade da senha em dias', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_expiry_warning_days', '7', 'security', 'Avisar X dias antes de expirar', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_grace_period_days', '3', 'security', 'Período de graça pós-expiração', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.force_password_change_first_login', 'true', 'security', 'Forçar troca no primeiro login', datetime('now'), datetime('now')),
  
  -- Lockout e tentativas
  (lower(hex(randomblob(16))), 'auth.max_failed_attempts', '5', 'security', 'Tentativas máximas antes de bloqueio', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.lockout_duration_minutes', '15', 'security', 'Duração do bloqueio em minutos', datetime('now'), datetime('now')),
  
  -- Recuperação de senha
  (lower(hex(randomblob(16))), 'auth.reset_token_expiry_hours', '1', 'security', 'Validade do token de reset em horas', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.max_reset_attempts_per_hour', '3', 'security', 'Limite de solicitações de reset por hora', datetime('now'), datetime('now')),
  
  -- Configurações gerais
  (lower(hex(randomblob(16))), 'auth.allow_password_recovery', 'true', 'security', 'Permitir recuperação de senha por email', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.session_timeout_minutes', '480', 'security', 'Timeout de sessão em minutos (8h)', datetime('now'), datetime('now'))
ON CONFLICT(key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Migração de dados - Gerar username para admins existentes
-- ════════════════════════════════════════════════════════════════════════════
UPDATE "Employee"
SET "username" = 'admin_' || lower(replace("name", ' ', '_'))
WHERE "role" IN ('ADMIN', 'MANAGER')
  AND "username" IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: Criar triggers de validação
-- ════════════════════════════════════════════════════════════════════════════

-- Trigger: Validar email obrigatório para ADMIN/MANAGER
DROP TRIGGER IF EXISTS enforce_admin_email_on_insert;
CREATE TRIGGER enforce_admin_email_on_insert
BEFORE INSERT ON "Employee"
WHEN NEW."role" IN ('ADMIN', 'MANAGER') AND (NEW."email" IS NULL OR NEW."email" = '')
BEGIN
  SELECT RAISE(ABORT, 'Email é obrigatório para perfis ADMIN e MANAGER');
END;

DROP TRIGGER IF EXISTS enforce_admin_email_on_update;
CREATE TRIGGER enforce_admin_email_on_update
BEFORE UPDATE ON "Employee"
WHEN NEW."role" IN ('ADMIN', 'MANAGER') AND (NEW."email" IS NULL OR NEW."email" = '')
BEGIN
  SELECT RAISE(ABORT, 'Email é obrigatório para perfis ADMIN e MANAGER');
END;

-- Trigger: Validar username obrigatório para ADMIN/MANAGER
DROP TRIGGER IF EXISTS enforce_admin_username_on_insert;
CREATE TRIGGER enforce_admin_username_on_insert
BEFORE INSERT ON "Employee"
WHEN NEW."role" IN ('ADMIN', 'MANAGER') AND (NEW."username" IS NULL OR NEW."username" = '')
BEGIN
  SELECT RAISE(ABORT, 'Username é obrigatório para perfis ADMIN e MANAGER');
END;

DROP TRIGGER IF EXISTS enforce_admin_username_on_update;
CREATE TRIGGER enforce_admin_username_on_update
BEFORE UPDATE ON "Employee"
WHEN NEW."role" IN ('ADMIN', 'MANAGER') AND (NEW."username" IS NULL OR NEW."username" = '')
BEGIN
  SELECT RAISE(ABORT, 'Username é obrigatório para perfis ADMIN e MANAGER');
END;

-- Trigger: Atualizar updatedAt automaticamente
DROP TRIGGER IF EXISTS update_employee_updated_at;
CREATE TRIGGER update_employee_updated_at
AFTER UPDATE ON "Employee"
BEGIN
  UPDATE "Employee" SET "updatedAt" = datetime('now') WHERE id = NEW.id;
END;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 7: Auditoria - Adicionar novas ações de audit log
-- ════════════════════════════════════════════════════════════════════════════
-- Nota: Enum de ações será atualizado no código Rust, não no DB SQLite
-- Eventos novos: PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED,
--                PASSWORD_EXPIRED, FAILED_LOGIN_ATTEMPT, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
