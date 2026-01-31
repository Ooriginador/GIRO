-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: AUTH PASSWORD FIELDS
-- ════════════════════════════════════════════════════════════════════════════
-- Reverte todas as mudanças da migration add_auth_password_fields
-- ⚠️  ATENÇÃO: Isto removerá TODOS os dados de autenticação por senha!
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Backup de Segurança
-- ════════════════════════════════════════════════════════════════════════════

-- Antes de executar este rollback, faça backup:
-- sqlite3 dev.db ".backup 'backup_before_rollback_$(date +%Y%m%d_%H%M%S).db'"

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Remover Triggers
-- ════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS enforce_admin_email_on_insert;
DROP TRIGGER IF EXISTS enforce_admin_email_on_update;
DROP TRIGGER IF EXISTS enforce_unique_username_insert;
DROP TRIGGER IF EXISTS enforce_unique_username_update;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Remover Índices Adicionais
-- ════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS "idx_employee_locked_until";
DROP INDEX IF EXISTS "idx_employee_failed_attempts";

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Remover Settings de Segurança
-- ════════════════════════════════════════════════════════════════════════════

DELETE FROM "Setting" WHERE key LIKE 'auth.%';

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Reverter Schema da Tabela Employee
-- ════════════════════════════════════════════════════════════════════════════

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Criar tabela temporária com schema ANTIGO (sem campos de senha)
CREATE TABLE "Employee_rollback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "pin" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- Copiar dados (apenas campos que existiam antes)
INSERT INTO "Employee_rollback" (
    "id",
    "name",
    "cpf",
    "phone",
    "email",
    "pin",
    "role",
    "isActive",
    "createdAt",
    "updatedAt",
    "deletedAt"
)
SELECT
    "id",
    "name",
    "cpf",
    "phone",
    "email",
    "pin",
    "role",
    "isActive",
    "createdAt",
    "updatedAt",
    "deletedAt"
FROM "Employee";

-- Dropar tabela atual
DROP TABLE "Employee";

-- Renomear tabela de rollback
ALTER TABLE "Employee_rollback" RENAME TO "Employee";

-- Recriar índices originais
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");
CREATE INDEX "Employee_cpf_idx" ON "Employee"("cpf");
CREATE INDEX "Employee_pin_idx" ON "Employee"("pin");
CREATE INDEX "Employee_role_idx" ON "Employee"("role");
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: Limpar Audit Logs Relacionados (Opcional)
-- ════════════════════════════════════════════════════════════════════════════

-- Remover logs de ações de senha (opcional - comentado por padrão)
-- DELETE FROM "AuditLog" WHERE action IN (
--   'PASSWORD_CHANGED',
--   'PASSWORD_RESET_REQUESTED',
--   'PASSWORD_RESET_COMPLETED',
--   'FAILED_LOGIN_ATTEMPT',
--   'ACCOUNT_LOCKED',
--   'ACCOUNT_UNLOCKED'
-- );

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 7: Validação Final
-- ════════════════════════════════════════════════════════════════════════════

-- Verificar estrutura da tabela
SELECT 'Estrutura da tabela Employee após rollback:' as info;
PRAGMA table_info("Employee");

-- Verificar quantidade de funcionários
SELECT 'Total de funcionários preservados:' as info, COUNT(*) as total FROM "Employee";

-- Verificar triggers removidos
SELECT 'Triggers restantes (deve estar vazio):' as info;
SELECT name FROM sqlite_master
WHERE type = 'trigger' AND name LIKE 'enforce_%';

-- Verificar settings removidas
SELECT 'Settings de auth restantes (deve ser 0):' as info;
SELECT COUNT(*) as total FROM "Setting" WHERE key LIKE 'auth.%';

-- ════════════════════════════════════════════════════════════════════════════
-- NOTAS IMPORTANTES
-- ════════════════════════════════════════════════════════════════════════════
-- 1. Este rollback remove PERMANENTEMENTE:
--    - Todos os usernames
--    - Todas as senhas (hashes)
--    - Histórico de tentativas de login
--    - Tokens de reset de senha
--    - Timestamps de último login
--
-- 2. Após o rollback:
--    - Somente autenticação por PIN funcionará
--    - Administradores precisarão usar PIN temporariamente
--    - Será necessário recriar usernames/senhas se reverter novamente
--
-- 3. Foreign Keys:
--    - As relações com outras tabelas são preservadas
--    - Nenhum dado de vendas, produtos, etc é afetado
--
-- 4. Recomendações:
--    - SEMPRE faça backup antes de executar
--    - Teste em ambiente de desenvolvimento primeiro
--    - Documente o motivo do rollback
--    - Notifique usuários sobre a mudança
-- ════════════════════════════════════════════════════════════════════════════
