// ═══════════════════════════════════════════════════════════════════════════
// GIRO ENTERPRISE - TIPOS TYPESCRIPT
// Módulo de Almoxarifado Industrial
// ═══════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────────────────────────────────────

/** Status de um Contrato/Obra */
export type ContractStatus =
  | 'PLANNING' // Em planejamento
  | 'ACTIVE' // Em execução
  | 'SUSPENDED' // Suspenso
  | 'COMPLETED' // Concluído
  | 'CANCELLED'; // Cancelado

/** Status de uma Frente de Trabalho */
export type WorkFrontStatus =
  | 'ACTIVE' // Em operação
  | 'SUSPENDED' // Paralisada
  | 'COMPLETED'; // Concluída

/** Status de uma Atividade */
export type ActivityStatus =
  | 'PENDING' // Não iniciada
  | 'IN_PROGRESS' // Em andamento
  | 'COMPLETED' // Concluída
  | 'CANCELLED'; // Cancelada

/** Tipo de Local de Estoque */
export type StockLocationType =
  | 'CENTRAL' // Almoxarifado central
  | 'OBRA' // Almoxarifado de obra
  | 'FRENTE' // Almoxarifado de frente
  | 'CONTAINER' // Container/Módulo
  | 'TERCEIRO'; // Em poder de terceiros

/** Status de Requisição de Material */
export type MaterialRequestStatus =
  | 'DRAFT' // Rascunho
  | 'PENDING' // Aguardando aprovação
  | 'APPROVED' // Aprovada
  | 'PARTIALLY_APPROVED' // Aprovada parcialmente
  | 'REJECTED' // Rejeitada
  | 'SEPARATING' // Em separação
  | 'DELIVERED' // Entregue
  | 'CANCELLED'; // Cancelada

/** Prioridade de Requisição */
export type RequestPriority =
  | 'LOW' // Baixa
  | 'NORMAL' // Normal
  | 'HIGH' // Alta
  | 'URGENT'; // Urgente

/** Prioridade de Transferência (alias de RequestPriority) */
export type TransferPriority = RequestPriority;

/** Status de Transferência */
export type TransferStatus =
  | 'DRAFT' // Rascunho
  | 'PENDING' // Aguardando aprovação
  | 'APPROVED' // Aprovada
  | 'REJECTED' // Rejeitada
  | 'IN_TRANSIT' // Em trânsito
  | 'COMPLETED' // Concluída
  | 'RECEIVED' // Recebida (alias para COMPLETED)
  | 'CANCELLED'; // Cancelada

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES - ESTRUTURA ORGANIZACIONAL
// ────────────────────────────────────────────────────────────────────────────

/** Contrato/Obra */
export interface Contract {
  id: string;
  code: string; // CTR-2026-001
  name: string;
  description?: string | null;

  // Cliente
  clientName: string;
  clientCNPJ?: string | null;

  // Período
  startDate: string; // ISO date
  endDate?: string | null;

  // Financeiro
  budget?: number | null;
  costCenter: string;

  // Status
  status: ContractStatus;

  // Localização
  address?: string | null;
  city?: string | null;
  state?: string | null;

  // Gerente responsável
  managerId: string;
  manager?: Employee;

  // Contagens (para listagem)
  _count?: {
    workFronts: number;
    locations: number;
    requests: number;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Frente de Trabalho */
export interface WorkFront {
  id: string;
  code: string; // FT-001
  name: string;
  description?: string | null;

  // Contrato
  contractId: string;
  contract?: Contract;

  // Supervisor
  supervisorId: string;
  supervisor?: Employee;

  // Localização (opcional)
  locationId?: string | null;
  location?: string | null;

  // Período
  startDate?: string | null;
  expectedEndDate?: string | null;

  // Progresso
  progress?: number;

  // Observações
  notes?: string | null;

  // Status
  status: WorkFrontStatus;

  // Contagens
  _count?: {
    activities: number;
    requests: number;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Atividade de Obra */
export interface Activity {
  id: string;
  code: string; // ATV-001
  name: string;
  description?: string | null;

  // Frente de trabalho
  workFrontId: string;
  workFront?: WorkFront;

  // Período planejado
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;

  // Período real
  actualStartDate?: string | null;
  actualEndDate?: string | null;

  // Aliases para UI
  startDate?: string | null;
  endDate?: string | null;

  // Progresso (0-100)
  progress?: number;

  // Status
  status: ActivityStatus;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES - ESTOQUE MULTI-LOCALIZAÇÃO
// ────────────────────────────────────────────────────────────────────────────

/** Local de Estoque */
export interface StockLocation {
  id: string;
  code: string; // ALM-CENTRAL, ALM-OBRA-001
  name: string;
  description?: string | null;

  // Tipo
  type: StockLocationType;

  // Vínculo opcional com contrato
  contractId?: string | null;
  contract?: Contract;

  // Responsável
  managerId?: string | null;
  manager?: Employee;

  // Endereço
  address?: string | null;

  // Status
  isActive: boolean;

  // Contagens
  _count?: {
    balances: number;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Saldo de Estoque por Local */
export interface StockBalance {
  id: string;
  locationId: string;
  location?: StockLocation;
  productId: string;
  product?: Product;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  // UI extras
  minQuantity?: number | null;
  maxQuantity?: number | null;
  averageCost?: number | null;
  lastMovement?: string | null;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES - REQUISIÇÕES DE MATERIAL
// ────────────────────────────────────────────────────────────────────────────

/** Requisição de Material */
export interface MaterialRequest {
  id: string;
  code: string; // REQ-2026-00001

  // Destino
  contractId: string;
  contract?: Contract;
  workFrontId?: string | null;
  workFront?: WorkFront;
  activityId?: string | null;
  activity?: Activity;

  // Origem do material (opcional para draft)
  sourceLocationId?: string | null;
  sourceLocation?: StockLocation;

  // Solicitante
  requesterId: string;
  requester?: Employee;

  // Aprovador
  approverId?: string | null;
  approver?: Employee;

  // Entregador (almoxarife)
  delivererId?: string | null;
  deliverer?: Employee;

  // Status e prioridade
  status: MaterialRequestStatus;
  priority: RequestPriority;

  // Observações
  notes?: string | null;
  rejectionReason?: string | null;

  // Datas
  requestedAt?: string | null;
  neededByDate?: string | null;
  needDate?: string | null; // Alias
  approvedAt?: string | null;
  deliveredAt?: string | null;

  // Contagem de itens
  itemCount?: number;

  // Itens
  items?: MaterialRequestItem[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Item de Requisição */
export interface MaterialRequestItem {
  id: string;
  requestId: string;
  request?: MaterialRequest;
  productId: string;
  product?: Product;
  requestedQuantity: number;
  quantity?: number; // Alias para requestedQuantity
  approvedQuantity?: number | null;
  separatedQuantity?: number | null;
  deliveredQuantity?: number | null;
  unitOfMeasure?: string;
  notes?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES - TRANSFERÊNCIAS
// ────────────────────────────────────────────────────────────────────────────

/** Transferência de Estoque */
export interface StockTransfer {
  id: string;
  code: string; // TRF-2026-00001

  // Origem e destino
  sourceLocationId: string;
  sourceLocation?: StockLocation;
  originLocation?: StockLocation; // Alias para sourceLocation
  origin?: string; // Alias para UI
  destinationLocationId: string;
  destinationLocation?: StockLocation;
  destination?: string; // Alias para UI

  // Responsáveis
  requesterId: string;
  requester?: Employee;
  approverId?: string | null;
  approver?: Employee;
  shipperId?: string | null;
  shipper?: Employee;
  receiverId?: string | null;
  receiver?: Employee;

  // Status e prioridade
  status: TransferStatus;
  priority?: TransferPriority;

  // Observações
  notes?: string | null;
  rejectionReason?: string | null;

  // Datas
  requestedAt: string;
  approvedAt?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;

  // Itens
  items?: StockTransferItem[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Item de Transferência */
export interface StockTransferItem {
  id: string;
  transferId: string;
  transfer?: StockTransfer;
  productId: string;
  product?: Product;
  lotId?: string | null;
  quantity: number;
  receivedQuantity?: number | null;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES - APROPRIAÇÃO DE CUSTOS
// ────────────────────────────────────────────────────────────────────────────

/** Apropriação de Consumo de Material */
export interface MaterialConsumption {
  id: string;
  activityId: string;
  activity?: Activity;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  totalCost: number;
  consumedAt: string;
  employeeId: string;
  employee?: Employee;
  notes?: string | null;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES - DTOs E FORMS
// ────────────────────────────────────────────────────────────────────────────

/** DTO para criar contrato */
export interface CreateContractDTO {
  code: string;
  name: string;
  description?: string;
  clientName: string;
  clientCNPJ?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  costCenter: string;
  status?: ContractStatus;
  address?: string;
  city?: string;
  state?: string;
  managerId: string;
}

/** DTO para criar requisição */
export interface CreateMaterialRequestDTO {
  contractId: string;
  workFrontId?: string;
  activityId?: string;
  sourceLocationId: string;
  priority?: RequestPriority;
  neededByDate?: string;
  notes?: string;
  items: CreateRequestItemDTO[];
}

/** DTO para item de requisição */
export interface CreateRequestItemDTO {
  productId: string;
  requestedQuantity: number;
  notes?: string;
}

/** DTO para criar transferência */
export interface CreateTransferDTO {
  sourceLocationId: string;
  destinationLocationId: string;
  notes?: string;
  items: CreateTransferItemDTO[];
}

/** DTO para item de transferência */
export interface CreateTransferItemDTO {
  productId: string;
  lotId?: string;
  quantity: number;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES AUXILIARES (referência a tipos existentes)
// ────────────────────────────────────────────────────────────────────────────

/** Employee simplificado (já existe em types/index.ts) */
export interface Employee {
  id: string;
  name: string;
  email?: string | null;
  role: string;
}

/** Product simplificado (já existe em types/index.ts) */
export interface Product {
  id: string;
  name: string;
  internalCode?: string;
  code?: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// TIPOS DE DASHBOARD
// ────────────────────────────────────────────────────────────────────────────

/** KPIs do Dashboard Enterprise */
export interface EnterpriseKPIs {
  activeContracts: number;
  pendingRequests: number;
  inTransitTransfers: number;
  lowStockAlerts: number;
}

/** Tipo de atividade recente no dashboard */
export type RecentActivityType = 'request' | 'transfer' | 'inventory' | 'contract' | 'delivery';

/** Item de atividade recente para o dashboard */
export interface RecentActivityItem {
  id: string;
  type: RecentActivityType;
  title: string;
  description: string;
  timestamp: string;
  entityId: string;
  entityType: 'request' | 'transfer' | 'contract' | 'location';
  status?: string;
  userName?: string;
}

/** Consumo mensal para gráfico */
export interface MonthlyConsumptionItem {
  month: string;
  value: number;
  quantity: number;
}

/** Despesas por categoria para gráfico */
export interface ExpenseByCategoryItem {
  category: string;
  value: number;
  percentage: number;
}

export type ContractDashboardStats = {
  activeContracts: number;
  totalContracts: number;
  totalValue: number;
  expiringContracts: number;
  pendingRequests: number;
  inTransitTransfers: number;
  lowStockAlerts: number;
  recentActivity: RecentActivityItem[];
  monthlyConsumption: MonthlyConsumptionItem[];
  expensesByCategory: ExpenseByCategoryItem[];
};

export type EnterpriseMaterialRequest = MaterialRequest;

/** Atividade de Frente de Trabalho (resumo) */
export type WorkFrontActivity = Activity;

/** Requisição recente para widget */
export interface RecentRequest {
  id: string;
  code: string;
  status: MaterialRequestStatus;
  requesterName: string;
  contractName: string;
  createdAt: string;
}

/** Consumo por contrato para gráfico */
export interface ContractConsumption {
  contractId: string;
  contractName: string;
  totalValue: number;
  percentage: number;
}
