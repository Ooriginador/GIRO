# 🧠 Semantic Thinking Construct (STC) Skill

> **Framework de cognição estrutural para agentes de IA**  
> Versão: 1.0.0 | Última Atualização: 29 de Janeiro de 2026

## 📋 Descrição

Esta skill implementa o paradigma **STC - Semantic Thinking Construct**, um modelo cognitivo que substitui chain-of-thought linear por estruturas semânticas persistentes.

## 🎯 Princípios Fundamentais

### 1. Unidade de Cognição

**Token ≠ Pensamento**

A unidade mínima de pensamento é um **Construct Semântico Persistente (CSP)**:

```
CSP := {
  core_identity: embedding + label
  state: mutable
  relations: bidirectional pointers
  constraints: logical + contextual
  activation_level: continuous
}
```

### 2. Memória ≠ Contexto

- Histórico textual é renderização tardia
- Memória real são CSPs no Memory MCP
- Acesso por ponteiro semântico, não por releitura

### 3. Inferência Estrutural

```
STATE_TRANSITION := f(CSP_i, CSP_j, relation_k)
```

- Inferências são locais
- Estado global emerge do hipergrafo
- Sem replay do sistema inteiro

---

## 📊 Estrutura de CSPs no Memory MCP

### Tipos de Entidades

| EntityType   | Uso                       | Exemplo              |
| ------------ | ------------------------- | -------------------- |
| `idea_core`  | Âncora central de tarefa  | TASK_implement_cpf   |
| `construct`  | CSP de domínio específico | CSP_validation_rules |
| `projection` | Expansão semântica        | PROJ_frontend_impact |
| `constraint` | Restrição lógica          | CONST_cpf_11_digits  |
| `inference`  | Resultado de inferência   | INF_needs_mask       |

### Template de Criação

```javascript
// Criar IDEA_CORE
mcp_memory_create_entities({
  entities: [
    {
      name: 'TASK_' + taskId,
      entityType: 'idea_core',
      observations: [
        'objective: ' + objective,
        'scope: ' + scope,
        'constraints: ' + constraints,
        'success_criteria: ' + criteria,
        'state: active',
      ],
    },
  ],
});

// Criar CSPs de domínio
mcp_memory_create_entities({
  entities: [
    {
      name: 'CSP_' + domain,
      entityType: 'construct',
      observations: ['domain: ' + domain, 'relevance: high', 'state: active', 'properties: [...]'],
    },
  ],
});

// Criar relações
mcp_memory_create_relations({
  relations: [
    {
      from: 'CSP_' + domain,
      to: 'TASK_' + taskId,
      relationType: 'projects_from',
    },
  ],
});
```

---

## 🔄 Fluxo Operacional

### 1. Inicialização

```
INPUT recebido
    ↓
CONSULTAR Memory MCP
    ↓
CSPs existentes? ──yes──→ RECUPERAR estado
    │                           ↓
    no                    ATUALIZAR contexto
    ↓
CRIAR IDEA_CORE
    ↓
EXPANDIR projeções
```

### 2. Processamento

```
IDEA_CORE ativo
    ↓
PARA CADA domínio relevante:
    ├── CRIAR CSP_projection
    ├── VINCULAR ao IDEA_CORE
    └── INFERIR localmente
    ↓
CONSOLIDAR estado
    ↓
RENDERIZAR output mínimo
```

### 3. Finalização

```
TAREFA completa
    ↓
ATUALIZAR IDEA_CORE (state: completed)
    ↓
REGISTRAR resultados
    ↓
MANTER CSPs para referência futura
```

---

## 🚫 Antipatterns

### Proibido

```
❌ "Vou analisar sua solicitação..."
❌ "Primeiro, preciso entender..."
❌ "Deixe-me verificar..."
❌ "Pensando sobre isso..."
❌ Reprocessar todo o contexto
❌ Chain-of-thought explícito
```

### Correto

```
✅ [Código ou ação direta]
✅ [Resultado conciso]
✅ [Próxima ação se houver]
```

---

## 📐 Métricas de Qualidade

| Métrica             | Alvo | Medição             |
| ------------------- | ---- | ------------------- |
| Densidade semântica | Alta | resultado / tokens  |
| Narração            | Zero | 0 meta-comentários  |
| Persistência        | 100% | CSPs atualizados    |
| Reutilização        | Alta | CSPs reaproveitados |

---

## 🔌 Integração com MCPs

### Memory MCP (Principal)

```javascript
// Operações core
mcp_memory_create_entities(); // Criar CSPs
mcp_memory_create_relations(); // Vincular CSPs
mcp_memory_add_observations(); // Atualizar estado
mcp_memory_read_graph(); // Recuperar tudo
mcp_memory_search_nodes(); // Busca semântica
mcp_memory_open_nodes(); // Acesso direto
```

### Sequential-Thinking MCP (Suporte)

Usar apenas para:

- Validar consistência
- Resolver conflitos
- Determinar próxima ação

**NÃO** para narrar pensamento.

---

## 💡 Exemplos Práticos

### Exemplo 1: Nova Feature

**Input**: "Adicionar busca por código de barras"

**CSPs criados**:

```
TASK_barcode_search (idea_core)
├── CSP_barcode_format (construct)
├── CSP_search_ui (projection)
├── CSP_backend_query (projection)
└── CONST_ean13_valid (constraint)
```

**Output**: [código diretamente]

### Exemplo 2: Bug Fix

**Input**: "Erro ao salvar cliente com CPF inválido"

**CSPs criados**:

```
TASK_fix_cpf_validation (idea_core)
├── CSP_current_validation (construct)
├── CSP_cpf_algorithm (construct)
└── INF_missing_mask (inference)
```

**Output**: [fix direto + teste]

---

## 🔗 Referências Teóricas

- Semantic Memory Networks
- Spreading Activation Theory
- Frame-based Knowledge Representation
- Constraint Satisfaction Problems
