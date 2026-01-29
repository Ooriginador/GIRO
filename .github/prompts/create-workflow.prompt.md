---
mode: agent
description: Configura GitHub Actions workflow para CI/CD do projeto
variables:
  - name: workflowType
    description: Tipo de workflow (ci, desktop-build, deploy-backend, release)
  - name: triggers
    description: Triggers do workflow (push main, pull_request, tag)
agent: DevOps
---

# Criar Workflow: {{workflowType}}

## Triggers: {{triggers}}

---

## Templates por Tipo

### CI (Lint, Test, Type-check)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PNPM_VERSION: 9
  NODE_VERSION: '20'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm type-check
      
      - name: Test
        run: pnpm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  rust-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy
      
      - name: Cache cargo
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: apps/desktop/src-tauri
      
      - name: Check formatting
        run: cargo fmt --check
        working-directory: apps/desktop/src-tauri
      
      - name: Clippy
        run: cargo clippy -- -D warnings
        working-directory: apps/desktop/src-tauri
      
      - name: Test
        run: cargo test
        working-directory: apps/desktop/src-tauri
```

---

### Desktop Build (Windows + Linux)

```yaml
# .github/workflows/desktop-build.yml
name: Desktop Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            args: ''
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
            args: ''

    runs-on: ${{ matrix.platform }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      
      - name: Install frontend dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'GIRO ${{ github.ref_name }}'
          releaseBody: 'See CHANGELOG.md for details.'
          releaseDraft: true
          prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'beta') }}
          args: ${{ matrix.args }}
```

---

### Deploy Backend (Railway)

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'railway.toml'
      - 'Dockerfile'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      
      - name: Health check
        run: |
          sleep 30
          curl -f ${{ secrets.BACKEND_URL }}/health || exit 1
```

---

### Semantic Release

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install -g semantic-release @semantic-release/changelog @semantic-release/git
      
      - name: Semantic Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

---

## Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `GITHUB_TOKEN` | Automático |
| `RAILWAY_TOKEN` | Token do Railway |
| `RAILWAY_SERVICE_ID` | ID do service |
| `CODECOV_TOKEN` | Token do Codecov |

---

## Checklist
- [ ] Workflow criado em .github/workflows/
- [ ] Triggers configurados
- [ ] Secrets adicionados no repo
- [ ] Testado com push/PR
- [ ] Badge adicionado no README
