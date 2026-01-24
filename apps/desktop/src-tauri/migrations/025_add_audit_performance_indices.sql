-- Performance indices for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_employee_id ON audit_logs(employee_id);
-- Performance indices for stock movement queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created ON stock_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
-- Composite index for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);