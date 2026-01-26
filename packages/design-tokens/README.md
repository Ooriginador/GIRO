# 🎨 GIRO Design Tokens

> Sistema de Design Unificado para o Ecossistema GIRO

## 📦 Instalação

### Projetos no Monorepo

```css
/* No seu globals.css ou main.css */
@import '../../packages/design-tokens/index.css';
```

### Projetos Externos

```bash
pnpm add @giro/design-tokens
```

```css
@import '@giro/design-tokens';
```

## 🎯 Uso

### Cores

```css
/* Variáveis CSS */
.meu-elemento {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* Cores da marca */
.verde-giro {
  background: hsl(var(--giro-green-500));
}

.laranja-giro {
  background: hsl(var(--giro-orange-500));
}
```

### Componentes

```html
<!-- Buttons -->
<button class="giro-btn giro-btn-primary">Salvar</button>
<button class="giro-btn giro-btn-secondary">Cancelar</button>
<button class="giro-btn giro-btn-destructive">Excluir</button>

<!-- Cards -->
<div class="giro-card giro-card-padded">
  <h3>Título</h3>
  <p>Conteúdo</p>
</div>

<!-- Inputs -->
<input class="giro-input" placeholder="Digite aqui..." />
<input class="giro-input giro-input-error" />

<!-- Badges -->
<span class="giro-badge giro-badge-success">Ativo</span>
<span class="giro-badge giro-badge-warning">Pendente</span>
<span class="giro-badge giro-badge-error">Erro</span>

<!-- Preços (PDV) -->
<span class="giro-price giro-price-xl">R$ 19,90</span>
```

### Enterprise Theme

```html
<!-- Adicione a classe no root para tema enterprise -->
<html class="theme-enterprise">
  <!-- Primary será azul industrial ao invés de verde -->
</html>
```

## 📁 Estrutura

```
packages/design-tokens/
├── index.css           # Entry point
├── giro-tokens.css     # Variáveis CSS (cores, tipografia, espaçamento)
├── giro-components.css # Classes de componentes
├── package.json
└── README.md
```

## 🔄 Migração

### De `.pdv-*` para `.giro-*`

| Antigo                | Novo                  |
| --------------------- | --------------------- |
| `.pdv-card`           | `.giro-card`          |
| `.pdv-button-primary` | `.giro-btn-primary`   |
| `.pdv-input`          | `.giro-input`         |
| `.badge-success`      | `.giro-badge-success` |

### De classes Mobile

| Antigo         | Novo                |
| -------------- | ------------------- |
| `.btn-primary` | `.giro-btn-primary` |
| `.card`        | `.giro-card`        |
| `.input`       | `.giro-input`       |

## 🎨 Paleta de Cores

### GIRO Brand

| Token               | HSL         | HEX     | Uso         |
| ------------------- | ----------- | ------- | ----------- |
| `--giro-green-500`  | 142 71% 45% | #22c55e | Primary PDV |
| `--giro-orange-500` | 25 95% 53%  | #f97316 | Accent      |

### Enterprise

| Token                     | HSL         | HEX     | Uso                |
| ------------------------- | ----------- | ------- | ------------------ |
| `--enterprise-blue-500`   | 217 91% 60% | #3b82f6 | Primary Enterprise |
| `--enterprise-yellow-500` | 38 92% 50%  | #f59e0b | Construção/Alerta  |

### Semânticas

| Token            | Uso                  |
| ---------------- | -------------------- |
| `--giro-success` | Sucesso, confirmação |
| `--giro-warning` | Alerta, atenção      |
| `--giro-error`   | Erro, destruição     |
| `--giro-info`    | Informação           |

## 📐 Grid

Sistema baseado em **4px**:

```
--space-1: 0.25rem (4px)
--space-2: 0.5rem  (8px)
--space-4: 1rem   (16px)
--space-8: 2rem   (32px)
```

## 📝 Tipografia

- **Sans:** Inter
- **Mono:** JetBrains Mono

```css
font-family: var(--font-sans);
font-family: var(--font-mono);
```

## 🌙 Dark Mode

Adicione a classe `.dark` no `<html>` ou `<body>`:

```html
<html class="dark"></html>
```

As variáveis são automaticamente atualizadas.

---

_Arkheion Corp © 2026_
