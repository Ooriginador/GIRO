-- Migration: 029_create_inventories_table
-- Description: Cria tabelas para inventário geral (PDV)
-- Created: 2026-01-27

CREATE TABLE IF NOT EXISTS inventories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL, -- 'in_progress', 'finished', 'cancelled'
    category_filter TEXT,
    section_filter TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    started_by TEXT NOT NULL,
    finished_by TEXT,
    total_products INTEGER NOT NULL DEFAULT 0,
    counted_products INTEGER NOT NULL DEFAULT 0,
    divergent_products INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (started_by) REFERENCES employees(id),
    FOREIGN KEY (finished_by) REFERENCES employees(id)
);

CREATE INDEX idx_inventories_status ON inventories(status);
CREATE INDEX idx_inventories_created ON inventories(created_at);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY NOT NULL,
    inventory_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    lot_id TEXT, -- Nullable
    expected_quantity REAL NOT NULL DEFAULT 0,
    counted_quantity REAL NOT NULL DEFAULT 0,
    divergence REAL NOT NULL DEFAULT 0,
    notes TEXT,
    counted_by TEXT NOT NULL,
    counted_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (counted_by) REFERENCES employees(id)
);

CREATE INDEX idx_inventory_items_inventory ON inventory_items(inventory_id);
-- Unique index to support ON CONFLICT(inventory_id, product_id, COALESCE(lot_id, ''))
CREATE UNIQUE INDEX idx_inventory_items_unique 
ON inventory_items(inventory_id, product_id, COALESCE(lot_id, ''));
