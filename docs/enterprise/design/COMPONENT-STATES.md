# 🎨 Guia de Estados de Componentes - GIRO Enterprise

> **Versão:** 1.0.0  
> **Última Atualização:** 28 de Janeiro de 2026

---

## 📋 Visão Geral

Este documento define os estados visuais de todos os componentes do módulo Enterprise, garantindo consistência na experiência do usuário.

---

## 🔘 Botões

### Botão Primário (Ações principais)

| Estado       | Background       | Texto      | Border | Exemplo             |
| ------------ | ---------------- | ---------- | ------ | ------------------- |
| **Default**  | `enterprise-600` | `white`    | none   | Salvar, Aprovar     |
| **Hover**    | `enterprise-700` | `white`    | none   | Mouse sobre o botão |
| **Active**   | `enterprise-800` | `white`    | none   | Clique/pressão      |
| **Disabled** | `gray-300`       | `gray-500` | none   | Ação não disponível |
| **Loading**  | `enterprise-600` | spinner    | none   | Aguardando resposta |

```css
/* Implementação */
.giro-btn-primary {
  @apply bg-enterprise-600 text-white hover:bg-enterprise-700 
         active:bg-enterprise-800 disabled:bg-gray-300 disabled:text-gray-500;
}
```

### Botão Secundário (Ações secundárias)

| Estado       | Background  | Texto            | Border           |
| ------------ | ----------- | ---------------- | ---------------- |
| **Default**  | transparent | `enterprise-600` | `enterprise-600` |
| **Hover**    | `blue-50`   | `enterprise-700` | `enterprise-700` |
| **Active**   | `blue-100`  | `enterprise-800` | `enterprise-800` |
| **Disabled** | transparent | `gray-400`       | `gray-300`       |

### Botão Destrutivo (Ações perigosas)

| Estado      | Background | Texto   | Uso               |
| ----------- | ---------- | ------- | ----------------- |
| **Default** | `red-600`  | `white` | Cancelar, Excluir |
| **Hover**   | `red-700`  | `white` | Mouse sobre       |
| **Active**  | `red-800`  | `white` | Clique            |

---

## 📝 Campos de Entrada (Inputs)

### Input Padrão

| Estado        | Border           | Background | Label            |
| ------------- | ---------------- | ---------- | ---------------- |
| **Default**   | `gray-300`       | `white`    | `gray-600`       |
| **Focus**     | `enterprise-500` | `white`    | `enterprise-600` |
| **Filled**    | `gray-400`       | `white`    | `gray-600`       |
| **Error**     | `red-500`        | `red-50`   | `red-600`        |
| **Disabled**  | `gray-200`       | `gray-100` | `gray-400`       |
| **Read-only** | `gray-300`       | `gray-50`  | `gray-500`       |

```css
/* Implementação */
.giro-input {
  @apply border-gray-300 focus:border-enterprise-500 focus:ring-enterprise-500/20;
}
.giro-input-error {
  @apply border-red-500 bg-red-50 focus:ring-red-500/20;
}
```

---

## 🏷️ Badges de Status

### Status de Contrato

| Status    | Background   | Texto        | Ícone |
| --------- | ------------ | ------------ | ----- |
| PLANNING  | `purple-100` | `purple-700` | 📋    |
| ACTIVE    | `green-100`  | `green-700`  | ✅    |
| SUSPENDED | `red-100`    | `red-700`    | ⏸️    |
| COMPLETED | `gray-100`   | `gray-700`   | ✓     |
| CANCELLED | `gray-200`   | `gray-500`   | ✗     |

### Status de Requisição

| Status    | Background    | Texto         | Ação pendente |
| --------- | ------------- | ------------- | ------------- |
| DRAFT     | `gray-100`    | `gray-600`    | Submeter      |
| PENDING   | `yellow-100`  | `yellow-700`  | Aprovar       |
| APPROVED  | `green-100`   | `green-700`   | Separar       |
| SEPARATED | `blue-100`    | `blue-700`    | Entregar      |
| DELIVERED | `emerald-100` | `emerald-700` | -             |
| REJECTED  | `red-100`     | `red-700`     | Revisar       |
| CANCELLED | `gray-200`    | `gray-500`    | -             |

### Status de Transferência

| Status     | Background    | Texto         | Ação pendente |
| ---------- | ------------- | ------------- | ------------- |
| PENDING    | `yellow-100`  | `yellow-700`  | Aprovar       |
| APPROVED   | `green-100`   | `green-700`   | Despachar     |
| IN_TRANSIT | `blue-100`    | `blue-700`    | Receber       |
| RECEIVED   | `emerald-100` | `emerald-700` | -             |
| CANCELLED  | `gray-200`    | `gray-500`    | -             |

---

## 📊 Cards

### Card Padrão

| Estado       | Shadow      | Border           | Transform     |
| ------------ | ----------- | ---------------- | ------------- |
| **Default**  | `shadow-sm` | `gray-200`       | none          |
| **Hover**    | `shadow-md` | `gray-300`       | `scale(1.01)` |
| **Selected** | `shadow-md` | `enterprise-500` | none          |
| **Disabled** | none        | `gray-200`       | `opacity-60`  |

### Card de Contrato

```
┌─────────────────────────────────────┐
│  📋 OBRA-001                        │
│  ─────────────────────────────────  │
│  Construção Sede Central            │
│                                     │
│  👤 João Silva (Gerente)            │
│  📍 São Paulo, SP                   │
│                                     │
│  ┌─────────┐  Frentes: 5            │
│  │🟢 ATIVO │  Budget: R$ 1.2M       │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

---

## 📋 Tabelas

### Estados de Linha

| Estado       | Background | Border-left            |
| ------------ | ---------- | ---------------------- |
| **Default**  | `white`    | none                   |
| **Hover**    | `gray-50`  | none                   |
| **Selected** | `blue-50`  | `enterprise-500` (4px) |
| **Expanded** | `gray-50`  | none                   |

### Ordenação de Coluna

| Estado       | Icon       | Cor              |
| ------------ | ---------- | ---------------- |
| **Sortable** | ↕️ (ambos) | `gray-400`       |
| **Asc**      | ↑          | `enterprise-600` |
| **Desc**     | ↓          | `enterprise-600` |

---

## 🔔 Feedback de Ações

### Toast Notifications

| Tipo        | Background   | Ícone | Duração |
| ----------- | ------------ | ----- | ------- |
| **Success** | `green-600`  | ✓     | 3s      |
| **Error**   | `red-600`    | ✗     | 5s      |
| **Warning** | `yellow-500` | ⚠️    | 4s      |
| **Info**    | `blue-600`   | ℹ️    | 3s      |

### Loading States

| Tipo         | Visual             | Uso                   |
| ------------ | ------------------ | --------------------- |
| **Button**   | Spinner inline     | Ação em andamento     |
| **Page**     | Skeleton + shimmer | Carregamento de dados |
| **Modal**    | Overlay + spinner  | Processamento pesado  |
| **Infinite** | Spinner bottom     | Scroll infinito       |

---

## 🎯 Foco e Acessibilidade

### Focus Ring

```css
/* Anel de foco padrão */
.focus-visible:focus {
  outline: 2px solid var(--enterprise-500);
  outline-offset: 2px;
}
```

### Contraste Mínimo

| Elemento       | Ratio WCAG | Padrão |
| -------------- | ---------- | ------ |
| Texto normal   | 4.5:1      | AA     |
| Texto grande   | 3:1        | AA     |
| Componentes UI | 3:1        | AA     |

---

## 🔗 Arquivos Relacionados

- [giro-tokens.css](../../../packages/design-tokens/giro-tokens.css) - Variáveis CSS
- [giro-components.css](../../../packages/design-tokens/giro-components.css) - Classes base
- [EnterpriseIcons.tsx](../../../apps/desktop/src/components/enterprise/icons/EnterpriseIcons.tsx) - Ícones

---

_Documento gerado automaticamente - GIRO Enterprise_
