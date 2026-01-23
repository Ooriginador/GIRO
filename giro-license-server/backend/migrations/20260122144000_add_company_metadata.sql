-- Migration: 20260122144000_add_company_metadata
-- Created: 2026-01-22
-- Description: Add CNPJ, City and State fields to admins table for complete sync
-- Fixed: Added IF NOT EXISTS checks and transaction wrapper
BEGIN;
-- Add company_cnpj if not exists
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'admins'
    AND column_name = 'company_cnpj'
) THEN
ALTER TABLE admins
ADD COLUMN company_cnpj VARCHAR(20);
END IF;
END $$;
-- Add company_address_city if not exists
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'admins'
    AND column_name = 'company_address_city'
) THEN
ALTER TABLE admins
ADD COLUMN company_address_city VARCHAR(100);
END IF;
END $$;
-- Add company_address_state if not exists
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'admins'
    AND column_name = 'company_address_state'
) THEN
ALTER TABLE admins
ADD COLUMN company_address_state VARCHAR(2);
END IF;
END $$;
-- Add company_address if not exists
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'admins'
    AND column_name = 'company_address'
) THEN
ALTER TABLE admins
ADD COLUMN company_address VARCHAR(255);
END IF;
END $$;
COMMIT;