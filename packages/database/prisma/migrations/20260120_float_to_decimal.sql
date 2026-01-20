-- Migration: Float -> Decimal conversion (2026-01-20)
-- Purpose: add new numeric/decimal columns, populate them from existing Float columns,
-- and create DB metadata tables. This migration is non-destructive: it creates
-- *_decimal columns and leaves original columns intact. After application code
-- is switched to the new columns and validated in staging, a controlled cleanup
-- (drop/rename) can be performed.
BEGIN TRANSACTION;
-- 1) Metadata tables
CREATE TABLE IF NOT EXISTS db_version (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  version_tag TEXT NOT NULL,
  applied_at DATETIME DEFAULT (datetime('now')),
  notes TEXT
);
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  path TEXT NOT NULL,
  checksum TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  size_bytes INTEGER,
  encrypted BOOLEAN DEFAULT 1
);
-- 2) Add decimal columns to key tables (money -> NUMERIC(12,2), quantities -> NUMERIC(14,3))
-- PRODUCTS
ALTER TABLE Product
ADD COLUMN salePrice_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN costPrice_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN currentStock_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN minStock_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN maxStock_decimal NUMERIC;
-- PRODUCT LOTS
ALTER TABLE ProductLot
ADD COLUMN initialQuantity_decimal NUMERIC;
ALTER TABLE ProductLot
ADD COLUMN currentQuantity_decimal NUMERIC;
ALTER TABLE ProductLot
ADD COLUMN costPrice_decimal NUMERIC;
-- CASH SESSIONS
ALTER TABLE CashSession
ADD COLUMN openingBalance_decimal NUMERIC;
ALTER TABLE CashSession
ADD COLUMN expectedBalance_decimal NUMERIC;
ALTER TABLE CashSession
ADD COLUMN actualBalance_decimal NUMERIC;
ALTER TABLE CashSession
ADD COLUMN difference_decimal NUMERIC;
-- CASH MOVEMENTS
ALTER TABLE CashMovement
ADD COLUMN amount_decimal NUMERIC;
-- SALES
ALTER TABLE Sale
ADD COLUMN subtotal_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN discountValue_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN total_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN amountPaid_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN change_decimal NUMERIC;
-- SALE ITEMS
ALTER TABLE SaleItem
ADD COLUMN quantity_decimal NUMERIC;
ALTER TABLE SaleItem
ADD COLUMN unitPrice_decimal NUMERIC;
ALTER TABLE SaleItem
ADD COLUMN discount_decimal NUMERIC;
ALTER TABLE SaleItem
ADD COLUMN total_decimal NUMERIC;
-- STOCK MOVEMENTS
ALTER TABLE StockMovement
ADD COLUMN quantity_decimal NUMERIC;
ALTER TABLE StockMovement
ADD COLUMN previousStock_decimal NUMERIC;
ALTER TABLE StockMovement
ADD COLUMN newStock_decimal NUMERIC;
-- PRICE HISTORY
ALTER TABLE PriceHistory
ADD COLUMN oldPrice_decimal NUMERIC;
ALTER TABLE PriceHistory
ADD COLUMN newPrice_decimal NUMERIC;
-- SERVICE ORDERS & ITEMS
ALTER TABLE ServiceOrder
ADD COLUMN laborCost_decimal NUMERIC;
ALTER TABLE ServiceOrder
ADD COLUMN partsCost_decimal NUMERIC;
ALTER TABLE ServiceOrder
ADD COLUMN discount_decimal NUMERIC;
ALTER TABLE ServiceOrder
ADD COLUMN total_decimal NUMERIC;
ALTER TABLE ServiceOrderItem
ADD COLUMN quantity_decimal NUMERIC;
ALTER TABLE ServiceOrderItem
ADD COLUMN unitPrice_decimal NUMERIC;
ALTER TABLE ServiceOrderItem
ADD COLUMN discount_decimal NUMERIC;
ALTER TABLE ServiceOrderItem
ADD COLUMN total_decimal NUMERIC;
-- SERVICES
ALTER TABLE Service
ADD COLUMN defaultPrice_decimal NUMERIC;
-- WARRANTY CLAIMS
ALTER TABLE WarrantyClaim
ADD COLUMN refundAmount_decimal NUMERIC;
ALTER TABLE WarrantyClaim
ADD COLUMN replacementCost_decimal NUMERIC;
-- 3) Populate new decimal columns from old Float columns (rounded appropriately)
-- Monetary values rounded to 2 decimals; quantities to 3 decimals.
UPDATE Product
SET salePrice_decimal = ROUND(salePrice, 2),
  costPrice_decimal = ROUND(costPrice, 2),
  currentStock_decimal = ROUND(currentStock, 3),
  minStock_decimal = ROUND(minStock, 3),
  maxStock_decimal = ROUND(COALESCE(maxStock, 0), 3);
UPDATE ProductLot
SET initialQuantity_decimal = ROUND(initialQuantity, 3),
  currentQuantity_decimal = ROUND(currentQuantity, 3),
  costPrice_decimal = ROUND(costPrice, 2);
UPDATE CashSession
SET openingBalance_decimal = ROUND(openingBalance, 2),
  expectedBalance_decimal = ROUND(expectedBalance, 2),
  actualBalance_decimal = ROUND(actualBalance, 2),
  difference_decimal = ROUND(difference, 2);
UPDATE CashMovement
SET amount_decimal = ROUND(amount, 2);
UPDATE Sale
SET subtotal_decimal = ROUND(subtotal, 2),
  discountValue_decimal = ROUND(discountValue, 2),
  total_decimal = ROUND(total, 2),
  amountPaid_decimal = ROUND(amountPaid, 2),
  change_decimal = ROUND(change, 2);
UPDATE SaleItem
SET quantity_decimal = ROUND(quantity, 3),
  unitPrice_decimal = ROUND(unitPrice, 2),
  discount_decimal = ROUND(discount, 2),
  total_decimal = ROUND(total, 2);
UPDATE StockMovement
SET quantity_decimal = ROUND(quantity, 3),
  previousStock_decimal = ROUND(previousStock, 3),
  newStock_decimal = ROUND(newStock, 3);
UPDATE PriceHistory
SET oldPrice_decimal = ROUND(oldPrice, 2),
  newPrice_decimal = ROUND(newPrice, 2);
UPDATE ServiceOrder
SET laborCost_decimal = ROUND(laborCost, 2),
  partsCost_decimal = ROUND(partsCost, 2),
  discount_decimal = ROUND(discount, 2),
  total_decimal = ROUND(total, 2);
UPDATE ServiceOrderItem
SET quantity_decimal = ROUND(quantity, 3),
  unitPrice_decimal = ROUND(unitPrice, 2),
  discount_decimal = ROUND(discount, 2),
  total_decimal = ROUND(total, 2);
UPDATE Service
SET defaultPrice_decimal = ROUND(defaultPrice, 2);
UPDATE WarrantyClaim
SET refundAmount_decimal = ROUND(refundAmount, 2),
  replacementCost_decimal = ROUND(replacementCost, 2);
-- Also create snake_case *_decimal columns to match existing Rust/SQL naming conventions
-- and populate them from the camelCase decimal columns (if any) or original columns.
ALTER TABLE Product
ADD COLUMN IF NOT EXISTS sale_price_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN IF NOT EXISTS cost_price_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN IF NOT EXISTS current_stock_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN IF NOT EXISTS min_stock_decimal NUMERIC;
ALTER TABLE Product
ADD COLUMN IF NOT EXISTS max_stock_decimal NUMERIC;
UPDATE Product
SET sale_price_decimal = COALESCE(
    sale_price_decimal,
    salePrice_decimal,
    ROUND(sale_price, 2)
  ),
  cost_price_decimal = COALESCE(
    cost_price_decimal,
    costPrice_decimal,
    ROUND(cost_price, 2)
  ),
  current_stock_decimal = COALESCE(
    current_stock_decimal,
    currentStock_decimal,
    ROUND(current_stock, 3)
  ),
  min_stock_decimal = COALESCE(
    min_stock_decimal,
    minStock_decimal,
    ROUND(min_stock, 3)
  ),
  max_stock_decimal = COALESCE(
    max_stock_decimal,
    maxStock_decimal,
    ROUND(COALESCE(max_stock, 0), 3)
  );
ALTER TABLE ProductLot
ADD COLUMN IF NOT EXISTS initial_quantity_decimal NUMERIC;
ALTER TABLE ProductLot
ADD COLUMN IF NOT EXISTS current_quantity_decimal NUMERIC;
ALTER TABLE ProductLot
ADD COLUMN IF NOT EXISTS cost_price_decimal NUMERIC;
UPDATE ProductLot
SET initial_quantity_decimal = COALESCE(
    initial_quantity_decimal,
    initialQuantity_decimal,
    ROUND(initial_quantity, 3)
  ),
  current_quantity_decimal = COALESCE(
    current_quantity_decimal,
    currentQuantity_decimal,
    ROUND(current_quantity, 3)
  ),
  cost_price_decimal = COALESCE(
    cost_price_decimal,
    costPrice_decimal,
    ROUND(cost_price, 2)
  );
ALTER TABLE CashSession
ADD COLUMN IF NOT EXISTS opening_balance_decimal NUMERIC;
ALTER TABLE CashSession
ADD COLUMN IF NOT EXISTS expected_balance_decimal NUMERIC;
ALTER TABLE CashSession
ADD COLUMN IF NOT EXISTS actual_balance_decimal NUMERIC;
ALTER TABLE CashSession
ADD COLUMN IF NOT EXISTS difference_decimal NUMERIC;
UPDATE CashSession
SET opening_balance_decimal = COALESCE(
    opening_balance_decimal,
    openingBalance_decimal,
    ROUND(opening_balance, 2)
  ),
  expected_balance_decimal = COALESCE(
    expected_balance_decimal,
    expectedBalance_decimal,
    ROUND(expected_balance, 2)
  ),
  actual_balance_decimal = COALESCE(
    actual_balance_decimal,
    actualBalance_decimal,
    ROUND(actual_balance, 2)
  ),
  difference_decimal = COALESCE(
    difference_decimal,
    difference_decimal,
    ROUND(difference, 2)
  );
ALTER TABLE CashMovement
ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC;
UPDATE CashMovement
SET amount_decimal = COALESCE(amount_decimal, amount_decimal, ROUND(amount, 2));
ALTER TABLE Sale
ADD COLUMN IF NOT EXISTS subtotal_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN IF NOT EXISTS discount_value_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN IF NOT EXISTS total_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN IF NOT EXISTS amount_paid_decimal NUMERIC;
ALTER TABLE Sale
ADD COLUMN IF NOT EXISTS change_decimal NUMERIC;
UPDATE Sale
SET subtotal_decimal = COALESCE(
    subtotal_decimal,
    subtotal_decimal,
    ROUND(subtotal, 2)
  ),
  discount_value_decimal = COALESCE(
    discount_value_decimal,
    discountValue_decimal,
    ROUND(discount_value, 2)
  ),
  total_decimal = COALESCE(total_decimal, total_decimal, ROUND(total, 2)),
  amount_paid_decimal = COALESCE(
    amount_paid_decimal,
    amountPaid_decimal,
    ROUND(amount_paid, 2)
  ),
  change_decimal = COALESCE(change_decimal, change_decimal, ROUND(change, 2));
ALTER TABLE SaleItem
ADD COLUMN IF NOT EXISTS quantity_decimal NUMERIC;
ALTER TABLE SaleItem
ADD COLUMN IF NOT EXISTS unit_price_decimal NUMERIC;
ALTER TABLE SaleItem
ADD COLUMN IF NOT EXISTS discount_decimal NUMERIC;
ALTER TABLE SaleItem
ADD COLUMN IF NOT EXISTS total_decimal NUMERIC;
UPDATE SaleItem
SET quantity_decimal = COALESCE(
    quantity_decimal,
    quantity_decimal,
    ROUND(quantity, 3)
  ),
  unit_price_decimal = COALESCE(
    unit_price_decimal,
    unitPrice_decimal,
    ROUND(unit_price, 2)
  ),
  discount_decimal = COALESCE(
    discount_decimal,
    discount_decimal,
    ROUND(discount, 2)
  ),
  total_decimal = COALESCE(total_decimal, total_decimal, ROUND(total, 2));
ALTER TABLE StockMovement
ADD COLUMN IF NOT EXISTS quantity_decimal NUMERIC;
ALTER TABLE StockMovement
ADD COLUMN IF NOT EXISTS previous_stock_decimal NUMERIC;
ALTER TABLE StockMovement
ADD COLUMN IF NOT EXISTS new_stock_decimal NUMERIC;
UPDATE StockMovement
SET quantity_decimal = COALESCE(
    quantity_decimal,
    quantity_decimal,
    ROUND(quantity, 3)
  ),
  previous_stock_decimal = COALESCE(
    previous_stock_decimal,
    previousStock_decimal,
    ROUND(previous_stock, 3)
  ),
  new_stock_decimal = COALESCE(
    new_stock_decimal,
    newStock_decimal,
    ROUND(new_stock, 3)
  );
ALTER TABLE PriceHistory
ADD COLUMN IF NOT EXISTS old_price_decimal NUMERIC;
ALTER TABLE PriceHistory
ADD COLUMN IF NOT EXISTS new_price_decimal NUMERIC;
UPDATE PriceHistory
SET old_price_decimal = COALESCE(
    old_price_decimal,
    oldPrice_decimal,
    ROUND(old_price, 2)
  ),
  new_price_decimal = COALESCE(
    new_price_decimal,
    newPrice_decimal,
    ROUND(new_price, 2)
  );
ALTER TABLE ServiceOrder
ADD COLUMN IF NOT EXISTS labor_cost_decimal NUMERIC;
ALTER TABLE ServiceOrder
ADD COLUMN IF NOT EXISTS parts_cost_decimal NUMERIC;
ALTER TABLE ServiceOrder
ADD COLUMN IF NOT EXISTS discount_decimal NUMERIC;
ALTER TABLE ServiceOrder
ADD COLUMN IF NOT EXISTS total_decimal NUMERIC;
UPDATE ServiceOrder
SET labor_cost_decimal = COALESCE(
    labor_cost_decimal,
    laborCost_decimal,
    ROUND(labor_cost, 2)
  ),
  parts_cost_decimal = COALESCE(
    parts_cost_decimal,
    partsCost_decimal,
    ROUND(parts_cost, 2)
  ),
  discount_decimal = COALESCE(
    discount_decimal,
    discount_decimal,
    ROUND(discount, 2)
  ),
  total_decimal = COALESCE(total_decimal, total_decimal, ROUND(total, 2));
ALTER TABLE ServiceOrderItem
ADD COLUMN IF NOT EXISTS unit_price_decimal NUMERIC;
UPDATE ServiceOrderItem
SET quantity_decimal = COALESCE(
    quantity_decimal,
    quantity_decimal,
    ROUND(quantity, 3)
  ),
  unit_price_decimal = COALESCE(
    unit_price_decimal,
    unitPrice_decimal,
    ROUND(unit_price, 2)
  ),
  discount_decimal = COALESCE(
    discount_decimal,
    discount_decimal,
    ROUND(discount, 2)
  ),
  total_decimal = COALESCE(total_decimal, total_decimal, ROUND(total, 2));
ALTER TABLE Service
ADD COLUMN IF NOT EXISTS default_price_decimal NUMERIC;
UPDATE Service
SET default_price_decimal = COALESCE(
    default_price_decimal,
    defaultPrice_decimal,
    ROUND(default_price, 2)
  );
ALTER TABLE WarrantyClaim
ADD COLUMN IF NOT EXISTS refund_amount_decimal NUMERIC;
ALTER TABLE WarrantyClaim
ADD COLUMN IF NOT EXISTS replacement_cost_decimal NUMERIC;
UPDATE WarrantyClaim
SET refund_amount_decimal = COALESCE(
    refund_amount_decimal,
    refundAmount_decimal,
    ROUND(refund_amount, 2)
  ),
  replacement_cost_decimal = COALESCE(
    replacement_cost_decimal,
    replacementCost_decimal,
    ROUND(replacement_cost, 2)
  );
-- 4) Simple validation queries: verify no NULLs where we expect values (manual check)
-- SELECT COUNT(*) FROM Product WHERE salePrice_decimal IS NULL;
-- SELECT COUNT(*) FROM Sale WHERE total_decimal IS NULL;
COMMIT;
-- Post-migration manual checklist:
-- 1) Run the validation queries and compare sums between old and new columns.
-- 2) Deploy application code that reads *_decimal columns (feature-flagged).
-- 3) Run staging load tests and financial reports to confirm parity.
-- 4) After validation, schedule a cleanup migration to
--    - either DROP old Float columns (SQLite >= 3.35 supports DROP COLUMN),
--    - or CREATE a new table with final schema, COPY data and swap tables atomically.
-- 5) Add CHECK constraints and triggers in a follow-up migration after data is normalized.