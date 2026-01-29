# 🗄️ Prisma SQLite Desktop Skill

> **Modelagem de dados e migrations para aplicações desktop**  
> Versão: 1.0.0 | Última Atualização: 25 de Janeiro de 2026

## 📋 Descrição

Esta skill fornece conhecimento especializado para modelagem de dados com Prisma e SQLite em aplicações desktop, incluindo:

- Design de schemas para varejo e almoxarifado
- Migrations versionadas
- Estratégias de soft delete
- Otimização para SQLite
- Geração de types TypeScript

## 🛠️ Stack Técnica

| Componente | Versão | Uso                        |
| ---------- | ------ | -------------------------- |
| Prisma     | 7.0+   | Schema design & migrations |
| SQLite     | 3.45+  | Database engine            |
| SQLx       | 0.7+   | Runtime queries (Rust)     |

## 📁 Estrutura Padrão

```
packages/database/
├── prisma/
│   ├── schema.prisma       # Schema principal
│   ├── migrations/         # Migration history
│   └── seed.ts             # Dados iniciais
├── src/
│   ├── types.ts            # Generated types
│   └── enums.ts            # Enums exportados
└── package.json
```

## 📐 Padrões de Schema

### Entidade Base

```prisma
model Product {
  id            String   @id @default(cuid())
  barcode       String?  @unique
  internalCode  String   @unique
  name          String

  // Preços
  costPrice     Decimal  @default(0)
  salePrice     Decimal

  // Estoque
  currentStock  Decimal  @default(0)
  minStock      Decimal  @default(0)

  // Auditoria
  isActive      Boolean  @default(true)
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id])
  saleItems     SaleItem[]

  @@index([barcode])
  @@index([name])
  @@index([categoryId])
}
```

### Enums

```prisma
enum BusinessType {
  GROCERY      // Mercearia
  MOTOPARTS    // Motopeças
  GENERAL      // Loja geral
  ENTERPRISE   // Almoxarifado
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  PIX
  CREDIT
}

enum TransactionType {
  SALE
  RETURN
  WITHDRAWAL
  DEPOSIT
  ADJUSTMENT
}
```

### Soft Delete Pattern

```prisma
// Sempre adicionar em entidades principais
deletedAt     DateTime?
isActive      Boolean  @default(true)

// Query padrão
findMany({
  where: {
    deletedAt: null,
    isActive: true
  }
})
```

### Índices Compostos

```prisma
// Para queries frequentes
@@index([categoryId, isActive])
@@index([createdAt(sort: Desc)])
@@index([name(ops: raw("COLLATE NOCASE"))])  // Case-insensitive
```

## 🔧 Comandos Úteis

```bash
# Gerar migration
pnpm prisma migrate dev --name add_product_lots

# Reset database (dev only!)
pnpm prisma migrate reset

# Gerar client
pnpm prisma generate

# Abrir studio
pnpm prisma studio

# Verificar status
pnpm prisma migrate status
```

## ⚠️ Considerações SQLite

1. **Sem ALTER COLUMN**: Migrations complexas recriam tabelas
2. **Sem concurrent writes**: Use transações
3. **Arquivo único**: Backup simples com cp
4. **PRAGMA**: Configure `foreign_keys = ON`

## ✅ Checklist

- [ ] Soft delete em entidades principais
- [ ] Índices em campos de busca
- [ ] Foreign keys com onDelete definido
- [ ] Enums para valores fixos
- [ ] updatedAt com @updatedAt
- [ ] cuid() para IDs (melhor que uuid para SQLite)

## 🔗 Recursos

- [Prisma SQLite Docs](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
