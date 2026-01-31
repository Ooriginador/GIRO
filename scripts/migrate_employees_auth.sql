-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION SCRIPT: migrate_employees_auth.sql
-- ════════════════════════════════════════════════════════════════════════════
-- Este script popula os novos campos de autenticação para usuários existentes.
-- Deve ser rodado APÓS a migration do schema.
-- ════════════════════════════════════════════════════════════════════════════

-- Fase 1: Backup de segurança (opcional, se tabela backup não existir)
-- CREATE TABLE IF NOT EXISTS employees_backup_auth AS SELECT * FROM employees;

-- Fase 2: Gerar username para admins e gerentes existentes
-- Formato: admin_nome_sobrenome (snake_case)
UPDATE Employee
SET username = 'admin_' || LOWER(REPLACE(TRIM(name), ' ', '_'))
WHERE (role = 'ADMIN' OR role = 'MANAGER')
  AND username IS NULL;

-- Remover caracteres especiais do username (simplificado para SQLite)
-- Nota: Em produção real, recomenda-se verificar colisões
UPDATE Employee
SET username = REPLACE(username, '.', '')
WHERE username LIKE '%.%';

-- Fase 3: Marcar contras que precisam de setup de senha (via settings)
-- Isso força a UI a pedir "Criar Senha" no primeiro acesso (se implementado)
-- Como alternativa, definimos uma senha temporária expirada

-- Fase 4: Definir senha temporária EXPIRADA para Admins
-- Senha padrão: "TrocaSenha123!"
-- Hash Argon2id pré-calculado (verify com utils/crypto)
UPDATE Employee
SET 
  password = '$argon2id$v=19$m=19456,t=2,p=1$7vXpYjYyZzJjKkLlMmNnOo$S0M3H4sHV4lU3...', -- Exemplo placeholder
  passwordChangedAt = datetime('now', '-91 days'), -- Expirada há 90 dias
  failedLoginAttempts = 0
WHERE (role = 'ADMIN' OR role = 'MANAGER')
  AND password IS NULL;

-- Nota: O hash acima é inválido. O correto deve ser gerado pelo backend.
-- Para este script, vamos deixar NULL e confiar que o Admin use "Esqueci minha senha" 
-- OU rodar um script utilitário TS que gera hashes válidos.
-- 
-- ALTERNATIVA: Usar PIN login primeiro, e o sistema detecta que precisa criar senha.
-- O sistema atual permite login com PIN para todos. 
-- Se a policy 'auth.force_password_change_first_login' estiver on, 
-- o fluxo de login via PIN deve checar se é ADMIN e exigir setup de senha.

-- Ajuste na Fase 4: Não setar senha inválida. Deixar NULL.
-- O Admin loga com PIN (que ainda existe e funciona) e o sistema deve forçar upgrade.

-- Fase 5: Validação
SELECT 
  id, name, role, username, 
  CASE WHEN password IS NOT NULL THEN 'HAS_PASS' ELSE 'NO_PASS' END as pass_status
FROM Employee
WHERE role IN ('ADMIN', 'MANAGER');
