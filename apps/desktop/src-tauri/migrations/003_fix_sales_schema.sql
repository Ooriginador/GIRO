-- Migration: 003_fix_sales_schema
-- Description: Corrige schema da tabela sales e sale_items para compatibilidade com o código
-- Created: 2026-01-08
-- Bug Fix: Alinhamento entre schema SQL e modelos Rust

-- ═══════════════════════════════════════════════════════════════════════════
-- CORREÇÕES NA TABELA sales
-- ═══════════════════════════════════════════════════════════════════════════

-- Adicionar colunas faltantes
ALTER TABLE sales ADD COLUMN daily_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN discount_type TEXT;
ALTER TABLE sales ADD COLUMN discount_reason TEXT;
ALTER TABLE sales ADD COLUMN canceled_by_id TEXT REFERENCES employees(id);
ALTER TABLE sales ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Renomear colunas para compatibilidade com código Rust
ALTER TABLE sales RENAME COLUMN discount TO discount_value;
ALTER TABLE sales RENAME COLUMN change_amount TO change;
ALTER TABLE sales RENAME COLUMN cancelled_at TO canceled_at;
ALTER TABLE sales RENAME COLUMN cancellation_reason TO cancel_reason;
ALTER TABLE sales RENAME COLUMN session_id TO cash_session_id;

-- Atualizar índices
DROP INDEX IF EXISTS idx_sales_session;
CREATE INDEX idx_sales_cash_session ON sales(cash_session_id);
CREATE INDEX idx_sales_daily_number ON sales(daily_number, created_at);
CREATE INDEX idx_sales_canceled_by ON sales(canceled_by_id);

-- Trigger para updated_at
CREATE TRIGGER IF NOT EXISTS update_sales_updated_at
AFTER UPDATE ON sales
FOR EACH ROW
BEGIN
    UPDATE sales SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ═══════════════════════════════════════════════════════════════════════════
-- CORREÇÕES NA TABELA sale_items
-- ═══════════════════════════════════════════════════════════════════════════

-- Adicionar colunas de informação do produto (desnormalização para performance)
ALTER TABLE sale_items ADD COLUMN product_name TEXT NOT NULL DEFAULT '';
ALTER TABLE sale_items ADD COLUMN product_barcode TEXT;
ALTER TABLE sale_items ADD COLUMN product_unit TEXT NOT NULL DEFAULT 'UNIT';
ALTER TABLE sale_items ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Popular dados existentes (se houver vendas anteriores)
UPDATE sale_items
SET product_name = COALESCE((SELECT name FROM products WHERE products.id = sale_items.product_id), 'Produto Removido'),
    product_barcode = (SELECT barcode FROM products WHERE products.id = sale_items.product_id),
    product_unit = COALESCE((SELECT unit FROM products WHERE products.id = sale_items.product_id), 'UNIT')
WHERE product_name = '';

-- Atualizar daily_number para vendas existentes (sequencial por dia)
UPDATE sales
SET daily_number = (
    SELECT COUNT(*) 
    FROM sales s2 
    WHERE date(s2.created_at) = date(sales.created_at) 
    AND s2.rowid <= sales.rowid
)
WHERE daily_number = 0;
