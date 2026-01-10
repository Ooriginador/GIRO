-- Migration: Ordens de Serviço - Motopeças
-- Criado em: 2026-01-09

-- ═══════════════════════════════════════════════════════════════════════════
-- SEQUÊNCIA PARA NÚMERO DA ORDEM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS _service_order_sequence (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    next_number INTEGER NOT NULL DEFAULT 1
);

-- Inicializa a sequência
INSERT OR IGNORE INTO _service_order_sequence (id, next_number) VALUES (1, 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- ORDENS DE SERVIÇO
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_orders (
    id TEXT PRIMARY KEY,
    order_number INTEGER NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    customer_vehicle_id TEXT NOT NULL,
    vehicle_year_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    vehicle_km INTEGER,
    symptoms TEXT,
    diagnosis TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    labor_cost REAL NOT NULL DEFAULT 0,
    parts_cost REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    warranty_days INTEGER NOT NULL DEFAULT 0,
    warranty_until TEXT,
    scheduled_date TEXT,
    started_at TEXT,
    completed_at TEXT,
    payment_method TEXT,
    is_paid INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    internal_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (customer_vehicle_id) REFERENCES customer_vehicles(id),
    FOREIGN KEY (vehicle_year_id) REFERENCES vehicle_years(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_service_orders_number ON service_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_vehicle ON service_orders(customer_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_employee ON service_orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created ON service_orders(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- SERVIÇOS DA ORDEM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS order_services (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    description TEXT NOT NULL,
    employee_id TEXT,
    unit_price REAL NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    discount_percent REAL NOT NULL DEFAULT 0,
    discount_value REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_order_services_order ON order_services(order_id);
CREATE INDEX IF NOT EXISTS idx_order_services_employee ON order_services(employee_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUTOS DA ORDEM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS order_products (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    lot_id TEXT,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_percent REAL NOT NULL DEFAULT 0,
    discount_value REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (lot_id) REFERENCES product_lots(id)
);

CREATE INDEX IF NOT EXISTS idx_order_products_order ON order_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_products_product ON order_products(product_id);
CREATE INDEX IF NOT EXISTS idx_order_products_lot ON order_products(lot_id);
