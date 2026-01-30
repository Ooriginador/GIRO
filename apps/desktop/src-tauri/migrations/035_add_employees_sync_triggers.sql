-- Migration: 035_add_employees_sync_triggers.sql
-- Description: Add sync triggers for employees to enable password/PIN sync from Master to Satellites
-- Author: Arkheion Corp
-- Date: 2026-01-30
--
-- DESIGN DECISION:
-- Employee sync is UNIDIRECTIONAL: Master -> Satellites only
-- - Master pushes employee changes (name, role, PIN, password)
-- - Satellites receive and apply employee data from Master
-- - Satellites NEVER push employee changes back (triggers check operation_mode)
--
-- Security: PIN and password hashes are synced, not plaintext.
-- The Master is the single source of truth for employee credentials.

-- ============================================================================
-- EMPLOYEES SYNC TRIGGERS (MASTER ONLY)
-- These triggers only add to sync_pending when operation_mode = 'master'
-- ============================================================================

-- Trigger for INSERT: Only queue for sync if this PC is Master
CREATE TRIGGER IF NOT EXISTS trigger_employees_sync_version_insert
AFTER INSERT ON employees
WHEN (SELECT value FROM settings WHERE key = 'network.operation_mode') = 'master'
BEGIN
    UPDATE employees SET sync_version = 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'employee',
        NEW.id,
        'create',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'cpf', NEW.cpf,
            'phone', NEW.phone,
            'email', NEW.email,
            'pin', NEW.pin,
            'password', NEW.password,
            'role', NEW.role,
            'commission_rate', NEW.commission_rate,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at,
            'sync_version', 1
        ),
        1
    );
END;

-- Trigger for UPDATE: Only queue for sync if this PC is Master
CREATE TRIGGER IF NOT EXISTS trigger_employees_sync_version_update
AFTER UPDATE ON employees
WHEN (SELECT value FROM settings WHERE key = 'network.operation_mode') = 'master'
     AND OLD.sync_version = NEW.sync_version
BEGIN
    UPDATE employees SET sync_version = OLD.sync_version + 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'employee',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'cpf', NEW.cpf,
            'phone', NEW.phone,
            'email', NEW.email,
            'pin', NEW.pin,
            'password', NEW.password,
            'role', NEW.role,
            'commission_rate', NEW.commission_rate,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at,
            'sync_version', OLD.sync_version + 1
        ),
        OLD.sync_version + 1
    );
END;

-- Trigger for DELETE (deactivation): Only queue for sync if this PC is Master
-- Note: We don't actually delete employees, we deactivate them
CREATE TRIGGER IF NOT EXISTS trigger_employees_sync_version_delete
AFTER UPDATE ON employees
WHEN (SELECT value FROM settings WHERE key = 'network.operation_mode') = 'master'
     AND OLD.is_active = 1 AND NEW.is_active = 0
BEGIN
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'employee',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'cpf', NEW.cpf,
            'phone', NEW.phone,
            'email', NEW.email,
            'pin', NEW.pin,
            'password', NEW.password,
            'role', NEW.role,
            'commission_rate', NEW.commission_rate,
            'is_active', 0,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at,
            'sync_version', NEW.sync_version
        ),
        NEW.sync_version
    );
END;

-- ============================================================================
-- ENSURE SETTING EXISTS
-- ============================================================================

-- Insert default operation_mode if not exists (standalone = not syncing employees)
INSERT OR IGNORE INTO settings (key, value, description, updated_at)
VALUES ('network.operation_mode', 'standalone', 'Network operation mode: standalone, master, or satellite', datetime('now'));
