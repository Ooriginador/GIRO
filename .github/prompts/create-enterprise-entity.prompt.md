---
description: Cria uma entidade Enterprise (Almoxarifado)
name: Criar Entidade Enterprise
mode: agent
tools:
  - search
  - createFile
  - editFiles
  - filesystem
  - prisma/*
---

# 🏢 Criar Entidade Enterprise

Crie uma nova entidade para o módulo Enterprise (Almoxarifado) end-to-end.

## Informações Necessárias

- **Nome da entidade:** ${input:entityName:Nome (PascalCase, ex: WorkFront)}
- **Descrição:** ${input:description:O que a entidade representa}
- **Campos principais:** ${input:fields:Campos separados por vírgula}

## Referência de Domínio

O módulo Enterprise gerencia almoxarifados para empresas de engenharia:

```text
Empresa
└── Contrato (Obra)
    └── Frente de Trabalho
        └── Atividade
            └── Requisição de Material
                └── Items de Requisição
```

## Template Prisma

```prisma
// packages/database/prisma/schema.prisma

model ${entityName} {
  id          String   @id @default(cuid())
  code        String   @unique  // Ex: "FT-001"
  name        String
  description String?
  status      ${entityName}Status @default(ACTIVE)

  // Relacionamentos
  contractId  String
  contract    Contract @relation(fields: [contractId], references: [id])

  // Audit
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  createdBy   String?
  updatedBy   String?

  @@index([code])
  @@index([status])
  @@index([contractId])
}

enum ${entityName}Status {
  ACTIVE
  INACTIVE
  COMPLETED
  CANCELLED
}
```

## Template Backend Rust

### Model

```rust
// apps/enterprise/src-tauri/src/models/${snake_case}.rs

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ${entityName} {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub contract_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Create${entityName}Dto {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub contract_id: String,
}

#[derive(Debug, Deserialize)]
pub struct Update${entityName}Dto {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}
```

### Repository

```rust
// apps/enterprise/src-tauri/src/repositories/${snake_case}_repository.rs

use sqlx::SqlitePool;
use crate::{error::AppResult, models::${entity_name}::*};

pub struct ${entityName}Repository {
    pool: SqlitePool,
}

impl ${entityName}Repository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn find_all(&self, contract_id: Option<&str>) -> AppResult<Vec<${entityName}>> {
        let items = sqlx::query_as!(
            ${entityName},
            r#"
            SELECT * FROM ${table_name}
            WHERE deleted_at IS NULL
            AND (? IS NULL OR contract_id = ?)
            ORDER BY created_at DESC
            "#,
            contract_id,
            contract_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn create(&self, data: Create${entityName}Dto) -> AppResult<${entityName}> {
        let id = cuid2::create_id();

        sqlx::query!(
            r#"
            INSERT INTO ${table_name} (id, code, name, description, contract_id)
            VALUES (?, ?, ?, ?, ?)
            "#,
            id,
            data.code,
            data.name,
            data.description,
            data.contract_id
        )
        .execute(&self.pool)
        .await?;

        self.find_by_id(&id).await?.ok_or(AppError::NotFound.into())
    }
}
```

## Template Frontend

### Types

```typescript
// apps/enterprise/src/types/${kebab-case}.ts

export interface ${entityName} {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ${entityName}Status;
  contractId: string;
  createdAt: string;
  updatedAt: string;
}

export type ${entityName}Status = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Create${entityName}Dto {
  code: string;
  name: string;
  description?: string;
  contractId: string;
}
```

### Hook

```typescript
// apps/enterprise/src/hooks/use${entityName}s.ts

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ${entityName}, Create${entityName}Dto } from '@/types/${kebab-case}';

export function use${entityName}s(contractId?: string) {
  return useQuery({
    queryKey: ['${entityName}s', contractId],
    queryFn: () => invoke<${entityName}[]>('list_${snake_case}s', { contractId }),
  });
}

export function useCreate${entityName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create${entityName}Dto) =>
      invoke<${entityName}>('create_${snake_case}', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entityName}s'] });
    },
  });
}
```

## Checklist

### Database

- [ ] Model adicionado ao schema.prisma
- [ ] Migration criada
- [ ] Índices configurados

### Backend

- [ ] Model Rust criado
- [ ] Repository implementado
- [ ] Service com validações
- [ ] Commands Tauri registrados

### Frontend

- [ ] Types TypeScript
- [ ] Hook com react-query
- [ ] Componente de lista
- [ ] Formulário de criação/edição

### Documentação

- [ ] Atualizar docs/05-ENTERPRISE-MODULE.md
- [ ] Atualizar STATUS.md nos roadmaps
