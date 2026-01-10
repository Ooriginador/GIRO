-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Fix Settings Schema
-- Descrição: Corrigir schema da tabela settings para match com modelo Rust
-- Data: 2026-01-10
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Criar nova tabela com schema correto
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE settings_new (
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

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Migrar dados existentes da tabela antiga
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO settings_new (id, key, value, type, group_name, created_at, updated_at)
SELECT 
    lower(hex(randomblob(16))) as id,  -- Gerar UUID simples
    key,
    value,
    'STRING' as type,                   -- Tipo padrão
    category as group_name,             -- Mapear category → group_name
    datetime('now') as created_at,
    updated_at
FROM settings;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Substituir tabela antiga pela nova
-- ────────────────────────────────────────────────────────────────────────────

DROP TABLE settings;
ALTER TABLE settings_new RENAME TO settings;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Recriar índices para performance
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_settings_group ON settings(group_name);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_updated ON settings(updated_at);

COMMIT;
