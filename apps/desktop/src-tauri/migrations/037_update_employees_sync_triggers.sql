-- Migration: 037_update_employees_sync_triggers.sql
-- Description: Update sync triggers for employees to include username and password_changed_at
-- Author: Arkheion Corp
-- Date: 2026-01-30

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_employees_sync_version_insert;
DROP TRIGGER IF EXISTS trigger_employees_sync_version_update;
DROP TRIGGER IF EXISTS trigger_employees_sync_version_delete;

-- ============================================================================
-- EMPLOYEES SYNC TRIGGERS (MASTER ONLY)
-- These triggers only add to sync_pending when operation_mode = 'master'
-- ============================================================================

-- Trigger for INSERT
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
            'username', NEW.username,
            'passwordChangedAt', NEW.password_changed_at,
            'failedLoginAttempts', NEW.failed_login_attempts,
            'lockedUntil', NEW.locked_until,
            'role', NEW.role,
            'commissionRate', NEW.commission_rate,
            'isActive', NEW.is_active,
            'createdAt', NEW.created_at,
            'updatedAt', NEW.updated_at,
            'syncVersion', 1
        ),
        1
    );
END;

-- Trigger for UPDATE
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
            'username', NEW.username,
            'passwordChangedAt', NEW.password_changed_at,
            'failedLoginAttempts', NEW.failed_login_attempts,
            'lockedUntil', NEW.locked_until,
            'role', NEW.role,
            'commissionRate', NEW.commission_rate,
            'isActive', NEW.is_active,
            'createdAt', NEW.created_at,
            'updatedAt', NEW.updated_at,
            'syncVersion', OLD.sync_version + 1
        ),
        OLD.sync_version + 1
    );
END;

-- Trigger for DELETE (deactivation)
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
            'username', NEW.username,
            'passwordChangedAt', NEW.password_changed_at,
            'failedLoginAttempts', NEW.failed_login_attempts,
            'lockedUntil', NEW.locked_until,
            'role', NEW.role,
            'commissionRate', NEW.commission_rate,
            'isActive', 0,
            'createdAt', NEW.created_at,
            'updatedAt', NEW.updated_at,
            'syncVersion', OLD.sync_version + 1
        ),
        OLD.sync_version + 1
    );
END;
