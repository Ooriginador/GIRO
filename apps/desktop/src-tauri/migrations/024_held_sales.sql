-- Migration: 024_held_sales
-- Description: Tabelas para persistência de vendas pausadas no PDV
-- Created: 2026-01-24
CREATE TABLE IF NOT EXISTS held_sales (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT,
  discount_value REAL NOT NULL DEFAULT 0,
  discount_reason TEXT,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  employee_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE
  SET NULL,
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS held_sale_items (
  id TEXT PRIMARY KEY NOT NULL,
  held_sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  barcode TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  is_weighted BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (held_sale_id) REFERENCES held_sales (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
CREATE INDEX idx_held_sales_employee ON held_sales(employee_id);
CREATE INDEX idx_held_sales_created ON held_sales(created_at);
CREATE INDEX idx_held_sale_items_sale ON held_sale_items(held_sale_id);