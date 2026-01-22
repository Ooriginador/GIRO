-- Migration: 019_fix_os_status_default
-- Description: Padroniza o status das ordens de serviço para 'OPEN' e migra status antigos
-- Created: 2026-01-22

-- 1. Atualizar status 'pending' (default antigo) para 'OPEN'
UPDATE service_orders SET status = 'OPEN' WHERE status = 'pending';

-- 2. Garantir que outros status estejam em uppercase (caso haja inconsistências manuais)
UPDATE service_orders SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE service_orders SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE service_orders SET status = 'DELIVERED' WHERE status = 'delivered';
UPDATE service_orders SET status = 'CANCELED' WHERE status = 'canceled';
