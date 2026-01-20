-- Migration: Add CHECK-like triggers and FTS5 virtual table for products search
BEGIN TRANSACTION;
-- FTS5 virtual table for product search (name, description, internal_code, barcode)
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  description,
  internal_code,
  barcode,
  content = 'products',
  content_rowid = 'rowid'
);
-- Populate initial FTS index
INSERT INTO products_fts(rowid, name, description, internal_code, barcode)
SELECT rowid,
  name,
  description,
  internal_code,
  barcode
FROM products;
-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS products_ai
AFTER
INSERT ON products BEGIN
INSERT INTO products_fts(rowid, name, description, internal_code, barcode)
VALUES (
    new.rowid,
    new.name,
    new.description,
    new.internal_code,
    new.barcode
  );
END;
CREATE TRIGGER IF NOT EXISTS products_ad
AFTER DELETE ON products BEGIN
DELETE FROM products_fts
WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS products_au
AFTER
UPDATE ON products BEGIN
UPDATE products_fts
SET name = new.name,
  description = new.description,
  internal_code = new.internal_code,
  barcode = new.barcode
WHERE rowid = new.rowid;
END;
-- Simple CHECK enforcement via triggers: prevent negative prices/stock
CREATE TRIGGER IF NOT EXISTS products_check_before_insert BEFORE
INSERT ON products BEGIN
SELECT CASE
    WHEN (
      NEW.sale_price IS NOT NULL
      AND NEW.sale_price < 0
    ) THEN RAISE(ABORT, 'sale_price must be >= 0')
    WHEN (
      NEW.cost_price IS NOT NULL
      AND NEW.cost_price < 0
    ) THEN RAISE(ABORT, 'cost_price must be >= 0')
    WHEN (
      NEW.current_stock IS NOT NULL
      AND NEW.current_stock < 0
    ) THEN RAISE(ABORT, 'current_stock must be >= 0')
  END;
END;
CREATE TRIGGER IF NOT EXISTS products_check_before_update BEFORE
UPDATE ON products BEGIN
SELECT CASE
    WHEN (
      NEW.sale_price IS NOT NULL
      AND NEW.sale_price < 0
    ) THEN RAISE(ABORT, 'sale_price must be >= 0')
    WHEN (
      NEW.cost_price IS NOT NULL
      AND NEW.cost_price < 0
    ) THEN RAISE(ABORT, 'cost_price must be >= 0')
    WHEN (
      NEW.current_stock IS NOT NULL
      AND NEW.current_stock < 0
    ) THEN RAISE(ABORT, 'current_stock must be >= 0')
  END;
END;
COMMIT;
-- Note: For stricter CHECK constraints consider rebuilding tables with explicit CHECK clauses.