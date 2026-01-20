ALTER TABLE service_order_items ADD COLUMN employee_id TEXT REFERENCES employees(id);
