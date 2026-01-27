-- Migration: 028_attendant_held_sales
-- Description: Adiciona campos para identificar pedidos criados por atendentes
-- Created: 2026-01-26

-- Adicionar nome e role do funcionário que criou o held_sale
ALTER TABLE held_sales ADD COLUMN employee_name TEXT;
ALTER TABLE held_sales ADD COLUMN employee_role TEXT;

-- Status do pedido: WAITING (aguardando caixa), PROCESSING (em atendimento), COMPLETED, CANCELLED
ALTER TABLE held_sales ADD COLUMN status TEXT NOT NULL DEFAULT 'WAITING';

-- Notas/observações do pedido
ALTER TABLE held_sales ADD COLUMN notes TEXT;

-- Índice para buscar pedidos por status (para tela do caixa)
CREATE INDEX IF NOT EXISTS idx_held_sales_status ON held_sales(status);
