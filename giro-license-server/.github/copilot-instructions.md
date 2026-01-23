# 🏛️ Arkheion Corp - Instruções Globais do Copilot

> **Contexto Universal para Todos os Projetos**  
> Versão: 1.0.0 | Atualizado: 2 de Janeiro de 2026

---

## 🎯 Identidade

Você é um assistente de desenvolvimento de elite trabalhando

---

## 📐 Padrões de Código

### TypeScript/JavaScript

```typescript
// Preferências
- Use arrow functions para componentes React
- Prefira const sobre let
- Sempre inclua tipos TypeScript explícitos
- Use nomes descritivos para variáveis
- Siga o padrão Repository para acesso a dados
- Use Zod para validação de schemas
- Prefira async/await sobre Promises raw
```

### Python

```python
# Preferências
- Use type hints em todas as funções
- Siga PEP 8 para formatação
- Use dataclasses ou Pydantic para models
- Docstrings no formato Google
- Prefira pathlib sobre os.path
```

### React/Next.js

```tsx
// Preferências
- Use Server Components por padrão
- Client Components apenas quando necessário ('use client')
- Prefira React Server Actions para mutations
- Use Suspense para loading states
- Siga o padrão de colocation de arquivos
```

---

## 🗄️ Banco de Dados

### Prisma (Principal)

- Sempre use transações para operações múltiplas
- Inclua soft delete (deletedAt) em entidades principais
- Use enums para status e tipos fixos
- Índices em campos de busca frequente
- Relations explícitas com onDelete/onUpdate

### Queries

- Sempre use select para limitar campos retornados
- Evite N+1 queries (use include/join apropriadamente)
- Paginação cursor-based para listas grandes

---

## 🧪 Testes

### Estrutura

```
tests/
├── unit/           # Testes unitários (Vitest/pytest)
├── integration/    # Testes de integração
├── e2e/           # Testes end-to-end (Playwright)
└── fixtures/       # Dados de teste
```

### Padrões

- Nomenclatura: `describe('ComponentName')`, `it('should do X when Y')`
- Arrange-Act-Assert pattern
- Mocks apenas quando necessário
- Coverage mínimo: 80%

---

## 🚀 Deploy & DevOps

### Infraestrutura Principal

- **Railway** - Backend, APIs, Workers
- **Vercel** - Frontend Next.js
- **PostgreSQL** - Database principal
- **Redis** - Cache e filas

### CI/CD

- GitHub Actions para pipelines
- Lint e type-check em PRs
- Testes automáticos antes de merge
- Deploy automático em main

---

## 📝 Commits

Use Conventional Commits:

```
feat(scope): add new feature
fix(scope): fix bug description
docs(scope): update documentation
refactor(scope): refactor code
test(scope): add tests
chore(scope): maintenance tasks
```

---

## 🔐 Segurança

- Nunca commite secrets ou API keys
- Use variáveis de ambiente para configurações sensíveis
- Valide todas as entradas do usuário
- Sanitize outputs para prevenir XSS
- Use HTTPS sempre
- Implemente rate limiting em APIs públicas

---

## 📚 Documentação

### Estrutura de Docs

```
docs/
├── 00-OVERVIEW.md      # Visão geral
├── 01-ARQUITETURA.md   # Decisões técnicas
├── 02-DATABASE.md      # Schema e migrations
├── 03-FEATURES.md      # Funcionalidades
└── API.md              # Documentação de API
```

### READMEs

- Descrição clara do projeto
- Instruções de setup
- Variáveis de ambiente necessárias
- Scripts disponíveis
- Estrutura de pastas

---

## 🎨 Design System

### Cores (Beautiful-Queen como referência)

```css
--primary: Rose Gold (#B76E79)
--secondary: Champagne (#F7E7CE)
--accent: Deep Rose (#8B4557)
--background: Cream White (#FFFEF9)
```

### Componentes

- Seguir atomic design (atoms, molecules, organisms)
- Acessibilidade WCAG 2.1 AA
- Mobile-first responsive
- Dark mode support

---

## 🤖 Uso de IA

### Ferramentas Disponíveis

- MCP Servers para integrações externas
- GitHub Copilot para code completion
- Custom Agents para tarefas específicas
- Prompt files para workflows repetitivos

### Boas Práticas

- Sempre revisar código gerado
- Validar outputs de IA
- Não confiar cegamente em sugestões
- Manter contexto relevante nos prompts

---

_Estas instruções são aplicadas automaticamente em todas as interações._
