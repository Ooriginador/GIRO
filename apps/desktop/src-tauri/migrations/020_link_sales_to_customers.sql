-- Migration: 018_link_sales_to_customers
-- Description: Adds customer_id to sales table to link sales directly to customers
-- Created: 2026-01-22

-- Add customer_id column (nullable, as legacy sales or anonymous sales might exist)
ALTER TABLE sales ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
