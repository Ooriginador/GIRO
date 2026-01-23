-- Migration: 20260123100000_normalize_emails.sql
-- Description: Normalize all existing admin emails to lowercase to prevent case-sensitivity issues during login.
BEGIN;
-- Update all existing emails to lowercase
-- This may fail if there are duplicates that only differ by case, 
-- but given the 'Credenciais inválidas' report, it's more likely users are just using different casing.
UPDATE admins
SET email = LOWER(email),
  updated_at = NOW()
WHERE email != LOWER(email);
COMMIT;