// ═══════════════════════════════════════════════════════════════════════════
// GIRO ENTERPRISE - HOOKS DE PERMISSÃO
// Hooks para verificação de autorização no módulo Enterprise
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import type { EmployeeRole } from '@/types';
import {
  ENTERPRISE_PERMISSIONS,
  type EnterprisePermission,
  canApproveAmount,
  type ApprovalConfig,
  DEFAULT_APPROVAL_CONFIG,
  isEnterpriseRole,
} from '@/lib/permissions/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// useEnterprisePermission
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para verificar uma permissão Enterprise específica
 *
 * @example
 * const canViewContracts = useEnterprisePermission('contracts.view');
 * const canApproveRequests = useEnterprisePermission('requests.approve');
 */
export function useEnterprisePermission(permission: EnterprisePermission): boolean {
  const { employee } = useAuthStore();
  const { businessType } = useBusinessProfile();

  return useMemo(() => {
    // Não autenticado
    if (!employee) return false;

    // Não é perfil Enterprise
    if (businessType !== 'ENTERPRISE') return false;

    // Verifica se o role tem a permissão
    const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(employee.role);
  }, [employee, businessType, permission]);
}

// ────────────────────────────────────────────────────────────────────────────
// useEnterprisePermissions
// ────────────────────────────────────────────────────────────────────────────

type PermissionCheckResult = {
  [K in EnterprisePermission]: boolean;
};

/**
 * Hook para verificar múltiplas permissões Enterprise de uma vez
 *
 * @example
 * const permissions = useEnterprisePermissions([
 *   'contracts.view',
 *   'contracts.create',
 *   'requests.approve'
 * ]);
 * if (permissions['contracts.create']) { ... }
 */
export function useEnterprisePermissions(
  permissions: EnterprisePermission[]
): Partial<PermissionCheckResult> {
  const { employee } = useAuthStore();
  const { businessType } = useBusinessProfile();

  return useMemo(() => {
    const result: Partial<PermissionCheckResult> = {};

    if (!employee || businessType !== 'ENTERPRISE') {
      permissions.forEach((p) => {
        result[p] = false;
      });
      return result;
    }

    permissions.forEach((permission) => {
      const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
      result[permission] = allowedRoles ? allowedRoles.includes(employee.role) : false;
    });

    return result;
  }, [employee, businessType, permissions]);
}

// ────────────────────────────────────────────────────────────────────────────
// useCanDo
// ────────────────────────────────────────────────────────────────────────────

interface CanDoActions {
  // Contratos
  viewContracts: boolean;
  createContract: boolean;
  editContract: boolean;
  deleteContract: boolean;

  // Frentes
  viewWorkFronts: boolean;
  createWorkFront: boolean;
  editWorkFront: boolean;

  // Atividades
  viewActivities: boolean;
  createActivity: boolean;
  editActivity: boolean;
  updateActivityProgress: boolean;

  // Locais de Estoque
  viewLocations: boolean;
  createLocation: boolean;
  editLocation: boolean;
  adjustLocationBalance: boolean;

  // Requisições
  viewRequests: boolean;
  createRequest: boolean;
  editRequest: boolean;
  submitRequest: boolean;
  approveRequest: boolean;
  rejectRequest: boolean;
  separateRequest: boolean;
  deliverRequest: boolean;
  cancelRequest: boolean;

  // Transferências
  viewTransfers: boolean;
  createTransfer: boolean;
  editTransfer: boolean;
  approveTransfer: boolean;
  rejectTransfer: boolean;
  shipTransfer: boolean;
  receiveTransfer: boolean;
  cancelTransfer: boolean;

  // Inventário
  viewInventory: boolean;
  countInventory: boolean;
  adjustInventory: boolean;
  approveInventory: boolean;

  // Relatórios
  viewConsumptionReport: boolean;
  viewStockReport: boolean;
  viewRequestsReport: boolean;
  viewTransfersReport: boolean;
  viewCostReport: boolean;
  viewAbcReport: boolean;

  // Helpers
  canApprove: (amount: number, config?: ApprovalConfig) => boolean;
  isEnterpriseUser: boolean;
}

/**
 * Hook completo para verificar todas as ações possíveis do Enterprise
 *
 * @example
 * const canDo = useCanDo();
 * if (canDo.createRequest) { ... }
 * if (canDo.canApprove(15000)) { ... }
 */
export function useCanDo(): CanDoActions {
  const { employee } = useAuthStore();
  const { businessType } = useBusinessProfile();

  const checkPermission = useCallback(
    (permission: EnterprisePermission): boolean => {
      if (!employee || businessType !== 'ENTERPRISE') return false;
      const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
      if (!allowedRoles) return false;
      return allowedRoles.includes(employee.role);
    },
    [employee, businessType]
  );

  const canApprove = useCallback(
    (amount: number, config?: ApprovalConfig): boolean => {
      if (!employee || businessType !== 'ENTERPRISE') return false;
      return canApproveAmount(employee.role, amount, config || DEFAULT_APPROVAL_CONFIG);
    },
    [employee, businessType]
  );

  return useMemo(
    () => ({
      // Contratos
      viewContracts: checkPermission('contracts.view'),
      createContract: checkPermission('contracts.create'),
      editContract: checkPermission('contracts.edit'),
      deleteContract: checkPermission('contracts.delete'),

      // Frentes
      viewWorkFronts: checkPermission('workFronts.view'),
      createWorkFront: checkPermission('workFronts.create'),
      editWorkFront: checkPermission('workFronts.edit'),

      // Atividades
      viewActivities: checkPermission('activities.view'),
      createActivity: checkPermission('activities.create'),
      editActivity: checkPermission('activities.edit'),
      updateActivityProgress: checkPermission('activities.updateProgress'),

      // Locais de Estoque
      viewLocations: checkPermission('locations.view'),
      createLocation: checkPermission('locations.create'),
      editLocation: checkPermission('locations.edit'),
      adjustLocationBalance: checkPermission('locations.adjustBalance'),

      // Requisições
      viewRequests: checkPermission('requests.view'),
      createRequest: checkPermission('requests.create'),
      editRequest: checkPermission('requests.edit'),
      submitRequest: checkPermission('requests.submit'),
      approveRequest: checkPermission('requests.approve'),
      rejectRequest: checkPermission('requests.reject'),
      separateRequest: checkPermission('requests.separate'),
      deliverRequest: checkPermission('requests.deliver'),
      cancelRequest: checkPermission('requests.cancel'),

      // Transferências
      viewTransfers: checkPermission('transfers.view'),
      createTransfer: checkPermission('transfers.create'),
      editTransfer: checkPermission('transfers.edit'),
      approveTransfer: checkPermission('transfers.approve'),
      rejectTransfer: checkPermission('transfers.reject'),
      shipTransfer: checkPermission('transfers.ship'),
      receiveTransfer: checkPermission('transfers.receive'),
      cancelTransfer: checkPermission('transfers.cancel'),

      // Inventário
      viewInventory: checkPermission('inventory.view'),
      countInventory: checkPermission('inventory.count'),
      adjustInventory: checkPermission('inventory.adjust'),
      approveInventory: checkPermission('inventory.approve'),

      // Relatórios
      viewConsumptionReport: checkPermission('reports.consumption'),
      viewStockReport: checkPermission('reports.stock'),
      viewRequestsReport: checkPermission('reports.requests'),
      viewTransfersReport: checkPermission('reports.transfers'),
      viewCostReport: checkPermission('reports.cost'),
      viewAbcReport: checkPermission('reports.abc'),

      // Helpers
      canApprove,
      isEnterpriseUser: !!employee && isEnterpriseRole(employee.role),
    }),
    [checkPermission, canApprove, employee]
  );
}

// ────────────────────────────────────────────────────────────────────────────
// useIsEnterprise
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook simples para verificar se está no perfil Enterprise
 *
 * @example
 * const isEnterprise = useIsEnterprise();
 * if (isEnterprise) { ... }
 */
export function useIsEnterprise(): boolean {
  const { businessType } = useBusinessProfile();
  return businessType === 'ENTERPRISE';
}

// ────────────────────────────────────────────────────────────────────────────
// useCurrentRole
// ────────────────────────────────────────────────────────────────────────────

interface CurrentRoleInfo {
  role: EmployeeRole | null;
  isAdmin: boolean;
  isContractManager: boolean;
  isSupervisor: boolean;
  isWarehouse: boolean;
  isRequester: boolean;
  isEnterpriseRole: boolean;
}

/**
 * Hook para obter informações do role atual
 *
 * @example
 * const { isWarehouse, isSupervisor } = useCurrentRole();
 */
export function useCurrentRole(): CurrentRoleInfo {
  const { employee } = useAuthStore();

  return useMemo(() => {
    const role = employee?.role || null;

    return {
      role,
      isAdmin: role === 'ADMIN',
      isContractManager: role === 'CONTRACT_MANAGER',
      isSupervisor: role === 'SUPERVISOR',
      isWarehouse: role === 'WAREHOUSE',
      isRequester: role === 'REQUESTER',
      isEnterpriseRole: role ? isEnterpriseRole(role) : false,
    };
  }, [employee]);
}
