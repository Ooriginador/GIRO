-- Migration: 018_fix_product_units
-- Description: Padroniza as unidades de medida no banco de dados para SCREAMING_SNAKE_CASE
-- Created: 2026-01-22

UPDATE products SET unit = 'UNIT' WHERE unit = 'un';
UPDATE products SET unit = 'KILOGRAM' WHERE unit = 'kg';
UPDATE products SET unit = 'GRAM' WHERE unit = 'g';
UPDATE products SET unit = 'LITER' WHERE unit = 'L';
UPDATE products SET unit = 'MILLILITER' WHERE unit = 'ml';
UPDATE products SET unit = 'METER' WHERE unit = 'm';
UPDATE products SET unit = 'CENTIMETER' WHERE unit = 'cm';
UPDATE products SET unit = 'BOX' WHERE unit = 'cx';
UPDATE products SET unit = 'PACK' WHERE unit = 'pct';
UPDATE products SET unit = 'DOZEN' WHERE unit = 'dz';
