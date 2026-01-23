-- Migration: 001_initial_schema
-- Updated for Full Idempotency
BEGIN;
-- UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- Enum: license_status
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'license_status'
) THEN CREATE TYPE license_status AS ENUM (
    'pending',
    'active',
    'expired',
    'suspended',
    'revoked'
);
END IF;
END $$;
-- Enum: plan_type
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'plan_type'
) THEN CREATE TYPE plan_type AS ENUM ('monthly', 'semiannual', 'annual');
END IF;
END $$;
-- Enum: payment_status
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'payment_status'
) THEN CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);
END IF;
END $$;
-- Enum: payment_provider
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'payment_provider'
) THEN CREATE TYPE payment_provider AS ENUM ('stripe', 'pix', 'manual');
END IF;
END $$;
-- Enum: audit_action
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'audit_action'
) THEN CREATE TYPE audit_action AS ENUM (
    'login',
    'logout',
    'login_failed',
    'password_reset',
    'license_created',
    'license_activated',
    'license_validated',
    'license_validation_failed',
    'license_transferred',
    'license_suspended',
    'license_revoked',
    'hardware_registered',
    'hardware_conflict',
    'hardware_cleared',
    'payment_created',
    'payment_completed',
    'payment_failed'
);
END IF;
END $$;
-- Tables
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    totp_secret VARCHAR(32),
    totp_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS hardware (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint VARCHAR(64) NOT NULL UNIQUE,
    machine_name VARCHAR(100),
    os_version VARCHAR(50),
    cpu_info VARCHAR(100),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(25) NOT NULL UNIQUE,
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    hardware_id UUID REFERENCES hardware(id) ON DELETE
    SET NULL,
        plan_type plan_type NOT NULL DEFAULT 'monthly',
        status license_status NOT NULL DEFAULT 'pending',
        activated_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        last_validated TIMESTAMPTZ,
        validation_count BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sales_total DECIMAL(15, 2) DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    average_ticket DECIMAL(10, 2) DEFAULT 0,
    products_sold INTEGER DEFAULT 0,
    low_stock_count INTEGER DEFAULT 0,
    expiring_count INTEGER DEFAULT 0,
    cash_opens INTEGER DEFAULT 0,
    cash_closes INTEGER DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_license_date UNIQUE (license_id, date)
);
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    provider payment_provider NOT NULL,
    provider_id VARCHAR(100),
    status payment_status NOT NULL DEFAULT 'pending',
    licenses_count INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    receipt_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE
    SET NULL,
        license_id UUID REFERENCES licenses(id) ON DELETE
    SET NULL,
        action audit_action NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    device_name VARCHAR(100),
    ip_address TEXT,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indices
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone)
WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_hardware_fingerprint ON hardware(fingerprint);
CREATE INDEX IF NOT EXISTS idx_hardware_active ON hardware(is_active);
CREATE INDEX IF NOT EXISTS idx_hardware_last_seen ON hardware(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_admin ON licenses(admin_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expires ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_licenses_hardware ON licenses(hardware_id)
WHERE hardware_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(status, expires_at)
WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_metrics_license ON metrics(license_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_license_date ON metrics(license_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_admin ON payments(admin_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_id)
WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_license ON audit_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_details ON audit_logs USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_refresh_admin ON refresh_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_active ON refresh_tokens(admin_id, is_revoked)
WHERE is_revoked = FALSE;
-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_admins_updated_at'
) THEN CREATE TRIGGER update_admins_updated_at BEFORE
UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_licenses_updated_at'
) THEN CREATE TRIGGER update_licenses_updated_at BEFORE
UPDATE ON licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;
END $$;
COMMIT;