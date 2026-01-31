-- ════════════════════════════════════════════════════════════════════════════
-- FIX DATABASE SCHEMA - Add Auth Fields to employees table
-- ════════════════════════════════════════════════════════════════════════════
-- Este script adiciona as colunas de autenticação necessárias à tabela employees
-- É seguro executar múltiplas vezes (usa IF NOT EXISTS / ALTER TABLE ADD COLUMN)
-- ════════════════════════════════════════════════════════════════════════════

-- Adicionar coluna username (se não existir)
ALTER TABLE employees ADD COLUMN username TEXT;

-- Adicionar campos de gerenciamento de senha
ALTER TABLE employees ADD COLUMN password_changed_at TEXT;
ALTER TABLE employees ADD COLUMN password_reset_token TEXT;
ALTER TABLE employees ADD COLUMN password_reset_expires_at TEXT;

-- Adicionar campos de segurança e lockout
ALTER TABLE employees ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN locked_until TEXT;
ALTER TABLE employees ADD COLUMN last_login_at TEXT;
ALTER TABLE employees ADD COLUMN last_login_ip TEXT;

-- Criar índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_password_reset_token ON employees(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Inserir configurações de política de senha (se não existirem)
INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_min_length', 
  '8', 
  'NUMBER', 
  'security', 
  'Tamanho mínimo da senha', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_min_length');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_max_length', 
  '128', 
  'NUMBER', 
  'security', 
  'Tamanho máximo da senha', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_max_length');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_require_uppercase', 
  'true', 
  'BOOLEAN', 
  'security', 
  'Exigir letras maiúsculas', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_uppercase');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_require_lowercase', 
  'true', 
  'BOOLEAN', 
  'security', 
  'Exigir letras minúsculas', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_lowercase');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_require_numbers', 
  'true', 
  'BOOLEAN', 
  'security', 
  'Exigir números', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_numbers');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_require_special', 
  'true', 
  'BOOLEAN', 
  'security', 
  'Exigir caracteres especiais', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_require_special');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_min_strength', 
  '3', 
  'NUMBER', 
  'security', 
  'Força mínima da senha (0-4)', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_min_strength');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_expiry_days', 
  '90', 
  'NUMBER', 
  'security', 
  'Validade da senha em dias', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_expiry_days');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_expiry_warning_days', 
  '7', 
  'NUMBER', 
  'security', 
  'Avisar X dias antes de expirar', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_expiry_warning_days');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.password_grace_period_days', 
  '3', 
  'NUMBER', 
  'security', 
  'Período de graça pós-expiração', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.password_grace_period_days');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.force_password_change_first_login', 
  'true', 
  'BOOLEAN', 
  'security', 
  'Forçar troca no primeiro login', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.force_password_change_first_login');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.max_failed_attempts', 
  '5', 
  'NUMBER', 
  'security', 
  'Tentativas máximas antes de bloqueio', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.max_failed_attempts');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.lockout_duration_minutes', 
  '15', 
  'NUMBER', 
  'security', 
  'Duração do bloqueio em minutos', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.lockout_duration_minutes');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.reset_token_expiry_hours', 
  '1', 
  'NUMBER', 
  'security', 
  'Validade do token de reset em horas', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.reset_token_expiry_hours');

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))), 
  'auth.max_reset_attempts_per_hour', 
  '3', 
  'NUMBER', 
  'security', 
  'Limite de solicitações de reset por hora', 
  datetime('now'), 
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auth.max_reset_attempts_per_hour');

-- Verificar resultado
SELECT 'Schema atualizado com sucesso!' as resultado;
SELECT COUNT(*) as total_auth_settings FROM settings WHERE key LIKE 'auth.%';
