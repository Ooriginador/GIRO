-- Add signature column to material_requests for delivery proof
ALTER TABLE material_requests ADD COLUMN delivered_by_signature TEXT;
