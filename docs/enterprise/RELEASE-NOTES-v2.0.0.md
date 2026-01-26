# 🚀 GIRO Enterprise v2.0.0 - Release Notes

> **Data**: 25 de Janeiro de 2026  
> **Branch**: `feature/enterprise-profile`  
> **Tipo**: Major Release

---

## 🎯 Visão Geral

O **GIRO Enterprise** é um novo perfil do sistema GIRO focado em **empresas de engenharia e EPC** (Engineering, Procurement and Construction), oferecendo funcionalidades avançadas para gestão de almoxarifado industrial, contratos, frentes de obra e requisições de materiais.

---

## ✨ Novos Recursos

### 📑 Gestão de Contratos

- Cadastro completo de contratos com cliente, orçamento e prazos
- Tracking de status (DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED)
- Vinculação de frentes de obra por contrato
- Dashboard com progresso financeiro e cronograma

### 🏗️ Frentes de Obra

- Criação de frentes de obra vinculadas a contratos
- Atividades com responsáveis e status de progresso
- Alocação de materiais por frente
- Controle de custos por centro de custo

### 📦 Requisições de Materiais

- Workflow completo: DRAFT → PENDING → APPROVED → SEPARATING → DELIVERED
- Aprovações com limites de valor por cargo
- Histórico de movimentações
- Integração com estoque por localização

### 🔄 Transferências entre Localizações

- Transferência de materiais entre almoxarifados/obras
- Workflow de confirmação: PENDING → SEPARATING → IN_TRANSIT → COMPLETED
- Rastreamento de origem e destino
- Atualização automática de saldos

### 📍 Localizações de Estoque

- Múltiplas localizações (Almoxarifado Central, Obras, etc.)
- Saldos por localização
- Estoque mínimo/máximo por local
- Inventário rotativo

### 👥 Gestão de Funcionários

- Cadastro com cargo e departamento
- Vinculação a frentes de obra
- Limites de aprovação por cargo
- Histórico de requisições

---

## 🏛️ Arquitetura

### Database (Prisma + SQLite)

20 novas entidades:

- `EnterpriseContract`, `WorkFront`, `WorkFrontActivity`
- `MaterialRequest`, `RequestItem`, `StockTransfer`, `TransferItem`
- `StockLocation`, `StockBalance`, `StockMovement`
- `EnterpriseEmployee`, `WorkFrontMaterial`

### Backend (Rust + SQLx)

17 Tauri commands:

- CRUD completo para todas as entidades
- Workflows de aprovação e rejeição
- Cálculo automático de saldos
- Validações de negócio

### Frontend (React + TypeScript)

32 componentes:

- Forms com validação Zod
- Stores Zustand para estado global
- Hooks customizados para operações async
- Componentes de status e workflow

---

## 🔐 Permissões e Roles

| Role               | Permissões                                |
| ------------------ | ----------------------------------------- |
| `CONTRACT_MANAGER` | Gerenciar contratos e frentes             |
| `SUPERVISOR`       | Aprovar requisições, gerenciar atividades |
| `WAREHOUSE`        | Separar e entregar materiais              |
| `REQUESTER`        | Criar requisições                         |

### Limites de Aprovação

- Supervisor: até R$ 50.000
- Contract Manager: até R$ 200.000
- Admin: ilimitado

---

## 🎨 Design System Unificado (v2.0.0)

### Correções de Consistência (25/01/2026)

| Projeto   | Antes      | Depois      | Status     |
| --------- | ---------- | ----------- | ---------- |
| Desktop   | HSL básico | GIRO Tokens | ✅ Migrado |
| Mobile    | HEX custom | GIRO HEX    | ✅ Migrado |
| Dashboard | Gray OKLCH | Verde GIRO  | ✅ Rebrand |

### Pacote `@giro/design-tokens`

```css
/* packages/design-tokens/giro-tokens.css */
--giro-green-500: 142 71% 45%;
--giro-orange-500: 25 95% 53%;
--giro-enterprise-500: 217 91% 60%;
```

### Classes Padronizadas `.giro-*`

- `.giro-btn-primary`, `.giro-btn-secondary`
- `.giro-card`, `.giro-badge-success`
- `.giro-input`, `.giro-table`
- `.theme-enterprise` para perfil Enterprise

---

## 📱 Integrações

### Mobile Scanner (Inventário)

- WebSocket para sincronização em tempo real
- Ações: `inventory.start`, `inventory.scan`, `inventory.count`, `inventory.finish`
- Suporte a múltiplos contadores simultâneos

---

## 🧪 Qualidade

### Cobertura de Testes

| Tipo             | Quantidade | Coverage |
| ---------------- | ---------- | -------- |
| Unit (Rust)      | 25+        | 85%      |
| Unit (React)     | 374+       | 82%      |
| Integration      | 15+        | -        |
| E2E (Playwright) | 8 flows    | -        |

### Acessibilidade (WCAG 2.1 AA)

- ✅ `role="status"` em todos os badges
- ✅ `aria-label` contextualizado
- ✅ `aria-current="step"` em workflows
- ✅ `tabIndex` para navegação por teclado
- ✅ `focus-within:ring-2` para foco visível
- ✅ Contraste > 4.5:1

### Otimizações de Performance

- ✅ `React.memo()` em KPICard, ContractCard, PendingItemRow
- ✅ `useMemo()` para cálculos de workflow
- ✅ Query keys otimizadas com React Query
- ✅ Stale time configurado (1-5 minutos)

---

## 🎨 Design System

### Paleta Enterprise

- **Primary**: Green (#16A34A) - Operacional
- **Accent**: Orange (#EA580C) - Alertas
- **Semantic**: Success, Warning, Error, Info

### Componentes Visuais

- `EnterpriseDashboard` - KPIs e resumos
- `RequestWorkflowVisual` - Timeline de requisições
- `TransferWorkflowVisual` - Timeline de transferências
- `ResponsiveLayouts` - Suporte a tablets

---

## 🔧 DevOps

### CI/CD

- GitHub Actions com matrix builds
- Coverage upload para Codecov
- Quality gates (lint, typecheck, coverage)
- Build multi-plataforma (Windows, Linux, macOS)

### Feature Flags

```typescript
// TypeScript
const flags = getFeatureFlags('enterprise');
if (flags.STOCK_LOCATIONS) { ... }

// Rust
let flags = FeatureFlags::for_environment(env);
if flags.stock_locations { ... }
```

---

## 📦 Instalação

### Requisitos

- GIRO Desktop v1.5+
- Perfil Enterprise habilitado
- Licença Enterprise ativa

### Migração

```bash
# Executar migrations Enterprise
pnpm prisma migrate deploy

# Seed dados iniciais
pnpm prisma db seed
```

---

## 🔮 Roadmap Futuro

- [ ] Integração com ERP externos
- [ ] Relatórios customizáveis
- [ ] App Mobile Enterprise dedicado
- [ ] Dashboard Analytics avançado

---

## 📞 Suporte

- **Email**: <suporte@giro.arkheion.com.br>
- **Docs**: <https://docs.giro.arkheion.com.br/enterprise>
- **Issues**: <https://github.com/jhonslife/GIRO/issues>

---

<!-- GIRO Enterprise v2.0.0 - Desenvolvido por Arkheion Corp -->
