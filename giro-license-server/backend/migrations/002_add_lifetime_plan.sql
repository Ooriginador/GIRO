-- Migration: 002_add_lifetime_plan
-- Created: 2026-01-11
-- Description: Add lifetime plan type for perpetual licenses

BEGIN;

-- Add lifetime to plan_type enum
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'lifetime';

-- Add columns for lifetime license tracking
ALTER TABLE licenses 
ADD COLUMN IF NOT EXISTS support_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS can_offline BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS offline_activated_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN licenses.support_expires_at IS 'For lifetime licenses: when 2-year support period ends';
COMMENT ON COLUMN licenses.can_offline IS 'Whether this license can work fully offline (after validation period)';
COMMENT ON COLUMN licenses.offline_activated_at IS 'When the license transitioned to offline mode';

-- Create index for support expiration queries
CREATE INDEX IF NOT EXISTS idx_licenses_support_expires 
ON licenses(support_expires_at) 
WHERE support_expires_at IS NOT NULL;

COMMIT;
