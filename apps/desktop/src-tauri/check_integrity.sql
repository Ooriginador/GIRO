-- Script de verificação e correção de integridade do banco de dados
-- GIRO Desktop - SQLite

-- Habilitar foreign keys
PRAGMA foreign_keys = ON;

-- Verificar integridade
PRAGMA integrity_check;

-- Verificar foreign key constraints
PRAGMA foreign_key_check;

-- Ver todas as foreign keys
SELECT 
    m.name AS 'table',
    p.id AS 'fk_id',
    p."from" AS 'from_column',
    p."table" AS 'references_table',
    p."to" AS 'references_column',
    p.on_update,
    p.on_delete
FROM 
    sqlite_master m
    JOIN pragma_foreign_key_list(m.name) p ON m.name != p."table"
WHERE 
    m.type = 'table'
ORDER BY 
    m.name;

-- Verificar registros órfãos (employees que aparecem em outras tabelas mas não existem)
SELECT 'Vendas com employee_id órfão:' AS check_type, COUNT(*) AS count
FROM sales s
WHERE s.employee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = s.employee_id);

SELECT 'Sessões de caixa com employee_id órfão:' AS check_type, COUNT(*) AS count
FROM cash_sessions cs
WHERE cs.employee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = cs.employee_id);

-- Ver configuração atual
PRAGMA foreign_keys;
