# 📊 Matriz de Compatibilidade: Mobile ↔ Desktop

> Referência rápida para garantir consistência de tipos entre as plataformas

---

## 🔄 Tipos de Dados

### Product

| Campo Mobile (TS) | Campo Desktop (Rust) | JSON Key       | Tipo         | Status         |
| ----------------- | -------------------- | -------------- | ------------ | -------------- |
| `id`              | `id`                 | `id`           | string       | ✅             |
| `barcode`         | `barcode`            | `barcode`      | string?      | ✅             |
| `internalCode`    | `internal_code`      | `internalCode` | string       | ✅             |
| `name`            | `name`               | `name`         | string       | ✅             |
| `description`     | `description`        | `description`  | string?      | ✅             |
| `categoryId`      | `category_id`        | `categoryId`   | string       | ✅             |
| `categoryName`    | -                    | `categoryName` | string?      | ⚠️ Mobile only |
| `unit`            | `unit`               | `unit`         | ProductUnit  | ⚠️ Ver abaixo  |
| `salePrice`       | `sale_price`         | `salePrice`    | number       | ✅             |
| `costPrice`       | `cost_price`         | `costPrice`    | number?      | ✅             |
| `currentStock`    | `current_stock`      | `currentStock` | number       | ✅             |
| `minStock`        | `min_stock`          | `minStock`     | number       | ✅             |
| `maxStock`        | -                    | `maxStock`     | number?      | ⚠️ Mobile only |
| `location`        | -                    | `location`     | string?      | ⚠️ Mobile only |
| `isActive`        | `is_active`          | `isActive`     | boolean      | ✅             |
| `createdAt`       | `created_at`         | `createdAt`    | string (ISO) | ✅             |
| `updatedAt`       | `updated_at`         | `updatedAt`    | string (ISO) | ✅             |

### ProductUnit

| Mobile | Desktop      | JSON Value     | Descrição          |
| ------ | ------------ | -------------- | ------------------ |
| `UN`   | `Unit`       | `"UNIT"`       | Unidade            |
| `KG`   | `Kilogram`   | `"KILOGRAM"`   | Quilograma         |
| `G`    | `Gram`       | `"GRAM"`       | Grama              |
| `L`    | `Liter`      | `"LITER"`      | Litro              |
| `ML`   | `Milliliter` | `"MILLILITER"` | Mililitro          |
| `M`    | `Meter`      | `"METER"`      | Metro              |
| `CM`   | ❌           | -              | Centímetro (FALTA) |
| `CX`   | `Box`        | `"BOX"`        | Caixa              |
| `PCT`  | `Pack`       | `"PACK"`       | Pacote             |
| `DZ`   | `Dozen`      | `"DOZEN"`      | Dúzia              |

**Ação Necessária**:

- Desktop: Adicionar `Centimeter` ao enum
- Mobile: Mapear valores JSON `UNIT` → `UN`, etc.

---

### Employee/Operator

| Campo Mobile (TS) | Campo Desktop (Rust) | JSON Key | Tipo         | Status         |
| ----------------- | -------------------- | -------- | ------------ | -------------- |
| `id`              | `id`                 | `id`     | string       | ✅             |
| `name`            | `name`               | `name`   | string       | ✅             |
| `role`            | `role`               | `role`   | OperatorRole | ⚠️ Ver abaixo  |
| `avatar`          | -                    | `avatar` | string?      | ⚠️ Mobile only |
| -                 | `cpf`                | `cpf`    | string?      | Desktop only   |
| -                 | `phone`              | `phone`  | string?      | Desktop only   |
| -                 | `email`              | `email`  | string?      | Desktop only   |

### OperatorRole / EmployeeRole

| Mobile      | Desktop      | JSON Value  | Permissões                  |
| ----------- | ------------ | ----------- | --------------------------- |
| `admin`     | `Admin`      | `"ADMIN"`   | Tudo                        |
| `gerente`   | `Manager`    | `"MANAGER"` | Gestão, relatórios          |
| `caixa`     | `Cashier`    | `"CASHIER"` | PDV, consultas              |
| `repositor` | ❌ `Stocker` | `"STOCKER"` | Estoque, inventário (FALTA) |
| -           | `Viewer`     | `"VIEWER"`  | Somente leitura             |

**Ação Necessária**:

- Desktop: Adicionar `Stocker` ao enum
- Mobile: Adicionar `visualizador` ao type

---

### StockMovement

| Campo Mobile (TS) | Campo Desktop (Rust) | JSON Key        | Tipo         | Status         |
| ----------------- | -------------------- | --------------- | ------------ | -------------- |
| `id`              | `id`                 | `id`            | string       | ✅             |
| `productId`       | `product_id`         | `productId`     | string       | ✅             |
| `type`            | `movement_type`      | `type`          | string       | ✅             |
| `quantity`        | `quantity`           | `quantity`      | number       | ✅             |
| `reason`          | `reason`             | `reason`        | string?      | ✅             |
| `previousStock`   | `previous_stock`     | `previousStock` | number       | ✅             |
| `newStock`        | `new_stock`          | `newStock`      | number       | ✅             |
| `notes`           | -                    | `notes`         | string?      | ⚠️ Mobile only |
| `employeeId`      | `employee_id`        | `employeeId`    | string?      | ✅             |
| `employeeName`    | -                    | `employeeName`  | string       | ⚠️ Mobile only |
| `createdAt`       | `created_at`         | `createdAt`     | string (ISO) | ✅             |

### StockAdjustmentType

| Mobile       | Desktop | JSON Value     |
| ------------ | ------- | -------------- | ------------ |
| `IN`         | `"IN"`  | `"IN"`         | ✅           |
| `OUT`        | `"OUT"` | `"OUT"`        | ✅           |
| `CORRECTION` | -       | `"CORRECTION"` | ⚠️ Verificar |

### StockAdjustmentReason

| Mobile       | Desktop | JSON Value     |
| ------------ | ------- | -------------- |
| `RECEIVING`  | ✅      | `"RECEIVING"`  |
| `RETURN`     | ✅      | `"RETURN"`     |
| `LOSS`       | ✅      | `"LOSS"`       |
| `EXPIRATION` | ✅      | `"EXPIRATION"` |
| `INVENTORY`  | ✅      | `"INVENTORY"`  |
| `SALE`       | ✅      | `"SALE"`       |
| `OTHER`      | ✅      | `"OTHER"`      |

---

### ProductLot

| Campo Mobile (TS) | Campo Desktop (Rust) | JSON Key          | Tipo         | Status              |
| ----------------- | -------------------- | ----------------- | ------------ | ------------------- |
| `id`              | `id`                 | `id`              | string       | ✅                  |
| `productId`       | `product_id`         | `productId`       | string       | ✅                  |
| `batchNumber`     | `lot_number`         | `lotNumber`       | string?      | ⚠️ Nomes diferentes |
| `expirationDate`  | `expiration_date`    | `expirationDate`  | string?      | ✅                  |
| `quantity`        | `current_quantity`   | `currentQuantity` | number       | ⚠️ Nomes diferentes |
| `costPrice`       | `cost_price`         | `costPrice`       | number?      | ✅                  |
| `status`          | `status`             | `status`          | LotStatus    | ✅                  |
| `createdAt`       | `created_at`         | `createdAt`       | string (ISO) | ✅                  |

### LotStatus

| Mobile      | Desktop | JSON Value    |
| ----------- | ------- | ------------- |
| `AVAILABLE` | ✅      | `"AVAILABLE"` |
| `LOW`       | ✅      | `"LOW"`       |
| `EXPIRED`   | ✅      | `"EXPIRED"`   |
| `SOLD_OUT`  | ✅      | `"SOLD_OUT"`  |

---

### Category

| Campo Mobile (TS) | Campo Desktop (Rust) | JSON Key       | Tipo    | Status                 |
| ----------------- | -------------------- | -------------- | ------- | ---------------------- |
| `id`              | `id`                 | `id`           | string  | ✅                     |
| `name`            | `name`               | `name`         | string  | ✅                     |
| `parentId`        | `parent_id`          | `parentId`     | string? | ✅                     |
| `color`           | `color`              | `color`        | string? | ✅                     |
| `icon`            | `icon`               | `icon`         | string? | ✅                     |
| `productCount`    | -                    | `productCount` | number  | ⚠️ Calcular no Desktop |

---

## 📡 WebSocket Protocol

### Request (Mobile → Desktop)

```typescript
// Mobile envia
interface WSRequest {
  id: number;
  action: WSActionType;
  payload: unknown;
  token?: string;
  timestamp: number;
}
```

```rust
// Desktop recebe
pub struct MobileRequest {
    pub id: u64,
    pub action: String,
    pub payload: serde_json::Value,
    pub token: Option<String>,
    pub timestamp: i64,
}
```

### Response (Desktop → Mobile)

```rust
// Desktop envia
pub struct MobileResponse {
    pub id: u64,
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<MobileError>,
    pub timestamp: i64,
}
```

```typescript
// Mobile recebe
interface WSResponse<T = unknown> {
  id: number;
  success: boolean;
  data?: T;
  error?: WSError;
  timestamp: number;
}
```

### Event (Desktop → Mobile)

```rust
// Desktop envia
pub struct MobileEvent {
    pub id: String,
    pub event: String,
    pub data: serde_json::Value,
    pub timestamp: i64,
}
```

```typescript
// Mobile recebe
interface WSEvent<T = unknown> {
  id: string;
  event: WSEventType;
  data: T;
  timestamp: number;
}
```

---

## 🔑 Auth Flow

### Login Request

```json
{
  "id": 1,
  "action": "auth.login",
  "payload": {
    "pin": "1234",
    "deviceId": "uuid-device",
    "deviceName": "GIRO Mobile - João"
  },
  "timestamp": 1736400000000
}
```

### Login Response (Success)

```json
{
  "id": 1,
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-01-10T08:00:00Z",
    "employee": {
      "id": "emp-uuid",
      "name": "João Silva",
      "role": "CASHIER"
    }
  },
  "timestamp": 1736400000050
}
```

### Login Response (Error)

```json
{
  "id": 1,
  "success": false,
  "error": {
    "code": "AUTH_INVALID",
    "message": "PIN inválido ou usuário não encontrado"
  },
  "timestamp": 1736400000050
}
```

---

## 📝 Mapeamentos Necessários no Mobile

```typescript
// Converter role do Desktop para Mobile
function mapDesktopRoleToMobile(desktopRole: string): OperatorRole {
  const mapping: Record<string, OperatorRole> = {
    ADMIN: 'admin',
    MANAGER: 'gerente',
    CASHIER: 'caixa',
    STOCKER: 'repositor',
    VIEWER: 'visualizador',
  };
  return mapping[desktopRole] || 'caixa';
}

// Converter unit do Desktop para Mobile
function mapDesktopUnitToMobile(desktopUnit: string): ProductUnit {
  const mapping: Record<string, ProductUnit> = {
    UNIT: 'UN',
    KILOGRAM: 'KG',
    GRAM: 'G',
    LITER: 'L',
    MILLILITER: 'ML',
    METER: 'M',
    CENTIMETER: 'CM',
    BOX: 'CX',
    PACK: 'PCT',
    DOZEN: 'DZ',
  };
  return mapping[desktopUnit] || 'UN';
}
```

---

_Matriz de compatibilidade atualizada em 9 de Janeiro de 2026_
