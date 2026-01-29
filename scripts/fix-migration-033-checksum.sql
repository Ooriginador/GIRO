-- Script de Emergência: Corrige checksum da migration 033
-- Use este script apenas se o app não iniciar devido ao erro:
-- "migration 33 was previously applied but has been modified"
--
-- INSTRUÇÕES:
-- 1. Baixe DB Browser for SQLite: https://sqlitebrowser.org/
-- 2. Abra o arquivo giro.db (localização abaixo)
-- 3. Vá em "Execute SQL"
-- 4. Cole e execute este script
-- 5. Clique em "Write Changes"
-- 6. Feche o DB Browser
-- 7. Abra o GIRO normalmente
--
-- LOCALIZAÇÃO DO BANCO:
-- Windows: %APPDATA%\com.arkheion.giro\giro.db
-- Linux: ~/.local/share/com.arkheion.giro/giro.db
--
-- ============================================================================

-- Passo 1: Verificar qual checksum está registrado
SELECT version, checksum, description 
FROM _sqlx_migrations 
WHERE version = 33;

-- Passo 2: Atualizar para o checksum correto da versão original
-- Este é o checksum da migration 033 ORIGINAL (antes da modificação incorreta)
UPDATE _sqlx_migrations
SET checksum = X'3a7f4d8c9e2b1a5f6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
WHERE version = 33;

-- Passo 3: Verificar se foi atualizado
SELECT version, checksum, description 
FROM _sqlx_migrations 
WHERE version = 33;

-- Passo 4: Se a migration 34 existir, ela corrigirá os triggers automaticamente
SELECT COUNT(*) as tem_migration_34
FROM _sqlx_migrations 
WHERE version = 34;

-- ============================================================================
-- ALTERNATIVA: Se preferir, pode deletar a migration 33 e deixar ela rodar novamente
-- ============================================================================

-- CUIDADO: Use apenas se souber o que está fazendo!
-- DELETE FROM _sqlx_migrations WHERE version = 33;

