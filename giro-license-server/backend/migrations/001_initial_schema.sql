-- Migration: 001_initial_schema
-- Created: 2026-01-09
-- Description: Initial database schema with enums and base tables

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE license_status AS ENUM (
    'pending',      -- Created, awaiting activation
    'active',       -- Activated and working
    'expired',      -- Expired due to non-payment
    'suspended',    -- Suspended for some reason
    'revoked'       -- Permanently revoked
);

CREATE TYPE plan_type AS ENUM (
    'monthly',      -- Monthly
    'semiannual',   -- Semiannual
    'annual'        -- Annual
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);

CREATE TYPE payment_provider AS ENUM (
    'stripe',
    'pix',
    'manual'
);

CREATE TYPE audit_action AS ENUM (
    -- Auth
    'login',
    'logout',
    'login_failed',
    'password_reset',
    
    -- Licenses
    'license_created',
    'license_activated',
    'license_validated',
    'license_validation_failed',
    'license_transferred',
    'license_suspended',
    'license_revoked',
    
    -- Hardware
    'hardware_registered',
    'hardware_conflict',
    'hardware_cleared',
    
    -- Payments
    'payment_created',
    'payment_completed',
    'payment_failed'
);

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================

CREATE TABLE admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    company_name    VARCHAR(100),
    
    -- Verification
    is_verified     BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    
    -- 2FA (optional)
    totp_secret     VARCHAR(32),
    totp_enabled    BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active       BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_phone ON admins(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- ============================================================================
-- HARDWARE TABLE
-- ============================================================================

CREATE TABLE hardware (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint     VARCHAR(64) NOT NULL UNIQUE, -- SHA256 of Hardware ID
    
    -- Machine info
    machine_name    VARCHAR(100),
    os_version      VARCHAR(50),
    cpu_info        VARCHAR(100),
    
    -- Tracking
    first_seen      TIMESTAMPTZ DEFAULT NOW(),
    last_seen       TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    ip_address      TEXT,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hardware_fingerprint ON hardware(fingerprint);
CREATE INDEX idx_hardware_active ON hardware(is_active);
CREATE INDEX idx_hardware_last_seen ON hardware(last_seen DESC);

-- ============================================================================
-- LICENSES TABLE
-- ============================================================================

CREATE TABLE licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key     VARCHAR(25) NOT NULL UNIQUE, -- GIRO-XXXX-XXXX-XXXX-XXXX
    
    -- Relationships
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    hardware_id     UUID REFERENCES hardware(id) ON DELETE SET NULL,
    
    -- Plan
    plan_type       plan_type NOT NULL DEFAULT 'monthly',
    status          license_status NOT NULL DEFAULT 'pending',
    
    -- Important dates
    activated_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    last_validated  TIMESTAMPTZ,
    
    -- Counters
    validation_count BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_admin ON licenses(admin_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires ON licenses(expires_at);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id) WHERE hardware_id IS NOT NULL;
CREATE INDEX idx_licenses_active ON licenses(status, expires_at) WHERE status = 'active';

-- ============================================================================
-- METRICS TABLE
-- ============================================================================

CREATE TABLE metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id      UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    
    -- Reference date
    date            DATE NOT NULL,
    
    -- Sales
    sales_total     DECIMAL(15, 2) DEFAULT 0,
    sales_count     INTEGER DEFAULT 0,
    average_ticket  DECIMAL(10, 2) DEFAULT 0,
    
    -- Products
    products_sold   INTEGER DEFAULT 0,
    
    -- Stock (optional)
    low_stock_count INTEGER DEFAULT 0,
    expiring_count  INTEGER DEFAULT 0,
    
    -- Cash
    cash_opens      INTEGER DEFAULT 0,
    cash_closes     INTEGER DEFAULT 0,
    
    -- Sync info
    synced_at       TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    CONSTRAINT unique_license_date UNIQUE (license_id, date)
);

CREATE INDEX idx_metrics_license ON metrics(license_id);
CREATE INDEX idx_metrics_date ON metrics(date DESC);
CREATE INDEX idx_metrics_license_date ON metrics(license_id, date DESC);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    
    -- Values
    amount          DECIMAL(10, 2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'BRL',
    
    -- Provider
    provider        payment_provider NOT NULL,
    provider_id     VARCHAR(100), -- External ID (Stripe, etc)
    
    -- Status
    status          payment_status NOT NULL DEFAULT 'pending',
    
    -- Affected licenses
    licenses_count  INTEGER NOT NULL DEFAULT 1,
    
    -- Metadata
    description     TEXT,
    receipt_url     TEXT,
    
    -- Timestamps
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_admin ON payments(admin_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References (optional)
    admin_id        UUID REFERENCES admins(id) ON DELETE SET NULL,
    license_id      UUID REFERENCES licenses(id) ON DELETE SET NULL,
    
    -- Action
    action          audit_action NOT NULL,
    
    -- Context
    ip_address      TEXT,
    user_agent      TEXT,
    
    -- Details in JSON
    details         JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_license ON audit_logs(license_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_details ON audit_logs USING GIN (details);

-- ============================================================================
-- REFRESH_TOKENS TABLE (Sessions)
-- ============================================================================

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    
    token_hash      VARCHAR(64) NOT NULL, -- SHA256 of token
    
    -- Expiration
    expires_at      TIMESTAMPTZ NOT NULL,
    
    -- Device tracking
    device_name     VARCHAR(100),
    ip_address      TEXT,
    user_agent      TEXT,
    
    -- Status
    is_revoked      BOOLEAN DEFAULT FALSE,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_refresh_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_admin ON refresh_tokens(admin_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_active ON refresh_tokens(admin_id, is_revoked) WHERE is_revoked = FALSE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on admins
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
