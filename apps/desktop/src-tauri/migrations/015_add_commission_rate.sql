-- Migration: 015_add_commission_rate
-- Description: Adiciona coluna de taxa de comissão aos funcionários
-- Created: 2026-01-20

ALTER TABLE employees ADD COLUMN commission_rate REAL DEFAULT 0.0;
