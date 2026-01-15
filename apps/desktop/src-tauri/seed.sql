-- Seed de dados para desenvolvimento/testes
-- Executar: sqlite3 giro.db < seed.sql
-- Limpar dados existentes (dev only)
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM cash_movements;
DELETE FROM cash_sessions;
DELETE FROM stock_movements;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM employees;
-- Funcionários de teste
-- PINs: Admin=8899, Gerente=5678, Caixa1=9999, Caixa2=1111
-- Hash SHA256
-- INSERT DE FUNCIONÁRIOS DE TESTE COMENTADO (DEV ONLY)
-- Se quiser reabilitar localmente, descomente o bloco abaixo em ambiente de desenvolvimento.
-- INSERT INTO employees (id, name, email, role, pin, is_active, created_at, updated_at) VALUES
--   ('emp-admin-001', 'Admin Sistema', 'admin@giro.com', 'ADMIN', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 1, datetime('now'), datetime('now')),
--   ('emp-manager-001', 'Gerente Loja', 'gerente@giro.com', 'MANAGER', 'f8638b979b2f4f793ddb6dbd197e0ee25a7a6ea32b0ae22f5e3c5d119d839e75', 1, datetime('now'), datetime('now')),
--   ('emp-cashier-001', 'Caixa 01', 'caixa01@giro.com', 'CASHIER', '888df25ae35772424a560c7152a1de794440e0ea5cfee62828333a456a506e05', 1, datetime('now'), datetime('now')),
--   ('emp-cashier-002', 'Caixa 02', 'caixa02@giro.com', 'CASHIER', '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c', 1, datetime('now'), datetime('now'));
-- Categorias de produtos
INSERT INTO categories (id, name, description, created_at, updated_at)
VALUES (
    'cat-hortifruti',
    'Hortifruti',
    'Frutas, verduras e legumes',
    datetime('now'),
    datetime('now')
  ),
  (
    'cat-acougue',
    'Açougue',
    'Carnes e frios',
    datetime('now'),
    datetime('now')
  ),
  (
    'cat-mercearia',
    'Mercearia',
    'Produtos secos e enlatados',
    datetime('now'),
    datetime('now')
  ),
  (
    'cat-limpeza',
    'Limpeza',
    'Produtos de limpeza',
    datetime('now'),
    datetime('now')
  ),
  (
    'cat-bebidas',
    'Bebidas',
    'Bebidas em geral',
    datetime('now'),
    datetime('now')
  );
-- Produtos de teste
INSERT INTO products (
    id,
    internal_code,
    name,
    barcode,
    category_id,
    sale_price,
    cost_price,
    unit,
    min_stock,
    current_stock,
    is_active,
    is_weighted,
    created_at,
    updated_at
  )
VALUES -- Produtos pesados
  (
    'prod-001',
    'P001',
    'Tomate',
    '2000001000001',
    'cat-hortifruti',
    8.90,
    5.50,
    'KG',
    20.0,
    50.0,
    1,
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-002',
    'P002',
    'Batata',
    '2000002000008',
    'cat-hortifruti',
    4.50,
    2.80,
    'KG',
    30.0,
    80.0,
    1,
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-003',
    'P003',
    'Banana Prata',
    '2000003000005',
    'cat-hortifruti',
    6.90,
    4.20,
    'KG',
    25.0,
    60.0,
    1,
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-004',
    'P004',
    'Carne Moída',
    '2000004000002',
    'cat-acougue',
    32.90,
    22.00,
    'KG',
    15.0,
    40.0,
    1,
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-005',
    'P005',
    'Queijo Mussarela',
    '2000005000009',
    'cat-acougue',
    45.90,
    32.00,
    'KG',
    10.0,
    25.0,
    1,
    1,
    datetime('now'),
    datetime('now')
  ),
  -- Produtos unitários
  (
    'prod-006',
    'P006',
    'Arroz 5kg',
    '7891234567890',
    'cat-mercearia',
    24.90,
    18.50,
    'UN',
    20.0,
    100.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-007',
    'P007',
    'Feijão 1kg',
    '7891234567891',
    'cat-mercearia',
    8.90,
    6.20,
    'UN',
    30.0,
    150.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-008',
    'P008',
    'Óleo 900ml',
    '7891234567892',
    'cat-mercearia',
    7.90,
    5.50,
    'UN',
    25.0,
    120.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-009',
    'P009',
    'Açúcar 1kg',
    '7891234567893',
    'cat-mercearia',
    4.50,
    3.20,
    'UN',
    40.0,
    200.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-010',
    'P010',
    'Café 500g',
    '7891234567894',
    'cat-mercearia',
    18.90,
    13.50,
    'UN',
    15.0,
    80.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-011',
    'P011',
    'Detergente 500ml',
    '7891234567895',
    'cat-limpeza',
    2.50,
    1.50,
    'UN',
    50.0,
    300.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-012',
    'P012',
    'Água Sanitária 1L',
    '7891234567896',
    'cat-limpeza',
    3.90,
    2.50,
    'UN',
    40.0,
    250.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-013',
    'P013',
    'Coca-Cola 2L',
    '7891234567897',
    'cat-bebidas',
    9.90,
    6.80,
    'UN',
    30.0,
    180.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-014',
    'P014',
    'Cerveja Lata 350ml',
    '7891234567898',
    'cat-bebidas',
    3.50,
    2.30,
    'UN',
    100.0,
    500.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    'prod-015',
    'P015',
    'Leite 1L',
    '7891234567899',
    'cat-bebidas',
    5.90,
    4.20,
    'UN',
    50.0,
    200.0,
    1,
    0,
    datetime('now'),
    datetime('now')
  );
-- Criar uma sessão de caixa aberta para testes
INSERT INTO cash_sessions (
    id,
    employee_id,
    employee_name,
    opened_at,
    opening_balance,
    status,
    created_at,
    updated_at
  )
VALUES (
    'session-test-001',
    'emp-admin-001',
    'Admin Sistema',
    datetime('now'),
    200.00,
    'OPEN',
    datetime('now'),
    datetime('now')
  );
SELECT 'Seed concluído com sucesso!' as resultado;
SELECT '✓ ' || COUNT(*) || ' funcionários criados'
FROM employees;
SELECT '✓ ' || COUNT(*) || ' categorias criadas'
FROM categories;
SELECT '✓ ' || COUNT(*) || ' produtos criados'
FROM products;
SELECT '✓ ' || COUNT(*) || ' sessões de caixa criadas'
FROM cash_sessions;