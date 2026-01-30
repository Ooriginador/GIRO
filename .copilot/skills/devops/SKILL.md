# 🚀 DevOps & CI/CD Skill

> **Especialista em deploy, pipelines e infraestrutura**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
deployments:
  GIRO-D:
    build: GitHub Actions → Windows/Linux installers
    distribution: giro-releases/ + auto-updater
  LICENSE:
    deploy: Railway (Rust + PostgreSQL)
    path: giro-license-server/backend/
  DASH:
    deploy: Vercel
    path: giro-license-server/dashboard/
  WEB:
    deploy: Vercel
    path: giro-license-server/giro-website/
  GIRO-M:
    build: EAS Build
    distribution: Google Play + App Store
  LEADBOT:
    deploy: Railway or VPS
    path: giro-leadbot/
```

## 📋 Descrição

Esta skill fornece conhecimento especializado em:

- GitHub Actions para CI/CD
- Deploy em Railway (backend) e Vercel (frontend)
- Build de aplicações Tauri para Windows/Linux
- Docker e containerização
- Release management e versionamento

## 🛠️ Stack de Infraestrutura

| Componente    | Plataforma         | Uso                       |
| ------------- | ------------------ | ------------------------- |
| CI/CD         | GitHub Actions     | Pipelines automatizados   |
| Backend       | Railway            | APIs, workers, cron jobs  |
| Frontend Web  | Vercel             | Next.js, landing pages    |
| Desktop Build | GitHub Actions     | Tauri NSIS installer      |
| Database      | Railway PostgreSQL | License server, analytics |
| Cache         | Railway Redis      | Sessions, filas           |

## 📁 Estrutura de Workflows

```text
.github/workflows/
├── ci.yml                    # Lint, type-check, tests
├── desktop-build.yml         # Build Tauri Windows/Linux
├── release.yml               # Semantic release
├── deploy-backend.yml        # Deploy Railway
├── deploy-frontend.yml       # Deploy Vercel
└── security-scan.yml         # SAST/DAST scans
```

## 📐 Padrões de CI/CD

### Workflow de CI Básico

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Test
        run: pnpm test
```

### Build Tauri Desktop

```yaml
name: Desktop Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: ubuntu-22.04
            target: x86_64-unknown-linux-gnu

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'GIRO v__VERSION__'
          releaseBody: 'See CHANGELOG.md for details.'
          releaseDraft: true
```

### Deploy Railway

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'railway.toml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy
        run: railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 🐳 Docker Patterns

### Dockerfile Multi-stage (Python)

```dockerfile
# Stage 1: Build
FROM python:3.12-slim as builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose Development

```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - '8000:8000'
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/giro
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=giro

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 📋 Railway Configuration

### railway.toml

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[service]
internalPort = 8000
```

## 🔖 Versionamento Semântico

### Conventional Commits → Version Bump

| Commit Type                   | Version Bump  | Exemplo                              |
| ----------------------------- | ------------- | ------------------------------------ |
| `fix:`                        | PATCH (0.0.X) | `fix(pdv): corrige cálculo de troco` |
| `feat:`                       | MINOR (0.X.0) | `feat(sync): adiciona sync multi-pc` |
| `feat!:` / `BREAKING CHANGE:` | MAJOR (X.0.0) | `feat!: migra para Tauri 3.0`        |

### Release Workflow

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## ✅ Checklist de Deploy

### Pré-Deploy

- [ ] Testes passando (CI verde)
- [ ] Code review aprovado
- [ ] CHANGELOG atualizado
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations aplicadas (se necessário)

### Pós-Deploy

- [ ] Health check OK
- [ ] Logs sem erros
- [ ] Monitoramento ativo
- [ ] Rollback testado

## 🔗 Referências

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Railway Docs](https://docs.railway.app)
- [Tauri CI Guide](https://tauri.app/v2/guides/building/cross-platform)
- [Conventional Commits](https://www.conventionalcommits.org)
