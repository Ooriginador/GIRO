# 🏗️ GIRO - Arquitetura do Sistema

> **Versão:** 2.0.0  
> **Status:** Aprovado  
> **Última Atualização:** 25 de Janeiro de 2026

---

## 📋 Sumário

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Arquitetura Multi-Produto](#arquitetura-multi-produto)
3. [Stack Tecnológica](#stack-tecnológica)
4. [Decisões Arquiteturais](#decisões-arquiteturais)
5. [Estrutura do Projeto](#estrutura-do-projeto)
6. [Integrações de Hardware](#integrações-de-hardware)
7. [Segurança](#segurança)
8. [Performance](#performance)

---

## 🎯 Visão Geral da Arquitetura

### Arquitetura High-Level - Monorepo Multi-Produto

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GIRO MONOREPO                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           APPS LAYER                                 │   │
│  │                                                                      │   │
│  │  ┌─────────────────────┐          ┌─────────────────────┐           │   │
│  │  │    apps/desktop     │          │   apps/enterprise   │           │   │
│  │  │    (GIRO Varejo)    │          │  (GIRO Enterprise)  │           │   │
│  │  │                     │          │                     │           │   │
│  │  │  • PDV/Caixa        │          │  • Contratos        │           │   │
│  │  │  • Vendas           │          │  • Requisições      │           │   │
│  │  │  • Estoque simples  │          │  • Multi-localização│           │   │
│  │  │  • Validade/FIFO    │          │  • Transferências   │           │   │
│  │  │  • Funcionários     │          │  • Inventário       │           │   │
│  │  │                     │          │  • Apropriação custo│           │   │
│  │  │  Target: Varejo     │          │  Target: Indústria  │           │   │
│  │  └──────────┬──────────┘          └──────────┬──────────┘           │   │
│  │             │                                │                       │   │
│  │             └────────────────┬───────────────┘                       │   │
│  │                              │                                       │   │
│  └──────────────────────────────┼───────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PACKAGES LAYER                                │   │
│  │                    (Código Compartilhado)                            │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   packages/  │  │   packages/  │  │   packages/  │              │   │
│  │  │   database   │  │      ui      │  │     core     │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ • Schema     │  │ • Button     │  │ • useAuth    │              │   │
│  │  │ • Migrations │  │ • Table      │  │ • useQuery   │              │   │
│  │  │ • Types      │  │ • Form       │  │ • formatters │              │   │
│  │  │ • Enums      │  │ • Modal      │  │ • validators │              │   │
│  │  │              │  │ • Sidebar    │  │ • constants  │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          INFRASTRUCTURE                                     │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   License    │  │   Mobile     │  │  Dashboard   │  │   Website    │   │
│  │   Server     │  │   Scanner    │  │   (Owner)    │  │  (Landing)   │   │
│  │              │  │    (PWA)     │  │              │  │              │   │
│  │  Railway     │  │   Vercel     │  │   Vercel     │  │   Vercel     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏭 Arquitetura Multi-Produto

### Estratégia: Monorepo com Apps Especializadas

O GIRO utiliza uma arquitetura de **monorepo com apps especializadas**, onde:

- **80% do código é compartilhado** via packages
- **20% é específico** de cada app (pages, workflows, features)
- **Deploy independente** - cada app gera seu próprio instalador
- **Versionamento separado** - GIRO v1.5, Enterprise v1.0

### Matriz de Features por Produto

| Feature              | Desktop (Varejo) | Enterprise (Almoxarifado) |
| -------------------- | :--------------: | :-----------------------: |
| PDV/Caixa            |        ✅        |            ❌             |
| Vendas               |        ✅        |            ❌             |
| Estoque              |   ✅ (simples)   |     ✅ (multi-local)      |
| Validade/Lotes       |        ✅        |            ✅             |
| Funcionários         |        ✅        |            ✅             |
| Contratos            |        ❌        |            ✅             |
| Frentes de Trabalho  |        ❌        |            ✅             |
| Atividades           |        ❌        |            ✅             |
| Requisições          |        ❌        |            ✅             |
| Transferências       |        ❌        |            ✅             |
| Inventário Rotativo  |        ❌        |            ✅             |
| Apropriação de Custo |        ❌        |            ✅             |
| Impressora Térmica   |        ✅        |            ✅             |
| Balança              |        ✅        |            ❌             |
| Scanner USB          |        ✅        |            ✅             |
| Scanner Mobile       |        ✅        |            ✅             |
| Gaveta de Dinheiro   |        ✅        |            ❌             |

### Arquitetura Interna de cada App

````text
┌─────────────────────────────────────────────────────────────────────────┐
│                        GIRO DESKTOP / ENTERPRISE APP                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     PRESENTATION LAYER                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │   Pages    │  │ Components │  │   Hooks    │  │   Stores   │  │  │
│  │  │ (Rotas)    │  │ (Específ.) │  │ (Domínio)  │  │ (Zustand)  │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  │                                                                   │  │
│  │  Imports: @giro/ui, @giro/core                                   │  │
│  │  Tech: React 18 + TypeScript + TailwindCSS + Shadcn/UI           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      APPLICATION LAYER                            │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                    TAURI BRIDGE (IPC)                        │ │  │
│  │  │   Commands | Events | State Management | File System         │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  Tech: Tauri 2.0 + Rust Core                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      BACKEND LAYER (Rust)                         │  │
│  │                                                                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │  Commands  │  │  Services  │  │ Repositories│ │  Hardware  │  │  │
│  │  │ (Específ.) │  │ (Domínio)  │  │  (SQLx)    │  │  Drivers   │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  │                                                                   │  │
│  │  Tech: Rust + SQLx + SerialPort + Google Drive API               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       DATA LAYER                                  │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────┐  ┌────────────────────────┐ │  │
│  │  │         SQLite Database         │  │     Google Drive       │ │  │
│  │  │   (Local - Embedded)            │  │     (Backup Only)      │ │  │
│  │  │                                 │  │                        │ │  │
│  │  │  Schema: @giro/database         │  │  • db_backup_*.sqlite  │ │  │
│  │  │  (Prisma compartilhado)         │  │  • Criptografado       │ │  │
│  │  └─────────────────────────────────┘  └────────────────────────┘ │  │
│  │                                                                   │  │
│  │  Tech: SQLite 3 + Prisma (Schema Only) + SQLx (Runtime)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```text
---

## 🛠️ Stack Tecnológica

### Frontend (Renderer Process)

| Tecnologia          | Versão | Justificativa                                                      |
| ------------------- | ------ | ------------------------------------------------------------------ |
| **React**           | 18.3+  | Ecossistema maduro, componentes reutilizáveis, DevTools excelentes |
| **TypeScript**      | 5.4+   | Type safety, IntelliSense, menos bugs em runtime                   |
| **Vite**            | 5.0+   | Build extremamente rápido, HMR instantâneo                         |
| **TailwindCSS**     | 3.4+   | Utility-first, consistência de design, bundle otimizado            |
| **Shadcn/UI**       | Latest | Componentes acessíveis, customizáveis, não é dependência           |
| **Zustand**         | 4.5+   | State management leve, sem boilerplate                             |
| **TanStack Query**  | 5.0+   | Cache de dados, sync automático, loading states                    |
| **React Hook Form** | 7.50+  | Forms performáticos, validação integrada                           |
| **Zod**             | 3.22+  | Schema validation, type inference                                  |

### Backend (Tauri/Rust)

| Tecnologia     | Versão | Justificativa                                 |
| -------------- | ------ | --------------------------------------------- |
| **Tauri**      | 2.0+   | Bundle 10x menor que Electron, seguro, nativo |
| **Rust**       | 1.75+  | Performance, segurança de memória, sem GC     |
| **SQLx**       | 0.7+   | Compile-time checked queries, async           |
| **SQLite**     | 3.45+  | Zero config, single file, performático        |
| **Tokio**      | 1.35+  | Async runtime de alta performance             |
| **Serde**      | 1.0+   | Serialização eficiente                        |
| **serialport** | 4.3+   | Comunicação com balanças e periféricos        |

### Banco de Dados

| Tecnologia | Uso                        | Justificativa                                   |
| ---------- | -------------------------- | ----------------------------------------------- |
| **SQLite** | Produção (Local)           | Funciona offline, arquivo único, backup fácil   |
| **Prisma** | Schema Design + Migrations | DX excelente, type-safe, migrations versionadas |
| **SQLx**   | Runtime Queries            | Queries verificadas em compile-time no Rust     |

### Integrações

| Tecnologia               | Uso                    | Justificativa                    |
| ------------------------ | ---------------------- | -------------------------------- |
| **node-thermal-printer** | Impressão de cupons    | Suporte a Epson, Elgin, Daruma   |
| **ESC/POS Protocol**     | Comandos de impressora | Padrão da indústria              |
| **Google Drive API**     | Backup em nuvem        | Familiar para usuários, gratuito |
| **WebSocket**            | Scanner Mobile         | Comunicação real-time            |

### DevOps & Build

| Tecnologia         | Uso                    | Justificativa                      |
| ------------------ | ---------------------- | ---------------------------------- |
| **GitHub Actions** | CI/CD                  | Integrado ao repo, runners Windows |
| **NSIS**           | Instalador Windows     | Padrão de mercado, customizável    |
| **WiX Toolset**    | Instalador alternativo | MSI enterprise-grade               |

---

## 📐 Decisões Arquiteturais

### ADR-001: Tauri vs Electron

| Critério                 | Electron    | Tauri           | Decisão                 |
| ------------------------ | ----------- | --------------- | ----------------------- |
| **Tamanho do Bundle**    | ~150MB      | ~10MB           | ✅ Tauri                |
| **Uso de RAM**           | ~300MB      | ~50MB           | ✅ Tauri                |
| **Startup Time**         | ~3s         | ~0.5s           | ✅ Tauri                |
| **Acesso a Hardware**    | Via Node.js | Via Rust        | ✅ Tauri (mais robusto) |
| **Curva de Aprendizado** | Familiar    | Rust necessário | ⚠️ Electron             |
| **Ecossistema**          | Maduro      | Crescendo       | ⚠️ Electron             |

**Decisão:** Tauri é escolhido pela performance crítica no PDV e tamanho do instalador.

### ADR-002: SQLite vs PostgreSQL Local

| Critério                | SQLite         | PostgreSQL       | Decisão       |
| ----------------------- | -------------- | ---------------- | ------------- |
| **Instalação**          | Zero config    | Serviço + config | ✅ SQLite     |
| **Backup**              | Copiar arquivo | pg_dump          | ✅ SQLite     |
| **Performance (local)** | Excelente      | Excelente        | Empate        |
| **Concurrent writes**   | Limitado       | Excelente        | ⚠️ PostgreSQL |
| **Manutenção**          | Zero           | Updates, vacuum  | ✅ SQLite     |

**Decisão:** SQLite pela simplicidade. Volume de operações não justifica PostgreSQL.

### ADR-003: Monorepo com Múltiplas Apps

```text
✅ DECISÃO: MONOREPO MULTI-PRODUTO

GIRO/
├── apps/
│   ├── desktop/          # GIRO Varejo (Mercearias, Motopeças)
│   └── enterprise/       # GIRO Enterprise (Almoxarifado Industrial)
├── packages/
│   ├── database/         # Prisma schema + migrations (compartilhado)
│   ├── ui/               # Design system Shadcn (compartilhado)
│   └── core/             # Hooks, utils, types (compartilhado)
└── tools/
    └── scripts/          # Build, deploy, etc.
````

**Justificativa:**

- **80% código compartilhado** - UI, auth, database, utils
- **20% específico por app** - Pages, workflows, features de domínio
- **Deploy independente** - Cada app gera instalador próprio
- **Manutenção unificada** - Bug fix beneficia ambas as apps
- **Evita "fork hell"** - Repos separados divergem e ficam impossíveis de sincronizar
- **Estrutura já existe** - pnpm workspaces configurado

### ADR-004: Backup Strategy

````text
┌──────────────────────────────────────────────────────────────────┐
│                     ESTRATÉGIA DE BACKUP                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LOCAL                          NUVEM                             │
│  ─────                          ─────                             │
│  • SQLite WAL mode              • Google Drive                    │
│  • Backup diário automático     • Upload criptografado (AES-256)  │
│  • Rotação 7 dias               • Rotação 30 dias                 │
│  • Pasta: %APPDATA%/Mercearias  • Pasta: Mercearias/backups/      │
│                                                                   │
│  TRIGGER: A cada fechamento de caixa                             │
│  TRIGGER: Diariamente às 03:00 (se PC ligado)                    │
│  TRIGGER: Manual pelo usuário                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```text
### ADR-005: Comunicação Frontend-Backend

```text
┌─────────────────────────────────────────────────────────────────┐
│                    TAURI IPC PATTERNS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COMMANDS (Request-Response)                                     │
│  ────────────────────────────                                    │
│  Frontend ──invoke('get_products', filters)──► Rust              │
│  Frontend ◄──────────── Result<Vec<Product>> ───Rust             │
│                                                                  │
│  EVENTS (Push Notifications)                                     │
│  ───────────────────────────                                     │
│  Rust ──emit('barcode_scanned', code)──► Frontend               │
│  Rust ──emit('print_completed', status)──► Frontend             │
│  Rust ──emit('alert_triggered', alert)──► Frontend              │
│                                                                  │
│  STATE (Reactive)                                                │
│  ────────────────                                                │
│  Zustand Store ──sync──► Tauri State Manager                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
````

---

## 📁 Estrutura do Projeto

```text
GIRO/                            # ─── MONOREPO RAIZ ───
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, build check
│   │   ├── release.yml         # Build installers (ambas apps)
│   │   └── tauri-build.yml     # Cross-platform builds
│   └── ISSUE_TEMPLATE/
│
├── apps/
│   │
│   ├── desktop/                 # ─── GIRO VAREJO ───
│   │   ├── src/                 # React Frontend
│   │   │   ├── components/
│   │   │   │   ├── pdv/         # PDV/Caixa (específico)
│   │   │   │   ├── sales/       # Vendas (específico)
│   │   │   │   ├── products/    # Cadastro de produtos
│   │   │   │   ├── stock/       # Gestão de estoque
│   │   │   │   └── reports/     # Relatórios varejo
│   │   │   │
│   │   │   ├── pages/           # Rotas/Páginas (específico)
│   │   │   │   ├── pdv/
│   │   │   │   ├── products/
│   │   │   │   ├── stock/
│   │   │   │   ├── employees/
│   │   │   │   ├── cash-control/
│   │   │   │   └── reports/
│   │   │   │
│   │   │   ├── hooks/           # Hooks específicos varejo
│   │   │   ├── stores/          # Zustand stores
│   │   │   └── types/           # Types específicos
│   │   │
│   │   ├── src-tauri/           # Rust Backend
│   │   │   ├── src/
│   │   │   │   ├── commands/    # Commands varejo
│   │   │   │   │   ├── products.rs
│   │   │   │   │   ├── sales.rs
│   │   │   │   │   ├── stock.rs
│   │   │   │   │   ├── cash.rs
│   │   │   │   │   └── reports.rs
│   │   │   │   ├── services/
│   │   │   │   ├── repositories/
│   │   │   │   └── hardware/
│   │   │   │
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json  # identifier: br.com.giro.desktop
│   │   │
│   │   └── package.json         # name: @giro/desktop
│   │
│   └── enterprise/              # ─── GIRO ENTERPRISE ───
│       ├── src/                 # React Frontend
│       │   ├── components/
│       │   │   ├── contracts/   # Gestão de contratos
│       │   │   ├── work-fronts/ # Frentes de trabalho
│       │   │   ├── activities/  # Atividades
│       │   │   ├── requests/    # Requisições
│       │   │   ├── transfers/   # Transferências
│       │   │   ├── locations/   # Locais de estoque
│       │   │   └── inventory/   # Inventário rotativo
│       │   │
│       │   ├── pages/           # Rotas/Páginas (específico)
│       │   │   ├── dashboard/
│       │   │   ├── contracts/
│       │   │   ├── work-fronts/
│       │   │   ├── requests/
│       │   │   ├── transfers/
│       │   │   ├── inventory/
│       │   │   └── reports/
│       │   │
│       │   ├── hooks/           # Hooks Enterprise
│       │   │   ├── useContracts.ts
│       │   │   ├── useRequests.ts
│       │   │   └── useTransfers.ts
│       │   │
│       │   └── types/           # Types Enterprise
│       │       └── enterprise.ts
│       │
│       ├── src-tauri/           # Rust Backend
│       │   ├── src/
│       │   │   ├── commands/    # Commands Enterprise
│       │   │   │   ├── contracts.rs
│       │   │   │   ├── work_fronts.rs
│       │   │   │   ├── activities.rs
│       │   │   │   ├── locations.rs
│       │   │   │   ├── requests.rs
│       │   │   │   ├── transfers.rs
│       │   │   │   └── inventory.rs
│       │   │   ├── services/
│       │   │   └── repositories/
│       │   │
│       │   ├── Cargo.toml
│       │   └── tauri.conf.json  # identifier: br.com.giro.enterprise
│       │
│       └── package.json         # name: @giro/enterprise
│
├── packages/
│   │
│   ├── database/                # ─── PRISMA SCHEMA (COMPARTILHADO) ───
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Schema único com todas as entidades
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── types.ts         # Generated types
│   │   │   └── enums.ts         # Enums exportados
│   │   └── package.json         # name: @giro/database
│   │
│   ├── ui/                      # ─── DESIGN SYSTEM (COMPARTILHADO) ───
│   │   ├── src/
│   │   │   ├── components/      # Button, Table, Form, Modal...
│   │   │   ├── layout/          # Shell, Sidebar, Header
│   │   │   ├── tokens/          # Cores, tipografia
│   │   │   └── index.ts
│   │   └── package.json         # name: @giro/ui
│   │
│   └── core/                    # ─── CÓDIGO COMUM (COMPARTILHADO) ───
│       ├── src/
│       │   ├── hooks/           # useAuth, useQuery wrappers
│       │   ├── utils/           # formatters, validators
│       │   ├── constants/       # Constantes globais
│       │   └── types/           # Types base
│       └── package.json         # name: @giro/core
│
├── docs/                        # Documentação
│   ├── 00-OVERVIEW.md
│   ├── 01-ARQUITETURA.md
│   ├── 02-DATABASE-SCHEMA.md
│   ├── 03-FEATURES-CORE.md
│   ├── 04-BUSINESS-MODEL.md
│   ├── 05-ENTERPRISE-MODULE.md  # ← NOVO
│   └── enterprise/
│       └── roadmaps/            # Roadmaps por agente
│
├── tools/
│   └── scripts/
│       ├── build-desktop.ts
│       ├── build-enterprise.ts
│       └── seed-database.ts
│
├── package.json                 # Root package (workspaces)
├── pnpm-workspace.yaml          # packages: ["apps/*", "packages/*"]
├── turbo.json                   # Turborepo config
└── README.md
```

### Fluxo de Imports entre Packages

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      DEPENDENCY GRAPH                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌────────────────┐          ┌────────────────┐                    │
│   │  apps/desktop  │          │ apps/enterprise│                    │
│   └───────┬────────┘          └───────┬────────┘                    │
│           │                           │                              │
│           │ imports                   │ imports                      │
│           ▼                           ▼                              │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                    packages/ui                             │     │
│   │  import { Button, Table, Modal } from '@giro/ui'          │     │
│   └───────────────────────────┬───────────────────────────────┘     │
│                               │                                      │
│                               │ imports                              │
│                               ▼                                      │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                   packages/core                            │     │
│   │  import { useAuth, formatCurrency } from '@giro/core'     │     │
│   └───────────────────────────┬───────────────────────────────┘     │
│                               │                                      │
│                               │ imports                              │
│                               ▼                                      │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                  packages/database                         │     │
│   │  import { Product, Contract } from '@giro/database'       │     │
│   └───────────────────────────────────────────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Integrações de Hardware

│ │ │ │ ├── pdvStore.ts
│ │ │ │ ├── authStore.ts
│ │ │ │ ├── settingsStore.ts
│ │ │ │ └── alertStore.ts
│ │ │ │
│ │ │ ├── lib/ # Utilities
│ │ │ │ ├── tauri.ts # Tauri invoke wrappers
│ │ │ │ ├── formatters.ts
│ │ │ │ └── validators.ts
│ │ │ │
│ │ │ ├── types/ # TypeScript types
│ │ │ └── styles/ # Global CSS
│ │ │
│ │ ├── src-tauri/ # Rust Backend
│ │ │ ├── src/
│ │ │ │ ├── main.rs
│ │ │ │ ├── lib.rs
│ │ │ │ │
│ │ │ │ ├── commands/ # Tauri commands
│ │ │ │ │ ├── mod.rs
│ │ │ │ │ ├── products.rs
│ │ │ │ │ ├── sales.rs
│ │ │ │ │ ├── stock.rs
│ │ │ │ │ ├── employees.rs
│ │ │ │ │ ├── cash.rs
│ │ │ │ │ ├── reports.rs
│ │ │ │ │ └── settings.rs
│ │ │ │ │
│ │ │ │ ├── services/ # Business logic
│ │ │ │ │ ├── mod.rs
│ │ │ │ │ ├── product_service.rs
│ │ │ │ │ ├── sale_service.rs
│ │ │ │ │ ├── stock_service.rs
│ │ │ │ │ ├── alert_service.rs
│ │ │ │ │ └── backup_service.rs
│ │ │ │ │
│ │ │ │ ├── repositories/ # Data access
│ │ │ │ │ ├── mod.rs
│ │ │ │ │ ├── product_repo.rs
│ │ │ │ │ ├── sale_repo.rs
│ │ │ │ │ └── ...
│ │ │ │ │
│ │ │ │ ├── hardware/ # Device drivers
│ │ │ │ │ ├── mod.rs
│ │ │ │ │ ├── printer.rs
│ │ │ │ │ ├── scale.rs
│ │ │ │ │ ├── barcode_scanner.rs
│ │ │ │ │ └── cash_drawer.rs
│ │ │ │ │
│ │ │ │ ├── models/ # Domain models
│ │ │ │ ├── database/ # DB connection
│ │ │ │ └── config/ # App config
│ │ │ │
│ │ │ ├── Cargo.toml
│ │ │ ├── tauri.conf.json
│ │ │ └── icons/
│ │ │
│ │ ├── package.json
│ │ ├── vite.config.ts
│ │ ├── tailwind.config.ts
│ │ └── tsconfig.json
│ │
│ └── mobile-scanner/ # ─── PWA SCANNER ───
│ ├── src/
│ │ ├── App.tsx
│ │ ├── Scanner.tsx # Camera barcode reader
│ │ └── WebSocketClient.tsx
│ ├── package.json
│ └── vite.config.ts
│
├── packages/
│ ├── database/ # ─── PRISMA SCHEMA ───
│ │ ├── prisma/
│ │ │ ├── schema.prisma
│ │ │ └── migrations/
│ │ ├── src/
│ │ │ └── types.ts # Generated types
│ │ └── package.json
│ │
│ ├── shared/ # ─── SHARED CODE ───
│ │ ├── src/
│ │ │ ├── constants.ts
│ │ │ ├── types.ts
│ │ │ └── utils.ts
│ │ └── package.json
│ │
│ └── ui/ # ─── DESIGN SYSTEM ───
│ ├── src/
│ │ ├── components/
│ │ ├── tokens/
│ │ └── index.ts
│ └── package.json
│
├── tools/
│ └── scripts/
│ ├── build-installer.ts
│ ├── generate-types.ts
│ └── seed-database.ts
│
├── docs/ # Documentação
├── roadmaps/ # Gestão do projeto
│
├── package.json # Root package (workspaces)
├── pnpm-workspace.yaml
├── turbo.json # Turborepo config
└── README.md

````text
---

## 🔌 Integrações de Hardware

### Impressora Térmica (ESC/POS)

```rust
// src-tauri/src/hardware/printer.rs

pub struct ThermalPrinter {
    interface: PrinterInterface,
    config: PrinterConfig,
}

pub enum PrinterInterface {
    Usb { vendor_id: u16, product_id: u16 },
    Serial { port: String, baud_rate: u32 },
    Network { ip: String, port: u16 },
}

impl ThermalPrinter {
    pub async fn print_receipt(&self, sale: &Sale) -> Result<(), PrintError> {
        let mut buffer = EscPosBuffer::new();

        buffer.initialize();
        buffer.align_center();
        buffer.bold(true);
        buffer.text(&self.config.store_name);
        buffer.bold(false);
        buffer.line_feed();
        buffer.text(&self.config.store_address);
        buffer.line_feed(2);

        buffer.align_left();
        buffer.text("─".repeat(42));

        for item in &sale.items {
            buffer.table_row(&[
                &item.quantity.to_string(),
                &item.product_name,
                &format_currency(item.total),
            ]);
        }

        buffer.text("─".repeat(42));
        buffer.bold(true);
        buffer.text(&format!("TOTAL: {}", format_currency(sale.total)));
        buffer.bold(false);

        buffer.line_feed(3);
        buffer.cut();

        self.send_raw(&buffer.bytes()).await
    }
}
```text
### Balança Serial

```rust
// src-tauri/src/hardware/scale.rs

pub struct DigitalScale {
    port: SerialPort,
    protocol: ScaleProtocol,
}

pub enum ScaleProtocol {
    Toledo,    // Toledo Prix
    Filizola,  // Filizola
    Urano,     // Urano
    Generic,   // Protocol comum
}

impl DigitalScale {
    pub async fn read_weight(&mut self) -> Result<Weight, ScaleError> {
        let mut buffer = [0u8; 32];

        // Envia comando de leitura
        self.port.write(&[0x05])?; // ENQ

        // Aguarda resposta
        let bytes_read = self.port.read(&mut buffer)?;

        // Parse conforme protocolo
        match self.protocol {
            ScaleProtocol::Toledo => self.parse_toledo(&buffer[..bytes_read]),
            ScaleProtocol::Filizola => self.parse_filizola(&buffer[..bytes_read]),
            _ => self.parse_generic(&buffer[..bytes_read]),
        }
    }

    fn parse_toledo(&self, data: &[u8]) -> Result<Weight, ScaleError> {
        // Formato Toledo: STX + 6 dígitos peso + status + ETX
        // Exemplo: [0x02, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x20, 0x03]
        //          STX   0     1     2     3     4     5    OK   ETX
        //          = 012.345 kg

        if data.len() < 9 || data[0] != 0x02 || data[8] != 0x03 {
            return Err(ScaleError::InvalidResponse);
        }

        let weight_str: String = data[1..7]
            .iter()
            .map(|&b| b as char)
            .collect();

        let grams: u32 = weight_str.parse()?;

        Ok(Weight {
            grams,
            stable: data[7] == 0x20,
        })
    }
}
```text
### Scanner Mobile (WebSocket)

```typescript
// apps/mobile-scanner/src/Scanner.tsx

import { BrowserMultiFormatReader } from '@zxing/library';

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Conecta ao desktop app
    wsRef.current = new WebSocket('ws://192.168.1.100:3847');

    // Inicia scanner de câmera
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(
      undefined, // Câmera padrão
      videoRef.current!,
      (result) => {
        if (result) {
          // Envia código para desktop
          wsRef.current?.send(
            JSON.stringify({
              type: 'barcode',
              code: result.getText(),
              format: result.getBarcodeFormat(),
              timestamp: Date.now(),
            })
          );

          // Vibra para feedback
          navigator.vibrate(100);
        }
      }
    );

    return () => {
      reader.reset();
      wsRef.current?.close();
    };
  }, []);

  return <video ref={videoRef} className="w-full h-full" />;
}
```text
---

## 🔐 Segurança

### Modelo de Segurança

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AUTENTICAÇÃO                                                    │
│  ─────────────                                                   │
│  • Login com PIN (4-6 dígitos) para operadores                  │
│  • Senha alfanumérica para administradores                      │
│  • Bcrypt para hash de senhas                                   │
│  • Rate limiting: 5 tentativas, bloqueio 5 min                  │
│                                                                  │
│  AUTORIZAÇÃO (RBAC)                                             │
│  ──────────────────                                              │
│  • ADMIN: Acesso total                                          │
│  • MANAGER: Relatórios, estoque, funcionários                   │
│  • CASHIER: PDV, consultas básicas                              │
│  • VIEWER: Apenas visualização                                  │
│                                                                  │
│  DADOS                                                           │
│  ─────                                                           │
│  • SQLite: Criptografia de arquivo (SQLCipher)                  │
│  • Backups: AES-256 antes de upload                             │
│  • Logs: Não incluem dados sensíveis                            │
│                                                                  │
│  REDE                                                            │
│  ────                                                            │
│  • Scanner mobile: Apenas rede local (192.168.x.x)              │
│  • Backup: HTTPS para Google Drive                              │
│  • Zero portas expostas para internet                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```text
### Permissões por Role

| Funcionalidade         | Admin | Manager | Cashier | Viewer |
| ---------------------- | ----- | ------- | ------- | ------ |
| Vender                 | ✅    | ✅      | ✅      | ❌     |
| Cancelar item          | ✅    | ✅      | ✅      | ❌     |
| Cancelar venda         | ✅    | ✅      | ❌      | ❌     |
| Dar desconto           | ✅    | ✅      | ❌      | ❌     |
| Ver relatórios         | ✅    | ✅      | ❌      | ✅     |
| Cadastrar produtos     | ✅    | ✅      | ❌      | ❌     |
| Editar preços          | ✅    | ✅      | ❌      | ❌     |
| Gerenciar estoque      | ✅    | ✅      | ❌      | ❌     |
| Gerenciar funcionários | ✅    | ❌      | ❌      | ❌     |
| Configurações          | ✅    | ❌      | ❌      | ❌     |
| Backup/Restore         | ✅    | ❌      | ❌      | ❌     |

---

## ⚡ Performance

### Targets

| Operação                  | Meta    | Medição             |
| ------------------------- | ------- | ------------------- |
| Startup da aplicação      | < 2s    | Cold start          |
| Busca de produto (código) | < 50ms  | P99                 |
| Busca de produto (texto)  | < 100ms | P99                 |
| Finalizar venda           | < 200ms | Incluindo impressão |
| Gerar relatório diário    | < 1s    | 10k transações      |
| Backup completo           | < 30s   | 100MB de dados      |

### Estratégias de Otimização

```text
DATABASE
────────
• Índices em: barcode, name, category_id, created_at
• Views materializadas para relatórios frequentes
• Prepared statements para queries repetidas
• Connection pooling (r2d2)

FRONTEND
────────
• Virtual scrolling para listas grandes
• Lazy loading de páginas
• Memoização agressiva (React.memo, useMemo)
• Code splitting por rota
• Debounce em buscas (300ms)

BACKEND
───────
• Async I/O para hardware
• Cache em memória para produtos frequentes (LRU)
• Batch inserts para movimentações de estoque
• Background jobs para alertas e backups
```text
---

## 📊 Monitoramento

### Logs

```rust
// Níveis de log
- ERROR: Falhas críticas (impressora offline, DB corrupto)
- WARN: Problemas recuperáveis (timeout de balança, retry)
- INFO: Operações importantes (venda, backup, login)
- DEBUG: Detalhes para troubleshooting

// Localização
Windows: %APPDATA%/Mercearias/logs/
  ├── app.log         # Log principal (rotação diária)
  ├── hardware.log    # Comunicação com periféricos
  └── error.log       # Apenas erros (retenção 30 dias)
```text
### Health Checks

```text
┌─────────────────────────────────────────────────────────────────┐
│                    HEALTH CHECK DASHBOARD                        │
│                    (Exibido no rodapé do app)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ● Database     Conectado (1.2GB, 98% livre)                    │
│  ● Impressora   Epson TM-T20X (Online)                          │
│  ● Balança      Toledo Prix 4 (Offline)                         │
│  ● Scanner      Mobile conectado (iPhone de João)               │
│  ● Backup       Último: 06/01/2026 03:00 (Google Drive)        │
│  ● Alertas      3 produtos vencendo em 7 dias                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```text
---

_Documento gerado seguindo metodologia "Architect First, Code Later" - Arkheion Corp_
````
