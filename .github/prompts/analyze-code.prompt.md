---
description: Analisa código e sugere melhorias
name: Analisar Código
mode: agent
tools:
  - search
  - filesystem
  - sequential-thinking/*
---

# 🔍 Analisar Código

Analise o código selecionado e forneça insights sobre qualidade, performance e melhorias.

## Informações Necessárias

- **Arquivo:** ${file}
- **Foco:** ${input:focus:performance|security|readability|all}

## Aspectos a Analisar

### 1. Qualidade de Código

- [ ] Nomenclatura clara e consistente
- [ ] Funções pequenas e focadas (SRP)
- [ ] Complexidade ciclomática adequada
- [ ] DRY - Sem código duplicado
- [ ] Comentários úteis (não óbvios)

### 2. TypeScript/Rust

- [ ] Tipos explícitos e corretos
- [ ] Sem `any` / sem unwrap desnecessários
- [ ] Generics apropriados
- [ ] Null/undefined handling
- [ ] Error handling adequado

### 3. React (se aplicável)

- [ ] Hooks usados corretamente
- [ ] Memoização onde necessário
- [ ] Keys em listas
- [ ] Props tipadas
- [ ] Evita re-renders desnecessários

### 4. Performance

- [ ] Queries otimizadas
- [ ] Lazy loading onde apropriado
- [ ] Debounce/throttle em inputs
- [ ] Caching implementado
- [ ] Bundle size considerado

### 5. Segurança

- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Secrets não expostos
- [ ] Validação de permissões

### 6. Testes

- [ ] Cobertura adequada
- [ ] Casos edge testados
- [ ] Mocks apropriados
- [ ] Testes são mantíveis

## Formato de Saída

````markdown
## 📊 Resumo da Análise

**Arquivo:** `path/to/file`
**Score Geral:** 7/10

### ✅ Pontos Positivos

- Item 1
- Item 2

### ⚠️ Pontos de Atenção

- Item 1 (linha X)
- Item 2 (linha Y)

### 🔧 Sugestões de Melhoria

#### Alta Prioridade

1. Descrição da melhoria
   `código sugerido`

#### Média Prioridade

1. Descrição

#### Baixa Prioridade

1. Descrição

### 📈 Métricas

- Complexidade: X
- Linhas de código: Y
- Cobertura estimada: Z%
````

## Comandos Úteis

```bash
# Lint
pnpm lint

# Type check
pnpm type-check

# Test coverage
pnpm test:coverage
```
