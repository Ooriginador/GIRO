-- Migration: 20260117_add_backups_table
-- Description: Add backups table for cloud backup storage
-- Fixed: Already has IF NOT EXISTS, just adding transaction wrapper
BEGIN;
-- Add backups table for cloud backup storage
-- Each backup is linked to a license and optionally an admin
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE
    SET NULL,
        file_key TEXT NOT NULL,
        file_size_bytes BIGINT NOT NULL DEFAULT 0,
        checksum TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add unique constraint on file_key if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'backups_file_key_key'
) THEN
ALTER TABLE backups
ADD CONSTRAINT backups_file_key_key UNIQUE (file_key);
END IF;
EXCEPTION
WHEN duplicate_object THEN -- Constraint already exists, ignore
NULL;
END $$;
-- Index for efficient queries by license
CREATE INDEX IF NOT EXISTS idx_backups_license_id ON backups(license_id);
-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
COMMIT;