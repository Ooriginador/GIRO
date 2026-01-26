# 🗄️ Database Roadmap - GIRO Enterprise

> **Agente:** 01-database  
> **Status:** 🟢 DONE  
> **Progresso:** 18/18 (100%)  
> **Bloqueador:** Nenhum  
> **Última Atualização:** 26 de Janeiro de 2026

---

## 📋 Objetivo

Criar todas as entidades de banco de dados necessárias para o módulo Enterprise, incluindo:

- Entidades de estrutura organizacional (Contratos, Frentes, Atividades)
- Entidades de estoque multi-localização
- Entidades de workflow (Requisições, Transferências)
- Entidades de apropriação de custos

---

## ✅ Checklist de Tasks

### Fase 1: Enums (7 tasks)

- [x] **DB-001**: Adicionar `ENTERPRISE` ao enum `BusinessType`
  - Arquivo: `packages/database/prisma/schema.prisma`
  - Linha: ~622 (após GENERAL)
- [x] **DB-002**: Criar enum `ContractStatus`

  ```prisma
  enum ContractStatus {
    PLANNING    // Em planejamento
    ACTIVE      // Em execução
    SUSPENDED   // Suspenso
    COMPLETED   // Concluído
    CANCELLED   // Cancelado
  }
  ```

- [x] **DB-003**: Criar enum `WorkFrontStatus`

  ```prisma
  enum WorkFrontStatus {
    ACTIVE      // Em operação
    SUSPENDED   // Paralisada
    COMPLETED   // Concluída
  }
  ```

- [x] **DB-004**: Criar enum `ActivityStatus`

  ```prisma
  enum ActivityStatus {
    PENDING     // Não iniciada
    IN_PROGRESS // Em andamento
    COMPLETED   // Concluída
    CANCELLED   // Cancelada
  }
  ```

- [x] **DB-005**: Criar enum `StockLocationType`

  ```prisma
  enum StockLocationType {
    CENTRAL     // Almoxarifado central
    OBRA        // Almoxarifado de obra
    FRENTE      // Almoxarifado de frente
    CONTAINER   // Container/Módulo
    TERCEIRO    // Em poder de terceiros
  }
  ```

- [x] **DB-006**: Criar enum `MaterialRequestStatus`

  ```prisma
  enum MaterialRequestStatus {
    DRAFT       // Rascunho
    PENDING     // Aguardando aprovação
    APPROVED    // Aprovada
    PARTIALLY_APPROVED // Aprovada parcialmente
    REJECTED    // Rejeitada
    SEPARATING  // Em separação
    DELIVERED   // Entregue
    CANCELLED   // Cancelada
  }
  ```

- [x] **DB-007**: Criar enum `RequestPriority`

  ```prisma
  enum RequestPriority {
    LOW         // Baixa
    NORMAL      // Normal
    HIGH        // Alta
    URGENT      // Urgente
  }
  ```

- [x] **DB-008**: Criar enum `TransferStatus`
  ```prisma
  enum TransferStatus {
    PENDING     // Aguardando aprovação
    APPROVED    // Aprovada
    REJECTED    // Rejeitada
    IN_TRANSIT  // Em trânsito
    COMPLETED   // Concluída
    CANCELLED   // Cancelada
  }
  ```

### Fase 2: Entidades de Estrutura (4 tasks)

- [x] **DB-009**: Criar model `Contract`

  ```prisma
  /// Contratos/Obras
  model Contract {
    id           String         @id @default(cuid())
    code         String         @unique // CTR-2026-001
    name         String
    description  String?

    // Cliente
    clientName   String
    clientCNPJ   String?

    // Período
    startDate    DateTime
    endDate      DateTime?

    // Financeiro
    budget       Decimal?
    costCenter   String         // Centro de custo principal

    // Status
    status       ContractStatus @default(PLANNING)

    // Localização
    address      String?
    city         String?
    state        String?

    // Gerente responsável
    managerId    String
    manager      Employee       @relation("ContractManager", fields: [managerId], references: [id])

    // Relações
    workFronts   WorkFront[]
    locations    StockLocation[]
    requests     MaterialRequest[]

    // Timestamps
    createdAt    DateTime       @default(now())
    updatedAt    DateTime       @updatedAt
    deletedAt    DateTime?

    @@index([code])
    @@index([status])
    @@index([managerId])
    @@index([deletedAt])
  }
  ```

- [x] **DB-010**: Criar model `WorkFront`

  ```prisma
  /// Frentes de Trabalho
  model WorkFront {
    id           String          @id @default(cuid())
    code         String          // FT-001
    name         String
    description  String?

    // Contrato
    contractId   String
    contract     Contract        @relation(fields: [contractId], references: [id])

    // Supervisor
    supervisorId String
    supervisor   Employee        @relation("WorkFrontSupervisor", fields: [supervisorId], references: [id])

    // Status
    status       WorkFrontStatus @default(ACTIVE)

    // Relações
    activities   Activity[]
    requests     MaterialRequest[]

    // Timestamps
    createdAt    DateTime        @default(now())
    updatedAt    DateTime        @updatedAt
    deletedAt    DateTime?

    @@unique([contractId, code])
    @@index([contractId])
    @@index([supervisorId])
    @@index([status])
    @@index([deletedAt])
  }
  ```

- [x] **DB-011**: Criar model `Activity`

  ```prisma
  /// Atividades de Obra
  model Activity {
    id            String         @id @default(cuid())
    code          String         // ATV-001
    name          String
    description   String?

    // Frente
    workFrontId   String
    workFront     WorkFront      @relation(fields: [workFrontId], references: [id])

    // Medição
    unit          String         @default("UN") // M, M2, M3, UN, etc.
    plannedQty    Decimal        @default(0)
    executedQty   Decimal        @default(0)

    // Status
    status        ActivityStatus @default(PENDING)

    // Período
    startDate     DateTime?
    endDate       DateTime?

    // Relações
    requests      MaterialRequest[]
    consumptions  MaterialConsumption[]

    // Timestamps
    createdAt     DateTime       @default(now())
    updatedAt     DateTime       @updatedAt
    deletedAt     DateTime?

    @@unique([workFrontId, code])
    @@index([workFrontId])
    @@index([status])
    @@index([deletedAt])
  }
  ```

### Fase 3: Entidades de Estoque Multi-Local (2 tasks)

- [x] **DB-012**: Criar model `StockLocation`

  ```prisma
  /// Locais de Estoque
  model StockLocation {
    id           String            @id @default(cuid())
    code         String            @unique // ALM-CENTRAL, ALM-OBR-001
    name         String
    description  String?

    // Tipo
    type         StockLocationType @default(CENTRAL)

    // Vínculo com contrato (para tipo OBRA/FRENTE)
    contractId   String?
    contract     Contract?         @relation(fields: [contractId], references: [id])

    // Responsável
    managerId    String
    manager      Employee          @relation("LocationManager", fields: [managerId], references: [id])

    // Localização física
    address      String?

    // Status
    isActive     Boolean           @default(true)

    // Relações
    balances           StockBalance[]
    requestsTo         MaterialRequest[]    @relation("RequestDestination")
    transfersFrom      StockTransfer[]      @relation("TransferOrigin")
    transfersTo        StockTransfer[]      @relation("TransferDestination")
    consumptions       MaterialConsumption[]

    // Timestamps
    createdAt    DateTime          @default(now())
    updatedAt    DateTime          @updatedAt
    deletedAt    DateTime?

    @@index([code])
    @@index([type])
    @@index([contractId])
    @@index([managerId])
    @@index([isActive])
    @@index([deletedAt])
  }
  ```

- [x] **DB-013**: Criar model `StockBalance`

  ```prisma
  /// Saldo de Estoque por Local
  model StockBalance {
    id           String        @id @default(cuid())

    // Produto
    productId    String
    product      Product       @relation(fields: [productId], references: [id])

    // Local
    locationId   String
    location     StockLocation @relation(fields: [locationId], references: [id])

    // Quantidades
    quantity     Decimal       @default(0) // Saldo atual
    reservedQty  Decimal       @default(0) // Reservado para requisições
    availableQty Decimal       @default(0) // Disponível = quantity - reservedQty

    // Parâmetros
    minStock     Decimal       @default(0)
    maxStock     Decimal?

    // Timestamps
    createdAt    DateTime      @default(now())
    updatedAt    DateTime      @updatedAt

    @@unique([productId, locationId])
    @@index([productId])
    @@index([locationId])
    @@index([quantity])
  }
  ```

### Fase 4: Entidades de Requisição (2 tasks)

- [x] **DB-014**: Criar model `MaterialRequest`

  ```prisma
  /// Requisições de Material
  model MaterialRequest {
    id              String                @id @default(cuid())
    requestNumber   Int                   // Sequencial por contrato
    requestDate     DateTime              @default(now())

    // Solicitante
    requesterId     String
    requester       Employee              @relation("RequestRequester", fields: [requesterId], references: [id])

    // Destino
    contractId      String
    contract        Contract              @relation(fields: [contractId], references: [id])
    workFrontId     String?
    workFront       WorkFront?            @relation(fields: [workFrontId], references: [id])
    activityId      String?
    activity        Activity?             @relation(fields: [activityId], references: [id])
    destinationId   String
    destination     StockLocation         @relation("RequestDestination", fields: [destinationId], references: [id])

    // Status
    status          MaterialRequestStatus @default(DRAFT)
    priority        RequestPriority       @default(NORMAL)

    // Aprovação
    approvedById    String?
    approvedBy      Employee?             @relation("RequestApprover", fields: [approvedById], references: [id])
    approvedAt      DateTime?
    rejectionReason String?

    // Entrega
    deliveredById   String?
    deliveredBy     Employee?             @relation("RequestDeliverer", fields: [deliveredById], references: [id])
    deliveredAt     DateTime?

    // Observações
    notes           String?
    internalNotes   String?

    // Itens
    items           MaterialRequestItem[]

    // Timestamps
    createdAt       DateTime              @default(now())
    updatedAt       DateTime              @updatedAt
    deletedAt       DateTime?

    @@index([requestNumber])
    @@index([requesterId])
    @@index([contractId])
    @@index([workFrontId])
    @@index([destinationId])
    @@index([status])
    @@index([priority])
    @@index([createdAt])
    @@index([deletedAt])
  }
  ```

- [x] **DB-015**: Criar model `MaterialRequestItem`

  ```prisma
  /// Itens de Requisição
  model MaterialRequestItem {
    id            String          @id @default(cuid())

    // Requisição
    requestId     String
    request       MaterialRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

    // Produto
    productId     String
    product       Product         @relation(fields: [productId], references: [id])

    // Quantidades
    requestedQty  Decimal         // Quantidade solicitada
    approvedQty   Decimal?        // Quantidade aprovada (pode ser menor)
    deliveredQty  Decimal         @default(0) // Quantidade entregue

    // Unidade
    unit          String          @default("UN")

    // Observações
    notes         String?

    // Timestamps
    createdAt     DateTime        @default(now())
    updatedAt     DateTime        @updatedAt

    @@index([requestId])
    @@index([productId])
  }
  ```

### Fase 5: Entidades de Transferência (2 tasks)

- [x] **DB-016**: Criar model `StockTransfer`

  ```prisma
  /// Transferências de Estoque
  model StockTransfer {
    id              String         @id @default(cuid())
    transferNumber  Int            // Sequencial

    // Origem e Destino
    fromLocationId  String
    fromLocation    StockLocation  @relation("TransferOrigin", fields: [fromLocationId], references: [id])
    toLocationId    String
    toLocation      StockLocation  @relation("TransferDestination", fields: [toLocationId], references: [id])

    // Solicitante
    requesterId     String
    requester       Employee       @relation("TransferRequester", fields: [requesterId], references: [id])

    // Status
    status          TransferStatus @default(PENDING)

    // Aprovação
    approvedById    String?
    approvedBy      Employee?      @relation("TransferApprover", fields: [approvedById], references: [id])
    approvedAt      DateTime?
    rejectionReason String?

    // Expedição
    shippedById     String?
    shippedBy       Employee?      @relation("TransferShipper", fields: [shippedById], references: [id])
    shippedAt       DateTime?

    // Recebimento
    receivedById    String?
    receivedBy      Employee?      @relation("TransferReceiver", fields: [receivedById], references: [id])
    receivedAt      DateTime?

    // Observações
    notes           String?

    // Itens
    items           StockTransferItem[]

    // Timestamps
    createdAt       DateTime       @default(now())
    updatedAt       DateTime       @updatedAt
    deletedAt       DateTime?

    @@index([transferNumber])
    @@index([fromLocationId])
    @@index([toLocationId])
    @@index([requesterId])
    @@index([status])
    @@index([createdAt])
    @@index([deletedAt])
  }
  ```

- [x] **DB-017**: Criar model `StockTransferItem`

  ```prisma
  /// Itens de Transferência
  model StockTransferItem {
    id            String        @id @default(cuid())

    // Transferência
    transferId    String
    transfer      StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)

    // Produto
    productId     String
    product       Product       @relation(fields: [productId], references: [id])

    // Quantidade
    quantity      Decimal

    // Lote (opcional)
    lotId         String?
    lot           ProductLot?   @relation(fields: [lotId], references: [id])

    // Timestamps
    createdAt     DateTime      @default(now())

    @@index([transferId])
    @@index([productId])
    @@index([lotId])
  }
  ```

### Fase 6: Entidade de Apropriação (1 task)

- [x] **DB-018**: Criar model `MaterialConsumption`

  ```prisma
  /// Apropriação de Consumo de Material
  model MaterialConsumption {
    id           String        @id @default(cuid())

    // Produto
    productId    String
    product      Product       @relation(fields: [productId], references: [id])

    // Atividade
    activityId   String
    activity     Activity      @relation(fields: [activityId], references: [id])

    // Local de origem
    locationId   String
    location     StockLocation @relation(fields: [locationId], references: [id])

    // Quantidade e Custo
    quantity     Decimal
    unitCost     Decimal       // Custo médio no momento
    totalCost    Decimal       // quantity * unitCost

    // Centro de Custo
    costCenter   String

    // Quem consumiu
    consumedById String
    consumedBy   Employee      @relation("ConsumptionEmployee", fields: [consumedById], references: [id])
    consumedAt   DateTime      @default(now())

    // Referência (requisição que originou)
    requestItemId String?

    // Timestamps
    createdAt    DateTime      @default(now())

    @@index([productId])
    @@index([activityId])
    @@index([locationId])
    @@index([costCenter])
    @@index([consumedAt])
  }
  ```

---

## 🔗 Relacionamentos com Entidades Existentes

### Alterações em `Employee`

Adicionar relações:

```prisma
model Employee {
  // ... campos existentes ...

  // Enterprise Relations
  managedContracts      Contract[]           @relation("ContractManager")
  supervisedWorkFronts  WorkFront[]          @relation("WorkFrontSupervisor")
  managedLocations      StockLocation[]      @relation("LocationManager")

  requestsCreated       MaterialRequest[]    @relation("RequestRequester")
  requestsApproved      MaterialRequest[]    @relation("RequestApprover")
  requestsDelivered     MaterialRequest[]    @relation("RequestDeliverer")

  transfersRequested    StockTransfer[]      @relation("TransferRequester")
  transfersApproved     StockTransfer[]      @relation("TransferApprover")
  transfersShipped      StockTransfer[]      @relation("TransferShipper")
  transfersReceived     StockTransfer[]      @relation("TransferReceiver")

  materialConsumptions  MaterialConsumption[] @relation("ConsumptionEmployee")
}
```

### Alterações em `Product`

Adicionar relações:

```prisma
model Product {
  // ... campos existentes ...

  // Enterprise Relations
  stockBalances         StockBalance[]
  requestItems          MaterialRequestItem[]
  transferItems         StockTransferItem[]
  consumptions          MaterialConsumption[]
}
```

### Alterações em `ProductLot`

Adicionar relação:

```prisma
model ProductLot {
  // ... campos existentes ...

  // Enterprise Relations
  transferItems         StockTransferItem[]
}
```

---

## 📊 Índices de Performance

```sql
-- Índices compostos para queries frequentes
CREATE INDEX idx_request_contract_status ON material_requests(contract_id, status);
CREATE INDEX idx_balance_location_product ON stock_balances(location_id, product_id);
CREATE INDEX idx_consumption_activity_date ON material_consumptions(activity_id, consumed_at);
CREATE INDEX idx_transfer_status_date ON stock_transfers(status, created_at);
```

---

## 🔄 Ordem de Execução

1. ✅ Adicionar enums (DB-001 a DB-008)
2. ✅ Criar Contract e WorkFront (DB-009, DB-010)
3. ✅ Criar Activity (DB-011)
4. ✅ Criar StockLocation e StockBalance (DB-012, DB-013)
5. ✅ Criar MaterialRequest e Items (DB-014, DB-015)
6. ✅ Criar StockTransfer e Items (DB-016, DB-017)
7. ✅ Criar MaterialConsumption (DB-018)
8. ✅ Atualizar relações em Employee, Product, ProductLot
9. ✅ Rodar `prisma migrate dev --name enterprise_module`
10. ✅ Gerar tipos TypeScript

---

## 🧪 Validação

Após implementação, verificar:

- [x] `prisma validate` passa sem erros
- [x] `prisma generate` gera tipos corretamente
- [x] Migration aplicada com sucesso
- [ ] Queries básicas funcionando via SQLx

---

<!-- Roadmap concluído em: 26 de Janeiro de 2026 -->

---

<!-- Roadmap criado em: 25 de Janeiro de 2026 -->
