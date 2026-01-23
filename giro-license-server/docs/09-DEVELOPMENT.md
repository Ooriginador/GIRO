# 💻 Development Guide

> Guia completo para desenvolvimento local

---

## 🚀 Quick Start

### Pré-requisitos

- **Rust 1.85+** - https://rustup.rs
- **PostgreSQL 16** - https://postgresql.org/download
- **Redis 7** - https://redis.io/download
- **Node.js 20+** (para Dashboard) - https://nodejs.org
- **Git** - https://git-scm.com

---

## 📦 Setup Inicial

### 1. Clone o Repositório

```bash
git clone https://github.com/jhonslife/giro-license-server.git
cd giro-license-server
```

### 2. Backend Setup

```bash
cd backend

# Instalar SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Copiar .env.example
cp .env.example .env

# Editar .env com suas credenciais locais
nano .env
```

**`.env` mínimo:**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/giro_licenses
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars-long-change-in-production
API_KEY_SECRET=another-secret-key-min-32-chars-long
RUST_LOG=debug
PORT=3001
```

### 3. Iniciar Banco de Dados

#### PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16
createdb giro_licenses

# Linux (Ubuntu/Debian)
sudo apt install postgresql-16
sudo systemctl start postgresql
sudo -u postgres createdb giro_licenses

# Docker
docker run -d \
  --name giro-postgres \
  -e POSTGRES_DB=giro_licenses \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

#### Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Docker
docker run -d \
  --name giro-redis \
  -p 6379:6379 \
  redis:7
```

### 4. Executar Migrations

```bash
cd backend
sqlx migrate run
```

**Verifica aplicação:**

```sql
psql giro_licenses -c "\dt"
-- Deve listar 8 tabelas
```

### 5. Rodar Backend

```bash
cargo run

# Ou com hot-reload (cargo-watch)
cargo install cargo-watch
cargo watch -x run
```

**Verificar funcionamento:**

```bash
curl http://localhost:3001/health
```

---

## 🎨 Dashboard Setup

### 1. Instalar Dependências

```bash
cd dashboard
npm install
```

### 2. Configurar Ambiente

```bash
cp .env.example .env.local
```

**`.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Rodar Dashboard

```bash
npm run dev
```

Abrir: http://localhost:3000

---

## 🧪 Testes

### Backend (Rust)

```bash
cd backend

# Rodar todos os testes
cargo test

# Com output detalhado
cargo test -- --nocapture

# Teste específico
cargo test test_create_license

# Coverage (tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage
```

**Estrutura de Testes:**

```
tests/
├── api_keys_test.rs       # API Keys CRUD
├── auth_test.rs           # Login, Registro, Refresh
├── license_test.rs        # Lifecycle completo
└── stripe_test.rs         # Webhooks Stripe
```

### Dashboard (Vitest + Playwright)

```bash
cd dashboard

# Unit tests (Vitest)
npm test

# E2E tests (Playwright)
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 🔍 Debugging

### Rust

#### VS Code (CodeLLDB)

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Backend",
      "cargo": {
        "args": ["build", "--bin=backend"]
      },
      "args": [],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "RUST_LOG": "debug"
      }
    }
  ]
}
```

#### Logs Detalhados

```bash
# Debug level
RUST_LOG=debug cargo run

# Trace specific module
RUST_LOG=backend::services::license_service=trace cargo run
```

### Database

```bash
# Conectar ao PostgreSQL
psql giro_licenses

# Ver schema
\dt
\d licenses

# Query manual
SELECT * FROM licenses WHERE status = 'active';

# Explain query
EXPLAIN ANALYZE SELECT * FROM licenses WHERE admin_id = '...';
```

---

## 📚 Estrutura do Projeto

```
giro-license-server/
├── backend/                    # Rust API
│   ├── src/
│   │   ├── main.rs            # Entry point
│   │   ├── state.rs           # AppState
│   │   ├── config/            # Settings
│   │   ├── dto/               # Request/Response DTOs
│   │   ├── errors/            # Error handling
│   │   ├── middleware/        # Auth, Rate limit
│   │   ├── models/            # Database entities
│   │   ├── repositories/      # Data access layer
│   │   ├── routes/            # HTTP endpoints
│   │   ├── services/          # Business logic
│   │   └── utils/             # Helpers
│   ├── migrations/            # SQL migrations
│   ├── tests/                 # Integration tests
│   └── Cargo.toml
│
├── dashboard/                  # Next.js Dashboard
│   ├── src/
│   │   ├── app/               # Pages (App Router)
│   │   ├── components/        # React components
│   │   └── lib/               # API client, utils
│   ├── e2e/                   # Playwright tests
│   └── package.json
│
├── docs/                       # Documentação
│   ├── README.md
│   ├── 01-ARCHITECTURE.md
│   ├── 02-DATABASE.md
│   └── ...
│
└── README.md
```

---

## 🛠️ Comandos Úteis

### Backend

```bash
# Build release
cargo build --release

# Check (sem build)
cargo check

# Format code
cargo fmt

# Lint
cargo clippy

# Update dependencies
cargo update

# Add dependency
cargo add axum

# Generate SQLx metadata (offline mode)
cargo sqlx prepare
```

### Database

```bash
# Create migration
sqlx migrate add create_notifications_table

# Run migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert

# Reset database (CUIDADO: perde dados)
sqlx database drop
sqlx database create
sqlx migrate run
```

### Dashboard

```bash
# Dev server
npm run dev

# Build production
npm run build

# Start production
npm start

# Lint
npm run lint

# Format
npm run format
```

---

## 📝 Code Style

### Rust

```rust
// ✅ Bom
pub async fn create_license(
    admin_id: Uuid,
    plan_type: PlanType,
) -> AppResult<License> {
    // Validate inputs
    if plan_type == PlanType::Monthly {
        // ...
    }

    // Create license
    let license = license_repo.create(...).await?;

    Ok(license)
}

// ❌ Evitar
pub async fn createLicense(admin_id:Uuid,plan_type:PlanType)->AppResult<License>{
    let license=license_repo.create(...).await?;license
}
```

**Regras:**

- Snake_case para funções e variáveis
- PascalCase para tipos e structs
- SCREAMING_SNAKE_CASE para constantes
- 4 espaços de indentação
- Max 100 chars por linha
- Documentação em doc comments `///`

### TypeScript

```typescript
// ✅ Bom
export async function createLicense(planType: PlanType, quantity: number): Promise<License[]> {
  const response = await api.post('/licenses', {
    plan_type: planType,
    quantity,
  });

  return response.data.licenses;
}

// ❌ Evitar
export async function createLicense(planType, quantity) {
  const response = await api.post('/licenses', { plan_type: planType, quantity });
  return response.data.licenses;
}
```

---

## 🔧 Troubleshooting

### Erro: "sqlx-data.json not found"

```bash
# Gerar offline metadata
DATABASE_URL=postgres://... cargo sqlx prepare

# Ou desabilitar offline mode
# Cargo.toml
[dependencies]
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres"] }
# Remove: "offline"
```

### Erro: "database doesn't exist"

```bash
createdb giro_licenses
sqlx migrate run
```

### Erro: "Redis connection refused"

```bash
# Verificar se Redis está rodando
redis-cli ping
# PONG

# Iniciar Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### Porta 3001 já em uso

```bash
# Mudar PORT no .env
PORT=3002 cargo run

# Ou matar processo
lsof -ti:3001 | xargs kill -9
```

---

## 📖 Recursos

### Documentação Oficial

- **Rust**: https://doc.rust-lang.org/book/
- **Axum**: https://docs.rs/axum
- **SQLx**: https://docs.rs/sqlx
- **Next.js**: https://nextjs.org/docs

### Tutoriais

- **Axum Tutorial**: https://github.com/tokio-rs/axum/tree/main/examples
- **SQLx Guide**: https://github.com/launchbadge/sqlx/tree/main/examples

### Comunidade

- **Rust Discord**: https://discord.gg/rust-lang
- **Axum Discord**: https://discord.gg/tokio

---

## 🤝 Contributing

### Workflow

1. **Fork** o repositório
2. **Clone** seu fork
3. **Crie branch**: `git checkout -b feature/nova-feature`
4. **Commit**: `git commit -m "feat: adiciona nova feature"`
5. **Push**: `git push origin feature/nova-feature`
6. **Pull Request** para `main`

### Commit Convention

```
feat: adiciona endpoint de notificações
fix: corrige bug no rate limiter
docs: atualiza README com novos endpoints
refactor: reorganiza estrutura de services
test: adiciona testes para hardware binding
chore: atualiza dependências
```

### Code Review

- [ ] Testes passando (`cargo test`)
- [ ] Sem warnings (`cargo clippy`)
- [ ] Formatado (`cargo fmt`)
- [ ] Documentado (doc comments)
- [ ] Migrations incluídas (se necessário)

---

## 🚀 Next Steps

1. Ler [01-ARCHITECTURE.md](./01-ARCHITECTURE.md)
2. Explorar [02-DATABASE.md](./02-DATABASE.md)
3. Testar endpoints via [03-API-ENDPOINTS.md](./03-API-ENDPOINTS.md)
4. Implementar nova feature
5. Criar testes
6. Abrir PR
