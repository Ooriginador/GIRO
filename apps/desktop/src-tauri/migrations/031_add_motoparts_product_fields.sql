-- Migration: 031_add_motoparts_product_fields
-- Description: Adiciona campos específicos de motopeças na tabela de produtos
-- Created: 2026-01-26

ALTER TABLE products ADD COLUMN oem_code TEXT;
ALTER TABLE products ADD COLUMN aftermarket_code TEXT;
ALTER TABLE products ADD COLUMN part_brand TEXT;
ALTER TABLE products ADD COLUMN application TEXT;

CREATE INDEX IF NOT EXISTS idx_products_oem ON products(oem_code);
CREATE INDEX IF NOT EXISTS idx_products_aftermarket ON products(aftermarket_code);
