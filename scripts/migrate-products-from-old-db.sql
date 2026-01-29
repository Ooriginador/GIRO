-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE MIGRAÇÃO DE PRODUTOS - GIRO
-- Recupera produtos de banco antigo para banco novo
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUÇÕES:
-- 1. Abra o DB Browser for SQLite
-- 2. Abra o NOVO banco de dados (destino): %APPDATA%\com.arkheion.giro\giro.db
-- 3. Vá em File → Attach Database → Selecione o banco ANTIGO
-- 4. Dê um nome para o banco anexado (ex: "antigo")
-- 5. Execute este script adaptando "antigo." para o nome que você escolheu
-- 6. Salve as mudanças (Write Changes)
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 1: Listar tabelas do banco antigo para verificar estrutura
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute para ver as tabelas disponíveis no banco antigo:
-- SELECT name FROM antigo.sqlite_master WHERE type='table';

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 2: Verificar estrutura da tabela products no banco antigo
-- ═══════════════════════════════════════════════════════════════════════════
-- PRAGMA antigo.table_info(products);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 3: Migrar Categorias (se existirem)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order, is_active, created_at, updated_at)
SELECT 
    id,
    name,
    COALESCE(description, ''),
    COALESCE(color, '#6366f1'),
    COALESCE(icon, 'package'),
    COALESCE(sort_order, 0),
    COALESCE(is_active, 1),
    COALESCE(created_at, datetime('now')),
    COALESCE(updated_at, datetime('now'))
FROM antigo.categories;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 4: Criar categoria padrão caso não exista
-- ═══════════════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO categories (id, name, description, color, icon, is_active)
VALUES ('categoria-importada', 'Produtos Importados', 'Categoria para produtos migrados', '#10b981', 'archive', 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 5: Migrar Fornecedores (se existirem)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO suppliers (id, name, trade_name, cnpj, phone, email, address, city, state, notes, is_active, created_at, updated_at)
SELECT 
    id,
    name,
    trade_name,
    cnpj,
    phone,
    email,
    address,
    city,
    state,
    notes,
    COALESCE(is_active, 1),
    COALESCE(created_at, datetime('now')),
    COALESCE(updated_at, datetime('now'))
FROM antigo.suppliers;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 6: Migrar Produtos
-- ═══════════════════════════════════════════════════════════════════════════
-- OPÇÃO A: Se a estrutura for similar
INSERT OR IGNORE INTO products (
    id, barcode, internal_code, name, description, unit, is_weighted,
    sale_price, cost_price, current_stock, min_stock, max_stock,
    is_active, category_id, created_at, updated_at
)
SELECT 
    id,
    barcode,
    COALESCE(internal_code, 'IMP-' || SUBSTR(id, 1, 8)),
    name,
    description,
    COALESCE(unit, 'UNIT'),
    COALESCE(is_weighted, 0),
    COALESCE(sale_price, 0),
    COALESCE(cost_price, 0),
    COALESCE(current_stock, 0),
    COALESCE(min_stock, 0),
    max_stock,
    COALESCE(is_active, 1),
    COALESCE(category_id, 'categoria-importada'),
    COALESCE(created_at, datetime('now')),
    COALESCE(updated_at, datetime('now'))
FROM antigo.products;

-- ═══════════════════════════════════════════════════════════════════════════
-- OPÇÃO B: Se a estrutura for diferente (adapte os campos)
-- ═══════════════════════════════════════════════════════════════════════════
-- Primeiro verifique os campos com: PRAGMA antigo.table_info(products);
-- Depois adapte o INSERT acima conforme necessário

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 7: Verificar migração
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    'Produtos no banco antigo: ' || (SELECT COUNT(*) FROM antigo.products) as info
UNION ALL
SELECT 
    'Produtos no banco novo: ' || (SELECT COUNT(*) FROM products) as info
UNION ALL
SELECT 
    'Categorias no banco novo: ' || (SELECT COUNT(*) FROM categories) as info;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 8: Atualizar sync_version (se necessário)
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE products SET sync_version = 1 WHERE sync_version = 0;
UPDATE categories SET sync_version = 1 WHERE sync_version = 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPEZA: Desanexar banco antigo
-- ═══════════════════════════════════════════════════════════════════════════
-- DETACH DATABASE antigo;
