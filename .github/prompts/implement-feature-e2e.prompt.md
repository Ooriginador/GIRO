---
mode: agent
description: Implementa uma feature completa end-to-end (DB → Backend → Frontend)
variables:
  - name: featureName
    description: Nome da feature (ex: Inventory Management, Customer Loyalty)
  - name: userStory
    description: User story da feature (Como usuário, eu quero...)
  - name: scope
    description: Escopo (PDV, Enterprise, Ambos)
agent: Planejador
---

# Implementar Feature E2E: {{featureName}}

## User Story
> {{userStory}}

## Escopo: {{scope}}

---

## Fase 1: Planejamento (Agente: Planejador)

### 1.1 Análise de Requisitos
- Identificar entidades envolvidas
- Mapear fluxo de dados
- Listar componentes necessários
- Definir critérios de aceite

### 1.2 Arquitetura
- Diagrama de componentes
- Schema de dados
- API contracts
- UI wireframes

---

## Fase 2: Database (Handoff → Database Agent)

### 2.1 Modelos Prisma
- Definir entidades no schema
- Configurar relations
- Criar índices

### 2.2 Migrations
```bash
pnpm prisma migrate dev --name add_{{featureName | snake_case}}
```

---

## Fase 3: Backend (Handoff → Rust Agent)

### 3.1 Commands Tauri
- Criar commands para CRUD
- Implementar business logic
- Adicionar validações

### 3.2 Services
- Criar service layer
- Implementar regras de negócio

### 3.3 Repositories
- Queries SQLx tipadas
- Soft delete handling

---

## Fase 4: Frontend (Handoff → Frontend Agent)

### 4.1 Types
- Interfaces TypeScript
- Zod schemas

### 4.2 Hooks
- useQuery/useMutation
- Custom hooks

### 4.3 Componentes
- Páginas principais
- Forms com validação
- Listas com paginação

### 4.4 Atalhos de Teclado
- Mapear hotkeys
- Registrar no KeyboardManager

---

## Fase 5: Testes (Handoff → QA Agent)

### 5.1 Unitários
- Commands Rust
- Hooks React
- Componentes

### 5.2 E2E
- Playwright scenarios
- Happy path
- Edge cases

---

## Fase 6: Revisão (Handoff → Security Agent)

### 6.1 Segurança
- Validação de inputs
- Proteção de PII
- Audit logs

---

## Checklist Final
- [ ] Schema de dados criado
- [ ] Migrations aplicadas
- [ ] Commands Rust implementados
- [ ] Frontend funcional
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Code review aprovado
