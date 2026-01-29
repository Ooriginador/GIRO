---
mode: agent
description: Cria uma nova migration Prisma com modelo e atualiza types
variables:
  - name: modelName
    description: Nome do modelo (ex: Customer, Inventory, Transaction)
  - name: fields
    description: Lista de campos (ex: name String, price Float, status Enum)
agent: Database
---

# Criar Migration Prisma: `{{modelName}}`

## Contexto
Adicionar novo modelo **{{modelName}}** ao schema Prisma com os seguintes campos:
```
{{fields}}
```

## Instruções

### 1. Atualizar Schema Prisma
Edite `packages/database/prisma/schema.prisma`:

```prisma
model {{modelName}} {
  id        String   @id @default(uuid())
  {{fields}}
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Índices
  @@index([createdAt])
}
```

**Padrões obrigatórios:**
- `id` como UUID
- `createdAt`, `updatedAt` automáticos
- `deletedAt` para soft delete
- Índices em campos de busca frequente
- Relations com `onDelete` explícito

### 2. Gerar Migration
```bash
cd packages/database
pnpm prisma migrate dev --name add_{{modelName | lowercase}}
```

### 3. Atualizar Types TypeScript
Em `packages/database/src/types/`:
```typescript
export interface {{modelName}} {
  id: string;
  // ... campos mapeados
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### 4. Criar Repository (Rust)
Em `apps/desktop/src-tauri/src/repositories/`:
```rust
pub struct {{modelName}}Repository {
    pool: SqlitePool,
}

impl {{modelName}}Repository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
    
    pub async fn find_all(&self) -> Result<Vec<{{modelName}}>, sqlx::Error> {
        sqlx::query_as!({{modelName}}, "SELECT * FROM {{modelName}} WHERE deleted_at IS NULL")
            .fetch_all(&self.pool)
            .await
    }
    
    // ... CRUD methods
}
```

### 5. Seed Data (opcional)
Adicione dados de exemplo em `packages/database/prisma/seed.ts`

## Checklist
- [ ] Modelo adicionado ao schema.prisma
- [ ] Migration gerada e aplicada
- [ ] Types TypeScript exportados
- [ ] Repository Rust criado
- [ ] Seed data (se aplicável)
- [ ] Documentação atualizada
