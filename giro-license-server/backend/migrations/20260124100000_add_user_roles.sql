-- Migration: 20260124100000_add_user_roles.sql
-- Description: Add user roles to admins table to distinguish between Staff and Customers
BEGIN;
-- Create role enum
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'customer');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Add role column with default 'customer'
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'customer';
-- Update the jhonslife admin to have the 'admin' role
UPDATE admins
SET role = 'admin'
WHERE email = 'ooriginador@gmail.com';
COMMIT;