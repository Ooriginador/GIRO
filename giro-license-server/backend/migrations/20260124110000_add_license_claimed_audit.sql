-- Migration: 20260124110000_add_license_claimed_audit
-- Description: Add license_claimed to audit_action enum
-- Note: ALTER TYPE ADD VALUE cannot be run inside a transaction block in PostgreSQL < 12
-- Using IF NOT EXISTS handles idempotency
ALTER TYPE audit_action
ADD VALUE IF NOT EXISTS 'license_claimed';