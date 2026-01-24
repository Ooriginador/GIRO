-- Migration 026: Add notes column to products table
-- This allows storing comments/notes about products
ALTER TABLE products
ADD COLUMN notes TEXT;