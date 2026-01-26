// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE PERFIS DE NEGÓCIO - GIRO Multi-Segmento
// ═══════════════════════════════════════════════════════════════════════════
// Permite que o mesmo sistema atenda diferentes tipos de negócio:
// - GROCERY: Mercearias, mercadinhos, padarias
// - MOTOPARTS: Motopeças, oficinas mecânicas
// - ENTERPRISE: Almoxarifado industrial, obras, EPC
// - GENERAL: Varejo genérico
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de negócio suportados pelo sistema
 */
export type BusinessType =
  | 'GROCERY' // Mercearia, mercadinho, padaria
  | 'MOTOPARTS' // Motopeças, autopeças, oficina mecânica
  | 'ENTERPRISE' // Almoxarifado industrial, obras, EPC
  | 'GENERAL'; // Varejo genérico

/**
 * Features que podem ser habilitadas/desabilitadas por perfil
 */
export interface BusinessFeatures {
  // ══════════════════════════════════════════════════════════════════════════
  // Core Features (sempre habilitadas)
  // ══════════════════════════════════════════════════════════════════════════
  pdv: boolean;
  inventory: true;
  employees: true;
  cashControl: boolean;
  reports: true;
  backup: true;

  // ══════════════════════════════════════════════════════════════════════════
  // Features Específicas por Perfil
  // ══════════════════════════════════════════════════════════════════════════

  // Mercearia/Grocery
  expirationControl: boolean; // Controle de validade (FIFO)
  weightedProducts: boolean; // Produtos pesáveis (balança)
  lotTracking: boolean; // Rastreamento de lotes

  // Motopeças/Oficina
  vehicleCompatibility: boolean; // Compatibilidade peça ↔ veículo
  serviceOrders: boolean; // Ordens de serviço (mecânica)
  warranties: boolean; // Controle de garantias
  customerVehicles: boolean; // Veículos do cliente
  vehicleHistory: boolean; // Histórico por veículo

  // Enterprise/Almoxarifado Industrial
  enterprise: boolean; // Módulo Enterprise ativo
  contracts: boolean; // Gestão de contratos/obras
  workFronts: boolean; // Frentes de trabalho
  materialRequests: boolean; // Requisições de material
  stockTransfers: boolean; // Transferências entre locais
  multiLocation: boolean; // Múltiplos almoxarifados
  costAppropriation: boolean; // Apropriação de custos
}

/**
 * Labels customizáveis por tipo de negócio
 */
export interface BusinessLabels {
  // Entidades principais
  product: string; // "Produto" | "Peça" | "Item"
  products: string; // "Produtos" | "Peças" | "Itens"
  customer: string; // "Cliente" | "Tutor"
  customers: string; // "Clientes" | "Tutores"
  sale: string; // "Venda" | "Atendimento"
  sales: string; // "Vendas" | "Atendimentos"

  // Ações
  addProduct: string; // "Adicionar Produto" | "Adicionar Peça"
  newSale: string; // "Nova Venda" | "Novo Atendimento"

  // Campos específicos
  barcode: string; // "Código de Barras" | "Código"
  category: string; // "Categoria" | "Grupo"
}

/**
 * Categorias padrão para cada tipo de negócio
 */
export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
}

/**
 * Configuração completa de um perfil de negócio
 */
export interface BusinessProfile {
  type: BusinessType;
  name: string;
  description: string;
  icon: string;
  features: BusinessFeatures;
  labels: BusinessLabels;
  defaultCategories: DefaultCategory[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFIS PRÉ-DEFINIDOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Perfil: Mercearia / Mercadinho / Padaria
 */
export const GROCERY_PROFILE: BusinessProfile = {
  type: 'GROCERY',
  name: 'Mercearia',
  description: 'Mercadinhos, padarias, conveniências e minimercados',
  icon: 'ShoppingCart',
  features: {
    // Core (sempre ativo)
    pdv: true,
    inventory: true,
    employees: true,
    cashControl: true,
    reports: true,
    backup: true,
    // Específicas - Habilitadas
    expirationControl: true,
    weightedProducts: true,
    lotTracking: true,
    // Específicas - Desabilitadas
    vehicleCompatibility: false,
    serviceOrders: false,
    warranties: false,
    customerVehicles: false,
    vehicleHistory: false,
    // Enterprise - Desabilitadas
    enterprise: false,
    contracts: false,
    workFronts: false,
    materialRequests: false,
    stockTransfers: false,
    multiLocation: false,
    costAppropriation: false,
  },
  labels: {
    product: 'Produto',
    products: 'Produtos',
    customer: 'Cliente',
    customers: 'Clientes',
    sale: 'Venda',
    sales: 'Vendas',
    addProduct: 'Adicionar Produto',
    newSale: 'Nova Venda',
    barcode: 'Código de Barras',
    category: 'Categoria',
  },
  defaultCategories: [
    { name: 'Bebidas', icon: 'GlassWater', color: '#3B82F6' },
    { name: 'Laticínios', icon: 'Milk', color: '#F59E0B' },
    { name: 'Carnes', icon: 'Beef', color: '#EF4444' },
    { name: 'Hortifrúti', icon: 'Apple', color: '#22C55E' },
    { name: 'Padaria', icon: 'Croissant', color: '#D97706' },
    { name: 'Frios', icon: 'Snowflake', color: '#06B6D4' },
    { name: 'Mercearia', icon: 'Package', color: '#8B5CF6' },
    { name: 'Limpeza', icon: 'Sparkles', color: '#EC4899' },
    { name: 'Higiene', icon: 'Bath', color: '#14B8A6' },
    { name: 'Outros', icon: 'MoreHorizontal', color: '#6B7280' },
  ],
};

/**
 * Perfil: Motopeças / Oficina Mecânica
 */
export const MOTOPARTS_PROFILE: BusinessProfile = {
  type: 'MOTOPARTS',
  name: 'Motopeças',
  description: 'Lojas de peças, oficinas mecânicas de motos e autos',
  icon: 'Bike',
  features: {
    // Core (sempre ativo)
    pdv: true,
    inventory: true,
    employees: true,
    cashControl: true,
    reports: true,
    backup: true,
    // Específicas - Habilitadas
    vehicleCompatibility: true,
    serviceOrders: true,
    warranties: true,
    customerVehicles: true,
    vehicleHistory: true,
    // Específicas - Desabilitadas
    expirationControl: false,
    weightedProducts: false,
    lotTracking: false,
    // Enterprise - Desabilitadas
    enterprise: false,
    contracts: false,
    workFronts: false,
    materialRequests: false,
    stockTransfers: false,
    multiLocation: false,
    costAppropriation: false,
  },
  labels: {
    product: 'Peça',
    products: 'Peças',
    customer: 'Cliente',
    customers: 'Clientes',
    sale: 'Venda',
    sales: 'Vendas',
    addProduct: 'Adicionar Peça',
    newSale: 'Nova Venda',
    barcode: 'Código',
    category: 'Categoria',
  },
  defaultCategories: [
    { name: 'Motor', icon: 'Cog', color: '#6B7280' },
    { name: 'Suspensão', icon: 'ArrowUpDown', color: '#3B82F6' },
    { name: 'Freios', icon: 'CircleSlash', color: '#EF4444' },
    { name: 'Elétrica', icon: 'Zap', color: '#F59E0B' },
    { name: 'Transmissão', icon: 'Link', color: '#8B5CF6' },
    { name: 'Carenagem', icon: 'Shield', color: '#06B6D4' },
    { name: 'Escapamento', icon: 'Wind', color: '#6366F1' },
    { name: 'Lubrificação', icon: 'Droplet', color: '#22C55E' },
    { name: 'Pneus e Rodas', icon: 'Circle', color: '#1F2937' },
    { name: 'Acessórios', icon: 'Star', color: '#EC4899' },
  ],
};

/**
 * Perfil: Varejo Genérico
 */
export const GENERAL_PROFILE: BusinessProfile = {
  type: 'GENERAL',
  name: 'Varejo Geral',
  description: 'Loja genérica com todas as funcionalidades disponíveis',
  icon: 'Store',
  features: {
    // Core (sempre ativo)
    pdv: true,
    inventory: true,
    employees: true,
    cashControl: true,
    reports: true,
    backup: true,
    // Todas específicas habilitadas
    expirationControl: true,
    weightedProducts: true,
    lotTracking: true,
    vehicleCompatibility: true,
    serviceOrders: true,
    warranties: true,
    customerVehicles: true,
    vehicleHistory: true,
    // Enterprise - Desabilitadas
    enterprise: false,
    contracts: false,
    workFronts: false,
    materialRequests: false,
    stockTransfers: false,
    multiLocation: false,
    costAppropriation: false,
  },
  labels: {
    product: 'Produto',
    products: 'Produtos',
    customer: 'Cliente',
    customers: 'Clientes',
    sale: 'Venda',
    sales: 'Vendas',
    addProduct: 'Adicionar Produto',
    newSale: 'Nova Venda',
    barcode: 'Código de Barras',
    category: 'Categoria',
  },
  defaultCategories: [
    { name: 'Geral', icon: 'Package', color: '#6B7280' },
    { name: 'Diversos', icon: 'MoreHorizontal', color: '#3B82F6' },
  ],
};

/**
 * Perfil: Enterprise / Almoxarifado Industrial
 */
export const ENTERPRISE_PROFILE: BusinessProfile = {
  type: 'ENTERPRISE',
  name: 'Enterprise',
  description: 'Almoxarifado industrial, obras de engenharia, EPC',
  icon: 'HardHat',
  features: {
    // Core
    pdv: false, // Sem PDV - requisições internas
    inventory: true,
    employees: true,
    cashControl: false, // Sem caixa
    reports: true,
    backup: true,
    // Grocery - Desabilitadas
    expirationControl: false,
    weightedProducts: false,
    lotTracking: true, // Lotes são importantes
    // Motopeças - Desabilitadas
    vehicleCompatibility: false,
    serviceOrders: false,
    warranties: false,
    customerVehicles: false,
    vehicleHistory: false,
    // Enterprise - Habilitadas
    enterprise: true,
    contracts: true,
    workFronts: true,
    materialRequests: true,
    stockTransfers: true,
    multiLocation: true,
    costAppropriation: true,
  },
  labels: {
    product: 'Material',
    products: 'Materiais',
    customer: 'Colaborador',
    customers: 'Colaboradores',
    sale: 'Requisição',
    sales: 'Requisições',
    addProduct: 'Adicionar Material',
    newSale: 'Nova Requisição',
    barcode: 'Código',
    category: 'Classe',
  },
  defaultCategories: [
    { name: 'Elétricos', icon: 'Zap', color: '#F59E0B' },
    { name: 'Hidráulicos', icon: 'Droplet', color: '#3B82F6' },
    { name: 'Mecânicos', icon: 'Cog', color: '#6B7280' },
    { name: 'Civil', icon: 'Building2', color: '#8B5CF6' },
    { name: 'Instrumentação', icon: 'Gauge', color: '#06B6D4' },
    { name: 'Estruturas', icon: 'Layers', color: '#EF4444' },
    { name: 'Pintura', icon: 'Paintbrush', color: '#EC4899' },
    { name: 'EPI/EPC', icon: 'Shield', color: '#22C55E' },
    { name: 'Ferramentas', icon: 'Wrench', color: '#D97706' },
    { name: 'Consumíveis', icon: 'Package', color: '#14B8A6' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPA DE PERFIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapa de todos os perfis disponíveis
 */
export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
  GROCERY: GROCERY_PROFILE,
  MOTOPARTS: MOTOPARTS_PROFILE,
  ENTERPRISE: ENTERPRISE_PROFILE,
  GENERAL: GENERAL_PROFILE,
};

/**
 * Lista de perfis para exibição no wizard
 */
export const AVAILABLE_PROFILES: BusinessProfile[] = [
  GROCERY_PROFILE,
  MOTOPARTS_PROFILE,
  ENTERPRISE_PROFILE,
];

/**
 * Perfil padrão
 */
export const DEFAULT_BUSINESS_TYPE: BusinessType = 'GROCERY';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retorna o perfil de negócio baseado no tipo
 */
export function getBusinessProfile(type: BusinessType): BusinessProfile {
  return BUSINESS_PROFILES[type] || BUSINESS_PROFILES[DEFAULT_BUSINESS_TYPE];
}

/**
 * Verifica se uma feature está habilitada no perfil
 */
export function isFeatureEnabled(
  profile: BusinessProfile,
  feature: keyof BusinessFeatures
): boolean {
  return profile.features[feature] === true;
}

/**
 * Retorna o label customizado para uma entidade
 */
export function getLabel(profile: BusinessProfile, key: keyof BusinessLabels): string {
  return profile.labels[key];
}

/**
 * Tipo para feature keys (para uso em componentes)
 */
export type FeatureKey = keyof BusinessFeatures;
