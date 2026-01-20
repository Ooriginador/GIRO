-- Migration: add_constraints
-- Creates triggers to enforce non-negative stock and non-negative prices
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
-- Products: prevent negative current_stock and negative sale_price
DROP TRIGGER IF EXISTS products_stock_non_negative_insert;
CREATE TRIGGER products_stock_non_negative_insert BEFORE
INSERT ON products
  WHEN NEW.current_stock < 0 BEGIN
SELECT RAISE(
    ABORT,
    'products.current_stock cannot be negative'
  );
END;
DROP TRIGGER IF EXISTS products_stock_non_negative_update;
CREATE TRIGGER products_stock_non_negative_update BEFORE
UPDATE ON products
  WHEN NEW.current_stock < 0 BEGIN
SELECT RAISE(
    ABORT,
    'products.current_stock cannot be negative'
  );
END;
DROP TRIGGER IF EXISTS products_sale_price_non_negative;
CREATE TRIGGER products_sale_price_non_negative BEFORE
INSERT
  OR
UPDATE ON products
  WHEN NEW.sale_price < 0 BEGIN
SELECT RAISE(ABORT, 'products.sale_price cannot be negative');
END;
-- Product lots: prevent negative current_quantity
DROP TRIGGER IF EXISTS product_lots_current_quantity_non_negative_insert;
CREATE TRIGGER product_lots_current_quantity_non_negative_insert BEFORE
INSERT ON product_lots
  WHEN NEW.current_quantity < 0 BEGIN
SELECT RAISE(
    ABORT,
    'product_lots.current_quantity cannot be negative'
  );
END;
DROP TRIGGER IF EXISTS product_lots_current_quantity_non_negative_update;
CREATE TRIGGER product_lots_current_quantity_non_negative_update BEFORE
UPDATE ON product_lots
  WHEN NEW.current_quantity < 0 BEGIN
SELECT RAISE(
    ABORT,
    'product_lots.current_quantity cannot be negative'
  );
END;
-- Sale items: quantity and unit_price must be positive
DROP TRIGGER IF EXISTS sale_items_quantity_positive;
CREATE TRIGGER sale_items_quantity_positive BEFORE
INSERT ON sale_items
  WHEN NEW.quantity <= 0 BEGIN
SELECT RAISE(ABORT, 'sale_items.quantity must be > 0');
END;
DROP TRIGGER IF EXISTS sale_items_unit_price_non_negative;
CREATE TRIGGER sale_items_unit_price_non_negative BEFORE
INSERT ON sale_items
  WHEN NEW.unit_price < 0 BEGIN
SELECT RAISE(
    ABORT,
    'sale_items.unit_price cannot be negative'
  );
END;
COMMIT;
PRAGMA foreign_keys = ON;