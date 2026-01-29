# 🚨 Fix Emergencial - Migration 033

## Problema

Erro ao iniciar o GIRO:

```
panicked at src\main.rs:533:13:
Falha ao conectar com banco de dados: Erro de banco de dados:
migration 33 was previously applied but has been modified
```

## Causa

A migration 033 foi modificada após já ter sido aplicada em alguns bancos de dados. O SQLx detecta isso pelo checksum e rejeita a inicialização.

## Soluções Disponíveis

### 🎯 Solução 1: Script Automático (Windows)

**Mais rápido e seguro**

1. Feche o GIRO se estiver aberto
2. Execute o script: `scripts/fix-migration-033.ps1`
3. Abra o GIRO normalmente

O script:

- ✅ Faz backup automático do banco
- ✅ Remove a migration 033 problemática
- ✅ Permite que o app reaplique com checksum correto

### 🛠️ Solução 2: Manual com DB Browser

**Se o script automático não funcionar**

1. Baixe [DB Browser for SQLite](https://sqlitebrowser.org/dl/)
2. Abra o banco de dados em:
   - **Windows**: `%APPDATA%\com.arkheion.giro\giro.db`
   - **Linux**: `~/.local/share/com.arkheion.giro/giro.db`
3. Vá em **Execute SQL**
4. Cole e execute:
   ```sql
   DELETE FROM _sqlx_migrations WHERE version = 33;
   ```
5. Clique em **Write Changes**
6. Feche o DB Browser
7. Abra o GIRO normalmente

### ⚠️ Solução 3: Reset Total (Perde Dados)

**Apenas se as outras não funcionarem**

1. Feche o GIRO
2. Delete o arquivo do banco:
   - **Windows**: `%APPDATA%\com.arkheion.giro\giro.db`
   - **Linux**: `~/.local/share/com.arkheion.giro/giro.db`
3. Abra o GIRO (criará novo banco vazio)

## Solução Definitiva

Atualize para a versão **v2.4.11 ou superior** onde este problema foi corrigido permanentemente.

## Suporte

Se nenhuma solução funcionar, entre em contato:

- Email: suporte@arkheion.com
- WhatsApp: [Número do suporte]

---

**Arkheion Corp** | GIRO Desktop v2.4.x
