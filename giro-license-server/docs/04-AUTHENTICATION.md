# 🔐 Sistema de Autenticação

> Implementação completa de autenticação JWT + Refresh Tokens

---

## 🎯 Visão Geral

O sistema utiliza **dois tipos de autenticação**:

1. **JWT (JSON Web Tokens)** - Para Dashboard Admin (Web)
2. **API Keys** - Para GIRO Desktop (Aplicação)

---

## 🔑 Autenticação JWT (Dashboard)

### Arquitetura de Tokens

```
┌──────────────────────────────────────────────────────────────┐
│                    JWT TOKEN FLOW                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Login (POST /auth/login)                                 │
│     ↓                                                         │
│  2. Validar credenciais (Argon2)                             │
│     ↓                                                         │
│  3. Gerar Access Token (24h)                                 │
│     ↓                                                         │
│  4. Gerar Refresh Token (30 dias)                            │
│     ↓                                                         │
│  5. Armazenar Refresh Token (Redis + PostgreSQL)             │
│     ↓                                                         │
│  6. Retornar ambos tokens                                    │
│                                                               │
│  ┌────────────────────────────────────────────────┐          │
│  │  Access Token Expirado?                        │          │
│  │  POST /auth/refresh                            │          │
│  │    ↓                                           │          │
│  │  Validar Refresh Token                         │          │
│  │    ↓                                           │          │
│  │  Gerar novo Access Token                       │          │
│  │    ↓                                           │          │
│  │  Retornar novo Access Token                    │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Access Token (JWT)

**Especificações:**

- **Algoritmo**: HS256 (HMAC-SHA256)
- **Validade**: 24 horas
- **Armazenamento**: Cliente (localStorage ou cookie HttpOnly)

**Estrutura do Payload:**

```json
{
  "sub": "d384bca6-ecbd-4690-8db2-662776d1652b", // Admin ID
  "email": "admin@giro.com.br",
  "token_type": "access",
  "iat": 1736380800, // Issued at
  "exp": 1736467200 // Expires at
}
```

**Implementação (Rust):**

```rust
// utils/jwt.rs
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

#[derive(Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: Uuid,      // Subject (admin_id)
    pub email: String,
    pub token_type: String,
    pub iat: i64,       // Issued at
    pub exp: i64,       // Expiration
}

pub fn encode_access_token(
    admin_id: Uuid,
    email: &str,
    secret: &str,
) -> Result<String, AppError> {
    let now = Utc::now().timestamp();
    let exp = now + 86400; // 24 horas

    let claims = AccessTokenClaims {
        sub: admin_id,
        email: email.to_string(),
        token_type: "access".to_string(),
        iat: now,
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}
```

### Refresh Token

**Especificações:**

- **Formato**: String aleatória (32 bytes → 64 chars hex)
- **Validade**: 30 dias
- **Armazenamento**: PostgreSQL (hash SHA-256)
- **Rotação**: Sim (novo token a cada refresh)

**Tabela:**

```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    admin_id    UUID NOT NULL,
    token_hash  VARCHAR(64) NOT NULL,  -- SHA256
    expires_at  TIMESTAMPTZ NOT NULL,
    device_name VARCHAR(100),
    ip_address  TEXT,
    user_agent  TEXT,
    is_revoked  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementação:**

```rust
use rand::Rng;
use sha2::{Sha256, Digest};

pub fn generate_refresh_token() -> String {
    let random_bytes: [u8; 32] = rand::thread_rng().gen();
    hex::encode(random_bytes)
}

pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}
```

---

## 🔒 Password Hashing (Argon2)

### Especificações

- **Algoritmo**: Argon2id (resistente a GPU/ASIC)
- **Parâmetros**:
  - Memory: 19 MiB
  - Iterations: 2
  - Parallelism: 1
  - Salt: 16 bytes aleatórios

**Implementação:**

```rust
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string();

    Ok(password_hash)
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let parsed_hash = PasswordHash::new(hash)?;
    let argon2 = Argon2::default();

    Ok(argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok())
}
```

**Exemplo de Hash:**

```
$argon2id$v=19$m=19456,t=2,p=1$SomeRandomSalt$HashOutput...
```

---

## 🚫 Token Blacklist (Redis)

### Propósito

Invalidar tokens antes da expiração natural (logout, troca de senha, etc).

### Implementação

```rust
// middleware/auth.rs
pub async fn blacklist_token(
    state: &AppState,
    token: &str,
    ttl_secs: u64,
) -> Result<(), AppError> {
    let mut conn = state.redis.clone();
    let key = format!("blacklist:{}", token);

    redis::cmd("SET")
        .arg(&key)
        .arg("1")
        .arg("EX")
        .arg(ttl_secs)
        .query_async(&mut conn)
        .await?;

    Ok(())
}

async fn check_token_blacklist(
    state: &AppState,
    token: &str,
) -> Result<bool, AppError> {
    let mut conn = state.redis.clone();
    let key = format!("blacklist:{}", token);

    let exists: bool = redis::cmd("EXISTS")
        .arg(&key)
        .query_async(&mut conn)
        .await?;

    Ok(exists)
}
```

**Uso:**

```rust
// No logout
blacklist_token(&state, &access_token, 86400).await?;
```

---

## 🔑 API Keys (Desktop)

### Formato

```
giro_live_XXXXXXXXXXXXXXXXXXXXXXXX
│    │    └─ 24 chars aleatórios
│    └─ Ambiente (live/test)
└─ Prefixo identificador
```

### Geração

```rust
pub fn generate_api_key() -> (String, String) {
    let random_bytes: [u8; 18] = rand::thread_rng().gen();
    let key_suffix = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .encode(random_bytes);

    let full_key = format!("giro_live_{}", key_suffix);
    let key_hash = hash_token(&full_key);

    (full_key, key_hash)
}
```

### Armazenamento

```sql
CREATE TABLE api_keys (
    id         UUID PRIMARY KEY,
    admin_id   UUID NOT NULL,
    key_hash   VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL,  -- "giro_live_XX"
    name       VARCHAR(100),
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Middleware de Validação

```rust
// middleware/auth.rs
#[derive(Debug, Clone)]
pub struct AuthApiKey {
    pub api_key: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthApiKey {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Tentar X-API-Key header
        let api_key = parts
            .headers
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        if let Some(key) = api_key {
            if key.starts_with("giro_") {
                // Validar no banco (hash)
                let api_key_service = state.api_key_service();
                api_key_service.validate(&key).await?;

                return Ok(AuthApiKey { api_key: key });
            }
        }

        Err(AppError::Unauthorized("API Key inválida".to_string()))
    }
}
```

---

## 🚦 Rate Limiting

### Implementação (Redis)

```rust
// middleware/rate_limiter.rs
const RATE_LIMIT_WINDOW: u64 = 60; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS: i32 = 100;
const AUTH_RATE_LIMIT: i32 = 10;  // Mais restrito para auth

pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let ip = addr.ip().to_string();
    check_limit(&state, &format!("rl:{}", ip), RATE_LIMIT_MAX_REQUESTS).await?;
    Ok(next.run(req).await)
}

async fn check_limit(
    state: &AppState,
    key: &str,
    max: i32,
) -> Result<(), AppError> {
    let mut conn = state.redis.clone();

    let count: i32 = redis::cmd("INCR")
        .arg(key)
        .query_async(&mut conn)
        .await?;

    if count == 1 {
        let _: () = conn.expire(key, RATE_LIMIT_WINDOW as i64).await?;
    }

    if count > max {
        return Err(AppError::RateLimitExceeded);
    }

    Ok(())
}
```

### Limites por Endpoint

| Endpoint               | Limite  | Window | Motivo                              |
| ---------------------- | ------- | ------ | ----------------------------------- |
| `/auth/login`          | 10 req  | 1 min  | Prevenção de brute force            |
| `/auth/register`       | 5 req   | 5 min  | Anti-spam                           |
| `/licenses/*/validate` | 100 req | 1 min  | Desktop pode validar frequentemente |
| Geral                  | 100 req | 1 min  | Proteção DDoS                       |

---

## 🛡️ Segurança Adicional

### 1. CORS

```rust
use tower_http::cors::{CorsLayer, Any};

let cors = CorsLayer::new()
    .allow_origin(Any)  // Produção: configurar domínios específicos
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers(Any);
```

### 2. HTTPS Obrigatório

- Railway fornece certificado Let's Encrypt automaticamente
- Redirect HTTP → HTTPS configurado no edge

### 3. Input Validation

```rust
use validator::Validate;

#[derive(Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8))]
    pub password: String,
}

// No handler
payload.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;
```

### 4. SQL Injection Protection

```rust
// ✅ Safe (SQLx compile-time checked)
sqlx::query_as::<_, Admin>("SELECT * FROM admins WHERE email = $1")
    .bind(email)
    .fetch_one(&pool)
    .await?;

// ❌ Nunca fazer (vulnerável)
// let query = format!("SELECT * FROM admins WHERE email = '{}'", email);
```

---

## 📋 Fluxos Completos

### Registro + Login

```
1. POST /auth/register
   Body: { email, password, name }
   ↓
2. Validar email único
3. Hash password (Argon2)
4. INSERT INTO admins
5. Retornar 201 Created
   ↓
6. POST /auth/login
   Body: { email, password }
   ↓
7. Buscar admin por email
8. Verificar password (Argon2)
9. Gerar Access Token (JWT)
10. Gerar Refresh Token
11. Salvar Refresh Token (PostgreSQL)
12. Retornar 200 OK
    {
      "access_token": "eyJ...",
      "refresh_token": "abc123...",
      "token_type": "Bearer",
      "expires_in": 86400,
      "admin": { ... }
    }
```

### Token Refresh

```
1. POST /auth/refresh
   Body: { refresh_token: "abc123..." }
   ↓
2. Hash do token recebido (SHA-256)
3. Buscar no banco pelo hash
4. Verificar:
   - Existe?
   - Não expirado?
   - Não revogado (is_revoked = false)?
   ↓
5. Gerar novo Access Token
6. (Opcional) Rotacionar Refresh Token
7. Retornar 200 OK
   {
     "access_token": "eyJ...",
     "expires_in": 86400
   }
```

### Logout

```
1. POST /auth/logout
   Headers: Authorization: Bearer <access_token>
   ↓
2. Extrair admin_id do JWT
3. Marcar Refresh Token como revogado
   UPDATE refresh_tokens SET is_revoked = true ...
4. Adicionar Access Token ao blacklist (Redis)
   SET blacklist:<token> 1 EX 86400
5. Retornar 204 No Content
```

---

## ⚠️ Considerações de Segurança

### ✅ Implementado

- [x] Argon2 para senhas
- [x] JWT com expiração curta
- [x] Refresh token rotation
- [x] Token blacklist
- [x] Rate limiting
- [x] SQL injection protection
- [x] Input validation
- [x] HTTPS obrigatório

### 🔄 Roadmap Futuro

- [ ] 2FA (TOTP)
- [ ] Email verification
- [ ] Account lockout após tentativas falhas
- [ ] Geolocation tracking
- [ ] Device fingerprinting
- [ ] Anomaly detection (login de IP suspeito)
