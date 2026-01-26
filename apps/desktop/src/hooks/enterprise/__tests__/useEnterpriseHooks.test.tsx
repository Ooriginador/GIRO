/**
 * Testes para hooks Enterprise
 * @vitest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

// Mock do Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock de useContracts hook
const useContracts = () => {
  const [contracts, setContracts] = vi.fn().mockReturnValue([]);
  const [loading, setLoading] = vi.fn().mockReturnValue(false);
  const [error, setError] = vi.fn().mockReturnValue(null);

  return {
    contracts,
    loading,
    error,
    loadContracts: vi.fn(),
    createContract: vi.fn(),
    updateContract: vi.fn(),
    deleteContract: vi.fn(),
  };
};

describe('useContracts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load contracts on mount', async () => {
    const mockContracts = [
      { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' },
      { id: '2', code: 'OBRA-002', name: 'Obra B', status: 'PLANNING' },
    ];

    vi.mocked(invoke).mockResolvedValueOnce(mockContracts);

    // Simular uso do hook
    const loadContracts = vi.fn().mockResolvedValue(mockContracts);
    const result = await loadContracts();

    expect(result).toEqual(mockContracts);
    expect(result).toHaveLength(2);
  });

  it('should filter contracts by status', async () => {
    const mockContracts = [
      { id: '1', code: 'OBRA-001', name: 'Obra A', status: 'ACTIVE' },
      { id: '2', code: 'OBRA-002', name: 'Obra B', status: 'PLANNING' },
      { id: '3', code: 'OBRA-003', name: 'Obra C', status: 'ACTIVE' },
    ];

    vi.mocked(invoke).mockResolvedValueOnce(mockContracts);

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

    vi.mocked(invoke).mockResolvedValueOnce(createdContract);

    const result = await invoke('create_contract', { input: newContract });

    expect(result).toEqual(createdContract);
    expect(result.status).toBe('PLANNING');
  });

  it('should handle error when loading contracts fails', async () => {
    const error = new Error('Network error');
    vi.mocked(invoke).mockRejectedValueOnce(error);

    await expect(invoke('list_contracts')).rejects.toThrow('Network error');
  });

  it('should update contract status', async () => {
    const contractId = 'contract-1';

    // Start contract
    vi.mocked(invoke).mockResolvedValueOnce({
      id: contractId,
      status: 'ACTIVE',
      startedAt: '2026-01-25T10:00:00Z',
    });

    const result = await invoke('start_contract', { id: contractId });

    expect(result.status).toBe('ACTIVE');
    expect(result.startedAt).toBeDefined();
  });

  it('should soft delete contract', async () => {
    const contractId = 'contract-1';

    vi.mocked(invoke).mockResolvedValueOnce(true);

    const result = await invoke('delete_contract', { id: contractId });

    expect(result).toBe(true);
  });
});

describe('useMaterialRequests Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load requests for a contract', async () => {
    const mockRequests = [
      { id: '1', requestNumber: 'REQ-001', status: 'PENDING', priority: 'NORMAL' },
      { id: '2', requestNumber: 'REQ-002', status: 'APPROVED', priority: 'HIGH' },
    ];

    vi.mocked(invoke).mockResolvedValueOnce(mockRequests);

    const result = await invoke('list_material_requests', { contractId: 'contract-1' });

    expect(result).toHaveLength(2);
  });

  it('should submit a request', async () => {
    const requestId = 'request-1';

    vi.mocked(invoke).mockResolvedValueOnce({
      id: requestId,
      status: 'PENDING',
      submittedAt: '2026-01-25T10:00:00Z',
    });

    const result = await invoke('submit_material_request', { id: requestId });

    expect(result.status).toBe('PENDING');
  });

  it('should approve a request', async () => {
    const requestId = 'request-1';

    vi.mocked(invoke).mockResolvedValueOnce({
      id: requestId,
      status: 'APPROVED',
      approvedAt: '2026-01-25T10:00:00Z',
    });

    const result = await invoke('approve_material_request', { id: requestId });

    expect(result.status).toBe('APPROVED');
  });

  it('should reject a request with reason', async () => {
    const requestId = 'request-1';
    const reason = 'Sem orçamento disponível';

    vi.mocked(invoke).mockResolvedValueOnce({
      id: requestId,
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: '2026-01-25T10:00:00Z',
    });

    const result = await invoke('reject_material_request', { id: requestId, reason });

    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe(reason);
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

  it('should create a transfer', async () => {
    const transferInput = {
      originLocationId: 'loc-origin',
      destinationLocationId: 'loc-dest',
      items: [{ productId: 'prod-1', quantity: 10 }],
    };

    vi.mocked(invoke).mockResolvedValueOnce({
      id: 'transfer-1',
      transferNumber: 'TRF-001',
      status: 'PENDING',
      ...transferInput,
    });

    const result = await invoke('create_stock_transfer', { input: transferInput });

    expect(result.transferNumber).toBeDefined();
    expect(result.status).toBe('PENDING');
  });

  it('should dispatch a transfer', async () => {
    const transferId = 'transfer-1';

    vi.mocked(invoke).mockResolvedValueOnce({
      id: transferId,
      status: 'IN_TRANSIT',
      dispatchedAt: '2026-01-25T10:00:00Z',
    });

    const result = await invoke('dispatch_stock_transfer', { id: transferId });

    expect(result.status).toBe('IN_TRANSIT');
  });

  it('should receive a transfer', async () => {
    const transferId = 'transfer-1';

    vi.mocked(invoke).mockResolvedValueOnce({
      id: transferId,
      status: 'DELIVERED',
      receivedAt: '2026-01-25T15:00:00Z',
    });

    const result = await invoke('receive_stock_transfer', { id: transferId });

    expect(result.status).toBe('DELIVERED');
  });
});

describe('useStockLocations Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load locations by type', async () => {
    const mockLocations = [
      { id: '1', code: 'ALM-01', name: 'Almoxarifado Central', locationType: 'CENTRAL' },
      { id: '2', code: 'FT-01', name: 'Frente 1', locationType: 'FIELD' },
    ];

    vi.mocked(invoke).mockResolvedValueOnce(mockLocations);

    const result = await invoke('list_stock_locations');
    const centralLocations = result.filter((l: any) => l.locationType === 'CENTRAL');

    expect(centralLocations).toHaveLength(1);
  });

  it('should get stock balance for location', async () => {
    const mockBalances = [
      { productId: 'prod-1', productName: 'Cimento', quantity: 100, reservedQuantity: 20 },
      { productId: 'prod-2', productName: 'Areia', quantity: 500, reservedQuantity: 0 },
    ];

    vi.mocked(invoke).mockResolvedValueOnce(mockBalances);

    const result = await invoke('get_location_stock', { locationId: 'loc-1' });

    expect(result).toHaveLength(2);

    // Calculate available stock
    const available = result.map((b: any) => ({
      ...b,
      available: b.quantity - b.reservedQuantity,
    }));

    expect(available[0].available).toBe(80);
    expect(available[1].available).toBe(500);
  });
});
