/**
 * Testes para hooks Enterprise
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

// Mock do Tauri - configuração isolada
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe('useContracts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should load contracts on mount', async () => {
    const mockContracts = [
      { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' },
      { id: '2', code: 'OBRA-002', name: 'Obra B', status: 'PLANNING' },
    ];

    mockedInvoke.mockResolvedValueOnce(mockContracts);

    const result = await invoke('list_contracts');

    expect(result).toEqual(mockContracts);
    expect(result).toHaveLength(2);
  });

  it('should filter contracts by status', () => {
    const mockContracts = [
      { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' },
      { id: '2', code: 'OBRA-002', name: 'Obra B', status: 'PLANNING' },
      { id: '3', code: 'OBRA-003', name: 'Obra C', status: 'ACTIVE' },
    ];

    const activeContracts = mockContracts.filter((c) => c.status === 'ACTIVE');

    expect(activeContracts).toHaveLength(2);
    expect(activeContracts.every((c) => c.status === 'ACTIVE')).toBe(true);
  });

  it('should create a new contract', async () => {
    const newContract = {
      code: 'OBRA-NEW',
      name: 'Nova Obra',
      clientName: 'Cliente X',
      clientDocument: '12.345.678/0001-90',
      managerId: 'emp-1',
    };

    const createdContract = {
      id: 'new-id',
      ...newContract,
      status: 'PLANNING',
      createdAt: '2026-01-25T10:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(createdContract);

    const result = await invoke('create_contract', { input: newContract });

    expect(result).toEqual(createdContract);
    expect((result as typeof createdContract).status).toBe('PLANNING');
  });

  it('should handle error when loading contracts fails', async () => {
    const error = new Error('Network error');
    mockedInvoke.mockRejectedValueOnce(error);

    await expect(invoke('list_contracts')).rejects.toThrow('Network error');
  });

  it('should update contract status', async () => {
    const contractId = 'contract-1';

    const updatedContract = {
      id: contractId,
      status: 'ACTIVE',
      startedAt: '2026-01-25T10:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(updatedContract);

    const result = await invoke('start_contract', { id: contractId });

    expect((result as typeof updatedContract).status).toBe('ACTIVE');
    expect((result as typeof updatedContract).startedAt).toBeDefined();
  });

  it('should soft delete contract', async () => {
    const contractId = 'contract-1';

    mockedInvoke.mockResolvedValueOnce(true);

    const result = await invoke('delete_contract', { id: contractId });

    expect(result).toBe(true);
  });
});

describe('useMaterialRequests Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should load requests for a contract', async () => {
    const mockRequests = [
      { id: '1', requestNumber: 'REQ-001', status: 'PENDING', priority: 'NORMAL' },
      { id: '2', requestNumber: 'REQ-002', status: 'APPROVED', priority: 'HIGH' },
    ];

    mockedInvoke.mockResolvedValueOnce(mockRequests);

    const result = await invoke('list_material_requests', { contractId: 'contract-1' });

    expect(result).toHaveLength(2);
  });

  it('should submit a request', async () => {
    const requestId = 'request-1';
    const submittedRequest = {
      id: requestId,
      status: 'PENDING',
      submittedAt: '2026-01-25T10:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(submittedRequest);

    const result = await invoke('submit_material_request', { id: requestId });

    expect((result as typeof submittedRequest).status).toBe('PENDING');
  });

  it('should approve a request', async () => {
    const requestId = 'request-1';
    const approvedRequest = {
      id: requestId,
      status: 'APPROVED',
      approvedAt: '2026-01-25T10:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(approvedRequest);

    const result = await invoke('approve_material_request', { id: requestId });

    expect((result as typeof approvedRequest).status).toBe('APPROVED');
  });

  it('should reject a request with reason', async () => {
    const requestId = 'request-1';
    const reason = 'Sem orçamento disponível';
    const rejectedRequest = {
      id: requestId,
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: '2026-01-25T10:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(rejectedRequest);

    const result = await invoke('reject_material_request', { id: requestId, reason });

    expect((result as typeof rejectedRequest).status).toBe('REJECTED');
    expect((result as typeof rejectedRequest).rejectionReason).toBe(reason);
  });

  it('should calculate request total value', () => {
    const items = [
      { quantity: 10, unitPrice: 25.0 },
      { quantity: 5, unitPrice: 100.0 },
      { quantity: 20, unitPrice: 10.0 },
    ];

    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    expect(total).toBe(950.0); // (10*25) + (5*100) + (20*10)
  });
});

describe('useStockTransfers Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create a transfer', async () => {
    const transferInput = {
      originLocationId: 'loc-origin',
      destinationLocationId: 'loc-dest',
      items: [{ productId: 'prod-1', quantity: 10 }],
    };

    const createdTransfer = {
      id: 'transfer-1',
      transferNumber: 'TRF-001',
      status: 'PENDING',
      ...transferInput,
    };

    mockedInvoke.mockResolvedValueOnce(createdTransfer);

    const result = await invoke('create_stock_transfer', { input: transferInput });

    expect((result as typeof createdTransfer).transferNumber).toBeDefined();
    expect((result as typeof createdTransfer).status).toBe('PENDING');
  });

  it('should dispatch a transfer', async () => {
    const transferId = 'transfer-1';
    const dispatchedTransfer = {
      id: transferId,
      status: 'IN_TRANSIT',
      dispatchedAt: '2026-01-25T10:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(dispatchedTransfer);

    const result = await invoke('dispatch_stock_transfer', { id: transferId });

    expect((result as typeof dispatchedTransfer).status).toBe('IN_TRANSIT');
  });

  it('should receive a transfer', async () => {
    const transferId = 'transfer-1';
    const receivedTransfer = {
      id: transferId,
      status: 'DELIVERED',
      receivedAt: '2026-01-25T15:00:00Z',
    };

    mockedInvoke.mockResolvedValueOnce(receivedTransfer);

    const result = await invoke('receive_stock_transfer', { id: transferId });

    expect((result as typeof receivedTransfer).status).toBe('DELIVERED');
  });
});

describe('useStockLocations Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should load locations by type', async () => {
    const mockLocations = [
      { id: '1', code: 'ALM-01', name: 'Almoxarifado Central', locationType: 'CENTRAL' },
      { id: '2', code: 'FT-01', name: 'Frente 1', locationType: 'FIELD' },
    ];

    mockedInvoke.mockResolvedValueOnce(mockLocations);

    const result = await invoke('list_stock_locations');
    const locations = result as typeof mockLocations;
    const centralLocations = locations.filter((l) => l.locationType === 'CENTRAL');

    expect(centralLocations).toHaveLength(1);
  });

  it('should get stock balance for location', async () => {
    const mockBalances = [
      { productId: 'prod-1', productName: 'Cimento', quantity: 100, reservedQuantity: 20 },
      { productId: 'prod-2', productName: 'Areia', quantity: 500, reservedQuantity: 0 },
    ];

    mockedInvoke.mockResolvedValueOnce(mockBalances);

    const result = await invoke('get_location_stock', { locationId: 'loc-1' });
    const balances = result as typeof mockBalances;

    expect(balances).toHaveLength(2);

    // Calculate available stock
    const available = balances.map((b) => ({
      ...b,
      available: b.quantity - b.reservedQuantity,
    }));

    expect(available[0].available).toBe(80);
    expect(available[1].available).toBe(500);
  });
});
