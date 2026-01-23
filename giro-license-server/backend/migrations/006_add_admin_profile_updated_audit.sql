-- Migration: 006_add_admin_profile_updated_audit
-- Description: Add admin_profile_updated to audit_action enum

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'admin_profile_updated';
