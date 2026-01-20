-- Migration: 014_create_service_order_items_compat
-- Purpose: compatibility shim for older code/tests expecting `service_order_items` table
-- Non-destructive: uses IF NOT EXISTS and columns that cover both order_products and order_services
CREATE TABLE IF NOT EXISTS service_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT,
  lot_id TEXT,
  description TEXT,
  employee_id TEXT,
  item_type TEXT NOT NULL DEFAULT 'PRODUCT',
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  discount_value REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (lot_id) REFERENCES product_lots(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
CREATE INDEX IF NOT EXISTS idx_service_order_items_order ON service_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_items_product ON service_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_service_order_items_item_type ON service_order_items(item_type);