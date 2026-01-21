-- Migration: 016_add_sale_id_to_service_orders
-- Description: Adiciona coluna sale_id às ordens de serviço para vincular com o financeiro
-- Created: 2026-01-20

ALTER TABLE service_orders ADD COLUMN sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL;
CREATE INDEX idx_service_orders_sale ON service_orders(sale_id);
