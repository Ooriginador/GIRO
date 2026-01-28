-- Test: LGPD Hard Delete Employee
-- Teste de exclusão de funcionário com dados relacionados

-- Setup: Criar funcionário de teste
INSERT INTO employees (id, name, pin, role, is_active) 
VALUES ('test-employee-lgpd', 'João Teste LGPD', '9999', 'CASHIER', 1);

-- Criar dados relacionados para testar anonimização
INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at)
VALUES ('test-session-lgpd', 'test-employee-lgpd', 100.0, 'CLOSED', datetime('now'));

INSERT INTO sales (id, employee_id, cash_session_id, customer_id, total, payment_method, status, created_at)
VALUES ('test-sale-lgpd', 'test-employee-lgpd', 'test-session-lgpd', NULL, 50.0, 'CASH', 'COMPLETED', datetime('now'));

INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, created_at)
VALUES ('test-audit-lgpd', 'test-employee-lgpd', 'João Teste LGPD', 'CREATE', 'sale', 'test-sale-lgpd', datetime('now'));

-- Verificar setup
SELECT 'ANTES DA EXCLUSÃO:' AS status;
SELECT 'Employee existe:', COUNT(*) FROM employees WHERE id = 'test-employee-lgpd';
SELECT 'Vendas com employee_id:', COUNT(*) FROM sales WHERE employee_id = 'test-employee-lgpd';
SELECT 'Sessões com employee_id:', COUNT(*) FROM cash_sessions WHERE employee_id = 'test-employee-lgpd';
SELECT 'Logs com user_id:', COUNT(*) FROM audit_logs WHERE user_id = 'test-employee-lgpd';

-- Executar anonimização manualmente (simula o comando Tauri)
BEGIN TRANSACTION;

-- Anonimizar vendas
UPDATE sales SET employee_id = NULL WHERE employee_id = 'test-employee-lgpd';

-- Anonimizar sessões de caixa
UPDATE cash_sessions SET employee_id = NULL WHERE employee_id = 'test-employee-lgpd';

-- Anonimizar logs
UPDATE audit_logs SET user_id = 'ANONYMIZED', user_name = 'ANONYMIZED' WHERE user_id = 'test-employee-lgpd';

-- Deletar funcionário
DELETE FROM employees WHERE id = 'test-employee-lgpd';

COMMIT;

-- Verificar resultado
SELECT 'DEPOIS DA EXCLUSÃO:' AS status;
SELECT 'Employee existe:', COUNT(*) FROM employees WHERE id = 'test-employee-lgpd';
SELECT 'Vendas com employee_id NULL:', COUNT(*) FROM sales WHERE id = 'test-sale-lgpd' AND employee_id IS NULL;
SELECT 'Sessões com employee_id NULL:', COUNT(*) FROM cash_sessions WHERE id = 'test-session-lgpd' AND employee_id IS NULL;
SELECT 'Logs anonimizados:', COUNT(*) FROM audit_logs WHERE id = 'test-audit-lgpd' AND user_id = 'ANONYMIZED';

-- Cleanup
DELETE FROM sales WHERE id = 'test-sale-lgpd';
DELETE FROM cash_sessions WHERE id = 'test-session-lgpd';
DELETE FROM audit_logs WHERE id = 'test-audit-lgpd';
