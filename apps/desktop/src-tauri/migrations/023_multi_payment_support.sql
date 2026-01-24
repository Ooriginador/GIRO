-- Migration: 021_multi_payment_support
-- Description: Adiciona suporte a múltiplos métodos de pagamento por venda
-- Created: 2026-01-24
CREATE TABLE IF NOT EXISTS sale_payments (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL,
  method TEXT NOT NULL,
  -- CASH, PIX, CREDIT, DEBIT, VOUCHER, OTHER
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
);
CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX idx_sale_payments_method ON sale_payments(method);
CREATE INDEX idx_sale_payments_created ON sale_payments(created_at);
-- Migração de dados existentes: cria um registro de pagamento para cada venda atual
INSERT INTO sale_payments (id, sale_id, method, amount, created_at)
SELECT 'PAY-' || id,
  id,
  payment_method,
  total,
  created_at
FROM sales;