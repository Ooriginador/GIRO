# 🔌 GIRO Mobile - WebSocket Protocol

> **Versão:** 1.0.0  
> **Status:** Planejamento  
> **Última Atualização:** 8 de Janeiro de 2026

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Estrutura de Mensagens](#estrutura-de-mensagens)
3. [Autenticação](#autenticação)
4. [Actions - Mobile → Desktop](#actions---mobile--desktop)
5. [Events - Desktop → Mobile](#events---desktop--mobile)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Reconexão](#reconexão)

---

## 🎯 Visão Geral

A comunicação entre o GIRO Mobile e o GIRO Desktop acontece via **WebSocket** na rede local. O Desktop atua como servidor e o Mobile como cliente.

### Características

| Aspecto       | Especificação        |
| ------------- | -------------------- |
| **Protocolo** | WebSocket (RFC 6455) |
| **Porta**     | 3847                 |
| **Formato**   | JSON                 |
| **Encoding**  | UTF-8                |
| **Heartbeat** | Ping a cada 30s      |
| **Timeout**   | 10s por request      |

### Fluxo de Conexão

```
┌──────────────┐                           ┌──────────────┐
│   Mobile     │                           │   Desktop    │
│    App       │                           │    GIRO      │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │  1. mDNS Discovery                       │
       │─────────────────────────────────────────►│
       │                                          │
       │  2. WebSocket Connect ws://IP:3847       │
       │─────────────────────────────────────────►│
       │                                          │
       │  3. Connection Established               │
       │◄─────────────────────────────────────────│
       │                                          │
       │  4. auth.login { pin }                   │
       │─────────────────────────────────────────►│
       │                                          │
       │  5. Response { user, token }             │
       │◄─────────────────────────────────────────│
       │                                          │
       │  6. Authenticated - Ready                │
       │◄════════════════════════════════════════►│
       │                                          │
       │  7. Ping (30s interval)                  │
       │─────────────────────────────────────────►│
       │                                          │
       │  8. Pong                                 │
       │◄─────────────────────────────────────────│
       │                                          │
```

---

## 📦 Estrutura de Mensagens

### Request (Mobile → Desktop)

```typescript
interface MobileRequest {
  // ID único para correlacionar resposta
  id: number;

  // Ação a executar (namespace.action)
  action: string;

  // Dados da requisição
  payload: Record<string, any>;

  // Timestamp do cliente
  timestamp: number;
}
```

**Exemplo:**

```json
{
  "id": 42,
  "action": "product.get",
  "payload": {
    "barcode": "7891234567890"
  },
  "timestamp": 1736337600000
}
```

### Response (Desktop → Mobile)

```typescript
interface DesktopResponse {
  // ID da requisição original
  id: number;

  // Tipo: response (sucesso) ou error
  type: 'response' | 'error';

  // Dados da resposta
  data?: any;

  // Erro (se type = error)
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  // Timestamp do servidor
  timestamp: number;
}
```

**Exemplo Sucesso:**

```json
{
  "id": 42,
  "type": "response",
  "data": {
    "id": "uuid",
    "barcode": "7891234567890",
    "name": "Coca-Cola 2L",
    "stock": 24,
    "price": 9.99
  },
  "timestamp": 1736337600050
}
```

**Exemplo Erro:**

```json
{
  "id": 42,
  "type": "error",
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produto não encontrado"
  },
  "timestamp": 1736337600050
}
```

### Event (Desktop → Mobile - Push)

```typescript
interface DesktopEvent {
  // ID único do evento
  id: string;

  // Tipo: event
  type: 'event';

  // Nome do evento
  event: string;

  // Dados do evento
  data: any;

  // Timestamp
  timestamp: number;
}
```

**Exemplo:**

```json
{
  "id": "evt_abc123",
  "type": "event",
  "event": "stock.low",
  "data": {
    "product_id": "uuid",
    "name": "Arroz 5kg",
    "current_stock": 2,
    "min_stock": 10
  },
  "timestamp": 1736337700000
}
```

---

## 🔐 Autenticação

### auth.login

Autentica o usuário com PIN.

**Request:**

```json
{
  "id": 1,
  "action": "auth.login",
  "payload": {
    "pin": "1234",
    "device_name": "Samsung Galaxy A54"
  },
  "timestamp": 1736337600000
}
```

**Response (Sucesso):**

```json
{
  "id": 1,
  "type": "response",
  "data": {
    "session_token": "sess_abc123xyz",
    "user": {
      "id": "uuid",
      "name": "Maria Silva",
      "role": "STOCKER",
      "permissions": [
        "product.read",
        "product.update_stock",
        "inventory.create",
        "inventory.update"
      ]
    },
    "expires_at": "2026-01-08T22:00:00Z"
  },
  "timestamp": 1736337600100
}
```

**Response (Erro):**

```json
{
  "id": 1,
  "type": "error",
  "error": {
    "code": "INVALID_PIN",
    "message": "PIN incorreto"
  },
  "timestamp": 1736337600100
}
```

### auth.logout

Encerra a sessão.

**Request:**

```json
{
  "id": 2,
  "action": "auth.logout",
  "payload": {},
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 2,
  "type": "response",
  "data": {
    "success": true
  },
  "timestamp": 1736337600050
}
```

---

## 📤 Actions - Mobile → Desktop

### Produtos

#### product.get

Busca produto por código de barras.

**Request:**

```json
{
  "id": 10,
  "action": "product.get",
  "payload": {
    "barcode": "7891234567890"
  },
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 10,
  "type": "response",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "barcode": "7891234567890",
    "name": "Coca-Cola 2L",
    "category": {
      "id": "uuid",
      "name": "Refrigerantes"
    },
    "stock": 24,
    "min_stock": 10,
    "price": 9.99,
    "cost_price": 7.5,
    "unit": "UN",
    "expiration_date": null,
    "last_movement": {
      "type": "SALE",
      "quantity": -2,
      "date": "2026-01-08T14:30:00Z"
    }
  },
  "timestamp": 1736337600050
}
```

#### product.search

Busca produtos por texto.

**Request:**

```json
{
  "id": 11,
  "action": "product.search",
  "payload": {
    "query": "coca",
    "limit": 20,
    "offset": 0,
    "filters": {
      "category_id": null,
      "low_stock": false
    }
  },
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 11,
  "type": "response",
  "data": {
    "products": [
      {
        "id": "uuid",
        "barcode": "7891234567890",
        "name": "Coca-Cola 2L",
        "stock": 24,
        "price": 9.99,
        "stock_status": "ok"
      }
    ],
    "total": 1,
    "has_more": false
  },
  "timestamp": 1736337600100
}
```

#### product.create

Cadastra novo produto.

**Request:**

```json
{
  "id": 12,
  "action": "product.create",
  "payload": {
    "barcode": "7891234567890",
    "name": "Novo Produto",
    "category_id": "uuid",
    "price": 9.99,
    "cost_price": 7.5,
    "initial_stock": 10,
    "min_stock": 5,
    "unit": "UN"
  },
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 12,
  "type": "response",
  "data": {
    "id": "new-uuid",
    "barcode": "7891234567890",
    "name": "Novo Produto",
    "created_at": "2026-01-08T15:00:00Z"
  },
  "timestamp": 1736337600100
}
```

### Estoque

#### stock.adjust

Ajusta quantidade do estoque.

**Request:**

```json
{
  "id": 20,
  "action": "stock.adjust",
  "payload": {
    "product_id": "uuid",
    "type": "IN",
    "quantity": 12,
    "reason": "RECEIVING",
    "notes": "NF 12345"
  },
  "timestamp": 1736337600000
}
```

| Type         | Descrição          |
| ------------ | ------------------ |
| `IN`         | Entrada (adiciona) |
| `OUT`        | Saída (remove)     |
| `CORRECTION` | Correção (define)  |

| Reason       | Descrição            |
| ------------ | -------------------- |
| `RECEIVING`  | Recebimento          |
| `RETURN`     | Devolução            |
| `LOSS`       | Perda/Quebra         |
| `EXPIRATION` | Vencimento           |
| `INVENTORY`  | Ajuste de inventário |
| `OTHER`      | Outro                |

**Response:**

```json
{
  "id": 20,
  "type": "response",
  "data": {
    "product_id": "uuid",
    "previous_stock": 24,
    "adjustment": 12,
    "new_stock": 36,
    "movement_id": "mov-uuid"
  },
  "timestamp": 1736337600100
}
```

#### stock.list

Lista produtos com filtros.

**Request:**

```json
{
  "id": 21,
  "action": "stock.list",
  "payload": {
    "filter": "low",
    "category_id": null,
    "limit": 50,
    "offset": 0
  },
  "timestamp": 1736337600000
}
```

| Filter     | Descrição     |
| ---------- | ------------- |
| `all`      | Todos         |
| `low`      | Estoque baixo |
| `zero`     | Sem estoque   |
| `expiring` | Vencendo      |

### Inventário

#### inventory.start

Inicia novo inventário.

**Request:**

```json
{
  "id": 30,
  "action": "inventory.start",
  "payload": {
    "scope": "category",
    "category_ids": ["uuid1", "uuid2"]
  },
  "timestamp": 1736337600000
}
```

| Scope      | Descrição         |
| ---------- | ----------------- |
| `full`     | Todos os produtos |
| `category` | Por categoria     |
| `section`  | Por seção         |

**Response:**

```json
{
  "id": 30,
  "type": "response",
  "data": {
    "inventory_id": "inv-uuid",
    "products_count": 156,
    "started_at": "2026-01-08T14:00:00Z",
    "products": [
      {
        "id": "uuid",
        "barcode": "789...",
        "name": "Coca-Cola 2L",
        "expected_stock": 24,
        "counted_stock": null
      }
    ]
  },
  "timestamp": 1736337600200
}
```

#### inventory.count

Registra contagem de um produto.

**Request:**

```json
{
  "id": 31,
  "action": "inventory.count",
  "payload": {
    "inventory_id": "inv-uuid",
    "product_id": "uuid",
    "counted_stock": 22
  },
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 31,
  "type": "response",
  "data": {
    "product_id": "uuid",
    "expected_stock": 24,
    "counted_stock": 22,
    "difference": -2,
    "products_remaining": 155
  },
  "timestamp": 1736337600050
}
```

#### inventory.finish

Finaliza inventário e aplica ajustes.

**Request:**

```json
{
  "id": 32,
  "action": "inventory.finish",
  "payload": {
    "inventory_id": "inv-uuid",
    "apply_adjustments": true
  },
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 32,
  "type": "response",
  "data": {
    "inventory_id": "inv-uuid",
    "products_counted": 156,
    "differences_found": 12,
    "adjustments_applied": 12,
    "financial_impact": -66.7,
    "finished_at": "2026-01-08T16:30:00Z"
  },
  "timestamp": 1736337600500
}
```

### Validade

#### expiration.list

Lista produtos por vencimento.

**Request:**

```json
{
  "id": 40,
  "action": "expiration.list",
  "payload": {
    "days": 7
  },
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 40,
  "type": "response",
  "data": {
    "products": [
      {
        "id": "uuid",
        "barcode": "789...",
        "name": "Iogurte Natural",
        "stock": 5,
        "expiration_date": "2026-01-09",
        "days_until_expiration": 1,
        "urgency": "critical"
      }
    ],
    "total": 12
  },
  "timestamp": 1736337600100
}
```

| Urgency    | Dias |
| ---------- | ---- |
| `critical` | 0-2  |
| `warning`  | 3-7  |
| `notice`   | 8-30 |

#### expiration.action

Executa ação em produto vencendo.

**Request:**

```json
{
  "id": 41,
  "action": "expiration.action",
  "payload": {
    "product_id": "uuid",
    "action": "write_off",
    "quantity": 3,
    "notes": "Descarte por vencimento"
  },
  "timestamp": 1736337600000
}
```

| Action      | Descrição              |
| ----------- | ---------------------- |
| `write_off` | Baixa/Descarte         |
| `promotion` | Marcar promoção        |
| `verified`  | Marcar como verificado |
| `dismiss`   | Ignorar alerta         |

### Categorias

#### category.list

Lista categorias disponíveis.

**Request:**

```json
{
  "id": 50,
  "action": "category.list",
  "payload": {},
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 50,
  "type": "response",
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Bebidas",
        "products_count": 45,
        "children": [
          {
            "id": "uuid2",
            "name": "Refrigerantes",
            "products_count": 20
          }
        ]
      }
    ]
  },
  "timestamp": 1736337600050
}
```

### Sistema

#### system.ping

Verifica conexão.

**Request:**

```json
{
  "id": 0,
  "action": "system.ping",
  "payload": {},
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 0,
  "type": "response",
  "data": {
    "pong": true,
    "server_time": "2026-01-08T15:00:00Z"
  },
  "timestamp": 1736337600010
}
```

#### system.info

Informações do servidor.

**Request:**

```json
{
  "id": 1,
  "action": "system.info",
  "payload": {},
  "timestamp": 1736337600000
}
```

**Response:**

```json
{
  "id": 1,
  "type": "response",
  "data": {
    "version": "1.0.0",
    "store_name": "Mercearia do João",
    "connected_clients": 2,
    "uptime_seconds": 3600
  },
  "timestamp": 1736337600050
}
```

---

## 📥 Events - Desktop → Mobile

### stock.low

Alerta de estoque baixo.

```json
{
  "id": "evt_001",
  "type": "event",
  "event": "stock.low",
  "data": {
    "product_id": "uuid",
    "barcode": "789...",
    "name": "Arroz 5kg",
    "current_stock": 3,
    "min_stock": 10
  },
  "timestamp": 1736337700000
}
```

### stock.zero

Alerta de estoque zerado.

```json
{
  "id": "evt_002",
  "type": "event",
  "event": "stock.zero",
  "data": {
    "product_id": "uuid",
    "barcode": "789...",
    "name": "Feijão Preto 1kg"
  },
  "timestamp": 1736337700000
}
```

### expiration.critical

Alerta de validade crítica.

```json
{
  "id": "evt_003",
  "type": "event",
  "event": "expiration.critical",
  "data": {
    "product_id": "uuid",
    "name": "Iogurte Natural",
    "stock": 5,
    "expiration_date": "2026-01-09",
    "days_remaining": 1
  },
  "timestamp": 1736337700000
}
```

### sale.completed

Notificação de venda realizada.

```json
{
  "id": "evt_004",
  "type": "event",
  "event": "sale.completed",
  "data": {
    "sale_id": "uuid",
    "total": 156.8,
    "items_count": 8,
    "cashier": "João"
  },
  "timestamp": 1736337700000
}
```

### inventory.reminder

Lembrete de inventário pendente.

```json
{
  "id": "evt_005",
  "type": "event",
  "event": "inventory.reminder",
  "data": {
    "inventory_id": "inv-uuid",
    "products_remaining": 45,
    "started_at": "2026-01-08T14:00:00Z"
  },
  "timestamp": 1736337700000
}
```

### connection.status

Status de conexão com outros clients.

```json
{
  "id": "evt_006",
  "type": "event",
  "event": "connection.status",
  "data": {
    "connected_clients": 3,
    "clients": [
      { "name": "Samsung A54", "user": "Maria" },
      { "name": "Motorola G", "user": "João" }
    ]
  },
  "timestamp": 1736337700000
}
```

---

## ❌ Tratamento de Erros

### Códigos de Erro

| Código                | Descrição                | Ação Sugerida    |
| --------------------- | ------------------------ | ---------------- |
| `UNAUTHORIZED`        | Não autenticado          | Fazer login      |
| `FORBIDDEN`           | Sem permissão            | Verificar role   |
| `INVALID_PIN`         | PIN incorreto            | Tentar novamente |
| `SESSION_EXPIRED`     | Sessão expirada          | Fazer login      |
| `PRODUCT_NOT_FOUND`   | Produto não existe       | Cadastrar        |
| `BARCODE_EXISTS`      | Código já existe         | Usar existente   |
| `INVENTORY_NOT_FOUND` | Inventário não existe    | Iniciar novo     |
| `INVENTORY_CLOSED`    | Inventário já fechado    | -                |
| `INVALID_QUANTITY`    | Quantidade inválida      | Corrigir valor   |
| `STOCK_NEGATIVE`      | Estoque ficaria negativo | Verificar valor  |
| `VALIDATION_ERROR`    | Dados inválidos          | Corrigir campos  |
| `INTERNAL_ERROR`      | Erro interno             | Reportar bug     |

### Exemplo de Erro

```json
{
  "id": 42,
  "type": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": {
      "fields": {
        "price": "Preço deve ser maior que zero",
        "name": "Nome é obrigatório"
      }
    }
  },
  "timestamp": 1736337600050
}
```

---

## 🔄 Reconexão

### Estratégia

```typescript
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // ms

class ReconnectionManager {
  private attempts = 0;

  getDelay(): number {
    const delay = RECONNECT_DELAYS[Math.min(this.attempts, RECONNECT_DELAYS.length - 1)];
    this.attempts++;
    return delay;
  }

  reset() {
    this.attempts = 0;
  }
}
```

### Fluxo de Reconexão

```
Desconectado
    │
    ▼
Aguarda 1s → Tenta reconectar → Sucesso? ─► Conectado
    │                              │
    │                              No
    ▼                              │
Aguarda 2s → Tenta reconectar → Sucesso? ─► Conectado
    │                              │
    │                              No
    ▼                              │
Aguarda 5s → Tenta reconectar → ...
    │
    (Continua até 30s max entre tentativas)
```

### Sincronização Pós-Reconexão

Após reconectar, o app:

1. Reautentica (se necessário)
2. Processa queue offline
3. Atualiza dados em cache
4. Resincroniza estado

---

## 🔒 Segurança

### Validações no Desktop

- Verificar session_token em cada request
- Validar permissões do usuário
- Rate limiting por sessão
- Log de todas as operações

### Mensagens Especiais

O Desktop pode enviar mensagens especiais:

```json
{
  "type": "system",
  "event": "force_logout",
  "data": {
    "reason": "Session revoked by admin"
  }
}
```

```json
{
  "type": "system",
  "event": "server_shutdown",
  "data": {
    "message": "Servidor será reiniciado em 60 segundos"
  }
}
```

---

_Este documento define o protocolo de comunicação WebSocket entre GIRO Mobile e GIRO Desktop._
