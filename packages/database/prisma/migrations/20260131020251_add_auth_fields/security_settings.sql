-- ════════════════════════════════════════════════════════════════════════════
-- AUTH SECURITY SETTINGS & CONSTRAINTS
-- ════════════════════════════════════════════════════════════════════════════
-- Adiciona configurações de segurança e validações para autenticação por senha
-- Deve ser executado APÓS a migration principal
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- POLÍTICAS DE SENHA (Settings)
-- ════════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "category", "description", "createdAt", "updatedAt")
VALUES
  -- Requisitos de senha
  (lower(hex(randomblob(16))), 'auth.password_min_length', '8', 'security', 'Tamanho mínimo da senha em caracteres', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_max_length', '128', 'security', 'Tamanho máximo da senha em caracteres', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_uppercase', 'true', 'security', 'Exigir pelo menos uma letra maiúscula', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_lowercase', 'true', 'security', 'Exigir pelo menos uma letra minúscula', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_number', 'true', 'security', 'Exigir pelo menos um número', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_require_special', 'true', 'security', 'Exigir pelo menos um caractere especial', datetime('now'), datetime('now')),
  
  -- Expiração de senha
  (lower(hex(randomblob(16))), 'auth.password_expiry_days', '90', 'security', 'Dias até a senha expirar (0 = nunca expira)', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_expiry_warning_days', '7', 'security', 'Avisar expiração X dias antes', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.password_history_count', '5', 'security', 'Número de senhas anteriores bloqueadas para reuso', datetime('now'), datetime('now')),
  
  -- Lockout de conta
  (lower(hex(randomblob(16))), 'auth.max_failed_attempts', '5', 'security', 'Número máximo de tentativas de login antes de bloquear', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.lockout_duration_minutes', '15', 'security', 'Duração do bloqueio em minutos', datetime('now'), datetime('now')),
  
  -- Reset de senha
  (lower(hex(randomblob(16))), 'auth.password_reset_token_validity_minutes', '60', 'security', 'Validade do token de reset em minutos', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.allow_password_recovery', 'true', 'security', 'Permitir recuperação de senha via email', datetime('now'), datetime('now')),
  
  -- Políticas por role
  (lower(hex(randomblob(16))), 'auth.admin_password_expiry_days', '60', 'security', 'Dias até senha de ADMIN expirar (mais restritivo)', datetime('now'), datetime('now')),
  (lower(hex(randomblob(16))), 'auth.manager_password_expiry_days', '90', 'security', 'Dias até senha de MANAGER expirar', datetime('now'), datetime('now'));

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS DE VALIDAÇÃO
-- ════════════════════════════════════════════════════════════════════════════

-- Trigger: Garantir que ADMIN/MANAGER tenham email
-- NOTA: Triggers comentados pois Prisma gerencia constraints via aplicação
-- Validação será feita no backend Rust/TypeScript

-- CREATE TRIGGER IF NOT EXISTS enforce_admin_email_on_insert
-- BEFORE INSERT ON "Employee"
-- WHEN NEW.role IN ('ADMIN', 'MANAGER') AND NEW.email IS NULL
-- BEGIN
--   SELECT RAISE(ABORT, 'Email obrigatório para funcionários com role ADMIN ou MANAGER');
-- END;

-- CREATE TRIGGER IF NOT EXISTS enforce_admin_email_on_update
-- BEFORE UPDATE OF role, email ON "Employee"
-- WHEN NEW.role IN ('ADMIN', 'MANAGER') AND NEW.email IS NULL
-- BEGIN
--   SELECT RAISE(ABORT, 'Email obrigatório para funcionários com role ADMIN ou MANAGER');
-- END;

-- Trigger: Garantir que username seja único (case-insensitive)
-- NOTA: Prisma já garante unicidade via UNIQUE constraint
-- Validação case-insensitive será feita no backend

-- CREATE TRIGGER IF NOT EXISTS enforce_unique_username_insert
-- BEFORE INSERT ON "Employee"
-- WHEN NEW.username IS NOT NULL
--   AND EXISTS (
--     SELECT 1 FROM "Employee"
--     WHERE LOWER(username) = LOWER(NEW.username)
--     AND id != NEW.id
--   )
-- BEGIN
--   SELECT RAISE(ABORT, 'Username já está em uso (case-insensitive)');
-- END;

-- CREATE TRIGGER IF NOT EXISTS enforce_unique_username_update
-- BEFORE UPDATE OF username ON "Employee"
-- WHEN NEW.username IS NOT NULL
--   AND EXISTS (
--     SELECT 1 FROM "Employee"
--     WHERE LOWER(username) = LOWER(NEW.username)
--     AND id != NEW.id
--   )
-- BEGIN
--   SELECT RAISE(ABORT, 'Username já está em uso (case-insensitive)');
-- END;

-- ════════════════════════════════════════════════════════════════════════════
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ════════════════════════════════════════════════════════════════════════════

-- Já criados pela migration principal:
-- CREATE INDEX "Employee_username_idx" ON "Employee"("username");
-- CREATE INDEX "Employee_email_idx" ON "Employee"("email");
-- CREATE INDEX "Employee_passwordResetToken_idx" ON "Employee"("passwordResetToken");

-- Índice para buscar contas bloqueadas
CREATE INDEX IF NOT EXISTS "idx_employee_locked_until" ON "Employee"("lockedUntil") WHERE "lockedUntil" IS NOT NULL;

-- Índice para buscar contas com falhas de login
CREATE INDEX IF NOT EXISTS "idx_employee_failed_attempts" ON "Employee"("failedLoginAttempts") WHERE "failedLoginAttempts" > 0;

-- ════════════════════════════════════════════════════════════════════════════
-- AUDITORIA - Novos tipos de ação
-- ════════════════════════════════════════════════════════════════════════════

-- Verificar se tabela Setting possui os novos tipos de ação de auditoria
-- (Serão usados pelo sistema de audit logs)

-- Tipos de ação que serão registrados:
-- - PASSWORD_CHANGED: Senha alterada pelo usuário
-- - PASSWORD_RESET_REQUESTED: Solicitação de reset de senha
-- - PASSWORD_RESET_COMPLETED: Reset de senha concluído
-- - FAILED_LOGIN_ATTEMPT: Tentativa de login falhada
-- - ACCOUNT_LOCKED: Conta bloqueada por excesso de tentativas
-- - ACCOUNT_UNLOCKED: Conta desbloqueada (manual ou automático)

-- ════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO FINAL
-- ════════════════════════════════════════════════════════════════════════════

-- Verificar que as settings foram inseridas
SELECT COUNT(*) as total_security_settings
FROM "Setting"
WHERE category = 'security' AND key LIKE 'auth.%';

-- Verificar índices criados (executar via sqlite3)
-- SELECT name FROM sqlite_master
-- WHERE type = 'index' AND tbl_name = 'Employee';
