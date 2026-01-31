-- Rollback Migration: Remove Authentication Fields
-- Autor: Arkheion Corp
-- Data: 2026-01-30
-- Descrição: Reverte alterações da migration de autenticação dual

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: REMOVER TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS enforce_admin_email_on_insert;
DROP TRIGGER IF EXISTS enforce_admin_email_on_update;
DROP TRIGGER IF EXISTS enforce_unique_username;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: REMOVER ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS idx_employees_username;
DROP INDEX IF EXISTS idx_employees_email_auth;
DROP INDEX IF EXISTS idx_employees_password_reset_token;
DROP INDEX IF EXISTS idx_employees_locked_until;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: BACKUP DE DADOS (OPCIONAL)
-- ════════════════════════════════════════════════════════════════════════════

-- Criar tabela temporária com dados de autenticação (para auditoria)
CREATE TABLE IF NOT EXISTS employees_auth_backup (
  id TEXT,
  username TEXT,
  password_changed_at TEXT,
  failed_login_attempts INTEGER,
  last_login_at TEXT,
  backed_up_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO employees_auth_backup (id, username, password_changed_at, failed_login_attempts, last_login_at)
SELECT id, username, password_changed_at, failed_login_attempts, last_login_at
FROM employees
WHERE username IS NOT NULL OR password_changed_at IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: REMOVER COLUNAS
-- ════════════════════════════════════════════════════════════════════════════

-- SQLite não suporta DROP COLUMN diretamente
-- Precisamos recriar a tabela

-- 4.1: Criar tabela temporária com schema original
CREATE TABLE employees_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  pin TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'CASHIER',
  commission_rate REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 4.2: Copiar dados (excluindo novos campos)
INSERT INTO employees_new (
  id, name, cpf, phone, email, pin, password, role, 
  commission_rate, is_active, created_at, updated_at, deleted_at
)
SELECT 
  id, name, cpf, phone, email, pin, password, role,
  commission_rate, is_active, created_at, updated_at, deleted_at
FROM employees;

-- 4.3: Dropar tabela antiga
DROP TABLE employees;

-- 4.4: Renomear tabela nova
ALTER TABLE employees_new RENAME TO employees;

-- 4.5: Recriar índices originais
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_pin ON employees(pin);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: REMOVER CONFIGURAÇÕES
-- ════════════════════════════════════════════════════════════════════════════

DELETE FROM settings WHERE key LIKE 'auth.%';

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: VALIDAÇÃO DO ROLLBACK
-- ════════════════════════════════════════════════════════════════════════════

-- Verificar se tabela voltou ao estado original
SELECT 
  COUNT(*) as employees_count,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
FROM employees;

-- Verificar backup de dados
SELECT COUNT(*) as backed_up_records FROM employees_auth_backup;

-- ════════════════════════════════════════════════════════════════════════════
-- NOTAS DE ROLLBACK
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Dados de autenticação foram salvos em employees_auth_backup
-- 2. Para recuperar: consultar employees_auth_backup
-- 3. Sistema volta a funcionar apenas com PIN
-- 4. Não há perda de dados de funcionários
-- 5. Configurações de segurança foram removidas

SELECT 'Rollback concluído com sucesso!' as status;
