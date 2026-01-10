# 🔍 Auditoria de Compatibilidade: GIRO Mobile ↔ Desktop

> **Data**: 9 de Janeiro de 2026  
> **Versão Mobile**: 0.1.0  
> **Versão Desktop**: 1.x  
> **Status**: ⚠️ REQUER IMPLEMENTAÇÃO NO DESKTOP

---

## 📋 Sumário Executivo

Esta auditoria analisa a compatibilidade entre o **GIRO Mobile** e o **GIRO Desktop**, identificando gaps de implementação que precisam ser corrigidos para garantir funcionamento completo.

### Resultado Geral

| Área                   | Mobile       | Desktop         | Status     |
| ---------------------- | ------------ | --------------- | ---------- |
| WebSocket Scanner      | ✅ Pronto    | ✅ Implementado | 🟢 OK      |
| WebSocket API Completa | ✅ Pronto    | ❌ Não existe   | 🔴 FALTA   |
| mDNS Discovery         | ✅ Pronto    | ❌ Não existe   | 🔴 FALTA   |
| Autenticação Mobile    | ✅ Pronto    | ⚠️ Parcial      | 🟡 ADAPTAR |
| Tipos de Dados         | ✅ Definidos | ✅ Compatíveis  | 🟢 OK      |

---

## 1️⃣ Análise do WebSocket

### Mobile Espera (Definido em `app/lib/websocket.ts`)

```typescript
// Porta e conexão
ws://{IP}:3847

// Estrutura de Request
{
  id: number,
  action: string,        // ex: "product.get", "auth.login"
  payload: object,
  token?: string,        // JWT após autenticação
  timestamp: number
}

// Estrutura de Response
{
  id: number,
  success: boolean,
  data?: object,
  error?: { code: string, message: string },
  timestamp: number
}

// Estrutura de Event (Push)
{
  id: string,
  event: string,         // ex: "stock.updated"
  data: object,
  timestamp: number
}
```

### Desktop Atual (em `src-tauri/src/hardware/scanner.rs`)

```rust
// Porta
3847 ✅ (compatível)

// Mensagens suportadas (APENAS scanner)
ScannerMessage::Barcode { code, format, timestamp }
ScannerMessage::Ping
ScannerMessage::Register { device_id, device_name }
ScannerMessage::Disconnect

// Respostas
ServerMessage::Connected { session_id }
ServerMessage::Ack { code, product_name }
ServerMessage::Error { message }
ServerMessage::Pong
```

### 🔴 GAP IDENTIFICADO

O Desktop **só implementa o WebSocket para scanner** (receber códigos de barras). O Mobile espera um **WebSocket completo** com:

| Action Mobile      | Existe no Desktop?    |
| ------------------ | --------------------- |
| `auth.login`       | ❌ NÃO                |
| `auth.logout`      | ❌ NÃO                |
| `product.get`      | ❌ NÃO (só via Tauri) |
| `product.search`   | ❌ NÃO (só via Tauri) |
| `stock.adjust`     | ❌ NÃO (só via Tauri) |
| `inventory.start`  | ❌ NÃO                |
| `inventory.count`  | ❌ NÃO                |
| `inventory.finish` | ❌ NÃO                |
| `expiration.list`  | ❌ NÃO                |
| `category.list`    | ❌ NÃO                |
| `system.ping`      | ⚠️ Parcial (só Pong)  |

---

## 2️⃣ Análise do mDNS Discovery

### Mobile Espera (em `app/lib/discovery.ts`)

```typescript
// Serviço mDNS que o Mobile procura
SERVICE_TYPE: '_giro._tcp'
DOMAIN: 'local.'
PORT: 3847

// Dados esperados do serviço
{
  id: string,
  name: string,          // Ex: "GIRO PDV - Caixa 01"
  host: string,
  ip: string,
  port: number,
  version?: string
}
```

### Desktop Atual

```rust
// ❌ NÃO EXISTE implementação de mDNS broadcast
// O Desktop NÃO anuncia sua presença na rede
```

### 🔴 GAP IDENTIFICADO

O Desktop **não faz broadcast mDNS**, portanto o Mobile **não consegue descobrir automaticamente** o Desktop na rede.

**Solução Necessária**: Implementar mDNS advertising no Desktop usando crate `mdns-sd` ou `zeroconf`.

---

## 3️⃣ Análise de Autenticação

### Mobile Espera

```typescript
// Login via WebSocket
action: 'auth.login'
payload: {
  pin: string,
  deviceId: string,
  deviceName: string
}

// Response esperada
{
  token: string,
  expiresAt: string,
  employee: {
    id: string,
    name: string,
    role: 'caixa' | 'repositor' | 'gerente' | 'admin'
  }
}
```

### Desktop Atual (em `src-tauri/src/commands/employees.rs`)

```rust
// ✅ Comando Tauri existe
#[tauri::command]
pub async fn authenticate_by_pin(pin: String, ...) -> AppResult<Option<SafeEmployee>>

// ✅ Modelo SafeEmployee compatível
pub struct SafeEmployee {
    pub id: String,
    pub name: String,
    pub role: String,  // "ADMIN", "MANAGER", "CASHIER", "VIEWER"
    ...
}
```

### 🟡 GAP PARCIAL

- ✅ A lógica de autenticação por PIN existe
- ❌ Não está exposta via WebSocket, só via Tauri
- ⚠️ Roles usam nomes diferentes:
  - Desktop: `ADMIN`, `MANAGER`, `CASHIER`, `VIEWER`
  - Mobile: `admin`, `gerente`, `caixa`, `repositor`

---

## 4️⃣ Análise de Tipos de Dados

### Product

| Campo Mobile           | Campo Desktop             | Compatível?                |
| ---------------------- | ------------------------- | -------------------------- |
| `id: string`           | `id: String`              | ✅                         |
| `barcode: string`      | `barcode: Option<String>` | ✅                         |
| `name: string`         | `name: String`            | ✅                         |
| `salePrice: number`    | `sale_price: f64`         | ⚠️ camelCase vs snake_case |
| `currentStock: number` | `current_stock: f64`      | ⚠️ camelCase vs snake_case |
| `unit: ProductUnit`    | `unit: String`            | ⚠️ Enum vs String          |
| `categoryId?: string`  | `category_id: String`     | ⚠️ camelCase vs snake_case |

**Nota**: O Desktop usa `#[serde(rename_all = "camelCase")]` nos modelos, então a serialização JSON **é compatível**.

### Stock Movement

| Campo Mobile                      | Campo Desktop            | Compatível?    |
| --------------------------------- | ------------------------ | -------------- |
| `type: 'IN'\|'OUT'\|'CORRECTION'` | `movement_type: String`  | ✅             |
| `quantity: number`                | `quantity: f64`          | ✅             |
| `reason: string`                  | `reason: Option<String>` | ✅             |
| `productId: string`               | `product_id: String`     | ✅ (via serde) |

### Employee/Operator

| Campo Mobile         | Campo Desktop  | Compatível?           |
| -------------------- | -------------- | --------------------- |
| `id: string`         | `id: String`   | ✅                    |
| `name: string`       | `name: String` | ✅                    |
| `role: OperatorRole` | `role: String` | ⚠️ Valores diferentes |

**Mapeamento de Roles necessário**:

```
Desktop ADMIN    → Mobile admin
Desktop MANAGER  → Mobile gerente
Desktop CASHIER  → Mobile caixa
Desktop VIEWER   → Mobile (novo: visualizador)
(não existe)     → Mobile repositor
```

---

## 5️⃣ Análise de ProductUnit

### Mobile

```typescript
type ProductUnit = 'UN' | 'KG' | 'G' | 'L' | 'ML' | 'M' | 'CM' | 'CX' | 'PCT' | 'DZ';
```

### Desktop

```rust
pub enum ProductUnit {
    Unit,       // un
    Kilogram,   // kg
    Gram,       // g
    Liter,      // L
    Milliliter, // ml
    Meter,      // m
    Box,        // cx
    Pack,       // pct
    Dozen,      // dz
}
// Nota: CM (Centímetro) não existe no Desktop
```

### 🟡 GAP PARCIAL

- Mobile tem `CM` (Centímetro), Desktop não
- Serialização usa SCREAMING_SNAKE_CASE no Desktop (`UNIT`, `KILOGRAM`)
- Mobile usa abreviações (`UN`, `KG`)

---

## 6️⃣ Plano de Ação

### Prioridade ALTA (Bloqueante)

#### 1. Implementar WebSocket API no Desktop

Criar novo módulo `src-tauri/src/services/mobile_api.rs`:

```rust
// Actions que precisam ser implementadas
async fn handle_ws_message(msg: MobileRequest) -> MobileResponse {
    match msg.action.as_str() {
        "auth.login" => handle_auth_login(msg.payload).await,
        "auth.logout" => handle_auth_logout(msg.token).await,
        "product.get" => handle_product_get(msg.payload).await,
        "product.search" => handle_product_search(msg.payload).await,
        "stock.adjust" => handle_stock_adjust(msg.payload).await,
        "inventory.start" => handle_inventory_start(msg.payload).await,
        "inventory.count" => handle_inventory_count(msg.payload).await,
        "inventory.finish" => handle_inventory_finish(msg.payload).await,
        "expiration.list" => handle_expiration_list(msg.payload).await,
        "category.list" => handle_category_list().await,
        "system.ping" => handle_ping().await,
        _ => Err(MobileError::UnknownAction)
    }
}
```

#### 2. Implementar mDNS Broadcasting

Adicionar ao `Cargo.toml`:

```toml
mdns-sd = "0.10"
```

Criar serviço:

```rust
pub fn start_mdns_broadcast(port: u16, name: &str) {
    let mdns = ServiceDaemon::new().unwrap();
    let service = ServiceInfo::new(
        "_giro._tcp.local.",
        name,
        &format!("{}.local.", hostname::get().unwrap()),
        (),
        port,
        None
    ).unwrap();
    mdns.register(service).unwrap();
}
```

### Prioridade MÉDIA

#### 3. Unificar Roles de Funcionário

Adicionar role `Stocker` (repositor) no Desktop:

```rust
pub enum EmployeeRole {
    Admin,
    Manager,
    Cashier,
    Stocker,   // NOVO
    Viewer,
}
```

#### 4. Adicionar ProductUnit CM

```rust
pub enum ProductUnit {
    // ... existentes
    Centimeter, // cm - NOVO
}
```

### Prioridade BAIXA

#### 5. Eventos Push (Desktop → Mobile)

Implementar broadcast de eventos quando:

- Estoque for alterado: `stock.updated`
- Produto ficar com estoque baixo: `stock.low`
- Produto esgotar: `stock.out`

---

## 7️⃣ Arquivos para Criar/Modificar no Desktop

### Novos Arquivos

| Arquivo                           | Propósito                |
| --------------------------------- | ------------------------ |
| `src/services/mobile_api.rs`      | WebSocket API completa   |
| `src/services/mdns_service.rs`    | Broadcasting mDNS        |
| `src/services/session_manager.rs` | Gerenciar sessões mobile |

### Arquivos a Modificar

| Arquivo                   | Modificação                |
| ------------------------- | -------------------------- |
| `src/hardware/scanner.rs` | Integrar com mobile_api.rs |
| `src/models/employee.rs`  | Adicionar role Stocker     |
| `src/models/product.rs`   | Adicionar Centimeter       |
| `src/main.rs`             | Iniciar mDNS ao startar    |
| `Cargo.toml`              | Adicionar mdns-sd          |

---

## 8️⃣ Checklist de Implementação

### Backend Desktop

- [ ] Criar `services/mobile_api.rs`
- [ ] Implementar handler WebSocket genérico
- [ ] Implementar `auth.login` via WebSocket
- [ ] Implementar `product.get` via WebSocket
- [ ] Implementar `product.search` via WebSocket
- [ ] Implementar `stock.adjust` via WebSocket
- [ ] Implementar `inventory.start` via WebSocket
- [ ] Implementar `inventory.count` via WebSocket
- [ ] Implementar `inventory.finish` via WebSocket
- [ ] Implementar `expiration.list` via WebSocket
- [ ] Implementar `category.list` via WebSocket
- [ ] Criar `services/mdns_service.rs`
- [ ] Implementar mDNS broadcast
- [ ] Adicionar role Stocker
- [ ] Adicionar ProductUnit::Centimeter
- [ ] Implementar eventos push (stock.updated, etc)
- [ ] Integrar mobile_api com scanner existente
- [ ] Testes unitários
- [ ] Testes de integração

### Mobile (Ajustes Menores)

- [ ] Mapeamento de roles na resposta de login
- [ ] Fallback se mDNS falhar (conexão manual)
- [ ] Tratamento de erros específicos

---

## 9️⃣ Estimativa de Esforço

| Tarefa                 | Complexidade | Tempo Estimado |
| ---------------------- | ------------ | -------------- |
| WebSocket API completa | Alta         | 3-4 dias       |
| mDNS Broadcasting      | Média        | 1 dia          |
| Unificar Roles         | Baixa        | 2 horas        |
| ProductUnit CM         | Baixa        | 1 hora         |
| Eventos Push           | Média        | 1 dia          |
| Testes                 | Média        | 2 dias         |
| **TOTAL**              | -            | **7-9 dias**   |

---

## 🔟 Conclusão

O **GIRO Mobile está pronto** para funcionar, mas o **GIRO Desktop precisa implementar**:

1. **WebSocket API completa** - Atualmente só existe scanner
2. **mDNS Broadcasting** - Para descoberta automática
3. **Pequenos ajustes** - Roles e units

Recomendação: Criar uma nova fase no roadmap do Desktop especificamente para "Integração Mobile".

---

_Auditoria realizada pelo Agente QA em 9 de Janeiro de 2026_
