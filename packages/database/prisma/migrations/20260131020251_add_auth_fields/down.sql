-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: add_auth_fields
-- ════════════════════════════════════════════════════════════════════════════
-- Reverte mudanças de autenticação dual
-- CUIDADO: Isto remove dados de username, password e configurações de segurança
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Remover triggers
-- ════════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS enforce_admin_email_on_insert;
DROP TRIGGER IF EXISTS enforce_admin_email_on_update;
DROP TRIGGER IF EXISTS enforce_admin_username_on_insert;
DROP TRIGGER IF EXISTS enforce_admin_username_on_update;
DROP TRIGGER IF EXISTS update_employee_updated_at;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Remover configurações de autenticação da tabela Setting
-- ════════════════════════════════════════════════════════════════════════════
DELETE FROM "Setting" WHERE "key" LIKE 'auth.%';

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Reverter tabela Employee para estado anterior
-- ════════════════════════════════════════════════════════════════════════════
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "old_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "pin" TEXT NOT NULL,
    "password" TEXT, -- Campo antigo (mantido para compatibilidade)
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- Migrar dados de volta (perder campos novos)
INSERT INTO "old_Employee" (
    "id", "name", "cpf", "phone", "email", "pin", "password", 
    "role", "isActive", "createdAt", "updatedAt", "deletedAt"
)
SELECT 
    "id", "name", "cpf", "phone", "email", "pin", "password",
    "role", "isActive", "createdAt", "updatedAt", "deletedAt"
FROM "Employee";

DROP TABLE "Employee";
ALTER TABLE "old_Employee" RENAME TO "Employee";

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
-- STEP 4: Remover campo notes de Product (se necessário)
-- ════════════════════════════════════════════════════════════════════════════
-- NOTA: Comentado para não perder dados, remova o comentário se quiser reverter
-- ALTER TABLE "Product" DROP COLUMN "notes";

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DO ROLLBACK
-- ════════════════════════════════════════════════════════════════════════════
-- Para executar este rollback:
-- sqlite3 seu_banco.db < down.sql
