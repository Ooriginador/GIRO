-- Migration: 036_add_location_id_to_stock_movements
-- Description: Adiciona coluna location_id para suportar movimentações multi-local (Enterprise)
-- Created: 2026-01-30
-- Bug Fix: EnterpriseInventoryRepository requer location_id para rastreamento por local

-- ═══════════════════════════════════════════════════════════════════════════
-- ADICIONAR COLUNA location_id EM stock_movements
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE stock_movements ADD COLUMN location_id TEXT REFERENCES stock_locations(id);

-- Criar índice para busca por localização
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON stock_movements(location_id);

-- Índice composto para consultas de estoque por local
CREATE INDEX IF NOT EXISTS idx_stock_movements_location_product ON stock_movements(location_id, product_id);
