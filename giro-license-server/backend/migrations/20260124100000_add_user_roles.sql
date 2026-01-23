-- Migration: 20260124100000_add_user_roles
-- Description: Add user roles to admins table to distinguish between Staff and Customers
-- Fixed: Improved error handling and idempotency
BEGIN;
-- Create role enum if not exists
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'customer');
EXCEPTION
WHEN duplicate_object THEN -- Type already exists, ignore
NULL;
END $$;
-- Add role column with default 'customer' if not exists
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'admins'
    AND column_name = 'role'
) THEN
ALTER TABLE admins
ADD COLUMN role user_role NOT NULL DEFAULT 'customer';
END IF;
END $$;
-- Update the admin user to have the 'admin' role
UPDATE admins
SET role = 'admin'
WHERE email = 'ooriginador@gmail.com'
  AND role != 'admin';
COMMIT;