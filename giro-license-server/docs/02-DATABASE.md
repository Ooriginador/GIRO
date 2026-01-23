# 🗄️ Database Schema

> Modelagem de dados completa do GIRO License Server

---

## 📊 Diagrama Entidade-Relacionamento

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐            ┌──────────────────┐           │
│  │     admins       │            │    licenses      │           │
│  ├──────────────────┤            ├──────────────────┤           │
│  │ id (PK)          │◄──────────┤│ admin_id (FK)    │           │
│  │ email (UNIQUE)   │            │ id (PK)          │           │
│  │ password_hash    │            │ license_key      │           │
│  │ name             │            │ hardware_id (FK) │───┐       │
│  │ phone            │            │ plan_type        │   │       │
│  │ company_name     │            │ status           │   │       │
│  │ is_verified      │            │ activated_at     │   │       │
│  │ is_active        │            │ expires_at       │   │       │
│  │ created_at       │            │ validation_count │   │       │
│  └──────────────────┘            └──────────────────┘   │       │
│         │                               │                │       │
│         │                               │                │       │
│         │                               ▼                ▼       │
│         │                  ┌──────────────────┐  ┌──────────────┐
│         │                  │    metrics       │  │   hardware   │
│         │                  ├──────────────────┤  ├──────────────┤
│         │                  │ id (PK)          │  │ id (PK)      │
│         │                  │ license_id (FK)  │  │ fingerprint  │
│         │                  │ date             │  │ machine_name │
│         │                  │ sales_total      │  │ os_version   │
│         │                  │ sales_count      │  │ is_active    │
│         │                  │ products_sold    │  │ first_seen   │
│         │                  │ synced_at        │  │ last_seen    │
│         │                  └──────────────────┘  └──────────────┘
│         │                                                        │
│         ├──────────────────┬─────────────────┬──────────────────┤
│         │                  │                 │                  │
│         ▼                  ▼                 ▼                  ▼
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │  payments   │  │ refresh_     │  │  api_keys    │  │ audit_logs   │
│  │             │  │  tokens      │  │              │  │              │
│  ├─────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│  │ id (PK)     │  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
│  │ admin_id FK │  │ admin_id FK  │  │ admin_id FK  │  │ admin_id FK  │
│  │ amount      │  │ token_hash   │  │ key_hash     │  │ license_id FK│
│  │ provider    │  │ expires_at   │  │ name         │  │ action       │
│  │ status      │  │ is_revoked   │  │ is_active    │  │ details JSONB│
│  └─────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📋 Tabelas Detalhadas

### 1. admins

Armazena contas de administradores/proprietários do sistema.

```sql
CREATE TABLE admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    company_name    VARCHAR(100),

    -- Verificação
    is_verified     BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,

    -- 2FA (futuro)
    totp_secret     VARCHAR(32),
    totp_enabled    BOOLEAN DEFAULT FALSE,

    -- Status
    is_active       BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_phone ON admins(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_admins_is_active ON admins(is_active);
```

**Regras de Negócio:**

- Email único e obrigatório
- Senha armazenada com Argon2 (hash de 255 chars)
- `is_active = false` bloqueia login
- `deleted_at` para soft delete

---

### 2. licenses

Licenças criadas e seu ciclo de vida.

```sql
CREATE TYPE license_status AS ENUM (
    'pending',      -- Criada, aguardando ativação
    'active',       -- Ativada e funcionando
    'expired',      -- Expirada por falta de pagamento
    'suspended',    -- Suspensa manualmente
    'revoked'       -- Revogada permanentemente
);

CREATE TYPE plan_type AS ENUM (
    'monthly',      -- Mensal (30 dias)
    'semiannual',   -- Semestral (180 dias)
    'annual'        -- Anual (365 dias)
);

CREATE TABLE licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key     VARCHAR(25) NOT NULL UNIQUE,  -- GIRO-XXXX-XXXX-XXXX-XXXX

    -- Relacionamentos
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    hardware_id     UUID REFERENCES hardware(id) ON DELETE SET NULL,

    -- Plano e Status
    plan_type       plan_type NOT NULL DEFAULT 'monthly',
    status          license_status NOT NULL DEFAULT 'pending',

    -- Datas Importantes
    activated_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    last_validated  TIMESTAMPTZ,

    -- Contadores
    validation_count BIGINT DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices otimizados
CREATE UNIQUE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_admin ON licenses(admin_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires ON licenses(expires_at);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id) WHERE hardware_id IS NOT NULL;
CREATE INDEX idx_licenses_active ON licenses(status, expires_at) WHERE status = 'active';
```

**Regras de Negócio:**

- `license_key` gerado automaticamente (formato: `GIRO-XXXX-XXXX-XXXX-XXXX`)
- `hardware_id` NULL até a primeira ativação
- `expires_at` calculado baseado no `plan_type`:
  - Monthly: +30 dias
  - Semiannual: +180 dias
  - Annual: +365 dias
- `validation_count` incrementado a cada validação bem-sucedida

---

### 3. hardware

Fingerprints das máquinas onde licenças foram ativadas.

```sql
CREATE TABLE hardware (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint     VARCHAR(64) NOT NULL UNIQUE,  -- SHA256 do Hardware ID

    -- Informações da Máquina
    machine_name    VARCHAR(100),
    os_version      VARCHAR(50),
    cpu_info        VARCHAR(100),

    -- Tracking
    first_seen      TIMESTAMPTZ DEFAULT NOW(),
    last_seen       TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,

    -- Metadata
    ip_address      TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_hardware_fingerprint ON hardware(fingerprint);
CREATE INDEX idx_hardware_active ON hardware(is_active);
CREATE INDEX idx_hardware_last_seen ON hardware(last_seen DESC);
```

**Regras de Negócio:**

- `fingerprint` é SHA-256 (64 chars hex) de componentes do hardware
- Componentes usados: CPU ID + Motherboard Serial + MAC Address + Disk Serial
- `last_seen` atualizado a cada validação
- `is_active = false` quando licença é transferida

---

### 4. metrics

Dados agregados enviados pelo Desktop (sync diário).

```sql
CREATE TABLE metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id      UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,

    -- Data de Referência
    date            DATE NOT NULL,

    -- Vendas
    sales_total     DECIMAL(15, 2) DEFAULT 0,
    sales_count     INTEGER DEFAULT 0,
    average_ticket  DECIMAL(10, 2) DEFAULT 0,

    -- Produtos
    products_sold   INTEGER DEFAULT 0,

    -- Estoque (opcional)
    low_stock_count INTEGER DEFAULT 0,
    expiring_count  INTEGER DEFAULT 0,

    -- Caixa
    cash_opens      INTEGER DEFAULT 0,
    cash_closes     INTEGER DEFAULT 0,

    -- Sync
    synced_at       TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint de unicidade
    CONSTRAINT unique_license_date UNIQUE (license_id, date)
);

-- Índices
CREATE INDEX idx_metrics_license ON metrics(license_id);
CREATE INDEX idx_metrics_date ON metrics(date DESC);
CREATE INDEX idx_metrics_license_date ON metrics(license_id, date DESC);
```

**Regras de Negócio:**

- Uma entrada por licença por dia
- Desktop envia dados agregados do dia anterior
- `average_ticket = sales_total / sales_count`

---

### 5. api_keys

API Keys para autenticação de Desktop.

```sql
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    -- Key (stored as hash)
    key_hash        VARCHAR(64) NOT NULL UNIQUE,  -- SHA256
    key_prefix      VARCHAR(12) NOT NULL,         -- giro_live_xxx (para exibição)

    -- Metadata
    name            VARCHAR(100),

    -- Status
    is_active       BOOLEAN DEFAULT TRUE,

    -- Tracking
    last_used_at    TIMESTAMPTZ,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_api_keys_admin ON api_keys(admin_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
```

**Formato:**

- Plain text (retornado uma vez na criação): `giro_live_XXXXXXXXXXXXXXXXXXXXXXXX`
- Armazenado: SHA-256 hash do plain text
- Prefixo: Primeiros 12 chars para identificação visual

---

### 6. refresh_tokens

Sessões ativas (refresh tokens).

```sql
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    token_hash      VARCHAR(64) NOT NULL,  -- SHA256

    -- Expiração
    expires_at      TIMESTAMPTZ NOT NULL,

    -- Device Tracking
    device_name     VARCHAR(100),
    ip_address      TEXT,
    user_agent      TEXT,

    -- Status
    is_revoked      BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_refresh_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_admin ON refresh_tokens(admin_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_active ON refresh_tokens(admin_id, is_revoked)
    WHERE is_revoked = FALSE;
```

**Regras de Negócio:**

- Expiração: 30 dias
- Um admin pode ter múltiplos refresh tokens (multi-device)
- Logout revoga o token (`is_revoked = true`)

---

### 7. payments

Histórico de pagamentos.

```sql
CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);

CREATE TYPE payment_provider AS ENUM (
    'stripe',
    'pix',
    'manual'
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    -- Valores
    amount          DECIMAL(10, 2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'BRL',

    -- Provider
    provider        payment_provider NOT NULL,
    provider_id     VARCHAR(100),  -- ID externo (Stripe, etc)

    -- Status
    status          payment_status NOT NULL DEFAULT 'pending',

    -- Licenças afetadas
    licenses_count  INTEGER NOT NULL DEFAULT 1,

    -- Metadata
    description     TEXT,
    receipt_url     TEXT,

    -- Timestamps
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payments_admin ON payments(admin_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider_id)
    WHERE provider_id IS NOT NULL;
CREATE INDEX idx_payments_created ON payments(created_at DESC);
```

---

### 8. audit_logs

Logs de auditoria para compliance e segurança.

```sql
CREATE TYPE audit_action AS ENUM (
    -- Auth
    'login', 'logout', 'login_failed', 'password_reset',

    -- Licenses
    'license_created', 'license_activated', 'license_validated',
    'license_validation_failed', 'license_transferred',
    'license_suspended', 'license_revoked',

    -- Hardware
    'hardware_registered', 'hardware_conflict', 'hardware_cleared',

    -- Payments
    'payment_created', 'payment_completed', 'payment_failed'
);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referências
    admin_id        UUID REFERENCES admins(id) ON DELETE SET NULL,
    license_id      UUID REFERENCES licenses(id) ON DELETE SET NULL,

    -- Ação
    action          audit_action NOT NULL,

    -- Contexto
    ip_address      TEXT,
    user_agent      TEXT,

    -- Detalhes em JSON
    details         JSONB DEFAULT '{}',

    -- Timestamp
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices otimizados
CREATE INDEX idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_license ON audit_logs(license_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_details ON audit_logs USING GIN (details);
```

**Exemplo de `details`:**

```json
{
  "hardware_id": "abc123...",
  "old_status": "pending",
  "new_status": "active",
  "reason": "First activation"
}
```

---

## 🔄 Triggers

### Atualização Automática de `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 📊 Estatísticas

| Tabela           | Função     | Crescimento Esperado                        |
| ---------------- | ---------- | ------------------------------------------- |
| `admins`         | Baixo      | ~100 por ano                                |
| `licenses`       | Médio      | ~1.000 por ano                              |
| `hardware`       | Médio      | ~1.000 por ano                              |
| `metrics`        | Alto       | ~365.000 por ano (1000 licenças × 365 dias) |
| `api_keys`       | Baixo      | ~200 por ano                                |
| `refresh_tokens` | Médio      | ~500 ativos                                 |
| `payments`       | Médio      | ~1.200 por ano                              |
| `audit_logs`     | Muito Alto | ~100.000+ por ano                           |

---

## 🔍 Queries Importantes

### Licenças prestes a expirar (7 dias)

```sql
SELECT l.*, a.email, a.name
FROM licenses l
JOIN admins a ON l.admin_id = a.id
WHERE l.status = 'active'
  AND l.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY l.expires_at ASC;
```

### Dashboard de métricas (últimos 30 dias)

```sql
SELECT
    DATE(m.date) as date,
    SUM(m.sales_total) as total_sales,
    SUM(m.sales_count) as total_transactions,
    AVG(m.average_ticket) as avg_ticket
FROM metrics m
JOIN licenses l ON m.license_id = l.id
WHERE l.admin_id = $1
  AND m.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(m.date)
ORDER BY date DESC;
```

### Detecção de conflito de hardware

```sql
SELECT l1.license_key, l2.license_key, h.fingerprint
FROM licenses l1
JOIN licenses l2 ON l1.hardware_id = l2.hardware_id
JOIN hardware h ON l1.hardware_id = h.id
WHERE l1.id < l2.id
  AND l1.status = 'active'
  AND l2.status = 'active';
```

---

## 🛡️ Constraints e Validações

### Check Constraints (Futuro)

```sql
-- Garantir que expires_at > activated_at
ALTER TABLE licenses
ADD CONSTRAINT check_expires_after_activation
CHECK (expires_at IS NULL OR activated_at IS NULL OR expires_at > activated_at);

-- Garantir valores positivos
ALTER TABLE metrics
ADD CONSTRAINT check_positive_sales
CHECK (sales_total >= 0 AND sales_count >= 0);
```

---

## 🔧 Manutenção

### Limpeza de Tokens Expirados

```sql
-- Executar diariamente via cron
DELETE FROM refresh_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### Arquivamento de Audit Logs

```sql
-- Mover logs antigos para tabela archive (> 90 dias)
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```
