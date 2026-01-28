/**
 * @file EnterpriseStore - Estado global do módulo Enterprise
 * @description Gerencia contratos, requisições, transferências e filtros
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Contract,
  ContractStatus,
  EnterpriseKPIs,
  MaterialRequest,
  MaterialRequestStatus,
  RecentRequest,
  StockLocation,
  StockTransfer,
  TransferStatus,
  WorkFront,
} from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES DE FILTROS
// ────────────────────────────────────────────────────────────────────────────

interface ContractFilters {
  search: string;
  status: ContractStatus | 'ALL';
  managerId: string | 'ALL';
}

interface RequestFilters {
  search: string;
  status: MaterialRequestStatus | 'ALL';
  contractId: string | 'ALL';
  priority: string | 'ALL';
}

interface TransferFilters {
  search: string;
  status: TransferStatus | 'ALL';
  sourceLocationId: string | 'ALL';
  destinationLocationId: string | 'ALL';
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACE DO STORE
// ────────────────────────────────────────────────────────────────────────────

interface EnterpriseStore {
  // ─── KPIs ───
  kpis: EnterpriseKPIs;
  isLoadingKPIs: boolean;
  setKPIs: (kpis: EnterpriseKPIs) => void;
  setLoadingKPIs: (loading: boolean) => void;

  // ─── Contratos ───
  contracts: Contract[];
  selectedContract: Contract | null;
  contractFilters: ContractFilters;
  isLoadingContracts: boolean;

  setContracts: (contracts: Contract[]) => void;
  selectContract: (contract: Contract | null) => void;
  setContractFilters: (filters: Partial<ContractFilters>) => void;
  resetContractFilters: () => void;
  setLoadingContracts: (loading: boolean) => void;

  // ─── Frentes de Trabalho ───
  workFronts: WorkFront[];
  selectedWorkFront: WorkFront | null;
  isLoadingWorkFronts: boolean;

  setWorkFronts: (workFronts: WorkFront[]) => void;
  selectWorkFront: (workFront: WorkFront | null) => void;
  setLoadingWorkFronts: (loading: boolean) => void;

  // ─── Locais de Estoque ───
  locations: StockLocation[];
  selectedLocation: StockLocation | null;
  isLoadingLocations: boolean;

  setLocations: (locations: StockLocation[]) => void;
  selectLocation: (location: StockLocation | null) => void;
  setLoadingLocations: (loading: boolean) => void;

  // ─── Requisições ───
  requests: MaterialRequest[];
  recentRequests: RecentRequest[];
  selectedRequest: MaterialRequest | null;
  requestFilters: RequestFilters;
  isLoadingRequests: boolean;

  setRequests: (requests: MaterialRequest[]) => void;
  setRecentRequests: (requests: RecentRequest[]) => void;
  selectRequest: (request: MaterialRequest | null) => void;
  setRequestFilters: (filters: Partial<RequestFilters>) => void;
  resetRequestFilters: () => void;
  setLoadingRequests: (loading: boolean) => void;

  // ─── Transferências ───
  transfers: StockTransfer[];
  selectedTransfer: StockTransfer | null;
  transferFilters: TransferFilters;
  isLoadingTransfers: boolean;

  setTransfers: (transfers: StockTransfer[]) => void;
  selectTransfer: (transfer: StockTransfer | null) => void;
  setTransferFilters: (filters: Partial<TransferFilters>) => void;
  resetTransferFilters: () => void;
  setLoadingTransfers: (loading: boolean) => void;

  // ─── Reset ───
  resetStore: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// VALORES INICIAIS
// ────────────────────────────────────────────────────────────────────────────

const initialContractFilters: ContractFilters = {
  search: '',
  status: 'ALL',
  managerId: 'ALL',
};

const initialRequestFilters: RequestFilters = {
  search: '',
  status: 'ALL',
  contractId: 'ALL',
  priority: 'ALL',
};

const initialTransferFilters: TransferFilters = {
  search: '',
  status: 'ALL',
  sourceLocationId: 'ALL',
  destinationLocationId: 'ALL',
};

const initialKPIs: EnterpriseKPIs = {
  activeContracts: 0,
  pendingRequests: 0,
  inTransitTransfers: 0,
  lowStockItems: 0,
  lowStockAlerts: 0,
  monthlyConsumption: 0,
  consumptionTrend: 0,
};

// ────────────────────────────────────────────────────────────────────────────
// STORE
// ────────────────────────────────────────────────────────────────────────────

export const useEnterpriseStore = create<EnterpriseStore>()(
  devtools(
    persist(
      (set) => ({
        // ─── KPIs ───
        kpis: initialKPIs,
        isLoadingKPIs: false,
        setKPIs: (kpis) => set({ kpis }),
        setLoadingKPIs: (isLoadingKPIs) => set({ isLoadingKPIs }),

        // ─── Contratos ───
        contracts: [],
        selectedContract: null,
        contractFilters: initialContractFilters,
        isLoadingContracts: false,

        setContracts: (contracts) => set({ contracts }),
        selectContract: (selectedContract) => set({ selectedContract }),
        setContractFilters: (filters) =>
          set((state) => ({
            contractFilters: { ...state.contractFilters, ...filters },
          })),
        resetContractFilters: () => set({ contractFilters: initialContractFilters }),
        setLoadingContracts: (isLoadingContracts) => set({ isLoadingContracts }),

        // ─── Frentes de Trabalho ───
        workFronts: [],
        selectedWorkFront: null,
        isLoadingWorkFronts: false,

        setWorkFronts: (workFronts) => set({ workFronts }),
        selectWorkFront: (selectedWorkFront) => set({ selectedWorkFront }),
        setLoadingWorkFronts: (isLoadingWorkFronts) => set({ isLoadingWorkFronts }),

        // ─── Locais de Estoque ───
        locations: [],
        selectedLocation: null,
        isLoadingLocations: false,

        setLocations: (locations) => set({ locations }),
        selectLocation: (selectedLocation) => set({ selectedLocation }),
        setLoadingLocations: (isLoadingLocations) => set({ isLoadingLocations }),

        // ─── Requisições ───
        requests: [],
        recentRequests: [],
        selectedRequest: null,
        requestFilters: initialRequestFilters,
        isLoadingRequests: false,

        setRequests: (requests) => set({ requests }),
        setRecentRequests: (recentRequests) => set({ recentRequests }),
        selectRequest: (selectedRequest) => set({ selectedRequest }),
        setRequestFilters: (filters) =>
          set((state) => ({
            requestFilters: { ...state.requestFilters, ...filters },
          })),
        resetRequestFilters: () => set({ requestFilters: initialRequestFilters }),
        setLoadingRequests: (isLoadingRequests) => set({ isLoadingRequests }),

        // ─── Transferências ───
        transfers: [],
        selectedTransfer: null,
        transferFilters: initialTransferFilters,
        isLoadingTransfers: false,

        setTransfers: (transfers) => set({ transfers }),
        selectTransfer: (selectedTransfer) => set({ selectedTransfer }),
        setTransferFilters: (filters) =>
          set((state) => ({
            transferFilters: { ...state.transferFilters, ...filters },
          })),
        resetTransferFilters: () => set({ transferFilters: initialTransferFilters }),
        setLoadingTransfers: (isLoadingTransfers) => set({ isLoadingTransfers }),

        // ─── Reset ───
        resetStore: () =>
          set({
            kpis: initialKPIs,
            contracts: [],
            selectedContract: null,
            contractFilters: initialContractFilters,
            workFronts: [],
            selectedWorkFront: null,
            locations: [],
            selectedLocation: null,
            requests: [],
            recentRequests: [],
            selectedRequest: null,
            requestFilters: initialRequestFilters,
            transfers: [],
            selectedTransfer: null,
            transferFilters: initialTransferFilters,
          }),
      }),
      {
        name: 'giro-enterprise-store',
        partialize: (state) => ({
          // Persistir apenas filtros
          contractFilters: state.contractFilters,
          requestFilters: state.requestFilters,
          transferFilters: state.transferFilters,
        }),
      }
    ),
    { name: 'EnterpriseStore' }
  )
);
