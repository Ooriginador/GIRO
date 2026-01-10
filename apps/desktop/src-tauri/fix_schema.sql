-- Fix vehicle_brands
ALTER TABLE vehicle_brands ADD COLUMN fipe_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_brands_fipe_code_key ON vehicle_brands(fipe_code);

-- Fix vehicle_models
ALTER TABLE vehicle_models ADD COLUMN fipe_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_models_fipe_code_key ON vehicle_models(fipe_code);

-- Fix vehicle_years
ALTER TABLE vehicle_years ADD COLUMN fipe_code TEXT;
ALTER TABLE vehicle_years ADD COLUMN fuel_type TEXT DEFAULT 'GASOLINE';
CREATE INDEX IF NOT EXISTS vehicle_years_fipe_code_idx ON vehicle_years(fipe_code);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_years_model_id_year_fuel_type_key ON vehicle_years(model_id, year, fuel_type);

-- Create product_compatibilities
CREATE TABLE IF NOT EXISTS product_compatibilities (
    id TEXT NOT NULL PRIMARY KEY,
    product_id TEXT NOT NULL,
    vehicle_year_id TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by_id TEXT,
    notes TEXT,
    position TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (vehicle_year_id) REFERENCES vehicle_years (id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS product_compatibilities_product_vehicle_key ON product_compatibilities(product_id, vehicle_year_id);
CREATE INDEX IF NOT EXISTS product_compatibilities_product_id_idx ON product_compatibilities(product_id);
CREATE INDEX IF NOT EXISTS product_compatibilities_vehicle_year_id_idx ON product_compatibilities(vehicle_year_id);

-- Create warranty_claims
CREATE TABLE IF NOT EXISTS warranty_claims (
    id TEXT NOT NULL PRIMARY KEY,
    customer_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    sale_item_id TEXT,
    order_item_id TEXT,
    product_id TEXT,
    description TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    resolution TEXT,
    resolved_by_id TEXT,
    resolved_at DATETIME,
    refund_amount REAL,
    replacement_cost REAL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS warranty_claims_customer_id_idx ON warranty_claims(customer_id);
CREATE INDEX IF NOT EXISTS warranty_claims_status_idx ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS warranty_claims_source_type_idx ON warranty_claims(source_type);
CREATE INDEX IF NOT EXISTS warranty_claims_created_at_idx ON warranty_claims(created_at);

-- Fix products (add Motoparts fields)
ALTER TABLE products ADD COLUMN oem_code TEXT;
ALTER TABLE products ADD COLUMN aftermarket_code TEXT;
ALTER TABLE products ADD COLUMN part_brand TEXT;
ALTER TABLE products ADD COLUMN application TEXT;
CREATE INDEX IF NOT EXISTS products_oem_code_idx ON products(oem_code);
CREATE INDEX IF NOT EXISTS products_part_brand_idx ON products(part_brand);
