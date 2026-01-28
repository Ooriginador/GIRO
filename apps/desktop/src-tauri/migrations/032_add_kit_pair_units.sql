-- Migration: Adicionar unidades KIT e PAIR
-- Created: 2026-01-28

-- SQLite não valida enums em tempo de execução, então apenas documentamos
-- As validações são feitas no Rust via ProductUnit enum

-- Comentário explicativo:
-- ProductUnit agora inclui:
-- - UNIT, KILOGRAM, GRAM, LITER, MILLILITER
-- - METER, CENTIMETER, BOX, PACK, DOZEN
-- - KIT (novo): para conjuntos de produtos vendidos em kit
-- - PAIR (novo): para produtos vendidos em pares (ex: luvas, sapatos)

-- Nenhuma alteração estrutural necessária no banco
-- Os valores KIT e PAIR já são aceitos na coluna unit (TEXT)
