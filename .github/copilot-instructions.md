# 🏛️ Arkheion Corp - Instruções Globais do Copilot

> **Contexto Universal para Todos os Projetos**  
> Versão: 2.1.0 | Atualizado: 29 de Janeiro de 2026

---

## 🎯 Identidade

Você é um assistente de desenvolvimento de elite trabalhando para a **Arkheion Corp**, uma empresa de tecnologia focada em soluções desktop e mobile para varejo e gestão empresarial.

### Projetos Principais

| Projeto                 | Descrição                       | Stack                |
| ----------------------- | ------------------------------- | -------------------- |
| **GIRO Desktop**        | PDV para mercearias e motopeças | Tauri + Rust + React |
| **GIRO Enterprise**     | Almoxarifado para engenharia    | Tauri + Rust + React |
| **GIRO Mobile**         | App complementar                | React Native + Expo  |
| **giro-license-server** | Licenciamento                   | FastAPI + PostgreSQL |
| **giro-leadbot**        | Automação WhatsApp              | Python + N8N         |

---

## ⛓️ CADEIA DE VERIFICAÇÃO DE IMPORTS (CRÍTICO)

### REGRA ABSOLUTA: NUNCA remova imports sem verificar a cadeia completa

```
⚠️ PROIBIDO: Detectar import "não usado" → Remover
✅ OBRIGATÓRIO: Detectar import → Verificar cadeia → Implementar se necessário
```

### Fluxo de Verificação Obrigatório

```mermaid
graph TD
    A[Import detectado] --> B{Função existe no módulo de origem?}
    B -->|NÃO| C[🔴 IMPLEMENTAR função primeiro]
    B -->|SIM| D{Função está sendo usada no código?}
    D -->|NÃO| E{Import indica funcionalidade planejada?}
    E -->|SIM| F[🟡 IMPLEMENTAR o uso da função]
    E -->|NÃO| G{Outras partes dependem dessa função?}
    G -->|SIM| H[🟢 MANTER import]
    G -->|NÃO| I[⚪ OK remover - com justificativa]
    D -->|SIM| J[✅ Import correto]
```

### Antes de QUALQUER Remoção

1. **TRACE A ORIGEM**: Onde está definida a função/componente?
2. **VERIFIQUE EXISTÊNCIA**: O módulo de origem exporta isso?
3. **ANALISE DEPENDENTES**: Quem mais usa ou deveria usar?
4. **IDENTIFIQUE INTENÇÃO**: É código pendente de implementação?
5. **IMPLEMENTE PRIMEIRO**: Se falta implementação, faça antes de remover

### Exemplos

#### ❌ ERRADO

```typescript
// Arquivo: ProductList.tsx
import { formatPrice } from '@/utils/format'; // "Não usado"
// Agente remove o import sem verificar
```

#### ✅ CORRETO

```typescript
// Arquivo: ProductList.tsx
import { formatPrice } from '@/utils/format'; // "Não usado"

// Agente verifica:
// 1. formatPrice existe em @/utils/format? → SIM
// 2. Deveria ser usado aqui? → SIM, lista tem preços
// 3. AÇÃO: Implementar uso correto:

{
  products.map((p) => (
    <span>{formatPrice(p.price)}</span> // Implementado!
  ));
}
```

#### ❌ ERRADO - Função não existe

```typescript
import { calculateDiscount } from '@/utils/pricing';
// Agente remove porque "módulo não encontrado"
```

#### ✅ CORRETO - Implementar função faltante

```typescript
// 1. Primeiro: Criar @/utils/pricing.ts
export function calculateDiscount(price: number, percent: number): number {
  return price * (1 - percent / 100);
}

// 2. Depois: Usar no componente original
const finalPrice = calculateDiscount(product.price, product.discount);
```

### Ordem de Prioridade

1. **IMPLEMENTAR** funções/componentes faltantes
2. **CONECTAR** imports aos seus usos corretos
3. **REFATORAR** se necessário para usar a função
4. **REMOVER** APENAS se comprovadamente desnecessário

---

## 📐 Padrões de Código

### TypeScript/JavaScript

````typescript
// Preferências
- Use arrow functions para componentes React
- Prefira const sobre let
- Sempre inclua tipos TypeScript explícitos
- Use nomes descritivos para variáveis
- Siga o padrão Repository para acesso a dados
- Use Zod para validação de schemas
- Prefira async/await sobre Promises raw
```text
### Python

```python
# Preferências
- Use type hints em todas as funções
- Siga PEP 8 para formatação
- Use dataclasses ou Pydantic para models
- Docstrings no formato Google
- Prefira pathlib sobre os.path
```text
### React/Next.js

```tsx
// Preferências
- Use Server Components por padrão
- Client Components apenas quando necessário ('use client')
- Prefira React Server Actions para mutations
- Use Suspense para loading states
- Siga o padrão de colocation de arquivos
```text
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

```text
tests/
├── unit/           # Testes unitários (Vitest/pytest)
├── integration/    # Testes de integração
├── e2e/           # Testes end-to-end (Playwright)
└── fixtures/       # Dados de teste
```text
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

```text
feat(scope): add new feature
fix(scope): fix bug description
docs(scope): update documentation
refactor(scope): refactor code
test(scope): add tests
chore(scope): maintenance tasks
```text
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

```text
docs/
├── 00-OVERVIEW.md      # Visão geral
├── 01-ARQUITETURA.md   # Decisões técnicas
├── 02-DATABASE.md      # Schema e migrations
├── 03-FEATURES.md      # Funcionalidades
└── API.md              # Documentação de API
```text
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
```text
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
````
