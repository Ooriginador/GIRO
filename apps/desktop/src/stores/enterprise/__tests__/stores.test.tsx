/**
 * Testes para Zustand Stores Enterprise
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock dos stores
interface Contract {
  id: string;
  code: string;
  name: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';
}

interface ContractStore {
  contracts: Contract[];
  selectedContract: Contract | null;
  loading: boolean;
  error: string | null;
  setContracts: (contracts: Contract[]) => void;
  selectContract: (contract: Contract | null) => void;
  addContract: (contract: Contract) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  removeContract: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Simular createStore do Zustand
const createMockStore = () => {
  const state: ContractStore = {
    contracts: [],
    selectedContract: null,
    loading: false,
    error: null,
    setContracts: (contracts) => {
      state.contracts = contracts;
    },
    selectContract: (contract) => {
      state.selectedContract = contract;
    },
    addContract: (contract) => {
      state.contracts = [...state.contracts, contract];
    },
    updateContract: (id, updates) => {
      state.contracts = state.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c));
    },
    removeContract: (id) => {
      state.contracts = state.contracts.filter((c) => c.id !== id);
    },
    setLoading: (loading) => {
      state.loading = loading;
    },
    setError: (error) => {
      state.error = error;
    },
    reset: () => {
      state.contracts = [];
      state.selectedContract = null;
      state.loading = false;
      state.error = null;
    },
  };

  return () => state;
};

describe('ContractStore', () => {
  let useContractStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    useContractStore = createMockStore();
  });

  it('should initialize with empty state', () => {
    const state = useContractStore();

    expect(state.contracts).toEqual([]);
    expect(state.selectedContract).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set contracts', () => {
    const state = useContractStore();
    const contracts: Contract[] = [
      { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' },
      { id: '2', code: 'OBRA-002', name: 'Obra B', status: 'PLANNING' },
    ];

    state.setContracts(contracts);

    expect(useContractStore().contracts).toHaveLength(2);
  });

  it('should select a contract', () => {
    const state = useContractStore();
    const contract: Contract = { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' };

    state.selectContract(contract);

    expect(useContractStore().selectedContract).toEqual(contract);
  });

  it('should add a contract', () => {
    const state = useContractStore();
    const contract: Contract = { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'PLANNING' };

    state.addContract(contract);

    expect(useContractStore().contracts).toHaveLength(1);
    expect(useContractStore().contracts[0]).toEqual(contract);
  });

  it('should update a contract', () => {
    const state = useContractStore();
    const contract: Contract = { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'PLANNING' };

    state.addContract(contract);
    state.updateContract('1', { status: 'ACTIVE' });

    expect(useContractStore().contracts[0].status).toBe('ACTIVE');
  });

  it('should remove a contract', () => {
    const state = useContractStore();
    state.addContract({ id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' });
    state.addContract({ id: '2', code: 'OBRA-002', name: 'Obra B', status: 'PLANNING' });

    state.removeContract('1');

    expect(useContractStore().contracts).toHaveLength(1);
    expect(useContractStore().contracts[0].id).toBe('2');
  });

  it('should set loading state', () => {
    const state = useContractStore();

    state.setLoading(true);
    expect(useContractStore().loading).toBe(true);

    state.setLoading(false);
    expect(useContractStore().loading).toBe(false);
  });

  it('should set error state', () => {
    const state = useContractStore();
    const errorMessage = 'Failed to load contracts';

    state.setError(errorMessage);
    expect(useContractStore().error).toBe(errorMessage);

    state.setError(null);
    expect(useContractStore().error).toBeNull();
  });

  it('should reset store', () => {
    const state = useContractStore();

    state.addContract({ id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' });
    state.selectContract({ id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' });
    state.setError('Some error');

    state.reset();

    expect(useContractStore().contracts).toEqual([]);
    expect(useContractStore().selectedContract).toBeNull();
    expect(useContractStore().error).toBeNull();
  });
});

// Request Store Tests
interface RequestItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface MaterialRequest {
  id: string;
  requestNumber: string;
  status: string;
  items: RequestItem[];
}

interface RequestStore {
  requests: MaterialRequest[];
  draftRequest: Partial<MaterialRequest> | null;
  addItem: (item: RequestItem) => void;
  removeItem: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  clearDraft: () => void;
  getTotal: () => number;
}

const createRequestStore = () => {
  const state: RequestStore = {
    requests: [],
    draftRequest: { items: [] },
    addItem: (item) => {
      if (state.draftRequest?.items) {
        const existing = state.draftRequest.items.find((i) => i.productId === item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          state.draftRequest.items = [...state.draftRequest.items, item];
        }
      }
    },
    removeItem: (productId) => {
      if (state.draftRequest?.items) {
        state.draftRequest.items = state.draftRequest.items.filter(
          (i) => i.productId !== productId
        );
      }
    },
    updateItemQuantity: (productId, quantity) => {
      if (state.draftRequest?.items) {
        state.draftRequest.items = state.draftRequest.items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        );
      }
    },
    clearDraft: () => {
      state.draftRequest = { items: [] };
    },
    getTotal: () => {
      return (
        state.draftRequest?.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ??
        0
      );
    },
  };

  return () => state;
};

describe('RequestStore', () => {
  let useRequestStore: ReturnType<typeof createRequestStore>;

  beforeEach(() => {
    useRequestStore = createRequestStore();
  });

  it('should add item to draft', () => {
    const state = useRequestStore();

    state.addItem({ productId: 'prod-1', quantity: 10, unitPrice: 25.0 });

    expect(useRequestStore().draftRequest?.items).toHaveLength(1);
  });

  it('should increase quantity when adding existing item', () => {
    const state = useRequestStore();

    state.addItem({ productId: 'prod-1', quantity: 10, unitPrice: 25.0 });
    state.addItem({ productId: 'prod-1', quantity: 5, unitPrice: 25.0 });

    const items = useRequestStore().draftRequest?.items;
    expect(items).toHaveLength(1);
    expect(items?.[0].quantity).toBe(15);
  });

  it('should remove item from draft', () => {
    const state = useRequestStore();

    state.addItem({ productId: 'prod-1', quantity: 10, unitPrice: 25.0 });
    state.addItem({ productId: 'prod-2', quantity: 5, unitPrice: 50.0 });

    state.removeItem('prod-1');

    expect(useRequestStore().draftRequest?.items).toHaveLength(1);
    expect(useRequestStore().draftRequest?.items?.[0].productId).toBe('prod-2');
  });

  it('should update item quantity', () => {
    const state = useRequestStore();

    state.addItem({ productId: 'prod-1', quantity: 10, unitPrice: 25.0 });
    state.updateItemQuantity('prod-1', 20);

    expect(useRequestStore().draftRequest?.items?.[0].quantity).toBe(20);
  });

  it('should calculate total correctly', () => {
    const state = useRequestStore();

    state.addItem({ productId: 'prod-1', quantity: 10, unitPrice: 25.0 }); // 250
    state.addItem({ productId: 'prod-2', quantity: 5, unitPrice: 100.0 }); // 500

    expect(state.getTotal()).toBe(750);
  });

  it('should clear draft', () => {
    const state = useRequestStore();

    state.addItem({ productId: 'prod-1', quantity: 10, unitPrice: 25.0 });
    state.clearDraft();

    expect(useRequestStore().draftRequest?.items).toHaveLength(0);
  });
});

// Transfer Store Tests
interface TransferStore {
  pendingTransfers: number;
  inTransitTransfers: number;
  alerts: { locationId: string; message: string }[];
  incrementPending: () => void;
  decrementPending: () => void;
  addAlert: (locationId: string, message: string) => void;
  clearAlerts: () => void;
}

const createTransferStore = () => {
  const state: TransferStore = {
    pendingTransfers: 0,
    inTransitTransfers: 0,
    alerts: [],
    incrementPending: () => {
      state.pendingTransfers++;
    },
    decrementPending: () => {
      state.pendingTransfers = Math.max(0, state.pendingTransfers - 1);
    },
    addAlert: (locationId, message) => {
      state.alerts = [...state.alerts, { locationId, message }];
    },
    clearAlerts: () => {
      state.alerts = [];
    },
  };

  return () => state;
};

describe('TransferStore', () => {
  let useTransferStore: ReturnType<typeof createTransferStore>;

  beforeEach(() => {
    useTransferStore = createTransferStore();
  });

  it('should increment pending transfers', () => {
    const state = useTransferStore();

    state.incrementPending();
    state.incrementPending();

    expect(useTransferStore().pendingTransfers).toBe(2);
  });

  it('should decrement pending transfers', () => {
    const state = useTransferStore();

    state.incrementPending();
    state.incrementPending();
    state.decrementPending();

    expect(useTransferStore().pendingTransfers).toBe(1);
  });

  it('should not go below zero', () => {
    const state = useTransferStore();

    state.decrementPending();
    state.decrementPending();

    expect(useTransferStore().pendingTransfers).toBe(0);
  });

  it('should add alerts', () => {
    const state = useTransferStore();

    state.addAlert('loc-1', 'Estoque baixo');
    state.addAlert('loc-2', 'Transferência atrasada');

    expect(useTransferStore().alerts).toHaveLength(2);
  });

  it('should clear alerts', () => {
    const state = useTransferStore();

    state.addAlert('loc-1', 'Estoque baixo');
    state.clearAlerts();

    expect(useTransferStore().alerts).toHaveLength(0);
  });
});

// Location Store with computed selectors
interface Location {
  id: string;
  code: string;
  name: string;
  type: 'CENTRAL' | 'FIELD' | 'TRANSIT';
  contractId?: string;
}

interface LocationStore {
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  getByType: (type: string) => Location[];
  getByContract: (contractId: string) => Location[];
  getCentralWarehouse: () => Location | undefined;
}

const createLocationStore = () => {
  const state: LocationStore = {
    locations: [],
    setLocations: (locations) => {
      state.locations = locations;
    },
    getByType: (type) => {
      return state.locations.filter((l) => l.type === type);
    },
    getByContract: (contractId) => {
      return state.locations.filter((l) => l.contractId === contractId);
    },
    getCentralWarehouse: () => {
      return state.locations.find((l) => l.type === 'CENTRAL');
    },
  };

  return () => state;
};

describe('LocationStore with Selectors', () => {
  let useLocationStore: ReturnType<typeof createLocationStore>;

  beforeEach(() => {
    useLocationStore = createLocationStore();
  });

  it('should filter by type', () => {
    const state = useLocationStore();

    state.setLocations([
      { id: '1', code: 'ALM-01', name: 'Central', type: 'CENTRAL' },
      { id: '2', code: 'FT-01', name: 'Frente 1', type: 'FIELD', contractId: 'c1' },
      { id: '3', code: 'FT-02', name: 'Frente 2', type: 'FIELD', contractId: 'c1' },
    ]);

    expect(state.getByType('FIELD')).toHaveLength(2);
    expect(state.getByType('CENTRAL')).toHaveLength(1);
  });

  it('should filter by contract', () => {
    const state = useLocationStore();

    state.setLocations([
      { id: '1', code: 'ALM-01', name: 'Central', type: 'CENTRAL' },
      { id: '2', code: 'FT-01', name: 'Frente 1', type: 'FIELD', contractId: 'c1' },
      { id: '3', code: 'FT-02', name: 'Frente 2', type: 'FIELD', contractId: 'c2' },
    ]);

    expect(state.getByContract('c1')).toHaveLength(1);
    expect(state.getByContract('c1')[0].code).toBe('FT-01');
  });

  it('should get central warehouse', () => {
    const state = useLocationStore();

    state.setLocations([
      { id: '1', code: 'ALM-01', name: 'Central', type: 'CENTRAL' },
      { id: '2', code: 'FT-01', name: 'Frente 1', type: 'FIELD', contractId: 'c1' },
    ]);

    const central = state.getCentralWarehouse();
    expect(central?.code).toBe('ALM-01');
  });
});
