# 🌐 API Endpoints

> Referência completa da API REST

---

## 📡 Base URL

- **Produção**: `https://giro-license-server-production.up.railway.app`
- **Desenvolvimento**: `http://localhost:3001`

---

## 🔑 Autenticação

A API utiliza **dois métodos de autenticação**:

### 1. JWT (Dashboard Admin)

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. API Key (GIRO Desktop)

```http
X-API-Key: giro_live_XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 📚 Endpoints

### 🔐 Authentication (`/auth`)

#### `POST /auth/register`

Criar nova conta de administrador.

**Request:**

```json
{
  "email": "admin@empresa.com.br",
  "password": "SenhaForte123!",
  "name": "João Silva",
  "phone": "+55 11 98765-4321",
  "company_name": "Empresa LTDA"
}
```

**Response:** `201 Created`

```json
{
  "message": "Administrador criado com sucesso. Verifique seu email.",
  "admin_id": "d384bca6-ecbd-4690-8db2-662776d1652b"
}
```

---

#### `POST /auth/login`

Autenticar e obter tokens.

**Request:**

```json
{
  "email": "admin@empresa.com.br",
  "password": "SenhaForte123!"
}
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "4f3b2a1c9e8d7f6a5b4c3d2e1f0a9b8c...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "admin": {
    "id": "d384bca6-ecbd-4690-8db2-662776d1652b",
    "email": "admin@empresa.com.br",
    "name": "João Silva",
    "company_name": "Empresa LTDA",
    "is_verified": true
  }
}
```

---

#### `POST /auth/refresh`

Renovar access token expirado.

**Request:**

```json
{
  "refresh_token": "4f3b2a1c9e8d7f6a5b4c3d2e1f0a9b8c..."
}
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

---

#### `POST /auth/logout`

Invalidar sessão atual.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `204 No Content`

---

### 📜 Licenses (`/licenses`)

#### `POST /licenses`

Criar licença(s).

**Auth:** JWT (Admin)

**Request:**

```json
{
  "plan_type": "monthly", // monthly | semiannual | annual
  "quantity": 5
}
```

**Response:** `201 Created`

```json
{
  "licenses": [
    {
      "id": "a1b2c3d4-...",
      "license_key": "GIRO-ABCD-1234-EFGH-5678",
      "plan_type": "monthly",
      "status": "pending",
      "created_at": "2026-01-11T14:30:00Z"
    }
  ],
  "message": "5 licença(s) criada(s) com sucesso"
}
```

---

#### `GET /licenses`

Listar licenças do admin.

**Auth:** JWT (Admin)

**Query Params:**

- `status` (optional): `pending`, `active`, `expired`, `suspended`, `revoked`
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "license_key": "GIRO-ABCD-1234-EFGH-5678",
      "plan_type": "monthly",
      "status": "active",
      "activated_at": "2026-01-10T10:00:00Z",
      "expires_at": "2026-02-10T10:00:00Z",
      "last_validated": "2026-01-11T14:00:00Z",
      "created_at": "2026-01-09T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

---

#### `GET /licenses/:key`

Detalhes de uma licença.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
{
  "id": "a1b2c3d4-...",
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "plan_type": "monthly",
  "status": "active",
  "activated_at": "2026-01-10T10:00:00Z",
  "expires_at": "2026-02-10T10:00:00Z",
  "last_validated": "2026-01-11T14:00:00Z",
  "validation_count": 125,
  "hardware": {
    "id": "hw123...",
    "fingerprint": "a1b2c3d4...",
    "machine_name": "PDV-01",
    "os_version": "Windows 10",
    "first_seen": "2026-01-10T10:00:00Z",
    "last_seen": "2026-01-11T14:00:00Z"
  },
  "created_at": "2026-01-09T09:00:00Z"
}
```

---

#### `POST /licenses/:key/activate`

Ativar licença e vincular hardware.

**Auth:** API Key (Desktop)

**Request:**

```json
{
  "hardware_id": "CPU:BFEBFBFF000906EA|MB:O.E.M.|MAC:00-11-22-33-44-55|DISK:SN123456",
  "machine_name": "PDV-01",
  "os_version": "Windows 10",
  "timestamp": "2026-01-11T14:30:00Z"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "status": "active",
  "activated_at": "2026-01-11T14:30:00Z",
  "expires_at": "2026-02-11T14:30:00Z",
  "days_remaining": 30,
  "message": "Licença ativada com sucesso"
}
```

**Errors:**

- `400` - Licença já ativada em outro hardware
- `404` - Licença não encontrada
- `409` - Hardware já vinculado a outra licença

---

#### `POST /licenses/:key/validate`

Validar licença (chamado pelo Desktop a cada inicialização).

**Auth:** API Key (Desktop)

**Request:**

```json
{
  "hardware_id": "CPU:BFEBFBFF000906EA|MB:O.E.M.|MAC:00-11-22-33-44-55|DISK:SN123456",
  "timestamp": "2026-01-11T14:30:00Z"
}
```

**Response:** `200 OK`

```json
{
  "valid": true,
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "status": "active",
  "expires_at": "2026-02-11T14:30:00Z",
  "days_remaining": 30,
  "needs_renewal": false
}
```

**Errors:**

- `401` - Hardware não corresponde
- `403` - Licença expirada
- `404` - Licença não encontrada
- `410` - Licença revogada

---

#### `POST /licenses/:key/transfer`

Transferir licença para outro hardware.

**Auth:** JWT (Admin)

**Request:**

```json
{
  "new_hardware_id": "CPU:NEWCPU|MB:NEWMB|MAC:AA-BB-CC-DD-EE-FF|DISK:NEWDISK"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Licença transferida com sucesso",
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "old_hardware": "a1b2c3d4...",
  "new_hardware": "e5f6g7h8..."
}
```

---

#### `DELETE /licenses/:key`

Revogar licença permanentemente.

**Auth:** JWT (Admin)

**Response:** `204 No Content`

---

#### `GET /licenses/stats`

Estatísticas agregadas.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
{
  "total": 150,
  "pending": 20,
  "active": 100,
  "expired": 25,
  "suspended": 3,
  "revoked": 2,
  "expiring_soon": 8
}
```

---

### 🖥️ Hardware (`/hardware`)

#### `GET /hardware`

Listar todos os hardwares vinculados.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
[
  {
    "id": "hw123...",
    "fingerprint": "a1b2c3d4...",
    "machine_name": "PDV-01",
    "os_version": "Windows 10",
    "first_seen": "2026-01-10T10:00:00Z",
    "last_seen": "2026-01-11T14:00:00Z",
    "is_active": true
  }
]
```

---

#### `GET /hardware/:id`

Detalhes de um hardware.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
{
  "id": "hw123...",
  "fingerprint": "a1b2c3d4...",
  "machine_name": "PDV-01",
  "os_version": "Windows 10",
  "cpu_info": "Intel Core i5",
  "first_seen": "2026-01-10T10:00:00Z",
  "last_seen": "2026-01-11T14:00:00Z",
  "is_active": true
}
```

---

#### `DELETE /hardware/:id`

Desvincular hardware (libera licença).

**Auth:** JWT (Admin)

**Response:** `204 No Content`

---

### 📊 Metrics (`/metrics`)

#### `GET /metrics`

Listar métricas do admin.

**Auth:** JWT (Admin)

**Query Params:**

- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `license_id` (optional): UUID

**Response:** `200 OK`

```json
[
  {
    "id": "m123...",
    "license_id": "lic123...",
    "date": "2026-01-11",
    "sales_total": 2547.8,
    "sales_count": 32,
    "average_ticket": 79.62,
    "products_sold": 156,
    "synced_at": "2026-01-12T02:00:00Z"
  }
]
```

---

#### `POST /metrics`

Enviar métricas do Desktop (sync diário).

**Auth:** API Key (Desktop)

**Request:**

```json
{
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "date": "2026-01-11",
  "sales_total": 2547.8,
  "sales_count": 32,
  "products_sold": 156
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Métricas sincronizadas com sucesso"
}
```

---

#### `GET /metrics/summary`

Resumo agregado de período.

**Auth:** JWT (Admin)

**Query Params:**

- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

**Response:** `200 OK`

```json
{
  "total_sales": 76434.6,
  "total_transactions": 987,
  "average_ticket": 77.42,
  "total_products": 4523,
  "best_day": {
    "date": "2026-01-08",
    "sales": 3245.9
  }
}
```

---

### 🔑 API Keys (`/api-keys`)

#### `POST /api-keys`

Criar nova API Key.

**Auth:** JWT (Admin)

**Request:**

```json
{
  "name": "PDV Matriz"
}
```

**Response:** `201 Created`

```json
{
  "api_key": "giro_live_AbCdEfGhIjKlMnOpQrStUvWxYz",
  "key_id": "key123...",
  "name": "PDV Matriz",
  "created_at": "2026-01-11T14:30:00Z",
  "warning": "Guarde esta chave em local seguro. Ela não será exibida novamente."
}
```

---

#### `GET /api-keys`

Listar API Keys do admin.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
[
  {
    "id": "key123...",
    "name": "PDV Matriz",
    "key_prefix": "giro_live_Ab",
    "is_active": true,
    "last_used_at": "2026-01-11T14:00:00Z",
    "created_at": "2026-01-10T10:00:00Z"
  }
]
```

---

#### `DELETE /api-keys/:id`

Revogar API Key.

**Auth:** JWT (Admin)

**Response:** `204 No Content`

---

### 💳 Stripe Webhooks (`/stripe`)

#### `POST /stripe/webhook`

Processar eventos do Stripe.

**Headers:**

```
Stripe-Signature: t=1234567890,v1=abc123...
```

**Body:** (raw JSON from Stripe)

**Response:** `200 OK`

```json
{
  "received": true
}
```

**Eventos Processados:**

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.deleted`

---

### 📋 Subscriptions (`/subscriptions`)

#### `GET /subscriptions`

Listar assinaturas do admin.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
[
  {
    "id": "sub123...",
    "stripe_subscription_id": "sub_abc123",
    "status": "active",
    "current_period_start": "2026-01-01T00:00:00Z",
    "current_period_end": "2026-02-01T00:00:00Z",
    "plan": "Pro Plan - 10 Licenças"
  }
]
```

---

### 👤 Profile (`/profile`)

#### `GET /profile`

Dados do admin logado.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
{
  "id": "admin123...",
  "email": "admin@empresa.com.br",
  "name": "João Silva",
  "phone": "+55 11 98765-4321",
  "company_name": "Empresa LTDA",
  "is_verified": true,
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

#### `PUT /profile`

Atualizar perfil.

**Auth:** JWT (Admin)

**Request:**

```json
{
  "name": "João Silva Santos",
  "phone": "+55 11 99999-8888",
  "company_name": "Nova Empresa LTDA"
}
```

**Response:** `200 OK`

```json
{
  "message": "Perfil atualizado com sucesso",
  "admin": {
    /* updated admin */
  }
}
```

---

### 🔔 Notifications (`/notifications`)

#### `GET /notifications`

Listar notificações do admin.

**Auth:** JWT (Admin)

**Response:** `200 OK`

```json
[
  {
    "id": "notif123...",
    "type": "license_expiring",
    "title": "Licenças próximas ao vencimento",
    "message": "Você tem 3 licenças expirando nos próximos 7 dias",
    "is_read": false,
    "created_at": "2026-01-11T08:00:00Z"
  }
]
```

---

### ❤️ Health (`/health`)

#### `GET /health`

Verificar status da API.

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-11T14:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## ⚠️ Error Responses

Todos os erros seguem o formato:

```json
{
  "error": "NotFound",
  "message": "Licença não encontrada",
  "timestamp": "2026-01-11T14:30:00Z"
}
```

### Códigos HTTP

| Código | Significado                    |
| ------ | ------------------------------ |
| `200`  | Sucesso                        |
| `201`  | Recurso criado                 |
| `204`  | Sem conteúdo (sucesso)         |
| `400`  | Bad Request (validação)        |
| `401`  | Não autenticado                |
| `403`  | Não autorizado (sem permissão) |
| `404`  | Não encontrado                 |
| `409`  | Conflito (duplicado)           |
| `429`  | Rate limit excedido            |
| `500`  | Erro interno do servidor       |

---

## 🚦 Rate Limits

| Endpoint               | Limite                  |
| ---------------------- | ----------------------- |
| `/auth/login`          | 10 req/min por IP       |
| `/auth/register`       | 5 req/5min por IP       |
| `/licenses/*/validate` | 100 req/min por API Key |
| Demais                 | 100 req/min por IP      |
