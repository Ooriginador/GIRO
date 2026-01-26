-- ═══════════════════════════════════════════════════════════════════════════════
-- GIRO Enterprise Module - Database Schema
-- Módulo de Almoxarifado Industrial para empresas EPC
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTRACTS (Contratos/Obras)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    client_name TEXT,
    client_document TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED')),
    start_date TEXT,
    end_date TEXT,
    budget REAL DEFAULT 0,
    manager_id TEXT REFERENCES employees(id),
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_contracts_code ON contracts(code);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_manager ON contracts(manager_id);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(is_active);

-- ═══════════════════════════════════════════════════════════════════════════════
-- WORK FRONTS (Frentes de Trabalho)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS work_fronts (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'COMPLETED')),
    supervisor_id TEXT REFERENCES employees(id),
    location TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE(contract_id, code)
);

CREATE INDEX IF NOT EXISTS idx_work_fronts_contract ON work_fronts(contract_id);
CREATE INDEX IF NOT EXISTS idx_work_fronts_supervisor ON work_fronts(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_work_fronts_status ON work_fronts(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ACTIVITIES (Atividades/Tarefas)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    work_front_id TEXT NOT NULL REFERENCES work_fronts(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    unit TEXT NOT NULL DEFAULT 'UNIT',
    planned_qty REAL NOT NULL DEFAULT 0,
    executed_qty REAL NOT NULL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    cost_center TEXT,
    start_date TEXT,
    end_date TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE(work_front_id, code)
);

CREATE INDEX IF NOT EXISTS idx_activities_work_front ON activities(work_front_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_cost_center ON activities(cost_center);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STOCK LOCATIONS (Locais de Estoque)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_locations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    location_type TEXT NOT NULL DEFAULT 'WAREHOUSE' CHECK (location_type IN ('CENTRAL', 'WAREHOUSE', 'WORK_FRONT', 'TRANSIT')),
    contract_id TEXT REFERENCES contracts(id),
    work_front_id TEXT REFERENCES work_fronts(id),
    address TEXT,
    responsible_id TEXT REFERENCES employees(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_code ON stock_locations(code);
CREATE INDEX IF NOT EXISTS idx_stock_locations_type ON stock_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_stock_locations_contract ON stock_locations(contract_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STOCK BALANCES (Saldos por Local)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_balances (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES stock_locations(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL DEFAULT 0,
    reserved_qty REAL NOT NULL DEFAULT 0,
    min_qty REAL DEFAULT 0,
    max_qty REAL,
    last_count_date TEXT,
    last_count_qty REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(location_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_location ON stock_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_product ON stock_balances(product_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MATERIAL REQUESTS (Requisições de Material)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS material_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT NOT NULL,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    work_front_id TEXT REFERENCES work_fronts(id),
    activity_id TEXT REFERENCES activities(id),
    requester_id TEXT NOT NULL REFERENCES employees(id),
    approver_id TEXT REFERENCES employees(id),
    separator_id TEXT REFERENCES employees(id),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'SEPARATING', 'SEPARATED', 'DELIVERED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    needed_date TEXT,
    approved_at TEXT,
    separated_at TEXT,
    delivered_at TEXT,
    rejection_reason TEXT,
    notes TEXT,
    source_location_id TEXT REFERENCES stock_locations(id),
    destination_location_id TEXT REFERENCES stock_locations(id),
    total_items INTEGER NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE(contract_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_material_requests_number ON material_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_material_requests_contract ON material_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_work_front ON material_requests(work_front_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_requester ON material_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_approver ON material_requests(approver_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MATERIAL REQUEST ITEMS (Itens da Requisição)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS material_request_items (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    requested_qty REAL NOT NULL,
    approved_qty REAL,
    separated_qty REAL,
    delivered_qty REAL,
    unit_price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_material_request_items_request ON material_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_material_request_items_product ON material_request_items(product_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STOCK TRANSFERS (Transferências entre Locais)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY,
    transfer_number TEXT NOT NULL UNIQUE,
    source_location_id TEXT NOT NULL REFERENCES stock_locations(id),
    destination_location_id TEXT NOT NULL REFERENCES stock_locations(id),
    requester_id TEXT NOT NULL REFERENCES employees(id),
    approver_id TEXT REFERENCES employees(id),
    shipper_id TEXT REFERENCES employees(id),
    receiver_id TEXT REFERENCES employees(id),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT,
    shipped_at TEXT,
    received_at TEXT,
    rejection_reason TEXT,
    notes TEXT,
    total_items INTEGER NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_number ON stock_transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON stock_transfers(source_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_destination ON stock_transfers(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STOCK TRANSFER ITEMS (Itens da Transferência)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    requested_qty REAL NOT NULL,
    shipped_qty REAL,
    received_qty REAL,
    unit_price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_product ON stock_transfer_items(product_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MATERIAL CONSUMPTION (Consumo de Material por Atividade)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS material_consumptions (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    request_id TEXT REFERENCES material_requests(id),
    request_item_id TEXT REFERENCES material_request_items(id),
    quantity REAL NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    consumed_at TEXT NOT NULL DEFAULT (datetime('now')),
    consumed_by_id TEXT NOT NULL REFERENCES employees(id),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_material_consumptions_activity ON material_consumptions(activity_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_product ON material_consumptions(product_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_request ON material_consumptions(request_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_date ON material_consumptions(consumed_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INVENTORY COUNTS (Contagens de Inventário)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_counts (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES stock_locations(id),
    count_type TEXT NOT NULL DEFAULT 'FULL' CHECK (count_type IN ('FULL', 'ROTATING', 'SPOT')),
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    started_by_id TEXT NOT NULL REFERENCES employees(id),
    completed_by_id TEXT REFERENCES employees(id),
    total_items INTEGER NOT NULL DEFAULT 0,
    items_counted INTEGER NOT NULL DEFAULT 0,
    discrepancies INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_location ON inventory_counts(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_status ON inventory_counts(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INVENTORY COUNT ITEMS (Itens da Contagem)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_count_items (
    id TEXT PRIMARY KEY,
    count_id TEXT NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    system_qty REAL NOT NULL,
    counted_qty REAL,
    difference REAL,
    counted_at TEXT,
    counted_by_id TEXT REFERENCES employees(id),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_count_items_count ON inventory_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_inventory_count_items_product ON inventory_count_items(product_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENTERPRISE SETTINGS (Configurações do Módulo)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO settings (id, key, value, type, group_name, description, created_at, updated_at)
VALUES 
    (lower(hex(randomblob(16))), 'enterprise.enabled', 'false', 'BOOLEAN', 'enterprise', 'Habilita o módulo Enterprise', datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'enterprise.require_approval', 'true', 'BOOLEAN', 'enterprise', 'Exigir aprovação para requisições', datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'enterprise.auto_reserve_stock', 'true', 'BOOLEAN', 'enterprise', 'Reservar estoque ao aprovar requisição', datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'enterprise.approval_limit', '5000', 'NUMBER', 'enterprise', 'Limite de aprovação sem gerente (R$)', datetime('now'), datetime('now')),
    (lower(hex(randomblob(16))), 'enterprise.default_priority', 'NORMAL', 'STRING', 'enterprise', 'Prioridade padrão de requisições', datetime('now'), datetime('now'));
