/**
 * @file useEnterpriseCommands - Hook para comandos Enterprise
 * @description Abstração sobre os comandos Tauri para o módulo Enterprise
 */

import { useCallback, useEffect, useState } from 'react';
import * as tauri from '@/lib/tauri';
import type { ContractWithManager } from '@/lib/tauri';
import type { EnterpriseKPIs, MaterialRequestStatus, RecentRequest } from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface UseEnterpriseCommandsReturn {
  // KPIs
  getEnterpriseKPIs: () => Promise<EnterpriseKPIs>;

  // Contracts
  getContracts: (status?: string, managerId?: string) => Promise<tauri.ContractWithManager[]>;
  getContractById: (id: string) => Promise<tauri.ContractWithManager | null>;
  createContract: (input: tauri.CreateContractInput) => Promise<tauri.EnterpriseContract>;
  updateContract: (
    id: string,
    input: Partial<tauri.CreateContractInput>
  ) => Promise<tauri.EnterpriseContract>;
  deleteContract: (id: string) => Promise<void>;

  // Work Fronts
  getWorkFronts: (contractId?: string, status?: string) => Promise<tauri.WorkFrontWithDetails[]>;
  getWorkFrontById: (id: string) => Promise<tauri.WorkFrontWithDetails | null>;
  createWorkFront: (input: tauri.CreateWorkFrontInput) => Promise<tauri.EnterpriseWorkFront>;

  // Activities
  getActivities: (workFrontId?: string, status?: string) => Promise<tauri.ActivityWithDetails[]>;
  getActivityById: (id: string) => Promise<tauri.ActivityWithDetails | null>;
  createActivity: (input: tauri.CreateActivityInput) => Promise<tauri.EnterpriseActivity>;
  updateActivityProgress: (id: string, executedQty: number) => Promise<tauri.EnterpriseActivity>;

  // Stock Locations
  getStockLocations: (
    contractId?: string,
    locationType?: string
  ) => Promise<tauri.StockLocationWithDetails[]>;
  getStockLocationById: (id: string) => Promise<tauri.StockLocationWithDetails | null>;
  createStockLocation: (
    input: tauri.CreateStockLocationInput
  ) => Promise<tauri.EnterpriseStockLocation>;
  getStockBalances: (locationId: string) => Promise<tauri.StockBalance[]>;
  adjustStockBalance: (
    locationId: string,
    productId: string,
    quantity: number,
    reason: string
  ) => Promise<void>;

  // Material Requests
  getMaterialRequests: (
    contractId?: string,
    status?: string,
    requesterId?: string
  ) => Promise<tauri.MaterialRequestWithDetails[]>;
  getMaterialRequestById: (id: string) => Promise<tauri.MaterialRequestWithDetails | null>;
  createMaterialRequest: (
    input: tauri.CreateMaterialRequestInput
  ) => Promise<tauri.EnterpriseMaterialRequest>;
  getPendingRequests: () => Promise<tauri.MaterialRequestWithDetails[]>;
  getRequestItems: (requestId: string) => Promise<tauri.MaterialRequestItem[]>;
  addRequestItem: (
    requestId: string,
    input: tauri.AddRequestItemInput
  ) => Promise<tauri.MaterialRequestItem>;
  submitRequest: (requestId: string) => Promise<tauri.EnterpriseMaterialRequest>;
  approveRequest: (
    requestId: string,
    approvedItems: Array<{ itemId: string; approvedQty: number }>
  ) => Promise<tauri.EnterpriseMaterialRequest>;
  rejectRequest: (requestId: string, reason: string) => Promise<tauri.EnterpriseMaterialRequest>;
  startSeparation: (requestId: string) => Promise<tauri.EnterpriseMaterialRequest>;
  completeSeparation: (requestId: string) => Promise<tauri.EnterpriseMaterialRequest>;
  deliverRequest: (requestId: string) => Promise<tauri.EnterpriseMaterialRequest>;

  // Stock Transfers
  getStockTransfers: (
    sourceLocationId?: string,
    destinationLocationId?: string,
    status?: string
  ) => Promise<tauri.StockTransferWithDetails[]>;
  getStockTransferById: (id: string) => Promise<tauri.StockTransferWithDetails | null>;
  createStockTransfer: (
    input: tauri.CreateStockTransferInput
  ) => Promise<tauri.EnterpriseStockTransfer>;
  getTransferItems: (transferId: string) => Promise<tauri.StockTransferItem[]>;
  addTransferItem: (
    transferId: string,
    input: tauri.AddTransferItemInput
  ) => Promise<tauri.StockTransferItem>;
  approveTransfer: (transferId: string) => Promise<tauri.EnterpriseStockTransfer>;
  rejectTransfer: (transferId: string, reason: string) => Promise<tauri.EnterpriseStockTransfer>;
  shipTransfer: (
    transferId: string,
    shippedItems: Array<{ itemId: string; shippedQty: number }>
  ) => Promise<tauri.EnterpriseStockTransfer>;
  receiveTransfer: (
    transferId: string,
    receivedItems: Array<{ itemId: string; receivedQty: number }>
  ) => Promise<tauri.EnterpriseStockTransfer>;
  cancelTransfer: (transferId: string) => Promise<tauri.EnterpriseStockTransfer>;

  // Recent Requests (for dashboard)
  getRecentRequests: () => Promise<RecentRequest[]>;

  // Loading state
  isLoading: boolean;
  error: Error | null;
}

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────

export function useEnterpriseCommands(): UseEnterpriseCommandsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Wrapper para chamadas com loading state
  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // KPIs
  // ──────────────────────────────────────────────────────────────────────────

  const getEnterpriseKPIs = useCallback(async (): Promise<EnterpriseKPIs> => {
    return withLoading(async () => {
      const dashboard = await tauri.getContractDashboard();
      return {
        activeContracts: dashboard.activeContracts,
        pendingRequests: dashboard.pendingRequests,
        inTransitTransfers: dashboard.inTransitTransfers,
        lowStockAlerts: dashboard.lowStockAlerts,
      };
    });
  }, [withLoading]);

  // ──────────────────────────────────────────────────────────────────────────
  // CONTRACTS
  // ──────────────────────────────────────────────────────────────────────────

  const getContracts = useCallback(
    async (status?: string, managerId?: string) => {
      return withLoading(() => tauri.getContracts(status, managerId));
    },
    [withLoading]
  );

  const getContractById = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.getContractById(id));
    },
    [withLoading]
  );

  const createContract = useCallback(
    async (input: tauri.CreateContractInput) => {
      return withLoading(() => tauri.createContract(input));
    },
    [withLoading]
  );

  const updateContract = useCallback(
    async (id: string, input: Partial<tauri.CreateContractInput>) => {
      return withLoading(() => tauri.updateContract(id, input));
    },
    [withLoading]
  );

  const deleteContract = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.deleteContract(id));
    },
    [withLoading]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // WORK FRONTS
  // ──────────────────────────────────────────────────────────────────────────

  const getWorkFronts = useCallback(
    async (contractId?: string, status?: string) => {
      return withLoading(() => tauri.getWorkFronts(contractId, status));
    },
    [withLoading]
  );

  const getWorkFrontById = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.getWorkFrontById(id));
    },
    [withLoading]
  );

  const createWorkFront = useCallback(
    async (input: tauri.CreateWorkFrontInput) => {
      return withLoading(() => tauri.createWorkFront(input));
    },
    [withLoading]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ACTIVITIES
  // ──────────────────────────────────────────────────────────────────────────

  const getActivities = useCallback(
    async (workFrontId?: string, status?: string) => {
      return withLoading(() => tauri.getActivities(workFrontId, status));
    },
    [withLoading]
  );

  const getActivityById = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.getActivityById(id));
    },
    [withLoading]
  );

  const createActivity = useCallback(
    async (input: tauri.CreateActivityInput) => {
      return withLoading(() => tauri.createActivity(input));
    },
    [withLoading]
  );

  const updateActivityProgress = useCallback(
    async (id: string, executedQty: number) => {
      return withLoading(() => tauri.updateActivityProgress(id, executedQty));
    },
    [withLoading]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STOCK LOCATIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getStockLocations = useCallback(
    async (contractId?: string, locationType?: string) => {
      return withLoading(() => tauri.getStockLocations(contractId, locationType));
    },
    [withLoading]
  );

  const getStockLocationById = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.getStockLocationById(id));
    },
    [withLoading]
  );

  const createStockLocation = useCallback(
    async (input: tauri.CreateStockLocationInput) => {
      return withLoading(() => tauri.createStockLocation(input));
    },
    [withLoading]
  );

  const getStockBalances = useCallback(
    async (locationId: string) => {
      return withLoading(() => tauri.getStockBalances(locationId));
    },
    [withLoading]
  );

  const adjustStockBalance = useCallback(
    async (locationId: string, productId: string, quantity: number, reason: string) => {
      return withLoading(() => tauri.adjustStockBalance(locationId, productId, quantity, reason));
    },
    [withLoading]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MATERIAL REQUESTS
  // ──────────────────────────────────────────────────────────────────────────

  const getMaterialRequests = useCallback(
    async (contractId?: string, status?: string, requesterId?: string) => {
      return withLoading(() => tauri.getMaterialRequests(contractId, status, requesterId));
    },
    [withLoading]
  );

  const getMaterialRequestById = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.getMaterialRequestById(id));
    },
    [withLoading]
  );

  const createMaterialRequest = useCallback(
    async (input: tauri.CreateMaterialRequestInput) => {
      return withLoading(() => tauri.createMaterialRequest(input));
    },
    [withLoading]
  );

  const getPendingRequests = useCallback(async () => {
    return withLoading(() => tauri.getPendingRequests());
  }, [withLoading]);

  const getRequestItems = useCallback(
    async (requestId: string) => {
      return withLoading(() => tauri.getRequestItems(requestId));
    },
    [withLoading]
  );

  const addRequestItem = useCallback(
    async (requestId: string, input: tauri.AddRequestItemInput) => {
      return withLoading(() => tauri.addRequestItem(requestId, input));
    },
    [withLoading]
  );

  const submitRequest = useCallback(
    async (requestId: string) => {
      return withLoading(() => tauri.submitRequest(requestId));
    },
    [withLoading]
  );

  const approveRequest = useCallback(
    async (requestId: string, approvedItems: Array<{ itemId: string; approvedQty: number }>) => {
      return withLoading(() => tauri.approveRequest(requestId, approvedItems));
    },
    [withLoading]
  );

  const rejectRequest = useCallback(
    async (requestId: string, reason: string) => {
      return withLoading(() => tauri.rejectRequest(requestId, reason));
    },
    [withLoading]
  );

  const startSeparation = useCallback(
    async (requestId: string) => {
      return withLoading(() => tauri.startSeparation(requestId));
    },
    [withLoading]
  );

  const completeSeparation = useCallback(
    async (requestId: string) => {
      return withLoading(() => tauri.completeSeparation(requestId));
    },
    [withLoading]
  );

  const deliverRequest = useCallback(
    async (requestId: string) => {
      return withLoading(() => tauri.deliverRequest(requestId));
    },
    [withLoading]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STOCK TRANSFERS
  // ──────────────────────────────────────────────────────────────────────────

  const getStockTransfers = useCallback(
    async (sourceLocationId?: string, destinationLocationId?: string, status?: string) => {
      return withLoading(() =>
        tauri.getStockTransfers(sourceLocationId, destinationLocationId, status)
      );
    },
    [withLoading]
  );

  const getStockTransferById = useCallback(
    async (id: string) => {
      return withLoading(() => tauri.getStockTransferById(id));
    },
    [withLoading]
  );

  const createStockTransfer = useCallback(
    async (input: tauri.CreateStockTransferInput) => {
      return withLoading(() => tauri.createStockTransfer(input));
    },
    [withLoading]
  );

  const getTransferItems = useCallback(
    async (transferId: string) => {
      return withLoading(() => tauri.getTransferItems(transferId));
    },
    [withLoading]
  );

  const addTransferItem = useCallback(
    async (transferId: string, input: tauri.AddTransferItemInput) => {
      return withLoading(() => tauri.addTransferItem(transferId, input));
    },
    [withLoading]
  );

  const approveTransfer = useCallback(
    async (transferId: string) => {
      return withLoading(() => tauri.approveTransfer(transferId));
    },
    [withLoading]
  );

  const rejectTransfer = useCallback(
    async (transferId: string, reason: string) => {
      return withLoading(() => tauri.rejectTransfer(transferId, reason));
    },
    [withLoading]
  );

  const shipTransfer = useCallback(
    async (transferId: string, shippedItems: Array<{ itemId: string; shippedQty: number }>) => {
      return withLoading(() => tauri.shipTransfer(transferId, shippedItems));
    },
    [withLoading]
  );

  const receiveTransfer = useCallback(
    async (transferId: string, receivedItems: Array<{ itemId: string; receivedQty: number }>) => {
      return withLoading(() => tauri.receiveTransfer(transferId, receivedItems));
    },
    [withLoading]
  );

  const cancelTransfer = useCallback(
    async (transferId: string) => {
      return withLoading(() => tauri.cancelTransfer(transferId));
    },
    [withLoading]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RECENT REQUESTS (Dashboard helper)
  // ──────────────────────────────────────────────────────────────────────────

  const getRecentRequests = useCallback(async (): Promise<RecentRequest[]> => {
    return withLoading(async () => {
      const requests = await tauri.getPendingRequests();
      return requests.slice(0, 10).map((req) => ({
        id: req.id,
        code: req.requestNumber,
        status: req.status as MaterialRequestStatus,
        requesterName: req.requesterName,
        contractName: req.contractName,
        createdAt: req.createdAt,
      }));
    });
  }, [withLoading]);

  return {
    // KPIs
    getEnterpriseKPIs,

    // Contracts
    getContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,

    // Work Fronts
    getWorkFronts,
    getWorkFrontById,
    createWorkFront,

    // Activities
    getActivities,
    getActivityById,
    createActivity,
    updateActivityProgress,

    // Stock Locations
    getStockLocations,
    getStockLocationById,
    createStockLocation,
    getStockBalances,
    adjustStockBalance,

    // Material Requests
    getMaterialRequests,
    getMaterialRequestById,
    createMaterialRequest,
    getPendingRequests,
    getRequestItems,
    addRequestItem,
    submitRequest,
    approveRequest,
    rejectRequest,
    startSeparation,
    completeSeparation,
    deliverRequest,

    // Stock Transfers
    getStockTransfers,
    getStockTransferById,
    createStockTransfer,
    getTransferItems,
    addTransferItem,
    approveTransfer,
    rejectTransfer,
    shipTransfer,
    receiveTransfer,
    cancelTransfer,

    // Dashboard helper
    getRecentRequests,

    // State
    isLoading,
    error,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SPECIALIZED HOOKS (for backward compatibility with pages)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar contratos com filtros
 */
export function useContracts(status?: string, managerId?: string) {
  const [contracts, setContracts] = useState<ContractWithManager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tauri.getContracts(status, managerId);
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [status, managerId]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  return { data: contracts, contracts, isLoading, error, refetch: loadContracts };
}

/**
 * Hook para dashboard de contrato
 */
export function useContractDashboard() {
  const [kpis, setKpis] = useState<EnterpriseKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dashboard = await tauri.getContractDashboard();
      setKpis({
        activeContracts: dashboard.activeContracts,
        pendingRequests: dashboard.pendingRequests,
        inTransitTransfers: dashboard.inTransitTransfers,
        lowStockAlerts: dashboard.lowStockAlerts,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { kpis, isLoading, error, refetch: loadDashboard };
}

/**
 * Hook para requisições pendentes
 */
export function usePendingRequests() {
  const [requests, setRequests] = useState<RecentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tauri.getPendingRequests();
      const mapped: RecentRequest[] = data.slice(0, 10).map((req) => ({
        id: req.id,
        code: req.requestNumber,
        status: req.status as MaterialRequestStatus,
        requesterName: req.requesterName,
        contractName: req.contractName,
        createdAt: req.createdAt,
      }));
      setRequests(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return { requests, isLoading, error, refetch: loadRequests };
}

/**
 * Hook para listar work fronts
 */
export function useWorkFronts(contractId?: string, status?: string) {
  const [workFronts, setWorkFronts] = useState<tauri.WorkFrontWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadWorkFronts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tauri.getWorkFronts(contractId, status);
      setWorkFronts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [contractId, status]);

  useEffect(() => {
    loadWorkFronts();
  }, [loadWorkFronts]);

  return { data: workFronts, workFronts, isLoading, error, refetch: loadWorkFronts };
}
