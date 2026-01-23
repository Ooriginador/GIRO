-- Add backups table for cloud backup storage
-- Each backup is linked to a license and optionally an admin

CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    file_key TEXT NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries by license
CREATE INDEX IF NOT EXISTS idx_backups_license_id ON backups(license_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
