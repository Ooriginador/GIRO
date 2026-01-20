ALTER TABLE order_products ADD COLUMN employee_id TEXT REFERENCES employees(id);
