/**
 * @file useProfilePermissions - Hook centralizado de permissões
 * @description Combina verificação de features do perfil de negócio com roles do funcionário
 */

import { useAuthStore } from '@/stores/auth-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { FeatureKey, BusinessType, BusinessLabels } from '@/types/business-profile';
import { useMemo, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Roles disponíveis no sistema
 */
export type EmployeeRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STOCKER' | 'VIEWER';

/**
 * Configuração de permissão completa
 */
export interface PermissionConfig {
  /** Features requeridas */
  features?: FeatureKey[];
  /** Modo de verificação de features */
  featureMode?: 'all' | 'any';
  /** Roles permitidas */
  roles?: EmployeeRole[];
  /** Tipos de negócio permitidos */
  allowedTypes?: BusinessType[];
}

/**
 * Permissões de uma ação/funcionalidade
 */
export interface ActionPermission {
  /** Chave única da ação */
  key: string;
  /** Descrição da ação */
  description: string;
  /** Configuração de permissão */
  permission: PermissionConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSÕES PRÉ-DEFINIDAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapa de permissões do sistema
 * Use para verificar acesso a funcionalidades específicas
 */
export const SYSTEM_PERMISSIONS: Record<string, ActionPermission> = {
  // ─────────────────────────────────────────────────────────────────────────
  // PDV
  // ─────────────────────────────────────────────────────────────────────────
  'pdv:access': {
    key: 'pdv:access',
    description: 'Acessar PDV',
    permission: { features: ['pdv'] },
  },
  'pdv:apply_discount': {
    key: 'pdv:apply_discount',
    description: 'Aplicar desconto em vendas',
    permission: { features: ['pdv'], roles: ['ADMIN', 'MANAGER'] },
  },
  'pdv:cancel_sale': {
    key: 'pdv:cancel_sale',
    description: 'Cancelar vendas',
    permission: { features: ['pdv'], roles: ['ADMIN', 'MANAGER'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CAIXA
  // ─────────────────────────────────────────────────────────────────────────
  'cash:access': {
    key: 'cash:access',
    description: 'Acessar controle de caixa',
    permission: { features: ['cashControl'] },
  },
  'cash:open': {
    key: 'cash:open',
    description: 'Abrir caixa',
    permission: { features: ['cashControl'], roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  },
  'cash:close': {
    key: 'cash:close',
    description: 'Fechar caixa',
    permission: { features: ['cashControl'], roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  },
  'cash:withdrawal': {
    key: 'cash:withdrawal',
    description: 'Fazer sangria',
    permission: { features: ['cashControl'], roles: ['ADMIN', 'MANAGER'] },
  },
  'cash:reinforce': {
    key: 'cash:reinforce',
    description: 'Fazer reforço',
    permission: { features: ['cashControl'], roles: ['ADMIN', 'MANAGER'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ESTOQUE
  // ─────────────────────────────────────────────────────────────────────────
  'stock:access': {
    key: 'stock:access',
    description: 'Acessar estoque',
    permission: { features: ['inventory'] },
  },
  'stock:adjust': {
    key: 'stock:adjust',
    description: 'Ajustar estoque manualmente',
    permission: { features: ['inventory'], roles: ['ADMIN', 'MANAGER', 'STOCKER'] },
  },
  'stock:transfer': {
    key: 'stock:transfer',
    description: 'Transferir estoque entre locais',
    permission: { features: ['stockTransfers'], roles: ['ADMIN', 'MANAGER', 'STOCKER'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUTOS
  // ─────────────────────────────────────────────────────────────────────────
  'products:access': {
    key: 'products:access',
    description: 'Visualizar produtos',
    permission: {},
  },
  'products:create': {
    key: 'products:create',
    description: 'Cadastrar produtos',
    permission: { roles: ['ADMIN', 'MANAGER', 'STOCKER'] },
  },
  'products:edit': {
    key: 'products:edit',
    description: 'Editar produtos',
    permission: { roles: ['ADMIN', 'MANAGER', 'STOCKER'] },
  },
  'products:delete': {
    key: 'products:delete',
    description: 'Excluir produtos',
    permission: { roles: ['ADMIN'] },
  },
  'products:change_price': {
    key: 'products:change_price',
    description: 'Alterar preços',
    permission: { roles: ['ADMIN', 'MANAGER'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONÁRIOS
  // ─────────────────────────────────────────────────────────────────────────
  'employees:access': {
    key: 'employees:access',
    description: 'Visualizar funcionários',
    permission: { roles: ['ADMIN'] },
  },
  'employees:manage': {
    key: 'employees:manage',
    description: 'Gerenciar funcionários',
    permission: { roles: ['ADMIN'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RELATÓRIOS
  // ─────────────────────────────────────────────────────────────────────────
  'reports:access': {
    key: 'reports:access',
    description: 'Acessar relatórios',
    permission: { roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
  },
  'reports:financial': {
    key: 'reports:financial',
    description: 'Relatórios financeiros',
    permission: { roles: ['ADMIN', 'MANAGER'] },
  },
  'reports:export': {
    key: 'reports:export',
    description: 'Exportar relatórios',
    permission: { roles: ['ADMIN', 'MANAGER'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURAÇÕES
  // ─────────────────────────────────────────────────────────────────────────
  'settings:access': {
    key: 'settings:access',
    description: 'Acessar configurações',
    permission: { roles: ['ADMIN'] },
  },
  'settings:company': {
    key: 'settings:company',
    description: 'Configurações da empresa',
    permission: { roles: ['ADMIN'] },
  },
  'settings:backup': {
    key: 'settings:backup',
    description: 'Backup do sistema',
    permission: { roles: ['ADMIN'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ENTERPRISE
  // ─────────────────────────────────────────────────────────────────────────
  'enterprise:access': {
    key: 'enterprise:access',
    description: 'Acessar módulo Enterprise',
    permission: { features: ['enterprise'] },
  },
  'enterprise:contracts': {
    key: 'enterprise:contracts',
    description: 'Gerenciar contratos',
    permission: { features: ['contracts'], roles: ['ADMIN', 'MANAGER'] },
  },
  'enterprise:requests': {
    key: 'enterprise:requests',
    description: 'Fazer requisições',
    permission: { features: ['materialRequests'] },
  },
  'enterprise:approve_requests': {
    key: 'enterprise:approve_requests',
    description: 'Aprovar requisições',
    permission: { features: ['materialRequests'], roles: ['ADMIN', 'MANAGER'] },
  },
  'enterprise:transfers': {
    key: 'enterprise:transfers',
    description: 'Fazer transferências',
    permission: { features: ['stockTransfers'], roles: ['ADMIN', 'MANAGER', 'STOCKER'] },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MOTOPEÇAS
  // ─────────────────────────────────────────────────────────────────────────
  'motoparts:access': {
    key: 'motoparts:access',
    description: 'Acessar módulo Motopeças',
    permission: { features: ['serviceOrders', 'warranties'], featureMode: 'any' },
  },
  'motoparts:service_orders': {
    key: 'motoparts:service_orders',
    description: 'Gerenciar ordens de serviço',
    permission: { features: ['serviceOrders'] },
  },
  'motoparts:warranties': {
    key: 'motoparts:warranties',
    description: 'Gerenciar garantias',
    permission: { features: ['warranties'] },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook centralizado para verificação de permissões
 * Combina features do perfil de negócio com roles do funcionário
 *
 * @example
 * const { can, canAll, canAny, hasRole, hasFeature } = useProfilePermissions();
 *
 * // Verificar permissão específica
 * if (can('pdv:apply_discount')) {
 *   // Mostra botão de desconto
 * }
 *
 * // Verificar role
 * if (hasRole('ADMIN')) {
 *   // Mostra opções de admin
 * }
 *
 * // Verificar feature
 * if (hasFeature('enterprise')) {
 *   // Mostra módulo enterprise
 * }
 */
export function useProfilePermissions() {
  const { employee, isAuthenticated } = useAuthStore();
  const { isFeatureEnabled, businessType, profile, getLabel } = useBusinessProfile();

  // ─────────────────────────────────────────────────────────────────────────
  // Verificadores básicos
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica se o funcionário tem uma role específica
   */
  const hasRole = useCallback(
    (role: EmployeeRole): boolean => {
      if (!employee) return false;
      return employee.role === role;
    },
    [employee]
  );

  /**
   * Verifica se o funcionário tem qualquer uma das roles
   */
  const hasAnyRole = useCallback(
    (roles: EmployeeRole[]): boolean => {
      if (!employee) return false;
      return roles.includes(employee.role as EmployeeRole);
    },
    [employee]
  );

  /**
   * Verifica se uma feature está habilitada
   */
  const hasFeature = useCallback(
    (feature: FeatureKey): boolean => {
      return isFeatureEnabled(feature);
    },
    [isFeatureEnabled]
  );

  /**
   * Verifica se todas as features estão habilitadas
   */
  const hasAllFeatures = useCallback(
    (features: FeatureKey[]): boolean => {
      return features.every((f) => isFeatureEnabled(f));
    },
    [isFeatureEnabled]
  );

  /**
   * Verifica se qualquer feature está habilitada
   */
  const hasAnyFeature = useCallback(
    (features: FeatureKey[]): boolean => {
      return features.some((f) => isFeatureEnabled(f));
    },
    [isFeatureEnabled]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Verificador de permissão completa
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica se uma configuração de permissão é satisfeita
   */
  const checkPermission = useCallback(
    (config: PermissionConfig): boolean => {
      // Verifica tipo de negócio
      if (config.allowedTypes && !config.allowedTypes.includes(businessType)) {
        return false;
      }

      // Verifica features
      if (config.features && config.features.length > 0) {
        const mode = config.featureMode ?? 'all';
        const hasAccess =
          mode === 'all'
            ? config.features.every((f) => isFeatureEnabled(f))
            : config.features.some((f) => isFeatureEnabled(f));

        if (!hasAccess) {
          return false;
        }
      }

      // Verifica roles
      if (config.roles && config.roles.length > 0) {
        if (!employee || !config.roles.includes(employee.role as EmployeeRole)) {
          return false;
        }
      }

      return true;
    },
    [businessType, isFeatureEnabled, employee]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Verificadores de ações
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica se pode executar uma ação (usando chave do SYSTEM_PERMISSIONS)
   */
  const can = useCallback(
    (actionKey: keyof typeof SYSTEM_PERMISSIONS): boolean => {
      const action = SYSTEM_PERMISSIONS[actionKey];
      if (!action) return false;
      return checkPermission(action.permission);
    },
    [checkPermission]
  );

  /**
   * Verifica se pode executar todas as ações
   */
  const canAll = useCallback(
    (actionKeys: Array<keyof typeof SYSTEM_PERMISSIONS>): boolean => {
      return actionKeys.every((key) => can(key));
    },
    [can]
  );

  /**
   * Verifica se pode executar qualquer uma das ações
   */
  const canAny = useCallback(
    (actionKeys: Array<keyof typeof SYSTEM_PERMISSIONS>): boolean => {
      return actionKeys.some((key) => can(key));
    },
    [can]
  );

  /**
   * Verifica permissão customizada (não definida em SYSTEM_PERMISSIONS)
   */
  const canCustom = useCallback(
    (config: PermissionConfig): boolean => {
      return checkPermission(config);
    },
    [checkPermission]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Informações do contexto
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Informações do funcionário atual
   */
  const currentEmployee = useMemo(
    () => ({
      id: employee?.id,
      name: employee?.name,
      role: employee?.role as EmployeeRole | undefined,
      isAuthenticated,
      isAdmin: employee?.role === 'ADMIN',
      isManager: employee?.role === 'MANAGER',
      isCashier: employee?.role === 'CASHIER',
      isStocker: employee?.role === 'STOCKER',
      isViewer: employee?.role === 'VIEWER',
    }),
    [employee, isAuthenticated]
  );

  /**
   * Informações do perfil de negócio
   */
  const currentProfile = useMemo(
    () => ({
      type: businessType,
      name: profile.name,
      description: profile.description,
      isGrocery: businessType === 'GROCERY',
      isMotoparts: businessType === 'MOTOPARTS',
      isEnterprise: businessType === 'ENTERPRISE',
      isGeneral: businessType === 'GENERAL',
    }),
    [businessType, profile]
  );

  return {
    // Verificadores básicos
    hasRole,
    hasAnyRole,
    hasFeature,
    hasAllFeatures,
    hasAnyFeature,

    // Verificadores de ação
    can,
    canAll,
    canAny,
    canCustom,
    checkPermission,

    // Contexto
    currentEmployee,
    currentProfile,
    businessType,
    profile,

    // Labels customizados
    getLabel: getLabel as (key: keyof BusinessLabels) => string,

    // Constante de permissões
    PERMISSIONS: SYSTEM_PERMISSIONS,
  };
}
