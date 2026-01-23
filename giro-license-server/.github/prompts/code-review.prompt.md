---
description: Realiza code review completo com foco em qualidade
name: Code Review
tools: ['search', 'usages']
---

# 🔍 Code Review Completo

Realize um code review detalhado do código abaixo, focando em qualidade, segurança e boas práticas.

## Critérios de Avaliação

### 1. 🔐 Segurança
- [ ] Sem secrets/credentials hardcoded
- [ ] Inputs validados/sanitizados
- [ ] SQL injection prevenido
- [ ] XSS prevenido
- [ ] CSRF protection
- [ ] Autenticação/autorização correta

### 2. 📐 Arquitetura
- [ ] Responsabilidade única (SRP)
- [ ] Código modular e reutilizável
- [ ] Dependências injetadas
- [ ] Camadas bem separadas

### 3. 🧹 Qualidade de Código
- [ ] Nomes descritivos
- [ ] Funções pequenas e focadas
- [ ] Sem duplicação (DRY)
- [ ] Comentários úteis (não óbvios)
- [ ] Código auto-documentado

### 4. 🔷 TypeScript
- [ ] Types explícitos (evitar any)
- [ ] Interfaces bem definidas
- [ ] Null safety
- [ ] Enums para valores fixos

### 5. ⚡ Performance
- [ ] Sem loops desnecessários
- [ ] Queries otimizadas
- [ ] Memoização onde necessário
- [ ] Lazy loading apropriado

### 6. 🧪 Testabilidade
- [ ] Código fácil de testar
- [ ] Dependências mockáveis
- [ ] Funções puras quando possível

### 7. ♿ Acessibilidade (se UI)
- [ ] Semântica HTML correta
- [ ] ARIA labels
- [ ] Contraste adequado
- [ ] Navegação por teclado

## Formato de Review

```markdown
## 📋 Resumo

**Qualidade Geral:** ⭐⭐⭐⭐☆ (4/5)

[Resumo de 1-2 linhas]

## ✅ Pontos Positivos

1. **[Título]** - [Descrição]
2. ...

## ⚠️ Sugestões de Melhoria

### 1. [Título] - Severidade: 🔴/🟡/🟢

**Localização:** `arquivo.ts:L42`

**Problema:**
[Descrição do problema]

**Sugestão:**
```typescript
// código sugerido
```

**Motivo:**
[Por que essa mudança é importante]

---

### 2. [Próxima sugestão]
...

## 🔒 Issues de Segurança

[Se houver, listar com alta prioridade]

## 📊 Métricas

| Aspecto | Nota |
|---------|------|
| Segurança | ⭐⭐⭐⭐⭐ |
| Legibilidade | ⭐⭐⭐⭐☆ |
| Performance | ⭐⭐⭐☆☆ |
| Testabilidade | ⭐⭐⭐⭐☆ |

## ✍️ Conclusão

[Recomendação final: Aprovar / Aprovar com ressalvas / Solicitar mudanças]
```

## Níveis de Severidade

- 🔴 **Crítico** - Deve ser corrigido antes do merge (segurança, bugs graves)
- 🟡 **Importante** - Deveria ser corrigido (qualidade, manutenibilidade)
- 🟢 **Sugestão** - Nice to have (estilo, otimizações menores)
