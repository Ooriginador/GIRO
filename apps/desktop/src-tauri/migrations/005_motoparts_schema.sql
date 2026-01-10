-- Migration: Motopeças - Clientes e Veículos
-- Criado em: 2026-01-09

-- ═══════════════════════════════════════════════════════════════════════════
-- MARCAS DE VEÍCULOS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vehicle_brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_brands_name ON vehicle_brands(name);
CREATE INDEX IF NOT EXISTS idx_vehicle_brands_active ON vehicle_brands(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- MODELOS DE VEÍCULOS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vehicle_models (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    engine_size TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES vehicle_brands(id),
    UNIQUE(brand_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand ON vehicle_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_name ON vehicle_models(name);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_active ON vehicle_models(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- ANOS DE VEÍCULOS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vehicle_years (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    year_label TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (model_id) REFERENCES vehicle_models(id),
    UNIQUE(model_id, year)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_years_model ON vehicle_years(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_years_year ON vehicle_years(year);
CREATE INDEX IF NOT EXISTS idx_vehicle_years_active ON vehicle_years(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- CLIENTES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    zip_code TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- VEÍCULOS DOS CLIENTES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    vehicle_year_id TEXT NOT NULL,
    plate TEXT,
    chassis TEXT,
    renavam TEXT,
    color TEXT,
    current_km INTEGER,
    nickname TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (vehicle_year_id) REFERENCES vehicle_years(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer ON customer_vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_year ON customer_vehicles(vehicle_year_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_plate ON customer_vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_active ON customer_vehicles(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPATIBILIDADE PRODUTO-VEÍCULO
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_compatibility (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    vehicle_year_id TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (vehicle_year_id) REFERENCES vehicle_years(id),
    UNIQUE(product_id, vehicle_year_id)
);

CREATE INDEX IF NOT EXISTS idx_product_compat_product ON product_compatibility(product_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_vehicle ON product_compatibility(vehicle_year_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_verified ON product_compatibility(is_verified);
