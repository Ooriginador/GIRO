-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Módulo Motopeças
-- Adiciona suporte a veículos, compatibilidade de peças, clientes e ordens de serviço
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- CONFIGURAÇÃO DO NEGÓCIO
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "business_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_type" TEXT NOT NULL DEFAULT 'GROCERY',
    "features" TEXT NOT NULL,
    "labels" TEXT NOT NULL,
    "is_configured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ════════════════════════════════════════════════════════════════════════════
-- MARCAS DE VEÍCULOS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "vehicle_brands" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fipe_code" TEXT,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_brands_fipe_code_key" ON "vehicle_brands"("fipe_code");
CREATE INDEX IF NOT EXISTS "vehicle_brands_name_idx" ON "vehicle_brands"("name");
CREATE INDEX IF NOT EXISTS "vehicle_brands_is_active_idx" ON "vehicle_brands"("is_active");

-- ════════════════════════════════════════════════════════════════════════════
-- MODELOS DE VEÍCULOS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "vehicle_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand_id" TEXT NOT NULL,
    "fipe_code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT 'STREET',
    "engine_size" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("brand_id") REFERENCES "vehicle_brands" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_models_fipe_code_key" ON "vehicle_models"("fipe_code");
CREATE INDEX IF NOT EXISTS "vehicle_models_brand_id_idx" ON "vehicle_models"("brand_id");
CREATE INDEX IF NOT EXISTS "vehicle_models_name_idx" ON "vehicle_models"("name");
CREATE INDEX IF NOT EXISTS "vehicle_models_category_idx" ON "vehicle_models"("category");
CREATE INDEX IF NOT EXISTS "vehicle_models_is_active_idx" ON "vehicle_models"("is_active");

-- ════════════════════════════════════════════════════════════════════════════
-- ANOS DE VEÍCULOS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "vehicle_years" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "year_label" TEXT NOT NULL,
    "fipe_code" TEXT,
    "fuel_type" TEXT DEFAULT 'GASOLINE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("model_id") REFERENCES "vehicle_models" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "vehicle_years_model_id_idx" ON "vehicle_years"("model_id");
CREATE INDEX IF NOT EXISTS "vehicle_years_year_idx" ON "vehicle_years"("year");
CREATE INDEX IF NOT EXISTS "vehicle_years_fipe_code_idx" ON "vehicle_years"("fipe_code");
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_years_model_id_year_fuel_type_key" ON "vehicle_years"("model_id", "year", "fuel_type");

-- ════════════════════════════════════════════════════════════════════════════
-- COMPATIBILIDADE PEÇA ↔ VEÍCULO
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "product_compatibilities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "vehicle_year_id" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_id" TEXT,
    "notes" TEXT,
    "position" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("vehicle_year_id") REFERENCES "vehicle_years" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_compatibilities_product_vehicle_key" ON "product_compatibilities"("product_id", "vehicle_year_id");
CREATE INDEX IF NOT EXISTS "product_compatibilities_product_id_idx" ON "product_compatibilities"("product_id");
CREATE INDEX IF NOT EXISTS "product_compatibilities_vehicle_year_id_idx" ON "product_compatibilities"("vehicle_year_id");

-- ════════════════════════════════════════════════════════════════════════════
-- CAMPOS MOTOPEÇAS NO PRODUTO
-- ════════════════════════════════════════════════════════════════════════════

-- Adicionar campos específicos para motopeças na tabela de produtos
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "oem_code" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "aftermarket_code" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "part_brand" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "application" TEXT;

CREATE INDEX IF NOT EXISTS "products_oem_code_idx" ON "products"("oem_code");
CREATE INDEX IF NOT EXISTS "products_part_brand_idx" ON "products"("part_brand");

-- ════════════════════════════════════════════════════════════════════════════
-- CLIENTES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "zip_code" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "customers_cpf_key" ON "customers"("cpf");
CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers"("name");
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");
CREATE INDEX IF NOT EXISTS "customers_is_active_idx" ON "customers"("is_active");

-- ════════════════════════════════════════════════════════════════════════════
-- VEÍCULOS DO CLIENTE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "customer_vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "vehicle_year_id" TEXT NOT NULL,
    "plate" TEXT,
    "chassis" TEXT,
    "renavam" TEXT,
    "color" TEXT,
    "current_km" INTEGER,
    "nickname" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("vehicle_year_id") REFERENCES "vehicle_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_vehicles_customer_id_idx" ON "customer_vehicles"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_vehicles_vehicle_year_id_idx" ON "customer_vehicles"("vehicle_year_id");
CREATE INDEX IF NOT EXISTS "customer_vehicles_plate_idx" ON "customer_vehicles"("plate");
CREATE INDEX IF NOT EXISTS "customer_vehicles_is_active_idx" ON "customer_vehicles"("is_active");

-- ════════════════════════════════════════════════════════════════════════════
-- SERVIÇOS PRÉ-CADASTRADOS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_price" REAL NOT NULL,
    "estimated_time" INTEGER,
    "default_warranty_days" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "services_code_key" ON "services"("code");
CREATE INDEX IF NOT EXISTS "services_name_idx" ON "services"("name");
CREATE INDEX IF NOT EXISTS "services_is_active_idx" ON "services"("is_active");

-- ════════════════════════════════════════════════════════════════════════════
-- ORDENS DE SERVIÇO
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "service_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" INTEGER NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_vehicle_id" TEXT NOT NULL,
    "vehicle_year_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "vehicle_km" INTEGER,
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "labor_cost" REAL NOT NULL DEFAULT 0,
    "parts_cost" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "warranty_days" INTEGER NOT NULL DEFAULT 30,
    "warranty_until" DATETIME,
    "scheduled_date" DATETIME,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "payment_method" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("customer_vehicle_id") REFERENCES "customer_vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("vehicle_year_id") REFERENCES "vehicle_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "service_orders_customer_id_idx" ON "service_orders"("customer_id");
CREATE INDEX IF NOT EXISTS "service_orders_customer_vehicle_id_idx" ON "service_orders"("customer_vehicle_id");
CREATE INDEX IF NOT EXISTS "service_orders_vehicle_year_id_idx" ON "service_orders"("vehicle_year_id");
CREATE INDEX IF NOT EXISTS "service_orders_employee_id_idx" ON "service_orders"("employee_id");
CREATE INDEX IF NOT EXISTS "service_orders_status_idx" ON "service_orders"("status");
CREATE INDEX IF NOT EXISTS "service_orders_order_number_idx" ON "service_orders"("order_number");
CREATE INDEX IF NOT EXISTS "service_orders_created_at_idx" ON "service_orders"("created_at");

-- Sequência para número da OS
CREATE TABLE IF NOT EXISTS "_service_order_sequence" (
    "id" INTEGER PRIMARY KEY,
    "last_number" INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO "_service_order_sequence" ("id", "last_number") VALUES (1, 0);

-- ════════════════════════════════════════════════════════════════════════════
-- ITENS DA ORDEM DE SERVIÇO
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "service_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "item_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit_price" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "warranty_days" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("order_id") REFERENCES "service_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "service_order_items_order_id_idx" ON "service_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "service_order_items_product_id_idx" ON "service_order_items"("product_id");
CREATE INDEX IF NOT EXISTS "service_order_items_item_type_idx" ON "service_order_items"("item_type");

-- ════════════════════════════════════════════════════════════════════════════
-- GARANTIAS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "warranty_claims" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "sale_item_id" TEXT,
    "order_item_id" TEXT,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" DATETIME,
    "refund_amount" REAL,
    "replacement_cost" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "warranty_claims_customer_id_idx" ON "warranty_claims"("customer_id");
CREATE INDEX IF NOT EXISTS "warranty_claims_status_idx" ON "warranty_claims"("status");
CREATE INDEX IF NOT EXISTS "warranty_claims_source_type_idx" ON "warranty_claims"("source_type");
CREATE INDEX IF NOT EXISTS "warranty_claims_created_at_idx" ON "warranty_claims"("created_at");

-- ════════════════════════════════════════════════════════════════════════════
-- SEQUÊNCIA DE NÚMEROS DE OS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "_service_order_sequence" (
    "id" INTEGER PRIMARY KEY CHECK (id = 1),
    "last_number" INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO "_service_order_sequence" ("id", "last_number") VALUES (1, 0);
