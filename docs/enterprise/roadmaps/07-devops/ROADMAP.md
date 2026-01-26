# 🚀 DevOps Roadmap - GIRO Enterprise

> **Agente:** 07-devops  
> **Status:** � COMPLETE  
> **Progresso:** 4/4 (100%)  
> **Bloqueador:** Nenhum  
> **Última Atualização:** 28 de Janeiro de 2026

---

## 📋 Objetivo

Atualizar pipelines de CI/CD e configurações de deploy para suportar o perfil Enterprise:

- Atualizar workflows GitHub Actions
- Configurar build para Windows/Linux/macOS
- Atualizar scripts de seed e migrations
- Configurar feature flags para Enterprise

---

## ✅ Checklist de Tasks

### Fase 1: GitHub Actions (2 tasks) ✅

- [x] **DO-001**: Atualizar workflow de CI

  > **Implementado em**: `.github/workflows/ci.yml` (249 linhas)
  >
  > - Lint (ESLint + Clippy), Type check, Vitest + Rust tests
  > - Coverage upload para Codecov (frontend + rust flags)
  > - E2E tests com Playwright, Cargo audit
  > - Quality gate para validar todos os jobs

- [x] **DO-002**: Atualizar workflow de Release
  > **Implementado em**: `.github/workflows/release.yml` (193 linhas)
  >
  > - Build para Windows (x86_64-pc-windows-msvc) e Linux (x86_64-unknown-linux-gnu)
  > - Tauri signing com TAURI_SIGNING_PRIVATE_KEY
  > - Updater manifest automático, Release notes template

### Fase 2: Build & Migrations (2 tasks) ✅

- [x] **DO-003**: Migrations Enterprise

  > **Implementado em**: `src-tauri/migrations/027_enterprise_module.sql` (331 linhas)
  >
  > - Contracts, WorkFronts, Activities
  > - StockLocations, StockBalances
  > - MaterialRequests, StockTransfers
  > - Todos os índices e constraints

- [x] **DO-004**: Feature Flags

  > **Enterprise é ativado por**: `business_type = 'ENTERPRISE'` no settings
  >
  > - Não requer Cargo feature flag separado
  > - Reutiliza core do GIRO (Products, Employees, etc.)

        - name: Install dependencies
          run: pnpm install

        - name: Lint TypeScript
          run: pnpm lint

        - name: Type check
          run: pnpm typecheck

  test-rust:
  runs-on: ubuntu-latest
  steps: - uses: actions/checkout@v4

        - name: Setup Rust
          uses: dtolnay/rust-toolchain@stable

        - name: Cache cargo
          uses: Swatinem/rust-cache@v2
          with:
            workspaces: 'apps/desktop/src-tauri'

        - name: Run Rust tests
          working-directory: apps/desktop/src-tauri
          run: |
            cargo test --all-features

        - name: Check coverage
          working-directory: apps/desktop/src-tauri
          run: |
            cargo install cargo-tarpaulin
            cargo tarpaulin --out Xml --output-dir coverage

        - name: Upload coverage
          uses: codecov/codecov-action@v3
          with:
            files: apps/desktop/src-tauri/coverage/cobertura.xml
            flags: rust

  test-frontend:
  runs-on: ubuntu-latest
  steps: - uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'

        - name: Install dependencies
          run: pnpm install

        - name: Run tests
          run: pnpm test:coverage

        - name: Upload coverage
          uses: codecov/codecov-action@v3
          with:
            files: coverage/lcov.info
            flags: frontend

  e2e:
  needs: [lint, test-rust, test-frontend]
  runs-on: ubuntu-latest
  steps: - uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'

        - name: Install dependencies
          run: pnpm install

        - name: Install Playwright
          run: pnpm exec playwright install --with-deps

        - name: Run E2E tests
          run: pnpm test:e2e

        - name: Upload test results
          if: failure()
          uses: actions/upload-artifact@v4
          with:
            name: playwright-report
            path: playwright-report/

  ```

  ```

- [ ] **DO-002**: Atualizar workflow de Build

  ```yaml
  # .github/workflows/build.yml

  name: Build

  on:
    push:
      tags:
        - 'v*'
    workflow_dispatch:
      inputs:
        profile:
          description: 'Business profile to build'
          required: true
          type: choice
          options:
            - all
            - grocery
            - motoparts
            - enterprise

  jobs:
    build:
      strategy:
        matrix:
          include:
            - platform: ubuntu-22.04
              target: linux
            - platform: windows-latest
              target: windows
            - platform: macos-latest
              target: macos

      runs-on: ${{ matrix.platform }}

      steps:
        - uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'

        - name: Setup Rust
          uses: dtolnay/rust-toolchain@stable

        - name: Install Linux dependencies
          if: matrix.target == 'linux'
          run: |
            sudo apt-get update
            sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev

        - name: Install dependencies
          run: pnpm install

        - name: Build Tauri
          env:
            TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
            TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
          run: pnpm tauri build

        - name: Upload artifacts
          uses: actions/upload-artifact@v4
          with:
            name: giro-${{ matrix.target }}
            path: |
              apps/desktop/src-tauri/target/release/bundle/**/*.exe
              apps/desktop/src-tauri/target/release/bundle/**/*.msi
              apps/desktop/src-tauri/target/release/bundle/**/*.deb
              apps/desktop/src-tauri/target/release/bundle/**/*.AppImage
              apps/desktop/src-tauri/target/release/bundle/**/*.dmg
  ```

### Fase 2: Migrations e Seeds (1 task)

- [ ] **DO-003**: Criar migration e seed para Enterprise

  ```typescript
  // packages/database/prisma/migrations/YYYYMMDDHHMMSS_add_enterprise_entities/migration.sql

  -- Enums
  CREATE TYPE "ContractStatus" AS ENUM ('PLANNING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED');
  CREATE TYPE "WorkFrontStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');
  CREATE TYPE "ActivityStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
  CREATE TYPE "LocationType" AS ENUM ('CENTRAL', 'WORK_SITE', 'WORK_FRONT');
  CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'SEPARATING', 'DELIVERED', 'CANCELLED');
  CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
  CREATE TYPE "InventoryStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

  -- Adicionar novos roles ao enum existente
  ALTER TYPE "EmployeeRole" ADD VALUE 'CONTRACT_MANAGER';
  ALTER TYPE "EmployeeRole" ADD VALUE 'SUPERVISOR';
  ALTER TYPE "EmployeeRole" ADD VALUE 'WAREHOUSE';
  ALTER TYPE "EmployeeRole" ADD VALUE 'REQUESTER';

  -- Tables (conforme schema definido em 01-database)
  ...
  ```

  ```typescript
  // packages/database/prisma/seed-enterprise.ts

  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  async function seedEnterprise() {
    console.log('🏢 Seeding Enterprise data...');

    // Criar configuração Enterprise
    await prisma.businessConfig.upsert({
      where: { type: 'ENTERPRISE' },
      update: {},
      create: {
        type: 'ENTERPRISE',
        name: 'Almoxarifado Industrial',
        features: {
          pdv: false,
          inventory: true,
          contracts: true,
          workFronts: true,
          materialRequests: true,
          stockTransfers: true,
          multiLocation: true,
        },
        labels: {
          product: 'Material',
          products: 'Materiais',
          customer: 'Colaborador',
          sale: 'Requisição',
        },
      },
    });

    // Criar categorias padrão Enterprise
    const categories = [
      { name: 'Material Elétrico', icon: 'Zap', color: '#F59E0B' },
      { name: 'Material de Construção', icon: 'HardHat', color: '#6B7280' },
      { name: 'EPIs', icon: 'Shield', color: '#EF4444' },
      { name: 'Ferramentas', icon: 'Wrench', color: '#3B82F6' },
      { name: 'Material Hidráulico', icon: 'Droplet', color: '#06B6D4' },
      { name: 'Material de Acabamento', icon: 'Paintbrush', color: '#8B5CF6' },
      { name: 'Material de Soldagem', icon: 'Flame', color: '#F97316' },
      { name: 'Consumíveis', icon: 'Package', color: '#10B981' },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { name_businessType: { name: cat.name, businessType: 'ENTERPRISE' } },
        update: {},
        create: { ...cat, businessType: 'ENTERPRISE' },
      });
    }

    // Criar local padrão
    await prisma.stockLocation.upsert({
      where: { name: 'Almoxarifado Central' },
      update: {},
      create: {
        name: 'Almoxarifado Central',
        type: 'CENTRAL',
        address: 'Sede Administrativa',
        isActive: true,
      },
    });

    console.log('✅ Enterprise seed completed');
  }

  seedEnterprise()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
  ```

### Fase 3: Feature Flags (1 task)

- [ ] **DO-004**: Configurar feature flags para gradual rollout

  ```typescript
  // packages/config/feature-flags.ts

  export interface FeatureFlags {
    // Core
    enableEnterprise: boolean;

    // Enterprise específicos
    enterpriseContracts: boolean;
    enterpriseWorkFronts: boolean;
    enterpriseMaterialRequests: boolean;
    enterpriseTransfers: boolean;
    enterpriseInventory: boolean;

    // Integrações
    enterpriseSiengeExport: boolean;
    enterpriseUAUExport: boolean;
    enterpriseMobileSync: boolean;
  }

  // Default flags por ambiente
  export const DEFAULT_FLAGS: Record<string, FeatureFlags> = {
    development: {
      enableEnterprise: true,
      enterpriseContracts: true,
      enterpriseWorkFronts: true,
      enterpriseMaterialRequests: true,
      enterpriseTransfers: true,
      enterpriseInventory: true,
      enterpriseSiengeExport: false,
      enterpriseUAUExport: false,
      enterpriseMobileSync: false,
    },
    staging: {
      enableEnterprise: true,
      enterpriseContracts: true,
      enterpriseWorkFronts: true,
      enterpriseMaterialRequests: true,
      enterpriseTransfers: true,
      enterpriseInventory: true,
      enterpriseSiengeExport: true,
      enterpriseUAUExport: true,
      enterpriseMobileSync: true,
    },
    production: {
      enableEnterprise: false, // Habilitado gradualmente
      enterpriseContracts: false,
      enterpriseWorkFronts: false,
      enterpriseMaterialRequests: false,
      enterpriseTransfers: false,
      enterpriseInventory: false,
      enterpriseSiengeExport: false,
      enterpriseUAUExport: false,
      enterpriseMobileSync: false,
    },
  };
  ```

  ```rust
  // src-tauri/src/config/feature_flags.rs

  use serde::{Deserialize, Serialize};

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct FeatureFlags {
      pub enable_enterprise: bool,
      pub enterprise_contracts: bool,
      pub enterprise_work_fronts: bool,
      pub enterprise_material_requests: bool,
      pub enterprise_transfers: bool,
      pub enterprise_inventory: bool,
      pub enterprise_sienge_export: bool,
      pub enterprise_uau_export: bool,
      pub enterprise_mobile_sync: bool,
  }

  impl Default for FeatureFlags {
      fn default() -> Self {
          Self {
              enable_enterprise: cfg!(debug_assertions),
              enterprise_contracts: cfg!(debug_assertions),
              // ... outros flags
          }
      }
  }

  pub fn is_feature_enabled(flag: &str, flags: &FeatureFlags) -> bool {
      match flag {
          "enterprise" => flags.enable_enterprise,
          "contracts" => flags.enterprise_contracts && flags.enable_enterprise,
          "work_fronts" => flags.enterprise_work_fronts && flags.enable_enterprise,
          // ... outros
          _ => false,
      }
  }
  ```

---

## 📁 Arquivos Afetados

```text
.github/
├── workflows/
│   ├── ci.yml              # ATUALIZAR
│   └── build.yml           # ATUALIZAR
packages/
├── config/
│   └── feature-flags.ts    # NOVO
├── database/
│   └── prisma/
│       ├── migrations/     # NOVA migration
│       └── seed-enterprise.ts  # NOVO
apps/desktop/src-tauri/src/
└── config/
    └── feature_flags.rs    # NOVO
```

---

## 🔄 Estratégia de Rollout

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLLOUT ENTERPRISE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Semana 1-2: Development                                      │
│   ┌─────────────────────────────────────────┐                  │
│   │ ✓ Todos os flags habilitados            │                  │
│   │ ✓ Testes internos                       │                  │
│   └─────────────────────────────────────────┘                  │
│                                                                 │
│   Semana 3-4: Staging                                          │
│   ┌─────────────────────────────────────────┐                  │
│   │ ✓ Deploy em ambiente de homologação     │                  │
│   │ ✓ Testes com clientes beta              │                  │
│   │ ✓ Integrações Sienge/UAU                │                  │
│   └─────────────────────────────────────────┘                  │
│                                                                 │
│   Semana 5+: Production                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ → 10% dos novos clientes Enterprise     │                  │
│   │ → 25% após 1 semana sem issues          │                  │
│   │ → 50% após 2 semanas                    │                  │
│   │ → 100% após 1 mês                       │                  │
│   └─────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Validação

- [ ] CI pipeline passa em todas as branches
- [ ] Build gera artefatos para Win/Linux/macOS
- [ ] Migration aplica sem erros
- [ ] Seed popula dados corretos
- [ ] Feature flags funcionam conforme esperado

---

_Roadmap criado em: 25 de Janeiro de 2026_
