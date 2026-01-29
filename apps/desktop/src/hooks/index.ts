/**
 * @file Hooks Index
 * @description Exporta todos os hooks personalizados
 */

// Cash Session
export {
  useAddCashMovement,
  useCashSession,
  useCloseCashSession,
  useOpenCashSession,
} from './use-cash-session';

// Keyboard
export { PDV_SHORTCUTS, useKeyboard, usePDVKeyboard } from './use-keyboard';

// Employees
export {
  useCreateEmployee,
  useDeactivateEmployee,
  useEmployees,
  useInactiveEmployees,
  useReactivateEmployee,
  useUpdateEmployee,
} from './useEmployees';

// Dashboard
export { useDashboardStats } from './useDashboard';

// Products
export {
  useAllProducts,
  useCreateProduct,
  useDeactivateProduct,
  useDeleteProduct,
  useInactiveProducts,
  useProduct,
  useProductByBarcode,
  useProductSearch,
  useProducts,
  useReactivateProduct,
  useUpdateProduct,
} from './use-products';

// Toast
export { toast, useToast } from './use-toast';

// Categories
export * from './useCategories';

// Sales
export * from './useSales';

// Stock
export * from './useStock';

// Alerts
export * from './useAlerts';

// Suppliers
export * from './useSuppliers';

// Price History
export * from './usePriceHistory';

// Enterprise Permissions
export {
  useEnterprisePermission,
  useEnterprisePermissions,
  useCanDo,
  useIsEnterprise,
  useCurrentRole,
} from './useEnterprisePermission';

// Sync
export * from './useSync';

// Multi-PC Network
export * from './useMultiPc';

// Windows Printers
export { useWindowsPrinters, formatPrinterStatus } from './useWindowsPrinters';
export type { PrinterInfo } from './useWindowsPrinters';
