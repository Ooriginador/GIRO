-- Seeds for Development
-- Description: Test data (Admin, License, Hardware)

BEGIN;

-- 1. Create Admin
-- Password: "password123" (Argon2 hash)
INSERT INTO admins (id, email, password_hash, name, company_name, is_active, is_verified)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@giro.com.br',
    '$argon2id$v=19$m=4096,t=3,p=1$c2FsdHNalt$U/a7y+y5P2oJd7v/3+zEwQ',
    'Admin Local',
    'GIRO Desenvolvimento',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- 2. Create Hardware (Mock)
INSERT INTO hardware (id, fingerprint, machine_name, os_version, cpu_info, ip_address)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'hw_dev_fingerprint_123456',
    'DESKTOP-DEV',
    'Windows 11 Pro',
    'Intel Core i9-13900K',
    '192.168.1.100'
) ON CONFLICT (fingerprint) DO NOTHING;

-- 3. Create License (Active)
INSERT INTO licenses (
    id, license_key, admin_id, hardware_id, plan_type, status,
    activated_at, expires_at, validation_count
)
VALUES (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'GIRO-DEV1-TEST-ABCD-1234',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'annual',
    'active',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '335 days',
    42
) ON CONFLICT (license_key) DO NOTHING;

-- 4. Create Metrics (Last 30 days)
INSERT INTO metrics (
    license_id, date, sales_total, sales_count, average_ticket, products_sold
)
SELECT 
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    (random() * 1000 + 500)::DECIMAL(10,2), -- Sales between 500-1500
    (random() * 20 + 10)::INT,              -- 10-30 sales
    (random() * 50 + 20)::DECIMAL(10,2),    -- Ticket 20-70
    (random() * 50 + 20)::INT               -- 20-70 products
FROM generate_series(0, 30) n
ON CONFLICT (license_id, date) DO NOTHING;

COMMIT;
