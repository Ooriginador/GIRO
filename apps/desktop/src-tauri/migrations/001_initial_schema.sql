-- Migration: 001_initial_schema
-- Description: Schema inicial completo do sistema GIRO
-- Created: 2026-01-08
-- ═══════════════════════════════════════════════════════════════════════════
-- CATEGORIAS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT 'package',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE
    SET NULL
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);
-- ═══════════════════════════════════════════════════════════════════════════
-- FORNECEDORES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    trade_name TEXT,
    cnpj TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_suppliers_cnpj ON suppliers(cnpj)
WHERE cnpj IS NOT NULL;
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUTOS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    barcode TEXT UNIQUE,
    internal_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'UNIT',
    is_weighted BOOLEAN NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    current_stock REAL NOT NULL DEFAULT 0,
    min_stock REAL NOT NULL DEFAULT 0,
    max_stock REAL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    category_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_internal_code ON products(internal_code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_low_stock ON products(current_stock, min_stock)
WHERE is_active = 1;
-- ═══════════════════════════════════════════════════════════════════════════
-- LOTES DE PRODUTOS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS product_lots (
    id TEXT PRIMARY KEY NOT NULL,
    lot_number TEXT,
    expiration_date TEXT,
    manufacturing_date TEXT,
    purchase_date TEXT NOT NULL DEFAULT (datetime('now')),
    initial_quantity REAL NOT NULL,
    current_quantity REAL NOT NULL,
    cost_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    -- AVAILABLE, EXPIRED, SOLD_OUT
    product_id TEXT NOT NULL,
    supplier_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE
    SET NULL
);
CREATE INDEX idx_lots_product ON product_lots(product_id);
CREATE INDEX idx_lots_expiration ON product_lots(expiration_date);
CREATE INDEX idx_lots_status ON product_lots(status);
-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIONÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    email TEXT,
    pin TEXT NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'CASHIER',
    -- ADMIN, MANAGER, CASHIER, VIEWER
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_employees_cpf ON employees(cpf)
WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX idx_employees_pin ON employees(pin);
CREATE INDEX idx_employees_active ON employees(is_active);
-- ═══════════════════════════════════════════════════════════════════════════
-- SESSÕES DE CAIXA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    opened_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT,
    opening_balance REAL NOT NULL DEFAULT 0,
    expected_balance REAL,
    actual_balance REAL,
    difference REAL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    -- OPEN, CLOSED
    notes TEXT,
    employee_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT
);
CREATE INDEX idx_sessions_employee ON cash_sessions(employee_id);
CREATE INDEX idx_sessions_status ON cash_sessions(status);
CREATE INDEX idx_sessions_opened ON cash_sessions(opened_at);
-- ═══════════════════════════════════════════════════════════════════════════
-- MOVIMENTAÇÕES DE CAIXA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    -- ENTRY, WITHDRAWAL, SUPPLY, WITHDRAWAL_FUND
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES cash_sessions (id) ON DELETE CASCADE
);
CREATE INDEX idx_movements_session ON cash_movements(session_id);
CREATE INDEX idx_movements_type ON cash_movements(type);
-- ═══════════════════════════════════════════════════════════════════════════
-- VENDAS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL,
    -- CASH, PIX, CREDIT, DEBIT, OTHER
    amount_paid REAL NOT NULL,
    change_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    -- COMPLETED, CANCELLED
    cancelled_at TEXT,
    cancellation_reason TEXT,
    session_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES cash_sessions (id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT
);
CREATE INDEX idx_sales_session ON sales(session_id);
CREATE INDEX idx_sales_employee ON sales(employee_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_payment ON sales(payment_method);
-- ═══════════════════════════════════════════════════════════════════════════
-- ITENS DE VENDA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    lot_id TEXT,
    FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    FOREIGN KEY (lot_id) REFERENCES product_lots (id) ON DELETE
    SET NULL
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
-- ═══════════════════════════════════════════════════════════════════════════
-- MOVIMENTAÇÕES DE ESTOQUE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    -- ENTRY, EXIT, ADJUSTMENT, RETURN, LOSS
    quantity REAL NOT NULL,
    reason TEXT,
    reference_id TEXT,
    -- ID da venda, entrada, etc
    product_id TEXT NOT NULL,
    lot_id TEXT,
    employee_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    FOREIGN KEY (lot_id) REFERENCES product_lots (id) ON DELETE
    SET NULL,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE
    SET NULL
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);
-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIGURAÇÕES
-- ═══════════════════════════════════════════════════════════════════════════
-- NOTA: Schema atualizado em migration 002_fix_settings_schema.sql
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'STRING',
    group_name TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    updated_by_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_settings_group ON settings(group_name);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_updated ON settings(updated_at);
-- ═══════════════════════════════════════════════════════════════════════════
-- ALERTAS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    -- EXPIRATION_CRITICAL, EXPIRATION_WARNING, LOW_STOCK, OUT_OF_STOCK
    severity TEXT NOT NULL,
    -- CRITICAL, WARNING, INFO
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    product_id TEXT,
    lot_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT 0,
    is_dismissed BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES product_lots (id) ON DELETE CASCADE
);
CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_alerts_status ON alerts(is_read, is_dismissed);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at);
-- ═══════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS
-- ═══════════════════════════════════════════════════════════════════════════
-- O administrador deve ser criado no primeiro acesso via tela de setup do sistema.
-- Categoria padrão
INSERT
    OR IGNORE INTO categories (id, name, description, color, icon)
VALUES (
        'default-category',
        'Sem Categoria',
        'Categoria padrão para produtos',
        '#94a3b8',
        'package'
    );
-- Configurações padrão
INSERT
    OR IGNORE INTO settings (id, key, value, type, group_name)
VALUES (
        'setting-company',
        'company_name',
        'Minha Mercearia',
        'STRING',
        'general'
    ),
    (
        'setting-printer',
        'printer_enabled',
        'false',
        'BOOLEAN',
        'printer'
    ),
    (
        'setting-scale',
        'scale_enabled',
        'false',
        'BOOLEAN',
        'scale'
    ),
    (
        'setting-stock',
        'allow_negative_stock',
        'false',
        'BOOLEAN',
        'pdv'
    );