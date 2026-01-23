-- Migration: 20260114_add_mercadopago_provider
-- Created: 2026-01-14
-- Description: Add mercadopago to payment_provider enum
BEGIN;
ALTER TYPE payment_provider
ADD VALUE IF NOT EXISTS 'mercadopago';
COMMIT;