// ═══════════════════════════════════════════════════════════════════════════
// TIPOS ESPECÍFICOS PARA MOTOPEÇAS
// ═══════════════════════════════════════════════════════════════════════════
// Entidades relacionadas a veículos, compatibilidade de peças,
// ordens de serviço e garantias.
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleCategory =
  | 'STREET' // Rua (CG, Factor, Fazer)
  | 'SPORT' // Esportiva (CBR, Ninja)
  | 'TRAIL' // Trail (XRE, Lander)
  | 'OFFROAD' // Off-road (CRF, XTZ)
  | 'SCOOTER' // Scooter (PCX, Biz, Nmax)
  | 'CUSTOM' // Custom (Shadow, Boulevard)
  | 'TOURING' // Touring (Goldwing)
  | 'ADVENTURE' // Adventure (Africa Twin)
  | 'UTILITY'; // Utilitária (Cargo)

export type FuelType =
  | 'GASOLINE' // Gasolina
  | 'FLEX' // Flex
  | 'ELECTRIC' // Elétrica
  | 'DIESEL'; // Diesel

export type PartPosition =
  | 'FRONT' // Dianteiro
  | 'REAR' // Traseiro
  | 'LEFT' // Esquerdo
  | 'RIGHT' // Direito
  | 'BOTH'; // Ambos os lados

export type ServiceOrderStatus =
  | 'OPEN' // Aberta (aguardando)
  | 'IN_PROGRESS' // Em andamento
  | 'WAITING_PARTS' // Aguardando peças
  | 'COMPLETED' // Serviço concluído
  | 'DELIVERED' // Entregue ao cliente
  | 'CANCELED'; // Cancelada

export type ServiceItemType =
  | 'PART' // Peça
  | 'SERVICE'; // Serviço/Mão de obra

export type WarrantySourceType =
  | 'SALE' // Venda direta
  | 'SERVICE_ORDER'; // Ordem de serviço

export type WarrantyClaimStatus =
  | 'OPEN' // Aberta
  | 'IN_ANALYSIS' // Em análise
  | 'APPROVED' // Aprovada
  | 'DENIED' // Negada
  | 'RESOLVED'; // Resolvida

// ─────────────────────────────────────────────────────────────────────────────
// VEÍCULOS
// ─────────────────────────────────────────────────────────────────────────────

export interface VehicleBrand {
  id: string;
  fipeCode: string;
  name: string;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relações
  models?: VehicleModel[];
}

export interface VehicleModel {
  id: string;
  fipeCode: string;
  name: string;
  category: VehicleCategory;
  engineSize?: number | null;
  isActive: boolean;
  brandId: string;
  createdAt: string;
  updatedAt: string;

  // Relações
  brand?: VehicleBrand;
  years?: VehicleYear[];
}

export interface VehicleYear {
  id: string;
  year: number;
  yearLabel: string;
  fipeCode: string;
  fuelType: FuelType;
  modelId: string;
  createdAt: string;

  // Relações
  model?: VehicleModel;
}

/**
 * Veículo completo com todas as informações (marca + modelo + ano)
 * Útil para exibição e seleção
 */
export interface VehicleComplete {
  yearId: string;
  year: number;
  yearLabel: string;
  fuelType: FuelType;
  modelId: string;
  modelName: string;
  modelFipeCode: string;
  category: VehicleCategory;
  engineSize?: number | null;
  brandId: string;
  brandName: string;
  brandFipeCode: string;
  brandLogoUrl?: string | null;

  // Label formatado (ex: "Honda CG 160 Titan 2020")
  displayName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILIDADE DE PEÇAS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductCompatibility {
  id: string;
  productId: string;
  vehicleYearId: string;
  isVerified: boolean;
  verifiedById?: string | null;
  notes?: string | null;
  position?: PartPosition | null;
  createdAt: string;
  updatedAt: string;

  // Relações
  vehicleYear?: VehicleYear;
  // product?: Product; // Evita circular
}

/**
 * Compatibilidade expandida com informações do veículo
 */
export interface ProductCompatibilityExpanded extends ProductCompatibility {
  vehicle: VehicleComplete;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  // Endereço
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  // Status
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relações
  vehicles?: CustomerVehicle[];
}

export interface CustomerVehicle {
  id: string;
  customerId: string;
  vehicleYearId: string;
  plate?: string | null;
  chassis?: string | null;
  renavam?: string | null;
  color?: string | null;
  currentKm?: number | null;
  nickname?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relações
  customer?: Customer;
  vehicleYear?: VehicleYear;
}

/**
 * Veículo do cliente com informações completas
 */
export interface CustomerVehicleExpanded extends CustomerVehicle {
  vehicle: VehicleComplete;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDENS DE SERVIÇO
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  customerId: string;
  customerVehicleId: string;
  vehicleYearId: string;
  employeeId: string;
  vehicleKm?: number | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  status: ServiceOrderStatus;
  // Valores
  laborCost: number;
  partsCost: number;
  discount: number;
  total: number;
  // Garantia
  warrantyDays: number;
  warrantyUntil?: string | null;
  // Datas
  scheduledDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  // Pagamento
  paymentMethod?: string | null;
  isPaid: boolean;
  // Notas
  notes?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relações
  customer?: Customer;
  customerVehicle?: CustomerVehicle;
  items?: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  orderId: string;
  itemType: ServiceItemType;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  warrantyDays?: number | null;
  createdAt: string;

  // Relações
  order?: ServiceOrder;
  // product?: Product;
}

/**
 * OS com todas as informações expandidas
 */
export interface ServiceOrderExpanded extends ServiceOrder {
  customer: Customer;
  customerVehicle: CustomerVehicleExpanded;
  items: ServiceOrderItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVIÇOS PRÉ-CADASTRADOS
// ─────────────────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  defaultPrice: number;
  estimatedTime?: number | null; // minutos
  defaultWarrantyDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GARANTIAS
// ─────────────────────────────────────────────────────────────────────────────

export interface WarrantyClaim {
  id: string;
  sourceType: WarrantySourceType;
  saleItemId?: string | null;
  orderItemId?: string | null;
  customerId: string;
  productId?: string | null;
  description: string;
  reason: string;
  status: WarrantyClaimStatus;
  resolution?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  refundAmount?: number | null;
  replacementCost?: number | null;
  createdAt: string;
  updatedAt: string;

  // Relações
  customer?: Customer;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS (para criação/atualização)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  name: string;
  cpf?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface CreateCustomerVehicleInput {
  customerId: string;
  vehicleYearId: string;
  plate?: string;
  chassis?: string;
  renavam?: string;
  color?: string;
  currentKm?: number;
  nickname?: string;
  notes?: string;
}

export interface CreateServiceOrderInput {
  customerId: string;
  customerVehicleId: string;
  vehicleYearId: string;
  employeeId: string;
  vehicleKm?: number;
  symptoms?: string;
  scheduledDate?: string;
  notes?: string;
}

export interface AddServiceOrderItemInput {
  orderId: string;
  itemType: ServiceItemType;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  warrantyDays?: number;
}

export interface CreateProductCompatibilityInput {
  productId: string;
  vehicleYearId: string;
  notes?: string;
  position?: PartPosition;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formata nome completo do veículo
 */
export function formatVehicleName(brandName: string, modelName: string, year: number): string {
  return `${brandName} ${modelName} ${year}`;
}

/**
 * Retorna cor para status da OS
 */
export function getServiceOrderStatusColor(status: ServiceOrderStatus): string {
  const colors: Record<ServiceOrderStatus, string> = {
    OPEN: '#6B7280', // gray
    IN_PROGRESS: '#3B82F6', // blue
    WAITING_PARTS: '#F59E0B', // amber
    COMPLETED: '#22C55E', // green
    DELIVERED: '#8B5CF6', // purple
    CANCELED: '#EF4444', // red
  };
  return colors[status];
}

/**
 * Retorna label traduzido para status da OS
 */
export function getServiceOrderStatusLabel(status: ServiceOrderStatus): string {
  const labels: Record<ServiceOrderStatus, string> = {
    OPEN: 'Aberta',
    IN_PROGRESS: 'Em Andamento',
    WAITING_PARTS: 'Aguardando Peças',
    COMPLETED: 'Concluída',
    DELIVERED: 'Entregue',
    CANCELED: 'Cancelada',
  };
  return labels[status];
}

/**
 * Retorna label traduzido para categoria do veículo
 */
export function getVehicleCategoryLabel(category: VehicleCategory): string {
  const labels: Record<VehicleCategory, string> = {
    STREET: 'Rua',
    SPORT: 'Esportiva',
    TRAIL: 'Trail',
    OFFROAD: 'Off-Road',
    SCOOTER: 'Scooter',
    CUSTOM: 'Custom',
    TOURING: 'Touring',
    ADVENTURE: 'Adventure',
    UTILITY: 'Utilitária',
  };
  return labels[category];
}
