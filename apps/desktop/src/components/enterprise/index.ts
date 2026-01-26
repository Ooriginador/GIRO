/**
 * @file Enterprise Components - Exports
 * @description Barrel export para componentes do módulo Enterprise
 */

// Status Badges
export {
  ContractStatusBadge,
  RequestStatusBadge,
  TransferStatusBadge,
  WorkFrontStatusBadge,
  ActivityStatusBadge,
  PriorityBadge,
} from './StatusBadge';

// Permission Guards
export {
  PermissionGuard,
  MultiPermissionGuard,
  ApprovalGuard,
  RoleGuard,
  EnterpriseOnly,
  AccessDeniedCard,
  type PermissionGuardProps,
  type MultiPermissionGuardProps,
  type ApprovalGuardProps,
  type RoleGuardProps,
  type EnterpriseOnlyProps,
  type AccessDeniedCardProps,
} from './PermissionGuard';

// Forms
export { ContractForm, type ContractFormValues } from './ContractForm';
export { RequestForm, type RequestFormValues } from './RequestForm';
export { TransferForm, type TransferFormValues } from './TransferForm';

// Workflows
export { RequestWorkflow } from './RequestWorkflow';
export { TransferWorkflow } from './TransferWorkflow';

// Workflow Visuals (Design)
export { RequestWorkflowVisual } from './workflows/RequestWorkflowVisual';
export { TransferWorkflowVisual } from './workflows/TransferWorkflowVisual';

// Dashboard
export {
  EnterpriseDashboard,
  KPICard,
  ContractCard,
  PendingItemRow,
} from './dashboard/EnterpriseDashboard';

// Responsive Layouts
export {
  ResponsiveGrid,
  ResponsiveSidebarLayout,
  ResponsiveStack,
  AdaptiveCardGrid,
  TabletOptimizedTable,
  ResponsiveActions,
  ResponsiveFilters,
  useResponsive,
} from './layouts/ResponsiveLayouts';

// Icons
export {
  EnterpriseIcons,
  ContractIcon,
  WorkFrontIcon,
  ActivityIcon,
  StockLocationIcon,
  MaterialRequestIcon,
  StockTransferIcon,
  InventoryIcon,
  MaterialIcon,
} from './icons/EnterpriseIcons';
