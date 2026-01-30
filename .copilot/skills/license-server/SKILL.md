# 🔑 License Server Skill

> **Especialista em gerenciamento de licenças e autenticação**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
project: giro-license-server
path: giro-license-server/
components:
  - backend: Rust + Axum + SQLx + PostgreSQL
  - dashboard: Next.js 14 + TailwindCSS + shadcn/ui
  - website: Next.js marketing site
purpose: License validation and management for GIRO Desktop
```

## 📋 Descrição

Esta skill fornece conhecimento especializado em:

- Rust + Axum para API backend de alta performance
- Sistema de licenciamento GIRO Desktop
- Autenticação JWT com jsonwebtoken crate
- PostgreSQL com SQLx (compile-time checked queries)
- Dashboard Next.js para administração

## 🛠️ Stack Técnica

### Backend (Rust)

| Componente   | Versão | Uso                     |
| ------------ | ------ | ----------------------- |
| Axum         | 0.7+   | Web framework           |
| Tokio        | 1.35+  | Async runtime           |
| SQLx         | 0.7+   | Database (PostgreSQL)   |
| jsonwebtoken | 9.0+   | JWT auth                |
| argon2       | 0.5+   | Password hashing        |
| serde        | 1.0+   | Serialization           |
| tower-http   | 0.5+   | Middleware (CORS, etc)  |
| tracing      | 0.1+   | Logging/instrumentation |

### Dashboard (Next.js)

| Componente  | Versão | Uso             |
| ----------- | ------ | --------------- |
| Next.js     | 14+    | React framework |
| TailwindCSS | 3.4+   | Styling         |
| shadcn/ui   | latest | Components      |
| TanStack    | 5.0+   | Data fetching   |

## 📁 Estrutura do Projeto

````
giro-license-server/
├── backend/                  # Rust API
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   ├── lib.rs           # Exports
│   │   ├── config.rs        # Settings (envconfig)
│   │   ├── routes/          # Axum routers
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs      # /auth/*
│   │   │   ├── licenses.rs  # /licenses/*
│   │   │   └── health.rs    # /health
│   │   ├── handlers/        # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # SQLx queries
│   │   ├── models/          # Domain types
│   │   ├── auth/            # JWT, middleware
│   │   └── error.rs         # Error types
│   ├── migrations/          # SQLx migrations
│   ├── Cargo.toml
│   └── Dockerfile
├── dashboard/               # Next.js admin
│   ├── app/
│   ├── components/
│   └── package.json
├── giro-website/            # Marketing site
├── e2e/                     # Playwright tests
└── railway.toml

## 📐 Padrões de Código

### FastAPI Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_db
from app.schemas.license import LicenseCreate, LicenseResponse
from app.services.license import LicenseService
from prisma import Prisma

router = APIRouter()

@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_license(
    license_data: LicenseCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Cria uma nova licença para um cliente.

    Requer: Admin role
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar licenças",
        )

    service = LicenseService(db)
    return await service.create(license_data)


@router.get("/validate/{license_key}")
async def validate_license(
    license_key: str,
    machine_id: str,
    db: Prisma = Depends(get_db),
):
    """
    Valida uma licença e registra ativação.

    Chamado pelo GIRO Desktop no startup.
    """
    service = LicenseService(db)
    result = await service.validate(license_key, machine_id)

    if not result.valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=result.error,
        )

    return result
````

### Prisma Schema (License)

```prisma
generator client {
  provider             = "prisma-client-py"
  interface            = "asyncio"
  recursive_type_depth = 5
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model License {
  id            String       @id @default(uuid())
  key           String       @unique
  type          LicenseType
  status        LicenseStatus @default(ACTIVE)

  // Limites
  maxActivations Int         @default(1)
  maxComputers   Int         @default(1)

  // Datas
  createdAt     DateTime     @default(now())
  expiresAt     DateTime?

  // Relações
  customerId    String
  customer      Customer     @relation(fields: [customerId], references: [id])
  activations   Activation[]

  @@index([key])
  @@index([customerId])
}

model Activation {
  id          String   @id @default(uuid())
  machineId   String
  machineName String?
  activatedAt DateTime @default(now())
  lastSeenAt  DateTime @default(now())
  ipAddress   String?

  licenseId   String
  license     License  @relation(fields: [licenseId], references: [id])

  @@unique([licenseId, machineId])
  @@index([machineId])
}

model Customer {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  phone     String?
  document  String?   // CPF/CNPJ

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  licenses  License[]

  @@index([email])
}

enum LicenseType {
  TRIAL
  BASIC
  PROFESSIONAL
  ENTERPRISE
}

enum LicenseStatus {
  ACTIVE
  SUSPENDED
  EXPIRED
  REVOKED
}
```

## 📐 Padrões de Código (Rust + Axum)

### Axum Router Setup

```rust
// src/routes/mod.rs
use axum::{routing::{get, post, put, delete}, Router};
use crate::handlers;

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(handlers::health::check))
        .nest("/api/v1", api_routes())
}

fn api_routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth_routes())
        .nest("/licenses", license_routes())
        .nest("/customers", customer_routes())
}

fn license_routes() -> Router<AppState> {
    Router::new()
        .route("/", post(handlers::licenses::create))
        .route("/validate/:key", get(handlers::licenses::validate))
        .route("/:id", get(handlers::licenses::get_by_id))
        .route("/:id", put(handlers::licenses::update))
        .route("/:id/revoke", delete(handlers::licenses::revoke))
}
```

### License Handler

```rust
// src/handlers/licenses.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use crate::{
    auth::Claims,
    error::AppError,
    models::{License, LicenseCreate, LicenseValidation, ValidateQuery},
    services::LicenseService,
    AppState,
};

pub async fn create(
    State(state): State<AppState>,
    claims: Claims,
    Json(input): Json<LicenseCreate>,
) -> Result<(StatusCode, Json<License>), AppError> {
    claims.require_role("admin")?;

    let service = LicenseService::new(&state.pool);
    let license = service.create(input).await?;

    Ok((StatusCode::CREATED, Json(license)))
}

pub async fn validate(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Query(query): Query<ValidateQuery>,
) -> Result<Json<LicenseValidation>, AppError> {
    let service = LicenseService::new(&state.pool);
    let result = service.validate(&key, &query.machine_id).await?;

    Ok(Json(result))
}
```

### License Service

```rust
// src/services/license.rs
use sqlx::PgPool;
use rand::Rng;
use crate::{
    error::AppError,
    models::{License, LicenseCreate, LicenseValidation, LicenseType, LicenseStatus},
    repositories::LicenseRepository,
};

pub struct LicenseService<'a> {
    repo: LicenseRepository<'a>,
}

impl<'a> LicenseService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self {
            repo: LicenseRepository::new(pool),
        }
    }

    pub async fn create(&self, input: LicenseCreate) -> Result<License, AppError> {
        let key = self.generate_key(&input.license_type);
        self.repo.create(&key, input).await
    }

    pub async fn validate(
        &self,
        license_key: &str,
        machine_id: &str,
    ) -> Result<LicenseValidation, AppError> {
        let license = self.repo.find_by_key(license_key).await?
            .ok_or(AppError::LicenseNotFound)?;

        if license.status != LicenseStatus::Active {
            return Ok(LicenseValidation::invalid(
                format!("Licença {}", license.status.as_str())
            ));
        }

        if let Some(expires) = license.expires_at {
            if expires < chrono::Utc::now() {
                self.repo.update_status(&license.id, LicenseStatus::Expired).await?;
                return Ok(LicenseValidation::invalid("Licença expirada"));
            }
        }

        // Check activations
        let activations = self.repo.count_activations(&license.id).await?;
        let existing = self.repo.find_activation(&license.id, machine_id).await?;

        if existing.is_some() {
            self.repo.update_activation_seen(&license.id, machine_id).await?;
        } else if activations >= license.max_computers as i64 {
            return Ok(LicenseValidation::invalid(
                format!("Limite de {} computadores atingido", license.max_computers)
            ));
        } else {
            self.repo.create_activation(&license.id, machine_id).await?;
        }

        Ok(LicenseValidation::valid(license))
    }

    fn generate_key(&self, license_type: &LicenseType) -> String {
        let prefix = match license_type {
            LicenseType::Trial => "TRL",
            LicenseType::Basic => "BAS",
            LicenseType::Professional => "PRO",
            LicenseType::Enterprise => "ENT",
        };

        let random: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(16)
            .map(char::from)
            .collect::<String>()
            .to_uppercase();

        format!(
            "GIRO-{}-{}-{}-{}-{}",
            prefix,
            &random[0..4],
            &random[4..8],
            &random[8..12],
            &random[12..16]
        )
    }
}
```

### JWT Authentication

```rust
// src/auth/jwt.rs
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // user id
    pub role: String,       // admin, viewer
    pub exp: usize,         // expiration
    pub iat: usize,         // issued at
}

impl Claims {
    pub fn new(user_id: &str, role: &str, ttl_hours: i64) -> Self {
        let now = chrono::Utc::now();
        Self {
            sub: user_id.to_string(),
            role: role.to_string(),
            iat: now.timestamp() as usize,
            exp: (now + chrono::Duration::hours(ttl_hours)).timestamp() as usize,
        }
    }

    pub fn require_role(&self, role: &str) -> Result<(), AppError> {
        if self.role == role || self.role == "admin" {
            Ok(())
        } else {
            Err(AppError::Forbidden)
        }
    }
}

pub fn create_token(claims: &Claims, secret: &[u8]) -> Result<String, AppError> {
    encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(secret),
    )
    .map_err(|_| AppError::TokenCreation)
}

pub fn verify_token(token: &str, secret: &[u8]) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::InvalidToken)
}

#[async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::MissingToken)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AppError::InvalidToken)?;

        let secret = std::env::var("JWT_SECRET")
            .map_err(|_| AppError::ConfigError)?;

        verify_token(token, secret.as_bytes())
    }
}
```

### Error Handling

```rust
// src/error.rs
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Licença não encontrada")]
    LicenseNotFound,

    #[error("Token inválido")]
    InvalidToken,

    #[error("Token não fornecido")]
    MissingToken,

    #[error("Erro ao criar token")]
    TokenCreation,

    #[error("Acesso negado")]
    Forbidden,

    #[error("Erro de configuração")]
    ConfigError,

    #[error("Erro de banco: {0}")]
    Database(#[from] sqlx::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::LicenseNotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::InvalidToken | AppError::MissingToken => {
                (StatusCode::UNAUTHORIZED, self.to_string())
            }
            AppError::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::Database(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Erro interno".to_string())
            }
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Erro interno".to_string()),
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}
```

## 🔌 API Endpoints

| Método | Endpoint                         | Descrição           | Auth   |
| ------ | -------------------------------- | ------------------- | ------ |
| GET    | `/health`                        | Health check        | Public |
| POST   | `/api/v1/auth/login`             | Login admin         | Public |
| POST   | `/api/v1/licenses/`              | Criar licença       | Admin  |
| GET    | `/api/v1/licenses/validate/:key` | Validar licença     | Public |
| GET    | `/api/v1/licenses/:id`           | Detalhes da licença | Admin  |
| PUT    | `/api/v1/licenses/:id`           | Atualizar licença   | Admin  |
| DELETE | `/api/v1/licenses/:id/revoke`    | Revogar licença     | Admin  |
| GET    | `/api/v1/customers/`             | Listar clientes     | Admin  |
| POST   | `/api/v1/customers/`             | Criar cliente       | Admin  |

## 🔗 Integração com GIRO Desktop

```rust
// GIRO Desktop - src/services/license.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct LicenseValidation {
    pub valid: bool,
    pub license_type: Option<String>,
    pub expires_at: Option<String>,
    pub error: Option<String>,
}

pub async fn validate_license(
    license_key: &str,
    machine_id: &str,
) -> Result<LicenseValidation, String> {
    let client = Client::new();
    let base_url = std::env::var("LICENSE_SERVER_URL")
        .unwrap_or_else(|_| "https://license.giro.app".to_string());

    let url = format!(
        "{}/api/v1/licenses/validate/{}?machine_id={}",
        base_url, license_key, machine_id
    );

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.json().await.map_err(|e| e.to_string())
}
```

## ✅ Checklist

- [ ] Axum handlers com extração tipada
- [ ] SQLx queries compile-time checked
- [ ] JWT com Claims extractor
- [ ] Error handling com thiserror + IntoResponse
- [ ] CORS configurado para dashboard
- [ ] Rate limiting em /validate endpoint
- [ ] Tracing para observability
- [ ] Health check para Railway

## 🔗 Recursos

- [Axum Docs](https://docs.rs/axum/latest/axum/)
- [SQLx PostgreSQL](https://github.com/launchbadge/sqlx)
- [jsonwebtoken](https://docs.rs/jsonwebtoken/latest/jsonwebtoken/)

## ✅ Checklist

### Backend

- [ ] FastAPI configurado
- [ ] Prisma schema definido
- [ ] JWT authentication
- [ ] License validation endpoint
- [ ] Rate limiting
- [ ] CORS configurado

### Deploy

- [ ] Railway configurado
- [ ] PostgreSQL provisionado
- [ ] Variáveis de ambiente
- [ ] Health check endpoint
- [ ] Logs estruturados

## 🔗 Referências

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Prisma Python](https://prisma-client-py.readthedocs.io/)
- [Railway Docs](https://docs.railway.app/)
