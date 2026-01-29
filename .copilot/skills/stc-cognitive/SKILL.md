# 🧠 Semantic Thinking Construct (STC) Skill

> **Paradigma de cognição estrutural para agentes de desenvolvimento**  
> Versão: 1.0.0 | Atualizado: 29 de Janeiro de 2026

## 📋 Conceito

O STC é um modelo operacional que transforma o comportamento padrão de LLMs (chain-of-thought narrativo) em **cognição estrutural baseada em estado**.

### Princípios Fundamentais

1. **Estado > Sequência > Texto**
2. **Inferência local, não global**
3. **Persistência via Memory MCP**
4. **Output como resultado, não como trilha**

---

## 🔧 Implementação Técnica

### Mapeamento STC → MCP

| Conceito STC              | Implementação MCP             |
| ------------------------- | ----------------------------- |
| CSP (Construct Semântico) | `Entity` no Memory MCP        |
| Relações bidirecionais    | `Relation` no Memory MCP      |
| Estado persistente        | `Observations` atualizáveis   |
| Inferência estruturada    | `sequential-thinking` MCP     |
| Projeções semânticas      | Entidades filhas com relações |

---

## 📐 Estrutura de CSPs

### IDEA_CORE (Núcleo de Tarefa)

```typescript
interface IdeaCore {
  name: string; // "TASK_{timestamp}"
  entityType: 'idea_core';
  observations: [
    'objective: string', // O que resolver
    'scope: string', // Limites
    'constraints: string[]', // Restrições
    'success_criteria: string', // Critério de conclusão
    "state: 'active' | 'completed' | 'blocked'",
  ];
}
```

### CSP_PROJECTION (Projeção de Domínio)

```typescript
interface CSPProjection {
  name: string; // "CSP_{domain}_{id}"
  entityType: 'projection';
  observations: [
    'domain: string', // Ex: "validation", "ui", "database"
    "relevance: 'high' | 'medium' | 'low'",
    "state: 'active' | 'resolved' | 'pending'",
    'findings: string[]', // Descobertas
  ];
}
```

### CSP_INFERENCE (Inferência)

```typescript
interface CSPInference {
  name: string; // "INF_{source}_{target}"
  entityType: 'inference';
  observations: [
    "type: 'causal' | 'structural' | 'constraint'",
    'confidence: number', // 0.0 - 1.0
    'result: string',
  ];
}
```

---

## 🔄 Ciclo Operacional

### 1. Inicialização

```javascript
// Ao receber tarefa
async function initializeTask(taskDescription) {
  // Verificar estado existente
  const graph = await mcp_memory_read_graph();

  // Procurar IDEA_CORE ativo relacionado
  const activeCore = graph.entities.find(
    (e) => e.entityType === 'idea_core' && e.observations.includes('state: active')
  );

  if (activeCore) {
    // Continuar tarefa existente
    return activeCore;
  }

  // Criar novo IDEA_CORE
  return await mcp_memory_create_entities({
    entities: [
      {
        name: `TASK_${Date.now()}`,
        entityType: 'idea_core',
        observations: [`objective: ${taskDescription}`, 'state: active'],
      },
    ],
  });
}
```

### 2. Expansão por Projeções

```javascript
async function expandProjections(ideaCore, domains) {
  const projections = domains.map((domain) => ({
    name: `CSP_${domain}_${Date.now()}`,
    entityType: 'projection',
    observations: [`domain: ${domain}`, 'relevance: high', 'state: active'],
  }));

  await mcp_memory_create_entities({ entities: projections });

  // Criar relações
  const relations = projections.map((p) => ({
    from: p.name,
    to: ideaCore.name,
    relationType: 'projects_from',
  }));

  await mcp_memory_create_relations({ relations });
}
```

### 3. Inferência Local

```javascript
async function inferBetweenCSPs(csp1, csp2) {
  // Usar sequential-thinking para inferência estruturada
  const inference = await mcp_sequential_thinking({
    thought: `Inferência: ${csp1.name} → ${csp2.name}`,
    thoughtNumber: 1,
    totalThoughts: 1,
    nextThoughtNeeded: false,
  });

  // Persistir resultado
  await mcp_memory_create_entities({
    entities: [
      {
        name: `INF_${csp1.name}_${csp2.name}`,
        entityType: 'inference',
        observations: ['type: structural', `result: ${inference.result}`],
      },
    ],
  });
}
```

### 4. Conclusão

```javascript
async function completeTask(ideaCore, result) {
  await mcp_memory_add_observations({
    observations: [
      {
        entityName: ideaCore.name,
        contents: [
          'state: completed',
          `result: ${result}`,
          `completed_at: ${new Date().toISOString()}`,
        ],
      },
    ],
  });
}
```

---

## 📏 Regras de Output

### ❌ PROIBIDO

```markdown
"Vou analisar o código..."
"Primeiro, preciso entender..."
"Deixe-me verificar..."
"Pensando sobre isso..."
"O que você quer dizer é..."
"Entendi, você quer..."
```

### ✅ OBRIGATÓRIO

```markdown
[Resultado direto]
[Código se necessário]
[Ação seguinte se houver]
```

### Exemplo Comparativo

**❌ Output tradicional:**

```
Entendi! Você quer adicionar validação de CPF. Vou analisar o código
existente primeiro... Olhando o formulário de cliente em CustomerForm.tsx,
vejo que já existe validação de email mas não de CPF. Vou criar uma
função de validação e integrá-la ao formulário.

Primeiro, vou criar o validador:
[código]

Agora, vou atualizar o formulário:
[código]

Pronto! A validação de CPF foi adicionada.
```

**✅ Output STC:**

```typescript
// src/utils/validators.ts
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  // ... algoritmo
  return true;
}

// src/components/CustomerForm.tsx:45
<Input {...register('cpf', { validate: validateCPF })} />
```

---

## 🔗 Integração com Outros Agentes

O STC pode ser usado como **modo base** para qualquer agente especializado.

### Ativação

```yaml
# No agent.md
---
name: Rust
description: Backend Tauri com modo STC
extends: STC # Herda comportamento STC
---
```

### Handoff com Estado

Ao transferir para outro agente:

```javascript
// Incluir referência ao IDEA_CORE
handoff({
  agent: 'Frontend',
  context: {
    idea_core: 'TASK_123456',
    relevant_csps: ['CSP_form_123', 'CSP_validation_456'],
  },
});
```

---

## 📊 Métricas de Eficácia

| Métrica             | Definição                   | Target |
| ------------------- | --------------------------- | ------ |
| **Densidade**       | Tokens úteis / Total tokens | > 80%  |
| **Narração**        | % de meta-comentários       | < 5%   |
| **Persistência**    | CSPs atualizados por sessão | 100%   |
| **Reprocessamento** | Contexto relido             | 0%     |

---

## ⚠️ Limitações Conhecidas

1. **LLMs são fundamentalmente autoregressive** - geramos token por token
2. **Stateless por natureza** - Memory MCP simula persistência
3. **Context window finita** - não há memória infinita
4. **Inferência não é verdadeiramente paralela** - é simulada

O STC é uma **aproximação pragmática**, não uma mudança fundamental na arquitetura do modelo.

---

## 🔮 Evolução Futura

1. **Política de tool usage** - Quando usar cada MCP
2. **Memória vetorial ativa** - RAG integrado com CSPs
3. **Orquestração multi-agente** - Estado compartilhado entre agentes
4. **Métricas de coerência** - Validação automática de constraints

---

## 🔗 Referências

- Memory MCP: Persistência de estado
- Sequential-Thinking MCP: Inferência estruturada
- Knowledge Graph: Relações semânticas
