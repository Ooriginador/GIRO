-- Migration: 019_fix_service_order_items_view
-- Description: Converts service_order_items from a static table to a dynamic VIEW
-- Created: 2026-01-22

-- 1. Drop the incorrect static table created in migration 014
DROP TABLE IF EXISTS service_order_items;

-- 2. Create the VIEW that dynamically aggregates both services and products
CREATE VIEW IF NOT EXISTS service_order_items AS
SELECT 
    -- ID construction: prefix to ensure uniqueness between tables
    'SVC_' || os.id as id,
    os.order_id,
    NULL as product_id,
    NULL as lot_id,
    os.description,
    os.employee_id,
    'SERVICE' as item_type,
    os.quantity,
    os.unit_price,
    os.discount_percent,
    os.discount_value,
    os.subtotal,
    os.total,
    os.notes,
    os.created_at,
    os.updated_at
FROM order_services os

UNION ALL

SELECT 
    -- ID construction
    'PRD_' || op.id as id,
    op.order_id,
    op.product_id,
    op.lot_id,
    p.name as description,
    op.employee_id,
    'PRODUCT' as item_type,
    op.quantity,
    op.unit_price,
    op.discount_percent,
    op.discount_value,
    op.subtotal,
    op.total,
    NULL as notes,
    op.created_at,
    op.updated_at
FROM order_products op
LEFT JOIN products p ON p.id = op.product_id;
