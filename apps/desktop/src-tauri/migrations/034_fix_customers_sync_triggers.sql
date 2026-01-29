-- Migration: Fix customers sync triggers to use correct column names
-- Corrige os triggers de sincronização de customers que estavam referenciando
-- colunas inexistentes (cpf_cnpj -> cpf, address -> campos desmembrados)
-- Created: 2026-01-28

-- Drop existing broken triggers
DROP TRIGGER IF EXISTS trigger_customers_sync_version_insert;
DROP TRIGGER IF EXISTS trigger_customers_sync_version_update;

-- Recreate insert trigger with correct columns
CREATE TRIGGER IF NOT EXISTS trigger_customers_sync_version_insert
AFTER INSERT ON customers
BEGIN
    UPDATE customers SET sync_version = 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'customer',
        NEW.id,
        'create',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'phone2', NEW.phone2,
            'cpf', NEW.cpf,
            'zip_code', NEW.zip_code,
            'street', NEW.street,
            'number', NEW.number,
            'complement', NEW.complement,
            'neighborhood', NEW.neighborhood,
            'city', NEW.city,
            'state', NEW.state,
            'notes', NEW.notes,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        1
    );
END;

-- Recreate update trigger with correct columns
CREATE TRIGGER IF NOT EXISTS trigger_customers_sync_version_update
AFTER UPDATE ON customers
WHEN OLD.sync_version = NEW.sync_version
BEGIN
    UPDATE customers SET sync_version = OLD.sync_version + 1 WHERE id = NEW.id;
    INSERT OR REPLACE INTO sync_pending (id, entity_type, entity_id, operation, data, local_version)
    VALUES (
        lower(hex(randomblob(16))),
        'customer',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'phone2', NEW.phone2,
            'cpf', NEW.cpf,
            'zip_code', NEW.zip_code,
            'street', NEW.street,
            'number', NEW.number,
            'complement', NEW.complement,
            'neighborhood', NEW.neighborhood,
            'city', NEW.city,
            'state', NEW.state,
            'notes', NEW.notes,
            'is_active', NEW.is_active,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        ),
        OLD.sync_version + 1
    );
END;
