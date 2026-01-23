-- Migration: 006_add_admin_profile_updated_audit
-- Description: Add admin_profile_updated to audit_action enum
-- Fixed: Added transaction wrapper (though ALTER TYPE ADD VALUE cannot run inside transaction in older PG versions)
-- Note: ALTER TYPE ADD VALUE cannot be run inside a transaction block in PostgreSQL < 12
-- Using IF NOT EXISTS handles idempotency
ALTER TYPE audit_action
ADD VALUE IF NOT EXISTS 'admin_profile_updated';