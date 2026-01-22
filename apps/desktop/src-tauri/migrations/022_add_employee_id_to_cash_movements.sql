-- Adiciona employee_id às movimentações de caixa para melhor auditoria
ALTER TABLE cash_movements ADD COLUMN employee_id TEXT;

-- Vincula os registros existentes ao funcionário da sessão
UPDATE cash_movements 
SET employee_id = (SELECT employee_id FROM cash_sessions WHERE id = cash_movements.session_id)
WHERE employee_id IS NULL;

-- Nota: Não forçamos NOT NULL no SQLite via ALTER TABLE (não suportado).
-- O código se encarregará de sempre preencher este campo.
