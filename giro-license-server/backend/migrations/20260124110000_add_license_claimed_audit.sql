-- Migration: 20260124110000_add_license_claimed_audit
-- Description: Add license_claimed to audit_action enum
ALTER TYPE audit_action
ADD VALUE IF NOT EXISTS 'license_claimed';