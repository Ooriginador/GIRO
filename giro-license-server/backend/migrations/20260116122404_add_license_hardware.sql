-- Migration: 20260116122404_add_license_hardware
-- Description: Create license_hardware table for 1:N relationship between licenses and hardware
-- Fixed: Added IF NOT EXISTS, BEGIN/COMMIT transaction
BEGIN;
-- Create license_hardware table for 1:N relationship
CREATE TABLE IF NOT EXISTS license_hardware (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    hardware_id VARCHAR NOT NULL,
    machine_name VARCHAR,
    os_version VARCHAR,
    cpu_info VARCHAR,
    activations_count INTEGER DEFAULT 1,
    last_activated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add unique constraint if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uk_license_hardware'
) THEN
ALTER TABLE license_hardware
ADD CONSTRAINT uk_license_hardware UNIQUE (license_id, hardware_id);
END IF;
END $$;
-- Index for fast lookups (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_license_hardware_license ON license_hardware(license_id);
CREATE INDEX IF NOT EXISTS idx_license_hardware_hwid ON license_hardware(hardware_id);
-- Mark old hardware_id column as deprecated
COMMENT ON COLUMN licenses.hardware_id IS 'DEPRECATED: Use license_hardware table';
-- Add max_hardware support if not exists
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'licenses'
        AND column_name = 'max_hardware'
) THEN
ALTER TABLE licenses
ADD COLUMN max_hardware INTEGER DEFAULT 1;
END IF;
END $$;
COMMIT;