# Migration: Float → Decimal (2026-01-20)

## Resumo

Este conjunto de alterações prepara a migração de campos numéricos definidos como `Float` para `Decimal`/`NUMERIC` no banco local SQLite. A migration adiciona novas colunas \*\_decimal, popula com valores arredondados e cria metadados (`db_version`, `backups`).

## Por que isso?

- `Float` causa problemas de precisão monetária e arredondamento. Para valores financeiros devemos usar decimal com precisão fixa.
- Quantidades e pesos também precisam de precisão controlada (ex.: 3 casas decimais para gramas/kg).

## O que foi adicionado

- `schema.prisma` foi alterado para usar `Decimal` com anotações `@db.Decimal(...)` nas colunas críticas.
- `packages/database/prisma/migrations/20260120_float_to_decimal.sql` contém SQL para adicionar colunas \*\_decimal e popular os dados.

## Passos recomendados para aplicar em produção

1. Fazer snapshot completo do arquivo SQLite e do diretório do projeto.
2. Testar o SQL da migration em um clone do banco (staging).
3. Executar a migration SQL.
4. Atualizar a aplicação para ler as colunas \*\_decimal (usar feature flag).
5. Validar relatórios financeiros e diferenças (somas, totais diários).
6. Após validação, criar migration de cleanup para remover colunas antigas ou reconstruir tabela final.

## Observações técnicas

- A migration é _não-destrutiva_ inicialmente (mantém colunas antigas).
- CHECK constraints e migração completa de DROP/rename exigem cuidado e podem precisar de uma janela de manutenção.
- Atualize os mapeamentos no backend Rust (usar `rust_decimal` ou equivalente) e gere clientes Prisma/TS após rodar `prisma generate`.

### Notas de implementação (passos recomendados)

1. Atualize as dependências Rust para suportar `rust_decimal` e a feature `decimal` do `sqlx`.

   - No crate `apps/desktop/src-tauri` já foi adicionada a dependência `rust_decimal` e a feature `decimal` do `sqlx`.
   - Rode `cargo update` e compile para garantir que tudo está OK.

2. Gere o cliente Prisma/TypeScript:

```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
```

3. Habilite leitura/escrita nas colunas `_decimal` definindo a variável de ambiente `USE_DECIMAL_COLUMNS=1` na máquina alvo.

4. Depois de validar em staging, agende a migration de limpeza (remover colunas antigas). A remoção deve ser feita por recriação de tabela ou via `ALTER TABLE DROP COLUMN` dependendo da versão do SQLite disponível em produção.

## Contatos

Para assistência, solicite revisão do DBA e um teste completo de integração com o módulo PDV e relatórios.
