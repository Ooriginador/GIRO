# 🏢 Enterprise Almoxarifado Skill

> **Gestão de almoxarifado para empresas de engenharia/EPC**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
project: GIRO Enterprise (GIRO-E)
path: GIRO/apps/desktop/src/pages/enterprise/
backend: GIRO/apps/desktop/src-tauri/src/commands/enterprise/
database: GIRO/packages/database/prisma/ (enterprise models)
purpose: Warehouse management for construction/EPC companies
```

## 📋 Descrição

Esta skill fornece conhecimento especializado para módulos de gestão de almoxarifado em empresas de engenharia e construção, incluindo:

- Gestão de contratos e frentes de trabalho
- Requisições e transferências de materiais
- Inventário rotativo e rastreabilidade
- Múltiplos locais de estoque
- Integração com ERP (SAP, TOTVS)

## 🎯 Empresas-Alvo

| Empresa                | Setor            | Porte         |
| ---------------------- | ---------------- | ------------- |
| GTEL Engenharia        | Elétrica/Telecom | Grande        |
| Elecnor                | Energia          | Multinacional |
| Montcalm               | Construção       | Médio         |
| Construtoras regionais | Civil            | Pequeno/Médio |

## 📊 Entidades do Domínio

### Hierarquia de Localização

```
Empresa
└── Contrato (Obra)
    └── Frente de Trabalho
        └── Atividade
            └── Requisição de Material
```

### Entidades Principais

```prisma
// Contrato/Obra
model Contract {
  id            String   @id @default(cuid())
  code          String   @unique // Ex: "GTEL-2026-001"
  name          String
  clientName    String
  startDate     DateTime
  endDate       DateTime?
  status        ContractStatus @default(ACTIVE)
  budget        Decimal?

  workFronts    WorkFront[]
  locations     StockLocation[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Frente de Trabalho
model WorkFront {
  id            String   @id @default(cuid())
  code          String
  name          String
  contractId    String
  contract      Contract @relation(fields: [contractId], references: [id])
  responsibleId String?
  responsible   Employee? @relation(fields: [responsibleId], references: [id])

  activities    Activity[]
  requests      MaterialRequest[]

  @@unique([contractId, code])
}

// Requisição de Material
model MaterialRequest {
  id              String   @id @default(cuid())
  requestNumber   String   @unique
  workFrontId     String
  workFront       WorkFront @relation(fields: [workFrontId], references: [id])
  requesterId     String
  requester       Employee @relation(fields: [requesterId], references: [id])
  status          RequestStatus @default(PENDING)
  priority        Priority @default(NORMAL)
  requestDate     DateTime @default(now())
  neededByDate    DateTime?
  approvedById    String?
  approvedBy      Employee? @relation("ApprovedRequests", fields: [approvedById], references: [id])
  approvedAt      DateTime?

  items           MaterialRequestItem[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Transferência entre Locais
model StockTransfer {
  id              String   @id @default(cuid())
  transferNumber  String   @unique
  fromLocationId  String
  fromLocation    StockLocation @relation("TransfersFrom", fields: [fromLocationId], references: [id])
  toLocationId    String
  toLocation      StockLocation @relation("TransfersTo", fields: [toLocationId], references: [id])
  status          TransferStatus @default(PENDING)
  requestedById   String
  requestedBy     Employee @relation(fields: [requestedById], references: [id])

  items           StockTransferItem[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Enums

```prisma
enum ContractStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  COMPLETED
  CANCELLED
}

enum RequestStatus {
  PENDING      // Aguardando aprovação
  APPROVED     // Aprovada
  REJECTED     // Rejeitada
  PARTIAL      // Parcialmente atendida
  FULFILLED    // Totalmente atendida
  CANCELLED    // Cancelada
}

enum TransferStatus {
  PENDING      // Aguardando
  IN_TRANSIT   // Em trânsito
  RECEIVED     // Recebido
  CANCELLED    // Cancelado
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

## 🔄 Fluxos de Negócio

### 1. Requisição de Material

```
1. Encarregado cria requisição
2. Almoxarife recebe notificação
3. Verifica disponibilidade
4. Se disponível: Separa e entrega
5. Se não: Solicita compra ou transferência
6. Baixa no estoque (FIFO por lote)
7. Registra assinatura de recebimento
```

### 2. Transferência entre Obras

```
1. Origem solicita transferência
2. Destino confirma recebimento
3. Sistema atualiza saldos
4. Gera documentos de movimentação
```

### 3. Inventário Rotativo

```
1. Sistema sugere itens para contagem (ABC)
2. Almoxarife registra contagem
3. Sistema compara com saldo
4. Divergências geram ajustes
5. Aprovação de supervisor para ajustes
```

## 🔐 Roles e Permissões

| Role        | Permissões                                |
| ----------- | ----------------------------------------- |
| Almoxarife  | CRUD requisições, transferências, estoque |
| Encarregado | Criar requisições, visualizar estoque     |
| Supervisor  | Aprovar requisições, ajustes de estoque   |
| Gestor      | Relatórios, dashboards, configurações     |
| Admin       | Tudo + gestão de usuários                 |

## 📱 Integrações

### SAP MM

```typescript
interface SAPMaterialMasterSync {
  materialNumber: string;
  description: string;
  unit: string;
  materialGroup: string;
  purchasingGroup: string;
}

interface SAPGoodsMovement {
  movementType: '101' | '201' | '301' | '311';
  materialNumber: string;
  quantity: number;
  plant: string;
  storageLocation: string;
  costCenter?: string;
}
```

## ✅ Checklist Enterprise

- [ ] Multi-tenant por empresa/contrato
- [ ] Workflow de aprovações configurável
- [ ] Auditoria completa de movimentações
- [ ] Relatórios por centro de custo
- [ ] Integração com ERP
- [ ] Sync offline para campo
- [ ] QR Code para rastreabilidade

## 🔗 Recursos

- [docs/05-ENTERPRISE-MODULE.md](../../GIRO/docs/05-ENTERPRISE-MODULE.md)
- [docs/enterprise/roadmaps/](../../GIRO/docs/enterprise/roadmaps/)
