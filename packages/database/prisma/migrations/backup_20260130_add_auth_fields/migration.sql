-- Migration: Add Authentication Fields
-- Autor: Arkheion Corp
-- Data: 2026-01-30
-- Descrição: Adiciona campos para autenticação dual (PIN + Login/Senha)

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: ADICIONAR NOVOS CAMPOS
-- ════════════════════════════════════════════════════════════════════════════

-- Campos de autenticação
ALTER TABLE employees ADD COLUMN username TEXT;
ALTER TABLE employees ADD COLUMN password_changed_at TEXT;
ALTER TABLE employees ADD COLUMN password_reset_token TEXT;
ALTER TABLE employees ADD COLUMN password_reset_expires TEXT;

-- Campos de segurança (lockout)
ALTER TABLE employees ADD COLUMN failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE employees ADD COLUMN locked_until TEXT;

-- Campos de auditoria
ALTER TABLE employees ADD COLUMN last_login_at TEXT;
ALTER TABLE employees ADD COLUMN last_login_ip TEXT;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: CRIAR ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

-- Índice único para username (apenas quando não nulo)
CREATE UNIQUE INDEX idx_employees_username ON employees(username) WHERE username IS NOT NULL;

-- Índices de busca
CREATE INDEX idx_employees_email_auth ON employees(email) WHERE email IS NOT NULL;
CREATE INDEX idx_employees_password_reset_token ON employees(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_employees_locked_until ON employees(locked_until) WHERE locked_until IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: TRIGGERS DE VALIDAÇÃO
-- ════════════════════════════════════════════════════════════════════════════

-- Trigger: Email obrigatório para ADMIN/MANAGER
CREATE TRIGGER enforce_admin_email_on_insert
BEFORE INSERT ON employees
WHEN NEW.role IN ('ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'SUPERVISOR') 
  AND (NEW.email IS NULL OR NEW.email = '')
BEGIN
  SELECT RAISE(ABORT, 'Email é obrigatório para perfis administrativos (ADMIN/MANAGER)');
END;

CREATE TRIGGER enforce_admin_email_on_update
BEFORE UPDATE ON employees
WHEN NEW.role IN ('ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'SUPERVISOR') 
  AND (NEW.email IS NULL OR NEW.email = '')
BEGIN
  SELECT RAISE(ABORT, 'Email é obrigatório para perfis administrativos (ADMIN/MANAGER)');
END;

-- Trigger: Username único (case-insensitive check)
CREATE TRIGGER enforce_unique_username
BEFORE INSERT ON employees
WHEN NEW.username IS NOT NULL
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM employees 
      WHERE LOWER(username) = LOWER(NEW.username) 
        AND id != NEW.id
        AND deleted_at IS NULL
    )
    THEN RAISE(ABORT, 'Username já está em uso')
  END;
END;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: MIGRAÇÃO DE DADOS EXISTENTES
-- ════════════════════════════════════════════════════════════════════════════

-- Gerar username automático para admins existentes (se não tiverem)
UPDATE employees 
SET username = 'admin_' || LOWER(REPLACE(REPLACE(name, ' ', '_'), '.', ''))
WHERE role IN ('ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'SUPERVISOR')
  AND username IS NULL
  AND deleted_at IS NULL;

-- Garantir que admins tenham email
-- (Comentado - requer intervenção manual para adicionar emails válidos)
-- UPDATE employees SET email = username || '@example.com' 
-- WHERE role IN ('ADMIN', 'MANAGER') AND email IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: CONFIGURAÇÕES DE SEGURANÇA
-- ════════════════════════════════════════════════════════════════════════════

-- Inserir políticas de senha padrão
INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.password_min_length',
  '8',
  'security',
  'Tamanho mínimo da senha',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_min_length');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.password_require_uppercase',
  'true',
  'security',
  'Exigir letra maiúscula na senha',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_uppercase');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.password_require_lowercase',
  'true',
  'security',
  'Exigir letra minúscula na senha',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_lowercase');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.password_require_numbers',
  'true',
  'security',
  'Exigir números na senha',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_numbers');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.password_require_special',
  'false',
  'security',
  'Exigir caracteres especiais na senha',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_special');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.password_expiry_days',
  '90',
  'security',
  'Dias até expiração da senha (0 = nunca)',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_expiry_days');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.max_failed_attempts',
  '5',
  'security',
  'Máximo de tentativas de login antes de bloquear',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.max_failed_attempts');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.lockout_duration_minutes',
  '15',
  'security',
  'Duração do bloqueio em minutos',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.lockout_duration_minutes');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.session_timeout_minutes',
  '480',
  'security',
  'Timeout de sessão em minutos (8 horas)',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.session_timeout_minutes');

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  'auth.allow_password_recovery',
  'true',
  'security',
  'Permitir recuperação de senha via email',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.allow_password_recovery');

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: VALIDAÇÃO DA MIGRAÇÃO
-- ════════════════════════════════════════════════════════════════════════════

-- Verifica integridade dos dados
SELECT 
  'Admins sem username' as check_type,
  COUNT(*) as count
FROM employees
WHERE role IN ('ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'SUPERVISOR')
  AND username IS NULL
  AND deleted_at IS NULL;

SELECT 
  'Admins sem email' as check_type,
  COUNT(*) as count
FROM employees
WHERE role IN ('ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'SUPERVISOR')
  AND (email IS NULL OR email = '')
  AND deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- NOTAS DE IMPLANTAÇÃO
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Backup obrigatório antes de aplicar
-- 2. Admins precisarão configurar senha no primeiro login
-- 3. PIN continua funcional para todos os perfis (backward compatible)
-- 4. Email deve ser adicionado manualmente para admins existentes
-- 5. Verificar triggers com: SELECT name, sql FROM sqlite_master WHERE type='trigger';
