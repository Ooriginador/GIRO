/**
 * Componentes específicos para o módulo Motopeças
 *
 * Este módulo contém componentes React para:
 * - Seleção de veículos (cascata marca → modelo → ano)
 * - Busca de veículos por texto
 * - Gerenciamento de compatibilidade de peças
 * - Badges e visualizações de veículos
 * - Busca e gestão de clientes
 */

export {
  VehicleBadge,
  VehicleSearch,
  VehicleSelector,
  VehicleYearRangeSelector,
} from './VehicleSelector';

export { CompatibilityQuickView, ProductCompatibilityEditor } from './ProductCompatibilityEditor';

export { CustomerCard, CustomerCreateDialog, CustomerSearch } from './CustomerSearch';

export {
  ServiceOrderList,
  ServiceOrderQuickStats,
  ServiceOrderStatusBadge,
} from './ServiceOrderList';

export { ServiceOrderDetails } from './ServiceOrderDetails';
export { ServiceOrderForm } from './ServiceOrderForm';
export { ServiceOrderManager } from './ServiceOrderManager';

// Gestão de Garantias
export * from './MotopartsDashboard';
export * from './WarrantyDetails';
export * from './WarrantyForm';
export * from './WarrantyList';
export * from './WarrantyManager';
