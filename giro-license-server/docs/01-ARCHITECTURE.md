# 🏗️ Arquitetura do Sistema

> Documentação completa da arquitetura do GIRO License Server em produção

---

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     GIRO ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   DESKTOP    │    │   DASHBOARD  │    │   STRIPE     │      │
│  │   (Tauri)    │    │  (Next.js)   │    │  (Webhook)   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │              │
│         │ API Key           │ JWT               │ HMAC         │
│         └───────────────────┼───────────────────┘              │
│                             │                                  │
│                             ▼                                  │
│         ┌────────────────────────────────────────┐             │
│         │      AXUM WEB SERVER (Rust)            │             │
│         │                                        │             │
│         │  ┌──────────────────────────────────┐  │             │
│         │  │     MIDDLEWARE STACK             │  │             │
│         │  │  - CORS                          │  │             │
│         │  │  - Rate Limiter (Redis)          │  │             │
│         │  │  - Request Tracing               │  │             │
│         │  │  - Compression (gzip)            │  │             │
│         │  └──────────────────────────────────┘  │             │
│         │                │                       │             │
│         │                ▼                       │             │
│         │  ┌──────────────────────────────────┐  │             │
│         │  │         ROUTE LAYER              │  │             │
│         │  │                                  │  │             │
│         │  │  /auth      /licenses  /metrics  │  │             │
│         │  │  /hardware  /stripe    /profile  │  │             │
│         │  └──────────────────────────────────┘  │             │
│         │                │                       │             │
│         │                ▼                       │             │
│         │  ┌──────────────────────────────────┐  │             │
│         │  │       SERVICE LAYER              │  │             │
│         │  │                                  │  │             │
│         │  │  AuthService                     │  │             │
│         │  │  LicenseService                  │  │             │
│         │  │  HardwareService                 │  │             │
│         │  │  MetricsService                  │  │             │
│         │  │  ApiKeyService                   │  │             │
│         │  └──────────────────────────────────┘  │             │
│         │                │                       │             │
│         │                ▼                       │             │
│         │  ┌──────────────────────────────────┐  │             │
│         │  │     REPOSITORY LAYER             │  │             │
│         │  │     (SQLx type-safe queries)     │  │             │
│         │  └──────────────────────────────────┘  │             │
│         └────────────────┬───────────────────────┘             │
│                          │                                     │
│         ┌────────────────┴─────────────┐                       │
│         │                              │                       │
│         ▼                              ▼                       │
│  ┌──────────────┐              ┌──────────────┐               │
│  │ PostgreSQL   │              │    Redis     │               │
│  │   (Data)     │              │   (Cache)    │               │
│  └──────────────┘              └──────────────┘               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Backend (Rust)

| Tecnologia           | Versão  | Propósito                    |
| -------------------- | ------- | ---------------------------- |
| **Rust**             | 1.85+   | Linguagem principal          |
| **Axum**             | 0.7     | Framework web async          |
| **Tokio**            | 1.49    | Runtime async                |
| **SQLx**             | 0.8     | Database driver + migrations |
| **Tower/Tower-HTTP** | 0.5/0.6 | Middleware stack             |
| **Serde/Serde_json** | 1.0     | Serialização                 |
| **Jsonwebtoken**     | 9.3     | JWT                          |
| **Argon2**           | 0.5     | Password hashing             |
| **Redis**            | 0.27    | Cliente Redis async          |
| **Validator**        | 0.18    | Validação de inputs          |
| **Chrono**           | 0.4     | Data/hora                    |
| **UUID**             | 1.19    | Geração de IDs               |
| **Tracing**          | 0.1     | Logs estruturados            |

### Database

| Tecnologia     | Versão | Uso                              |
| -------------- | ------ | -------------------------------- |
| **PostgreSQL** | 16+    | Persistência principal           |
| **Redis**      | 7+     | Cache + Rate limiting + Sessions |

### Infraestrutura

| Serviço     | Uso                  |
| ----------- | -------------------- |
| **Railway** | Hosting + DB managed |
| **GitHub**  | Repositório privado  |
| **Stripe**  | Pagamentos           |

---

## 📁 Estrutura de Diretórios

```
backend/src/
├── main.rs                 # Entry point + server setup
├── lib.rs                  # Re-exports públicos
├── state.rs                # AppState global
│
├── config/                 # Configurações
│   ├── mod.rs
│   └── settings.rs         # Env vars (database, JWT, Redis)
│
├── routes/                 # HTTP Handlers
│   ├── mod.rs              # Router agregador
│   ├── auth.rs             # POST /auth/login, register, etc
│   ├── licenses.rs         # CRUD + activate/validate
│   ├── hardware.rs         # Gestão de máquinas
│   ├── metrics.rs          # Dashboard + sync
│   ├── api_keys.rs         # CRUD de API Keys
│   ├── stripe.rs           # Checkout + webhooks
│   ├── profile.rs          # Perfil do admin
│   ├── health.rs           # Health check + metrics
│   ├── subscriptions.rs    # Assinaturas
│   └── notifications.rs    # Push notifications
│
├── services/               # Lógica de Negócio
│   ├── mod.rs
│   ├── auth_service.rs     # Login, register, tokens
│   ├── license_service.rs  # Ativação, validação, CRUD
│   ├── hardware_service.rs # Fingerprint binding
│   ├── metrics_service.rs  # Agregação de dados
│   ├── api_key_service.rs  # Geração e validação
│   └── email_service.rs    # Envio de emails (Resend)
│
├── repositories/           # Data Access Layer
│   ├── mod.rs
│   ├── admin_repo.rs       # CRUD admins
│   ├── license_repo.rs     # CRUD licenses
│   ├── hardware_repo.rs    # CRUD hardware
│   ├── metrics_repo.rs     # CRUD metrics
│   ├── api_key_repo.rs     # CRUD api_keys
│   ├── refresh_token_repo.rs
│   └── audit_repo.rs       # Logs de auditoria
│
├── models/                 # Entities (DB mapping)
│   ├── mod.rs
│   ├── admin.rs            # Admin, AdminSummary
│   ├── license.rs          # License, LicenseStatus, PlanType
│   ├── hardware.rs         # Hardware, HardwareInfo
│   ├── metrics.rs          # Metrics, DashboardData
│   ├── api_key.rs          # ApiKey, ApiKeySummary
│   ├── payment.rs          # Payment
│   ├── refresh_token.rs    # RefreshToken
│   └── audit_log.rs        # AuditLog, AuditAction
│
├── dto/                    # Request/Response DTOs
│   ├── mod.rs
│   ├── auth.rs             # LoginRequest, RegisterRequest
│   ├── license.rs          # ActivateRequest, ValidateRequest
│   ├── metrics.rs          # SyncMetricsRequest
│   └── pagination.rs       # PaginatedResponse, PaginationMeta
│
├── middleware/             # Middleware customizado
│   ├── mod.rs
│   ├── auth.rs             # AuthAdmin, AuthApiKey (extractors)
│   ├── rate_limiter.rs     # Rate limiting Redis
│   └── api_key.rs          # API Key validator (desktop)
│
├── utils/                  # Utilities
│   ├── mod.rs
│   ├── jwt.rs              # encode/decode JWT
│   ├── hash.rs             # Argon2 hashing
│   ├── license_key.rs      # Geração de chaves (GIRO-XXXX-...)
│   └── time.rs             # Server time utilities
│
└── errors/                 # Error Handling
    ├── mod.rs
    └── app_error.rs        # AppError enum + conversões

migrations/
├── 001_initial_schema.sql  # Schema completo
└── 20260110_create_api_keys.sql
```

---

## 🧱 Camadas da Aplicação

### 1. Routes (Handlers HTTP)

**Responsabilidade:**

- Receber requisições HTTP
- Validar parâmetros básicos
- Extrair autenticação (AuthAdmin ou AuthApiKey)
- Chamar Services
- Retornar JSON responses

**Exemplo:**

```rust
// routes/licenses.rs
async fn activate_license(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Json(payload): Json<ActivateLicenseRequest>,
) -> AppResult<Json<ActivateLicenseResponse>> {
    payload.validate()?;

    let service = state.license_service();
    let response = service.activate(&key, &payload.hardware_id, ...).await?;

    Ok(Json(response))
}
```

### 2. Services (Lógica de Negócio)

**Responsabilidade:**

- Implementar regras de negócio
- Orquestrar repositories
- Validações complexas
- Logs de auditoria

**Exemplo:**

```rust
// services/license_service.rs
impl LicenseService {
    pub async fn activate(...) -> AppResult<ActivateLicenseResponse> {
        // 1. Buscar licença
        let license = self.license_repo().find_by_key(key).await?;

        // 2. Validar estado
        if !license.can_activate() {
            return Err(AppError::Conflict("Já ativada"));
        }

        // 3. Registrar hardware
        let hw = self.hardware_repo().create(hardware_id).await?;

        // 4. Ativar licença
        let updated = self.license_repo().activate(license.id, hw.id).await?;

        // 5. Auditar
        self.audit_repo().log(AuditAction::LicenseActivated, ...).await?;

        Ok(ActivateLicenseResponse { ... })
    }
}
```

### 3. Repositories (Data Access)

**Responsabilidade:**

- Queries SQL type-safe (SQLx)
- Mapping de resultados
- Cache (Redis quando aplicável)

**Exemplo:**

```rust
// repositories/license_repo.rs
impl LicenseRepository {
    pub async fn find_by_key(&self, key: &str) -> AppResult<Option<License>> {
        let result = sqlx::query_as::<_, License>(
            "SELECT * FROM licenses WHERE license_key = $1"
        )
        .bind(key)
        .fetch_optional(&self.db)
        .await?;

        Ok(result)
    }
}
```

---

## 🔄 Fluxos Principais

### Fluxo 1: Ativação de Licença (Desktop → Server)

```
Desktop                Server                   Database
   │                      │                         │
   │ POST /licenses/      │                         │
   │  {KEY}/activate      │                         │
   │──────────────────────>│                         │
   │                      │ Validate input          │
   │                      │ Extract API Key         │
   │                      │                         │
   │                      │ Find license by key     │
   │                      │─────────────────────────>│
   │                      │<─────────────────────────│
   │                      │ License found           │
   │                      │                         │
   │                      │ Check can_activate()    │
   │                      │ Register hardware       │
   │                      │─────────────────────────>│
   │                      │<─────────────────────────│
   │                      │                         │
   │                      │ Update license          │
   │                      │ (set hardware_id,       │
   │                      │  status=active,         │
   │                      │  expires_at)            │
   │                      │─────────────────────────>│
   │                      │<─────────────────────────│
   │                      │                         │
   │                      │ Log audit               │
   │                      │─────────────────────────>│
   │                      │                         │
   │ 200 OK               │                         │
   │ { status: "active",  │                         │
   │   expires_at: ... }  │                         │
   │<─────────────────────│                         │
```

### Fluxo 2: Validação Periódica (Desktop → Server)

```
Desktop                Server              Redis           Database
   │                      │                   │                │
   │ POST /licenses/      │                   │                │
   │  {KEY}/validate      │                   │                │
   │──────────────────────>│                   │                │
   │                      │ Check rate limit  │                │
   │                      │───────────────────>│                │
   │                      │<───────────────────│                │
   │                      │ OK                │                │
   │                      │                   │                │
   │                      │ Find license + hardware            │
   │                      │────────────────────────────────────>│
   │                      │<────────────────────────────────────│
   │                      │                   │                │
   │                      │ Validate:         │                │
   │                      │ - status=active   │                │
   │                      │ - hw_id match     │                │
   │                      │ - not expired     │                │
   │                      │ - time drift OK   │                │
   │                      │                   │                │
   │                      │ Increment counter │                │
   │                      │────────────────────────────────────>│
   │                      │                   │                │
   │ 200 OK               │                   │                │
   │ { valid: true, ... } │                   │                │
   │<─────────────────────│                   │                │
```

---

## ⚙️ AppState (Estado Global)

```rust
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: ConnectionManager,
    pub settings: Arc<Settings>,
}

impl AppState {
    pub fn license_service(&self) -> LicenseService {
        LicenseService::new(self.db.clone(), self.redis.clone())
    }

    pub fn auth_service(&self) -> AuthService {
        AuthService::new(self.db.clone(), self.redis.clone(), self.settings.clone())
    }

    // ... outros services
}
```

---

## 🔐 Autenticação

### JWT (Dashboard Admins)

- **Access Token**: 24h de validade, contém `sub` (admin_id) e `email`
- **Refresh Token**: 30 dias, armazenado no Redis com hash SHA-256
- **Blacklist**: Tokens revogados ficam em cache Redis até expiração

### API Keys (Desktop)

- Formato: `giro_live_XXXXXXXXXXXXXXXXXXXXXXXX` (32 chars)
- Validação via middleware `AuthApiKey`
- Armazenadas com hash SHA-256 no banco

---

## 🚀 Deploy (Railway)

### Configuração

- **Build**: Dockerfile multi-stage
- **Runtime**: Rust release optimized
- **Port**: 3000 (HTTP/2)
- **Health Check**: `/api/v1/health`

### Variáveis de Ambiente

```bash
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

---

## 📊 Performance

| Métrica              | Valor               |
| -------------------- | ------------------- |
| Cold Start           | < 2s                |
| Avg Response Time    | < 100ms             |
| Database Connections | Pool de 10          |
| Rate Limit           | 100 req/min (geral) |
| Memory Usage         | ~30MB base          |

---

## 🧪 Qualidade de Código

- ✅ Type-safe queries (SQLx compile-time check)
- ✅ Zero unsafe code
- ✅ Error handling com Result<T, AppError>
- ✅ Validação automática (validator crate)
- ✅ Logs estruturados (tracing)
