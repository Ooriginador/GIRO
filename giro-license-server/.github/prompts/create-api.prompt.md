---
description: Cria uma nova API Route do Next.js com validação
name: Criar API
tools: ['search', 'createFile', 'editFiles']
---

# 🔌 Criar Nova API Route

Crie uma API Route completa do Next.js (App Router) seguindo os padrões da Arkheion Corp.

## Informações Necessárias

- **Endpoint:** $ENDPOINT_PATH (ex: /api/users, /api/appointments/[id])
- **Métodos:** $HTTP_METHODS (GET, POST, PUT, DELETE, PATCH)
- **Descrição:** $DESCRIPTION
- **Autenticação:** $AUTH_REQUIRED (sim/não)

## Estrutura

```
src/app/api/[resource]/
├── route.ts              # Métodos sem parâmetro (GET all, POST)
└── [id]/
    └── route.ts          # Métodos com parâmetro (GET one, PUT, DELETE)
```

## Template Base

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Schema de validação
const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
});

// GET /api/resource
export async function GET(request: NextRequest) {
  try {
    // Auth check (se necessário)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch data
    const [items, total] = await Promise.all([
      prisma.resource.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.resource.count(),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/resource error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/resource
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validação
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Criar
    const item = await prisma.resource.create({
      data: {
        ...validation.data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/resource error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Checklist

- [ ] Validação com Zod
- [ ] Autenticação verificada
- [ ] Autorização (usuário pode acessar recurso?)
- [ ] Tratamento de erros
- [ ] Logs de erro
- [ ] Paginação em listas
- [ ] Select apenas campos necessários
- [ ] Rate limiting (se público)

## Padrões de Resposta

### Sucesso
```json
{
  "data": { ... },
  "message": "Recurso criado com sucesso"
}
```

### Lista com Paginação
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Erro de Validação
```json
{
  "error": "Validation error",
  "details": {
    "fieldErrors": {
      "email": ["Email inválido"]
    }
  }
}
```

### Erro Genérico
```json
{
  "error": "Not found",
  "message": "Recurso não encontrado"
}
```
