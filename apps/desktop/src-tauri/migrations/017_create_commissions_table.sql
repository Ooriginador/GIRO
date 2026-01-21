-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    amount REAL NOT NULL,
    rate_snapshot REAL NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(employee_id) REFERENCES employees(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commissions_employee_id ON commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_sale_id ON commissions(sale_id);
