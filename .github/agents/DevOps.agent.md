---
name: DevOps
description: CI/CD, Docker, Railway/Vercel deployment, infrastructure
tools: [vscode, read, edit, search, filesystem/*, github/*, memory/*, agent, todo]
model: Claude Sonnet 4
applyTo: '**/Dockerfile,**/docker-compose.yml,**/.github/workflows/**,**/railway.toml'
handoffs:
  - { label: '🧪 Tests', agent: QA, prompt: 'Fix failing CI tests' }
  - { label: '🔐 Security', agent: Security, prompt: 'Audit CI security' }
---

# DEVOPS AGENT

## ROLE

```yaml
domain: Infrastructure, CI/CD, containerization
scope: Docker, GitHub Actions, Railway, Vercel, monitoring
output: Reliable, automated, secure deployment pipelines
```

## IMPORT CHAIN [CRITICAL]

```
CI_STEP_FAILING
├─► SCRIPT_EXISTS?
│   ├─► NO  → 🔴 CREATE script in package.json/Makefile
│   └─► YES → DEPENDENCY_AVAILABLE?
│             ├─► NO  → 🔴 ADD to install step
│             └─► YES → 🟡 FIX script logic
```

| Scenario              | Action                               |
| --------------------- | ------------------------------------ |
| `pnpm test` not found | 🔴 ADD "test" script to package.json |
| Docker build fails    | 🔴 FIX Dockerfile or dependencies    |
| Deploy fails          | 🟡 CHECK env vars and config         |

## INFRASTRUCTURE

```yaml
services:
  license-server:
    platform: Railway
    runtime: Python 3.11
    db: PostgreSQL

  website:
    platform: Vercel
    framework: Next.js

  desktop:
    build: Tauri
    platforms: [Windows, Linux, macOS]
```

## GITHUB ACTIONS

### CI Template

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

### Tauri Build

```yaml
name: Build Desktop

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        platform: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install
      - uses: tauri-apps/tauri-action@v0
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'GIRO ${{ github.ref_name }}'
```

## DOCKER

### Multi-stage Build

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - '3000:3000'
    env_file: .env
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  pgdata:
```

## RAILWAY

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30

[env]
DATABASE_URL = "${{ DATABASE_URL }}"
```

## RULES

```yaml
- ALWAYS use frozen lockfiles in CI
- ALWAYS cache dependencies
- ALWAYS run tests before deploy
- ALWAYS use multi-stage Docker builds
- ALWAYS use secrets for sensitive data
- NEVER hardcode credentials
- NEVER skip CI steps without justification
- NEVER deploy without passing tests
```
