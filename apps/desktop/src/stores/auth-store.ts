import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EmployeeRole } from '@/types';
import { getCurrentUser, getCurrentCashSession } from '@/lib/tauri';

// Re-export for convenience
export type { EmployeeRole };

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  email?: string;
  pin?: string;
  username?: string; // Legacy field if needed
}

export type CurrentUser = Employee;

export const PERMISSIONS = {
  // PDV
  'pdv.sell': ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKER'],
  'pdv.discount.basic': ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKER'],
  'pdv.discount.advanced': ['ADMIN', 'MANAGER'],
  'pdv.discount.unlimited': ['ADMIN'],
  'pdv.cancel.current': ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKER'],
  'pdv.cancel.completed': ['ADMIN', 'MANAGER'],

  // Caixa
  'cash.open': ['ADMIN', 'MANAGER', 'CASHIER'],
  'cash.close': ['ADMIN', 'MANAGER', 'CASHIER'],

  // Clientes
  'customers.manage': ['ADMIN', 'MANAGER', 'CASHIER'],

  // Ordens de Serviço
  'os.view': ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKER'],
  'os.create': ['ADMIN', 'MANAGER', 'CASHIER'],
  'os.update': ['ADMIN', 'MANAGER', 'CASHIER'],
  'os.cancel': ['ADMIN', 'MANAGER'],
  'os.finish': ['ADMIN', 'MANAGER', 'CASHIER'],

  // Serviços
  'services.view': ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKER'],
  'services.manage': ['ADMIN', 'MANAGER'],

  // Garantias
  'warranties.view': ['ADMIN', 'MANAGER', 'CASHIER'],
  'warranties.manage': ['ADMIN', 'MANAGER'],

  // Relatórios
  'reports.view': ['ADMIN', 'MANAGER'],

  // Configurações
  'settings.view': ['ADMIN', 'MANAGER'],
  'settings.edit': ['ADMIN'],
  'settings.backup': ['ADMIN'],

  // Veículos (Motopeças)
  'vehicles.view': ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKER', 'VIEWER'],

  // Estoque
  'stock.view_value': ['ADMIN', 'MANAGER', 'STOCKER'],

  // ════════════════════════════════════════════════════════════════════════
  // ENTERPRISE - Contratos
  // ════════════════════════════════════════════════════════════════════════
  'enterprise.contracts.view': ['ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'SUPERVISOR'],
  'enterprise.contracts.create': ['ADMIN', 'CONTRACT_MANAGER'],
  'enterprise.contracts.edit': ['ADMIN', 'CONTRACT_MANAGER'],
  'enterprise.contracts.delete': ['ADMIN'],

  // ENTERPRISE - Requisições
  'enterprise.requests.view': [
    'ADMIN',
    'MANAGER',
    'CONTRACT_MANAGER',
    'SUPERVISOR',
    'WAREHOUSE',
    'REQUESTER',
  ],
  'enterprise.requests.create': ['ADMIN', 'SUPERVISOR', 'REQUESTER'],
  'enterprise.requests.approve': ['ADMIN', 'CONTRACT_MANAGER', 'SUPERVISOR'],
  'enterprise.requests.separate': ['ADMIN', 'WAREHOUSE'],
  'enterprise.requests.deliver': ['ADMIN', 'WAREHOUSE'],

  // ENTERPRISE - Transferências
  'enterprise.transfers.view': ['ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'WAREHOUSE'],
  'enterprise.transfers.create': ['ADMIN', 'WAREHOUSE'],
  'enterprise.transfers.approve': ['ADMIN', 'CONTRACT_MANAGER'],
  'enterprise.transfers.execute': ['ADMIN', 'WAREHOUSE'],

  // ENTERPRISE - Inventário
  'enterprise.inventory.view': ['ADMIN', 'MANAGER', 'CONTRACT_MANAGER', 'WAREHOUSE'],
  'enterprise.inventory.count': ['ADMIN', 'WAREHOUSE'],
  'enterprise.inventory.adjust': ['ADMIN', 'WAREHOUSE'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export interface CashSession {
  id: string;
  employeeId: string;
  employeeName?: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  status: 'OPEN' | 'CLOSED' | 'FORCED';
}

interface AuthState {
  // Estado do usuário
  employee: Employee | null;
  currentEmployee: Employee | null; // alias for compatibility
  currentUser: Employee | null; // deprecated alias
  currentSession: CashSession | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  lastActivity: number;

  // Ações de autenticação
  login: (user: Employee) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
  updateActivity: () => void;

  // Ações de sessão de caixa
  openCashSession: (session: CashSession) => void;
  closeCashSession: () => void;

  // Verificações de permissão
  hasPermission: (permission: Permission | EmployeeRole) => boolean;
  canDiscount: (percentage: number) => boolean;
  canCancelSale: () => boolean;
}

const roleHierarchy: Record<EmployeeRole, number> = {
  VIEWER: 0,
  REQUESTER: 1, // Enterprise
  STOCKER: 1,
  CASHIER: 1,
  WAREHOUSE: 2, // Enterprise
  SUPERVISOR: 2, // Enterprise
  MANAGER: 2,
  CONTRACT_MANAGER: 3, // Enterprise
  ADMIN: 4,
};

const discountLimits: Record<EmployeeRole, number> = {
  VIEWER: 0,
  REQUESTER: 0, // Enterprise - sem desconto
  STOCKER: 5,
  CASHIER: 5,
  WAREHOUSE: 0, // Enterprise - sem desconto
  SUPERVISOR: 10, // Enterprise
  MANAGER: 20,
  CONTRACT_MANAGER: 20, // Enterprise
  ADMIN: 100,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      employee: null,
      currentEmployee: null,
      currentUser: null,
      currentSession: null,
      isAuthenticated: false,
      isRestoring: true,
      lastActivity: 0,

      login: (user) => {
        set({
          employee: user,
          currentEmployee: user,
          currentUser: user,
          isAuthenticated: true,
          lastActivity: Date.now(),
        });
      },

      logout: () => {
        set({
          employee: null,
          currentUser: null,
          currentSession: null,
          isAuthenticated: false,
          lastActivity: 0,
        });
      },

      restoreSession: async () => {
        set({ isRestoring: true });
        try {
          const [user, session] = await Promise.all([getCurrentUser(), getCurrentCashSession()]);

          if (user) {
            set({
              employee: user,
              currentEmployee: user,
              currentUser: user,
              isAuthenticated: true,
              lastActivity: Date.now(),
            });
          } else {
            // Backend session is invalid/expired
            set({
              employee: null,
              currentEmployee: null,
              currentUser: null,
              isAuthenticated: false,
              lastActivity: 0,
            });
          }

          if (session && session.status === 'OPEN') {
            set({
              currentSession: {
                id: session.id,
                employeeId: session.employeeId,
                employeeName: session.employee?.name || user?.name || 'Não identificado',
                openedAt: session.openedAt,
                closedAt: session.closedAt,
                openingBalance: session.openingBalance,
                closingBalance: session.actualBalance,
                status: 'OPEN',
              },
            });
          } else {
            set({ currentSession: null });
          }
        } catch (error) {
          console.error('[AuthStore] Failed to restore session:', error);
        } finally {
          set({ isRestoring: false });
        }
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      openCashSession: (session) => {
        set({ currentSession: session });
      },

      closeCashSession: () => {
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, status: 'CLOSED', closedAt: new Date().toISOString() }
            : null,
        }));
      },

      hasPermission: (required) => {
        const { employee } = get();
        if (!employee) return false;

        // Check if it's a Permission key
        if (typeof required === 'string' && required in PERMISSIONS) {
          const allowedRoles = PERMISSIONS[required as Permission];
          // Zustand middleware types are complex - simple role check

          return (allowedRoles as readonly EmployeeRole[]).includes(employee.role);
        }

        // Check if it's a direct role comparison (legacy support)
        const role = required as EmployeeRole;
        return roleHierarchy[employee.role] >= roleHierarchy[role];
      },

      canDiscount: (percentage) => {
        const { employee } = get();
        if (!employee) return false;
        return percentage <= discountLimits[employee.role];
      },

      canCancelSale: () => {
        const { employee } = get();
        if (!employee) return false;
        return roleHierarchy[employee.role] >= roleHierarchy.MANAGER;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        employee: state.employee,
        currentUser: state.employee,
        currentSession: state.currentSession,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
