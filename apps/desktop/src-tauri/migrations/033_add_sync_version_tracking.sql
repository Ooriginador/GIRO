-- Migration: 033_add_sync_version_tracking.sql
-- Description: Add sync_version column to entities for multi-PC sync conflict detection
-- Author: Arkheion Corp
-- Date: 2026-01-28

-- ============================================================================
-- ADD SYNC VERSION TO CORE ENTITIES
-- ============================================================================

-- Products: Primary entity for sync
ALTER TABLE products ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- Categories
ALTER TABLE categories ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- Suppliers
ALTER TABLE suppliers ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- Customers
ALTER TABLE customers ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- Employees (sync with caution - no passwords)
ALTER TABLE employees ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- Settings
ALTER TABLE settings ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- CREATE SYNC CURSOR TABLE (LOCAL)
-- Tracks last sync point for each entity type
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_cursors (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_type TEXT NOT NULL UNIQUE,
    last_synced_version INTEGER NOT NULL DEFAULT 0,
    last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initialize cursors for all entity types
INSERT OR IGNORE INTO sync_cursors (id, entity_type, last_synced_version) VALUES
    (lower(hex(randomblob(16))), 'product', 0),
    (lower(hex(randomblob(16))), 'category', 0),
    (lower(hex(randomblob(16))), 'supplier', 0),
    (lower(hex(randomblob(16))), 'customer', 0),
    (lower(hex(randomblob(16))), 'employee', 0),
    (lower(hex(randomblob(16))), 'setting', 0);

-- ============================================================================
-- CREATE SYNC PENDING QUEUE
-- Tracks local changes that need to be pushed to server
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_pending (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    data TEXT, -- JSON blob of entity data
    local_version INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_pending_entity_type ON sync_pending(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_pending_created_at ON sync_pending(created_at);

-- ============================================================================
-- TRIGGERS TO AUTO-INCREMENT SYNC VERSION AND QUEUE PENDING CHANGES
-- ============================================================================

-- Products
CREATE TRIGGER IF NOT EXISTS trigger_products_sync_version_insert
AFTER INSERT ON products
BEGIN
    UPDATE products SET sync_version = 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'product',
        NEW.id,
        'create',
        json_object(
            'id', NEW.id,
            'barcode', NEW.barcode,
            'internal_code', NEW.internal_code,
            'name', NEW.name,
            'description', NEW.description,
            'notes', NEW.notes,
            'unit', NEW.unit,
            'is_weighted', NEW.is_weighted,
            'sale_price', NEW.sale_price,
            'cost_price', NEW.cost_price,
            'current_stock', NEW.current_stock,
            'min_stock', NEW.min_stock,
            'max_stock', NEW.max_stock,
            'is_active', NEW.is_active,
            'category_id', NEW.category_id,
            'oem_code', NEW.oem_code,
            'aftermarket_code', NEW.aftermarket_code,
            'part_brand', NEW.part_brand,
            'application', NEW.application,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        1
    );
END;

CREATE TRIGGER IF NOT EXISTS trigger_products_sync_version_update
AFTER UPDATE ON products
WHEN OLD.sync_version = NEW.sync_version -- Only if not a sync-applied update
BEGIN
    UPDATE products SET sync_version = OLD.sync_version + 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'product',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'barcode', NEW.barcode,
            'internal_code', NEW.internal_code,
            'name', NEW.name,
            'description', NEW.description,
            'notes', NEW.notes,
            'unit', NEW.unit,
            'is_weighted', NEW.is_weighted,
            'sale_price', NEW.sale_price,
            'cost_price', NEW.cost_price,
            'current_stock', NEW.current_stock,
            'min_stock', NEW.min_stock,
            'max_stock', NEW.max_stock,
            'is_active', NEW.is_active,
            'category_id', NEW.category_id,
            'oem_code', NEW.oem_code,
            'aftermarket_code', NEW.aftermarket_code,
            'part_brand', NEW.part_brand,
            'application', NEW.application,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        OLD.sync_version + 1
    );
END;

-- Categories
CREATE TRIGGER IF NOT EXISTS trigger_categories_sync_version_insert
AFTER INSERT ON categories
BEGIN
    UPDATE categories SET sync_version = 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'category',
        NEW.id,
        'create',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'description', NEW.description,
            'color', NEW.color,
            'icon', NEW.icon,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        1
    );
END;

CREATE TRIGGER IF NOT EXISTS trigger_categories_sync_version_update
AFTER UPDATE ON categories
WHEN OLD.sync_version = NEW.sync_version
BEGIN
    UPDATE categories SET sync_version = OLD.sync_version + 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'category',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'description', NEW.description,
            'color', NEW.color,
            'icon', NEW.icon,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        OLD.sync_version + 1
    );
END;

-- Suppliers
CREATE TRIGGER IF NOT EXISTS trigger_suppliers_sync_version_insert
AFTER INSERT ON suppliers
BEGIN
    UPDATE suppliers SET sync_version = 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'supplier',
        NEW.id,
        'create',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'trade_name', NEW.trade_name,
            'cnpj', NEW.cnpj,
            'email', NEW.email,
            'phone', NEW.phone,
            'address', NEW.address,
            'notes', NEW.notes,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        1
    );
END;

CREATE TRIGGER IF NOT EXISTS trigger_suppliers_sync_version_update
AFTER UPDATE ON suppliers
WHEN OLD.sync_version = NEW.sync_version
BEGIN
    UPDATE suppliers SET sync_version = OLD.sync_version + 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'supplier',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'trade_name', NEW.trade_name,
            'cnpj', NEW.cnpj,
            'email', NEW.email,
            'phone', NEW.phone,
            'address', NEW.address,
            'notes', NEW.notes,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        OLD.sync_version + 1
    );
END;

-- Customers
CREATE TRIGGER IF NOT EXISTS trigger_customers_sync_version_insert
AFTER INSERT ON customers
BEGIN
    UPDATE customers SET sync_version = 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'customer',
        NEW.id,
        'create',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'phone2', NEW.phone2,
            'cpf', NEW.cpf,
            'zip_code', NEW.zip_code,
            'street', NEW.street,
            'number', NEW.number,
            'complement', NEW.complement,
            'neighborhood', NEW.neighborhood,
            'city', NEW.city,
            'state', NEW.state,
            'notes', NEW.notes,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        1
    );
END;

CREATE TRIGGER IF NOT EXISTS trigger_customers_sync_version_update
AFTER UPDATE ON customers
WHEN OLD.sync_version = NEW.sync_version
BEGIN
    UPDATE customers SET sync_version = OLD.sync_version + 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'customer',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'phone2', NEW.phone2,
            'cpf', NEW.cpf,
            'zip_code', NEW.zip_code,
            'street', NEW.street,
            'number', NEW.number,
            'complement', NEW.complement,
            'neighborhood', NEW.neighborhood,
            'city', NEW.city,
            'state', NEW.state,
            'notes', NEW.notes,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        OLD.sync_version + 1
    );
END;

-- Settings
CREATE TRIGGER IF NOT EXISTS trigger_settings_sync_version_insert
AFTER INSERT ON settings
BEGIN
    UPDATE settings SET sync_version = 1 WHERE key = NEW.key;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'setting',
        NEW.key,
        'create',
        json_object(
            'key', NEW.key,
            'value', NEW.value,
            'description', NEW.description,
            'updated_at', NEW.updated_at
        ),
        1
    );
END;

CREATE TRIGGER IF NOT EXISTS trigger_settings_sync_version_update
AFTER UPDATE ON settings
WHEN OLD.sync_version = NEW.sync_version
BEGIN
    UPDATE settings SET sync_version = OLD.sync_version + 1 WHERE key = NEW.key;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'setting',
        NEW.key,
        'update',
        json_object(
            'key', NEW.key,
            'value', NEW.value,
            'description', NEW.description,
            'updated_at', NEW.updated_at
        ),
        OLD.sync_version + 1
    );
END;

-- ============================================================================
-- INDICES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_sync_version ON products(sync_version);
CREATE INDEX IF NOT EXISTS idx_categories_sync_version ON categories(sync_version);
CREATE INDEX IF NOT EXISTS idx_suppliers_sync_version ON suppliers(sync_version);
CREATE INDEX IF NOT EXISTS idx_customers_sync_version ON customers(sync_version);
CREATE INDEX IF NOT EXISTS idx_employees_sync_version ON employees(sync_version);
CREATE INDEX IF NOT EXISTS idx_settings_sync_version ON settings(sync_version);
