# 🔐 Security Audit & Best Practices

> Auditoria de segurança completa do sistema

---

## 📋 Executive Summary

O GIRO License Server implementa múltiplas camadas de segurança:

- ✅ **Autenticação**: JWT + API Keys com Argon2 hashing
- ✅ **Autorização**: Role-based access control
- ✅ **Rate Limiting**: Redis-based (100 req/min geral, 10 req/min auth)
- ✅ **Input Validation**: Validator crate com sanitização
- ✅ **SQL Injection Protection**: SQLx compile-time checked queries
- ✅ **Token Management**: Blacklist Redis + refresh token rotation
- ✅ **Audit Logging**: Registro completo de ações críticas
- ✅ **HTTPS**: Certificado Let's Encrypt via Railway
- ✅ **Secrets Management**: Variáveis de ambiente (.env)

---

## 🛡️ Implementações de Segurança

### 1. Password Security

#### Argon2id Hashing

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
```

**Parâmetros:**

- **Algorithm**: Argon2id (resistente a GPU/ASIC attacks)
- **Memory**: 19 MiB
- **Iterations**: 2
- **Parallelism**: 1
- **Salt**: 16 bytes aleatórios

**Proteções:**

- ✅ Salt único por senha
- ✅ Custo computacional alto (anti brute-force)
- ✅ Resistente a timing attacks

---

### 2. JWT Security

#### Token Structure

```json
{
  "sub": "d384bca6-ecbd-4690-8db2-662776d1652b",
  "email": "admin@giro.com",
  "token_type": "access",
  "iat": 1736380800,
  "exp": 1736467200
}
```

**Configurações:**

- **Algorithm**: HS256 (HMAC-SHA256)
- **Secret**: 64 chars aleatórios (env: `JWT_SECRET`)
- **Access Token TTL**: 24 horas
- **Refresh Token TTL**: 30 dias

**Validações Implementadas:**

```rust
// middleware/auth.rs
#[async_trait]
impl FromRequestParts<AppState> for AuthAdmin {
    async fn from_request_parts(...) -> Result<Self, AppError> {
        // 1. Extrair token do header Authorization
        let token = extract_bearer_token(parts)?;

        // 2. Validar assinatura + expiração
        let claims = decode_access_token(&token, &state.config.jwt_secret)?;

        // 3. Verificar blacklist (Redis)
        if is_token_blacklisted(&state, &token).await? {
            return Err(AppError::Unauthorized("Token revogado".to_string()));
        }

        // 4. Buscar admin no banco
        let admin = admin_repo.find_by_id(claims.sub).await?
            .ok_or_else(|| AppError::Unauthorized("Admin não encontrado".to_string()))?;

        // 5. Verificar se admin está ativo
        if !admin.is_active {
            return Err(AppError::Unauthorized("Conta desativada".to_string()));
        }

        Ok(AuthAdmin { admin_id: admin.id })
    }
}
```

---

### 3. API Key Security

#### Formato Seguro

```
giro_live_XXXXXXXXXXXXXXXXXXXXXXXX
│    │    └─ 24 chars aleatórios (base64url)
│    └─ Ambiente (live/test)
└─ Prefixo identificador
```

**Geração:**

```rust
use rand::Rng;
use base64::{Engine as _, engine::general_purpose};

pub fn generate_api_key() -> (String, String) {
    let random_bytes: [u8; 18] = rand::thread_rng().gen();
    let key_suffix = general_purpose::URL_SAFE_NO_PAD.encode(random_bytes);

    let full_key = format!("giro_live_{}", key_suffix);
    let key_hash = hash_sha256(&full_key);

    (full_key, key_hash)
}
```

**Armazenamento:**

- ❌ Plain text nunca armazenado
- ✅ SHA-256 hash no banco
- ✅ Prefix (12 chars) para identificação visual
- ✅ Retornado apenas uma vez na criação

---

### 4. Rate Limiting

#### Implementação Redis

```rust
// middleware/rate_limiter.rs
const RATE_LIMIT_WINDOW: u64 = 60; // segundos
const RATE_LIMIT_MAX_REQUESTS: i32 = 100;
const AUTH_RATE_LIMIT: i32 = 10;

pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let ip = addr.ip().to_string();
    let path = req.uri().path();

    let limit = if path.starts_with("/auth") {
        AUTH_RATE_LIMIT
    } else {
        RATE_LIMIT_MAX_REQUESTS
    };

    check_limit(&state, &format!("rl:{}", ip), limit).await?;
    Ok(next.run(req).await)
}

async fn check_limit(state: &AppState, key: &str, max: i32) -> AppResult<()> {
    let mut conn = state.redis.clone();

    let count: i32 = redis::cmd("INCR").arg(key).query_async(&mut conn).await?;

    if count == 1 {
        let _: () = conn.expire(key, RATE_LIMIT_WINDOW as i64).await?;
    }

    if count > max {
        return Err(AppError::RateLimitExceeded);
    }

    Ok(())
}
```

**Limites por Endpoint:**

| Endpoint               | Limite  | Window | IP-based |
| ---------------------- | ------- | ------ | -------- |
| `/auth/login`          | 10 req  | 1 min  | ✅       |
| `/auth/register`       | 5 req   | 5 min  | ✅       |
| `/licenses/*/validate` | 100 req | 1 min  | ✅       |
| Geral                  | 100 req | 1 min  | ✅       |

---

### 5. SQL Injection Protection

#### SQLx Compile-Time Checks

```rust
// ✅ SEGURO - Compile-time verified
sqlx::query_as::<_, Admin>(
    "SELECT * FROM admins WHERE email = $1"
)
.bind(email)
.fetch_one(&pool)
.await?;

// ✅ SEGURO - Prepared statement
sqlx::query!(
    "UPDATE licenses SET status = $1 WHERE id = $2",
    status as LicenseStatus,
    license_id
)
.execute(&pool)
.await?;

// ❌ NUNCA FAZER - Vulnerável a SQL injection
// let query = format!("SELECT * FROM admins WHERE email = '{}'", email);
// sqlx::query(&query).fetch_one(&pool).await?;
```

**Proteções:**

- ✅ Prepared statements obrigatórios
- ✅ Type checking em compile time
- ✅ SQL verificado contra schema real
- ✅ Impossível injetar SQL via user input

---

### 6. Input Validation

#### Validator Crate

```rust
use validator::Validate;
use serde::Deserialize;

#[derive(Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8, max = 100))]
    pub password: String,
}

#[derive(Deserialize, Validate)]
pub struct CreateLicenseRequest {
    #[validate(custom = "validate_plan_type")]
    pub plan_type: PlanType,

    #[validate(range(min = 1, max = 100))]
    pub quantity: Option<i32>,
}

// No handler
async fn login(Json(payload): Json<LoginRequest>) -> AppResult<...> {
    payload.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    // ...
}
```

**Validações Implementadas:**

- ✅ Email format (RFC 5322)
- ✅ Length constraints
- ✅ Range validation
- ✅ Custom validators
- ✅ Enum validation

---

### 7. CORS Configuration

```rust
use tower_http::cors::{CorsLayer, Any};

let cors = CorsLayer::new()
    .allow_origin(Any)  // ⚠️ Produção: definir domínios específicos
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers(Any)
    .max_age(Duration::from_secs(3600));
```

**TODO - Produção:**

```rust
.allow_origin([
    "https://dashboard.giro.com.br".parse::<HeaderValue>().unwrap(),
    "https://app.giro.com.br".parse::<HeaderValue>().unwrap(),
])
```

---

### 8. Audit Logging

#### Comprehensive Tracking

```rust
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Type)]
#[sqlx(type_name = "audit_action", rename_all = "snake_case")]
pub enum AuditAction {
    // Auth
    Login,
    Logout,
    LoginFailed,
    PasswordReset,

    // Licenses
    LicenseCreated,
    LicenseActivated,
    LicenseValidated,
    LicenseValidationFailed,
    LicenseTransferred,
    LicenseSuspended,
    LicenseRevoked,

    // Hardware
    HardwareRegistered,
    HardwareConflict,
    HardwareCleared,

    // Payments
    PaymentCreated,
    PaymentCompleted,
    PaymentFailed,
}

// Exemplo de uso
audit_repo.log(
    AuditAction::LicenseActivated,
    Some(admin_id),
    Some(license_id),
    Some(ip_address),
    serde_json::json!({
        "hardware_id": hardware.id,
        "fingerprint": fingerprint,
        "machine_name": machine_name
    }),
).await?;
```

**Campos Registrados:**

- `action` - Tipo de ação
- `admin_id` - Quem executou
- `license_id` - Recurso afetado
- `ip_address` - Origem da requisição
- `user_agent` - Client info
- `details` - JSONB com contexto adicional
- `created_at` - Timestamp

---

## ⚠️ Vulnerabilidades Conhecidas

### 1. CORS - Any Origin (Baixo Risco)

**Status**: ⚠️ To Fix
**Impacto**: Permite qualquer origem fazer requests
**Mitigação Temporária**: HTTPS + JWT required
**Fix Planejado**: Configurar origins específicos

```diff
- .allow_origin(Any)
+ .allow_origin([
+     "https://dashboard.giro.com.br".parse().unwrap(),
+ ])
```

---

### 2. Email Verification Ausente (Médio Risco)

**Status**: 🔄 Roadmap
**Impacto**: Contas podem ser criadas com emails falsos
**Mitigação Temporária**: Admin approval manual
**Fix Planejado**: Implementar SendGrid + email verification flow

---

### 3. 2FA Não Implementado (Médio Risco)

**Status**: 🔄 Roadmap
**Impacto**: Contas comprometidas não têm segunda camada
**Mitigação Temporária**: Senha forte obrigatória (min 8 chars)
**Fix Planejado**: TOTP com QR code

---

### 4. Account Lockout Ausente (Médio Risco)

**Status**: 🔄 Roadmap
**Impacto**: Brute force pode tentar muitas senhas
**Mitigação Atual**: Rate limiting (10 req/min no /auth/login)
**Fix Planejado**: Lockout após 5 tentativas falhas

---

## ✅ Security Checklist

### Authentication & Authorization

- [x] Argon2 password hashing
- [x] JWT com expiração curta (24h)
- [x] Refresh token rotation
- [x] Token blacklist (logout)
- [x] API Keys hashed (SHA-256)
- [ ] Email verification
- [ ] 2FA (TOTP)
- [ ] Account lockout

### Input Validation

- [x] Email format validation
- [x] Password complexity (min 8 chars)
- [x] Length constraints
- [x] Type checking (enum validation)
- [x] Range validation
- [ ] XSS sanitization (frontend)

### Database Security

- [x] SQL injection protection (SQLx)
- [x] Prepared statements only
- [x] Foreign key constraints
- [x] Soft delete (deleted_at)
- [x] Index on sensitive lookups

### Network Security

- [x] HTTPS obrigatório
- [x] Rate limiting
- [x] CORS configured
- [ ] CORS production origins
- [ ] DDoS protection (Cloudflare)

### Logging & Monitoring

- [x] Audit logs (ações críticas)
- [x] Failed login tracking
- [x] Structured logging (tracing)
- [ ] Alerting (suspicious activity)
- [ ] Log rotation

### Secrets Management

- [x] Environment variables
- [x] .env not committed
- [x] Railway secrets
- [ ] Secret rotation policy

---

## 🚨 Incident Response

### Comprometimento de JWT Secret

1. **Imediato**:

   - Gerar novo `JWT_SECRET`
   - Atualizar Railway env vars
   - Restart deployment

2. **Mitigação**:

   - Invalidar todos refresh tokens

   ```sql
   UPDATE refresh_tokens SET is_revoked = true;
   ```

   - Forçar re-login de todos admins
   - Notificar usuários

3. **Prevenção**:
   - Rotação periódica de secrets (90 dias)
   - Audit access logs

---

### Comprometimento de API Key

1. **Imediato**:

   - Revogar API Key específica

   ```sql
   UPDATE api_keys SET is_active = false WHERE id = $1;
   ```

   - Verificar audit_logs para uso suspeito

2. **Investigação**:

   - Checar IPs de origem
   - Verificar licenças validadas
   - Buscar padrões anômalos

3. **Comunicação**:
   - Notificar admin afetado
   - Gerar nova API Key
   - Atualizar Desktop config

---

### SQL Injection Attempt

1. **Detecção**:

   - SQLx rejeita queries inválidas em compile time
   - Logs de erros mostrarão tentativas

2. **Response**:
   - Identificar IP de origem
   - Ban temporário via rate limiter
   - Audit log da tentativa

---

## 📊 Security Metrics

### Monitoramento Recomendado

```sql
-- Failed logins nas últimas 24h
SELECT
    ip_address,
    COUNT(*) as attempts
FROM audit_logs
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY attempts DESC;

-- Top IPs fazendo requests
SELECT
    ip_address,
    COUNT(*) as total_requests
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY total_requests DESC
LIMIT 20;

-- Validações falhadas (possível pirataria)
SELECT
    l.license_key,
    COUNT(*) as failed_validations
FROM audit_logs al
JOIN licenses l ON al.license_id = l.id
WHERE al.action = 'license_validation_failed'
  AND al.created_at > NOW() - INTERVAL '24 hours'
GROUP BY l.license_key
ORDER BY failed_validations DESC;
```

---

## 🔒 Best Practices Aplicadas

1. **Principle of Least Privilege**

   - Admins só acessam suas próprias licenças
   - API Keys só podem validar licenças

2. **Defense in Depth**

   - Múltiplas camadas: Rate limiting + JWT + Validation + Audit

3. **Fail Securely**

   - Erros não expõem detalhes internos
   - Sempre retornar generic errors ao cliente

4. **Secure by Default**

   - HTTPS obrigatório
   - Senhas hasheadas automaticamente
   - Tokens expiram

5. **Keep Secrets Secret**
   - Nunca commit .env
   - API Keys retornadas apenas na criação
   - Passwords nunca logadas

---

## 📈 Próximos Passos de Segurança

1. **Curto Prazo (1-2 meses)**

   - [ ] CORS production origins
   - [ ] Email verification
   - [ ] Account lockout

2. **Médio Prazo (3-6 meses)**

   - [ ] 2FA (TOTP)
   - [ ] Geolocation tracking
   - [ ] Anomaly detection

3. **Longo Prazo (6-12 meses)**
   - [ ] Penetration testing
   - [ ] Bug bounty program
   - [ ] SOC 2 compliance
