-- Migration: Catálogo de Serviços - Motopeças
-- Criado em: 2026-01-09

CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    default_price REAL NOT NULL DEFAULT 0,
    estimated_time INTEGER, -- em minutos
    default_warranty_days INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
