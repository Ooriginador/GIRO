# 🚨 Fix Emergencial - Migration 033

## Problema

**Erro 1 (Checksum inválido):**

```
migration 33 was previously applied but has been modified
```

**Erro 2 (Após deletar migration 33):**

```
duplicate column name: sync_version
```

## Causa

A migration 033 foi modificada após já ter sido aplicada. Quando você deleta e tenta reaplicar, as colunas `sync_version` já existem, causando erro de duplicação.

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
4. Cole APENAS esta linha (corrige o checksum sem reexecutar):
   ```
   UPDATE _sqlx_migrations
   SET checksum = X'd5f0f92353daf02ea5062e5e348972a723a9b3858b01da9f03a86730ffc0955e'
   WHERE version = 33;
   ```
   ⚠️ **IMPORTANTE**: Isso corrige o checksum sem tentar recriar as colunas que já existem!
5. Clique em **Write Changes** (ícone de disco na toolbar ou Ctrl+S)
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
