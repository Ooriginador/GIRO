# @mercearias/database

Package de banco de dados do sistema Mercearias.

## Stack

- **Prisma 6+** - Schema design e migrations
- **SQLite 3.45+** - Database local
- **SQLx** - Runtime queries (Rust)

## Estrutura

````text
packages/database/
├── prisma/
│   ├── schema.prisma    # Schema do banco
│   ├── migrations/      # Migrations versionadas
│   └── seed.ts          # Dados iniciais
├── src/
│   ├── index.ts         # Exports principais
│   └── types.ts         # Types customizados
└── package.json
```text
## Comandos

```bash
# Gerar Prisma Client
pnpm db:generate

# Criar migration (dev)
pnpm db:migrate

# Aplicar migrations (produção)
pnpm db:migrate:deploy

# Resetar banco (dev only!)
pnpm db:reset

# Popular com dados iniciais
pnpm db:seed

# Visualizar banco
pnpm db:studio

# Validar schema
pnpm db:validate
```text
## Models

| Model           | Descrição                        |
| --------------- | -------------------------------- |
| `Category`      | Categorias de produtos           |
| `Product`       | Produtos do catálogo             |
| `ProductLot`    | Lotes com controle de validade   |
| `Supplier`      | Fornecedores                     |
| `Employee`      | Funcionários e operadores        |
| `Sale`          | Vendas realizadas                |
| `SaleItem`      | Itens de uma venda               |
| `CashSession`   | Sessões de caixa                 |
| `CashMovement`  | Movimentações de caixa           |
| `StockMovement` | Movimentações de estoque         |
| `Alert`         | Alertas do sistema               |
| `PriceHistory`  | Histórico de alterações de preço |
| `Setting`       | Configurações do sistema         |
| `AuditLog`      | Log de auditoria                 |

## Enums

| Enum                | Valores                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| `ProductUnit`       | UNIT, KILOGRAM, GRAM, LITER, MILLILITER, METER, CENTIMETER, BOX, PACK, DOZEN, KIT, PAIR |
| `LotStatus`         | AVAILABLE, EXPIRED, DEPLETED, BLOCKED                            |
| `EmployeeRole`      | ADMIN, MANAGER, CASHIER, VIEWER                                  |
| `PaymentMethod`     | CASH, PIX, CREDIT, DEBIT, OTHER                                  |
| `SaleStatus`        | COMPLETED, CANCELED                                              |
| `DiscountType`      | PERCENTAGE, FIXED                                                |
| `CashSessionStatus` | OPEN, CLOSED, FORCED                                             |
| `CashMovementType`  | OPENING, WITHDRAWAL, SUPPLY, SALE, REFUND, CLOSING               |
| `StockMovementType` | ENTRY, EXIT, ADJUSTMENT, TRANSFER, LOSS, EXPIRED, CONSUMPTION    |
| `AlertType`         | EXPIRATION_CRITICAL, EXPIRATION_WARNING, LOW_STOCK, OUT_OF_STOCK |
| `AlertSeverity`     | CRITICAL, WARNING, INFO                                          |
| `SettingType`       | STRING, NUMBER, BOOLEAN, JSON                                    |

## Dados Iniciais (Seed)

O seed cria:

- 10 categorias padrão (Bebidas, Laticínios, Carnes, etc.)
- 1 funcionário admin (PIN: 1234, Senha: admin123)
- 30+ configurações do sistema
- 10 produtos de exemplo

## Convenções

- **IDs:** CUID (`@id @default(cuid())`)
- **Timestamps:** `createdAt` + `updatedAt` em todas as entidades
- **Soft Delete:** `isActive Boolean @default(true)` onde aplicável
- **Índices:** Em campos de busca frequente (barcode, name, createdAt)
````
