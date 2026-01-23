-- Migration: 20260110_create_api_keys
-- Description: API Keys table for external integrations
-- Fixed: Added IF NOT EXISTS for table and proper constraint handling
BEGIN;
-- API Keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(50) NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
-- Add unique constraint if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_key_prefix'
) THEN
ALTER TABLE api_keys
ADD CONSTRAINT unique_key_prefix UNIQUE (key_prefix);
END IF;
END $$;
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_admin_id ON api_keys(admin_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(admin_id)
WHERE revoked_at IS NULL;
COMMIT;