-- Migration: Add company metadata to admins
-- Created: 2026-01-22
-- Description: Add CNPJ, City and State fields to admins table for complete sync

ALTER TABLE admins
ADD COLUMN company_cnpj VARCHAR(20),
ADD COLUMN company_address_city VARCHAR(100),
ADD COLUMN company_address_state VARCHAR(2);

-- Update existing column if needed or just leave as is (company_address already exists in some contexts but let's check repo)
-- Actually, the initial schema had 'company_name'. Let's add 'company_address' if it doesn't exist.
-- Looking at migrations/001_initial_schema.sql: 
-- company_name    VARCHAR(100),
-- It didn't have company_address.

ALTER TABLE admins
ADD COLUMN company_address VARCHAR(255);
