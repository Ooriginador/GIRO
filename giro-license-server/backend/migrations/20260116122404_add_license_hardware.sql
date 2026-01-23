-- Create license_hardware table for 1:N relationship
CREATE TABLE license_hardware (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    hardware_id VARCHAR NOT NULL,
    machine_name VARCHAR,
    os_version VARCHAR,
    cpu_info VARCHAR,
    activations_count INTEGER DEFAULT 1,
    last_activated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint to prevent duplicate hardware_id per license
    CONSTRAINT uk_license_hardware UNIQUE (license_id, hardware_id)
);

-- Index for fast lookups
CREATE INDEX idx_license_hardware_license ON license_hardware(license_id);
CREATE INDEX idx_license_hardware_hwid ON license_hardware(hardware_id);

-- Alter licenses table to relax hardware_id (keeping it for backward compat momentarily or deprecating)
-- We will make it nullable if it isn't already, but it likely is nullable or we just ignore it.
-- Actually, let's keep it as "primary" hardware or just ignore it in new logic.
-- For clarity, we will COMMENT on the column that it is deprecated.
COMMENT ON COLUMN licenses.hardware_id IS 'DEPRECATED: Use license_hardware table';

-- Add max_hardware support
ALTER TABLE licenses ADD COLUMN max_hardware INTEGER DEFAULT 1;
