# 🎨 Auditoria de Consistência de Design - GIRO Ecosystem

> **Agente:** QA - Design Review  
> **Data:** 25 de Janeiro de 2026  
> **Status:** ✅ CORREÇÕES APLICADAS

---

## 📊 Resumo Executivo

| Projeto   | Color System | Typography | Spacing     | Components | Status          |
| --------- | ------------ | ---------- | ----------- | ---------- | --------------- |
| Desktop   | HSL          | ✅ Inter   | ✅ 4px Grid | ✅ giro-\* | ✅ CORRIGIDO    |
| Mobile    | HEX          | ✅ Inter   | ✅ 4px Grid | ✅ giro-\* | ✅ CORRIGIDO    |
| Dashboard | OKLCH        | ⚠️ Geist   | ✅ shadcn   | ✅ giro-\* | ✅ CORRIGIDO    |
| Website   | ?            | ?          | ?           | ?          | 🔴 Não auditado |

---

## ✅ Correções Aplicadas (25/01/2026)

### 1. Desktop - globals.css

- ✅ Paleta GIRO unificada (verde + laranja)
- ✅ Tema Enterprise (.theme-enterprise)
- ✅ Classes `.giro-*` padronizadas
- ✅ Dark mode consistente
- ✅ Aliases para retrocompatibilidade (.pdv-_ → .giro-_)

### 2. Mobile - tailwind.config.cjs + global.css

- ✅ Paleta GIRO (HEX equivalente)
- ✅ Cores accent e enterprise adicionadas
- ✅ Tipografia Inter definida
- ✅ Classes `.giro-*` padronizadas
- ✅ Aliases para retrocompatibilidade (.btn-_ → .giro-btn-_)

### 3. Dashboard - globals.css

- ✅ Primary: Verde GIRO (oklch(0.723 0.191 142.1))
- ✅ Accent: Laranja GIRO (oklch(0.705 0.191 41.1))
- ✅ Sidebar com cores GIRO
- ✅ Charts com paleta GIRO
- ✅ Semantic colors (success, warning, info)

---

## 🔴 Inconsistências Originais (Histórico)

### 1. Sistema de Cores Divergente

#### Desktop (design-tokens.css + globals.css)

```css
/* Primary - Verde HSL */
--primary: 142 71% 45%; /* Verde Mercado */
--accent: 25 95% 53%; /* Laranja Tropical */
--success: 142 71% 45%;
--warning: 38 92% 50%;
--error: 0 84% 60%;
--info: 217 91% 60%;
```

#### Mobile (tailwind.config.cjs)

```css
/* Primary - Verde HEX */
primary-500: '#22c55e'           /* Verde diferente! */
success: '#22c55e'
warning: '#f59e0b'
error: '#ef4444'
info: '#3b82f6'
```

#### Dashboard (globals.css)

```css
/* Primary - OKLCH (neutro!) */
--primary: oklch(0.205 0 0); /* Cinza escuro, NÃO verde! */
--destructive: oklch(0.577 0.245 27.325);
```

**🚨 PROBLEMA:** Cada projeto usa um sistema de cor diferente:

- Desktop: HSL com Verde #22c55e como primary
- Mobile: HEX com verde Tailwind
- Dashboard: OKLCH com cinza como primary (padrão shadcn)

---

### 2. Tipografia Inconsistente

| Projeto   | Font Principal   | Font Mono      | Problema              |
| --------- | ---------------- | -------------- | --------------------- |
| Desktop   | Inter            | JetBrains Mono | ✅ Correto            |
| Mobile    | System (default) | N/A            | ⚠️ Sem fonte definida |
| Dashboard | Geist            | Geist Mono     | 🔴 Fonte diferente    |

---

### 3. Escala de Espaçamento

#### Desktop (design-tokens.css)

```css
/* Grid 4px */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-4: 1rem; /* 16px */
--space-8: 2rem; /* 32px */
```

#### Mobile (tailwind.config.cjs)

```javascript
spacing: {
  'safe-top': 'var(--safe-area-inset-top)',
  'safe-bottom': 'var(--safe-area-inset-bottom)',
}
// Usa Tailwind defaults apenas
```

#### Dashboard

```css
// Usa Tailwind defaults apenas
```

---

### 4. Border Radius Inconsistente

| Projeto   | Default             | LG            | XL      |
| --------- | ------------------- | ------------- | ------- |
| Desktop   | 0.25rem             | 0.5rem        | 0.75rem |
| Mobile    | 8px                 | 12px          | 16px    |
| Dashboard | calc(var(--radius)) | var(--radius) | +4px    |

---

### 5. Componentes CSS Divergentes

#### Desktop

```css
.pdv-card {
  @apply bg-card rounded-lg border shadow-sm p-4;
}
.pdv-button-primary {
  ...;
}
.badge-success {
  @apply bg-success/10 text-success...;
}
```

#### Mobile

```css
.btn-primary {
  @apply bg-primary-500 text-white px-4 py-3 rounded-lg font-semibold;
}
.card {
  @apply bg-background rounded-xl p-4 shadow-sm border border-border;
}
.badge-success {
  @apply bg-success/10 text-success;
}
```

**🚨 PROBLEMA:** Nomenclatura diferente para mesmos componentes:

- Desktop: `.pdv-card`, `.pdv-button-primary`
- Mobile: `.card`, `.btn-primary`

---

## 🟡 Inconsistências Menores

### 6. Dark Mode Implementation

| Projeto   | Método                | Seletor |
| --------- | --------------------- | ------- |
| Desktop   | CSS Variables + Class | `.dark` |
| Mobile    | Não implementado      | N/A     |
| Dashboard | CSS Variables + Class | `.dark` |

### 7. Animations

- Desktop: Keyframes customizados (slide, fade, pulse)
- Mobile: Nenhum definido
- Dashboard: Usa tw-animate-css

---

## ✅ Pontos Consistentes

1. **Tailwind CSS** - Todos usam Tailwind
2. **Estrutura Layer** - `@layer base/components/utilities`
3. **Pattern de foreground** - `*-foreground` para contraste
4. **Status colors** - success/warning/error/info (nomes iguais)

---

## 🛠️ Recomendações de Correção

### Prioridade 1: Unificar Sistema de Cores

Criar um **shared-tokens** package:

```
packages/
└── design-tokens/
    ├── colors.css       # Variáveis de cor em HSL
    ├── typography.css   # Fontes e escalas
    ├── spacing.css      # Grid 4px
    ├── components.css   # Classes CSS reutilizáveis
    └── index.css        # Entry point
```

### Prioridade 2: Padronizar Primary Color

Definir **Verde GIRO** único:

```css
/* Verde GIRO - ÚNICO em todo ecossistema */
--giro-green-hsl: 142 71% 45%; /* HSL para web */
--giro-green-hex: #22c55e; /* HEX fallback */
--giro-green-oklch: oklch(0.72 0.19 142); /* OKLCH para browsers modernos */
```

### Prioridade 3: Nomenclatura Unificada

| Padrão              | Componente     |
| ------------------- | -------------- |
| `.giro-card`        | Card container |
| `.giro-btn`         | Button base    |
| `.giro-btn-primary` | Primary button |
| `.giro-badge`       | Badge base     |
| `.giro-input`       | Input field    |

### Prioridade 4: Dashboard Rebrand

O Dashboard usa cores neutras (padrão shadcn). Precisa ser rebranded para:

- Primary: Verde GIRO
- Accent: Laranja GIRO

---

## 📋 Checklist de Correção

### Fase 1: Tokens Unificados

- [ ] Criar `packages/design-tokens/`
- [ ] Definir paleta GIRO única
- [ ] Exportar para CSS, JS, e Tailwind config

### Fase 2: Desktop

- [ ] Importar design-tokens
- [ ] Renomear `.pdv-*` para `.giro-*`
- [ ] Validar dark mode

### Fase 3: Mobile

- [ ] Importar design-tokens (HEX)
- [ ] Renomear `.btn-*` para `.giro-btn-*`
- [ ] Adicionar tipografia Inter

### Fase 4: Dashboard

- [ ] Alterar primary de cinza para verde
- [ ] Importar design-tokens
- [ ] Trocar Geist por Inter (opcional)

### Fase 5: Enterprise (Novo)

- [ ] Criar tokens Enterprise baseados no GIRO base
- [ ] Adicionar cores industriais (azul aço)
- [ ] Criar iconografia específica

---

## 🎯 Paleta Proposta Unificada

```css
:root {
  /* === GIRO BRAND === */
  --giro-primary: 142 71% 45%; /* Verde Mercado */
  --giro-accent: 25 95% 53%; /* Laranja Tropical */

  /* === SEMANTIC === */
  --giro-success: 142 71% 45%; /* = primary */
  --giro-warning: 38 92% 50%; /* Âmbar */
  --giro-error: 0 84% 60%; /* Vermelho */
  --giro-info: 217 91% 60%; /* Azul */

  /* === ENTERPRISE EXTENSION === */
  --enterprise-primary: 210 100% 35%; /* Industrial Blue */
  --enterprise-accent: 25 95% 53%; /* Laranja (igual) */
  --enterprise-construction: 38 92% 50%; /* Amarelo Obra */
}
```

---

## 📊 Métricas de Qualidade

| Métrica                    | Atual | Meta |
| -------------------------- | ----- | ---- |
| Cores duplicadas           | 12+   | 0    |
| Sistemas de cor            | 3     | 1    |
| Fontes diferentes          | 3     | 1-2  |
| Classes CSS inconsistentes | 15+   | 0    |
| Cobertura dark mode        | 66%   | 100% |

---

## 🔗 Arquivos Auditados

- [design-tokens.css](../../apps/desktop/src/styles/design-tokens.css)
- [globals.css (desktop)](../../apps/desktop/src/styles/globals.css)
- [tailwind.config.ts](../../apps/desktop/tailwind.config.ts)
- [global.css (mobile)](../../../../giro-mobile/global.css)
- [tailwind.config.cjs (mobile)](../../../../giro-mobile/tailwind.config.cjs)
- [globals.css (dashboard)](../../../../giro-license-server/dashboard/src/app/globals.css)

---

_Auditoria realizada por: QA Agent_  
_Próxima revisão: Após implementação das correções_
