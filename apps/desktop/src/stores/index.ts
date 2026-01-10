// ═══════════════════════════════════════════════════════════════════════════
// GIRO - STORES INDEX
// Exporta todas as stores Zustand
// ═══════════════════════════════════════════════════════════════════════════

export * from './alert-store';
export {
  PERMISSIONS,
  useAuthStore,
  type CurrentUser,
  type Employee,
  type EmployeeRole,
  type Permission,
} from './auth-store';
export * from './pdv-store';
export * from './settings-store';
export * from './useBusinessProfile';
