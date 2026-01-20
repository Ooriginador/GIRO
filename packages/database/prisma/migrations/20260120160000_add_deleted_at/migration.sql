-- Migration: add_deleted_at
-- Adds soft-delete column `deleted_at` to main tables and indexes
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
-- Categories
ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "categories_deleted_at_idx" ON "categories"("deleted_at");
-- Products
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "products_deleted_at_idx" ON "products"("deleted_at");
-- Product lots
ALTER TABLE "product_lots"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "product_lots_deleted_at_idx" ON "product_lots"("deleted_at");
-- Suppliers
ALTER TABLE "suppliers"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "suppliers_deleted_at_idx" ON "suppliers"("deleted_at");
-- Employees
ALTER TABLE "employees"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "employees_deleted_at_idx" ON "employees"("deleted_at");
-- Sales
ALTER TABLE "sales"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "sales_deleted_at_idx" ON "sales"("deleted_at");
-- Cash sessions
ALTER TABLE "cash_sessions"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "cash_sessions_deleted_at_idx" ON "cash_sessions"("deleted_at");
-- Customers
ALTER TABLE "customers"
ADD COLUMN IF NOT EXISTS "deleted_at" DATETIME;
CREATE INDEX IF NOT EXISTS "customers_deleted_at_idx" ON "customers"("deleted_at");
COMMIT;
PRAGMA foreign_keys = ON;