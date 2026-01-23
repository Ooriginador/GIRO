-- Seeds for Production Admin
-- Description: Create production admin account for jhonslife
-- Created: 2026-01-11

-- IMPORTANT: Run this script to create your admin account
-- After running, you can login at the dashboard

BEGIN;

-- Create Admin: jhonslife
-- Password: Will be set via registration or this hash
-- Use this to generate new hash: cargo run --example generate_hash -- "YOUR_PASSWORD"

INSERT INTO admins (
    id, 
    email, 
    password_hash, 
    name, 
    phone,
    company_name, 
    is_active, 
    is_verified,
    verified_at,
    created_at
)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',  -- Fixed UUID for consistency
    'jhonslife@arkheion.com.br',
    -- Hash for 'Admin@GIRO2026!' (Argon2id)
    '$argon2id$v=19$m=19456,t=2,p=1$B7oh6yEAReGu1RRnPdIRqA$qcpm3YFtaL8EVPnNUydGsB7w1939ImReGNVuOspkyLQ',
    'Jhonslife',
    '+55 11 99999-9999',
    'Arkheion Corp',
    TRUE,
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    company_name = EXCLUDED.company_name,
    is_active = TRUE,
    is_verified = TRUE,
    verified_at = COALESCE(admins.verified_at, NOW());

-- Create initial API Key for Desktop testing
INSERT INTO api_keys (
    id,
    admin_id,
    key_hash,
    key_prefix,
    name,
    created_at
)
VALUES (
    'd47ac10b-58cc-4372-a567-0e02b2c3d480',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    -- This is a placeholder hash, the actual key will be generated on first login
    '0000000000000000000000000000000000000000000000000000000000000000',
    'giro_dev_xxx',
    'Desktop Dev Key',
    NOW()
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- CREDENTIALS:
-- ============================================================================
-- Email: jhonslife@arkheion.com.br
-- Password: Admin@GIRO2026!
-- 
-- IMPORTANT: Change this password after first login!
-- Go to Settings > Security > Change Password
-- ============================================================================
