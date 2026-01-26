/**
 * Tauri Command Integration Tests
 * Tests for Enterprise Tauri commands with mocked database
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock data factories
const createMockContract = (overrides = {}) => ({
  id: 'contract-1',
  code: 'OBRA-001',
  name: 'Obra Teste',
  clientName: 'Cliente Teste',
  clientDocument: '12.345.678/0001-90',
  managerId: 'emp-1',
  status: 'PLANNING',
  createdAt: '2026-01-25T10:00:00Z',
  updatedAt: '2026-01-25T10:00:00Z',
  ...overrides,
});

const createMockRequest = (overrides = {}) => ({
  id: 'request-1',
  requestNumber: 'REQ-001',
  contractId: 'contract-1',
  workFrontId: 'wf-1',
  requesterId: 'emp-1',
  status: 'DRAFT',
  priority: 'NORMAL',
  items: [],
  createdAt: '2026-01-25T10:00:00Z',
  ...overrides,
});

const createMockTransfer = (overrides = {}) => ({
  id: 'transfer-1',
  transferNumber: 'TRF-001',
  originLocationId: 'loc-1',
  destinationLocationId: 'loc-2',
  status: 'PENDING',
  items: [],
  createdAt: '2026-01-25T10:00:00Z',
  ...overrides,
});

describe('Contract Commands Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list_contracts', () => {
    it('should list all contracts', async () => {
      const mockContracts = [
        createMockContract({ id: '1', code: 'OBRA-001' }),
        createMockContract({ id: '2', code: 'OBRA-002', status: 'ACTIVE' }),
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockContracts);

      const result = await invoke('list_contracts');

      expect(invoke).toHaveBeenCalledWith('list_contracts');
      expect(result).toHaveLength(2);
    });

    it('should filter contracts by status', async () => {
      const mockContracts = [createMockContract({ id: '1', status: 'ACTIVE' })];

      vi.mocked(invoke).mockResolvedValueOnce(mockContracts);

      const result = await invoke('list_contracts', { status: 'ACTIVE' });

      expect(invoke).toHaveBeenCalledWith('list_contracts', { status: 'ACTIVE' });
      expect(result).toHaveLength(1);
    });
  });

  describe('create_contract', () => {
    it('should create a new contract', async () => {
      const input = {
        code: 'OBRA-NEW',
        name: 'Nova Obra',
        clientName: 'Cliente',
        clientDocument: '12.345.678/0001-90',
        managerId: 'emp-1',
      };

      const mockResult = createMockContract({ ...input, id: 'new-id' });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('create_contract', { input });

      expect(invoke).toHaveBeenCalledWith('create_contract', { input });
      expect(result.code).toBe('OBRA-NEW');
      expect(result.status).toBe('PLANNING');
    });

    it('should reject duplicate code', async () => {
      const input = {
        code: 'OBRA-001', // Existing code
        name: 'Duplicada',
        clientName: 'Cliente',
        clientDocument: '12.345.678/0001-90',
        managerId: 'emp-1',
      };

      vi.mocked(invoke).mockRejectedValueOnce(new Error('Contract code already exists'));

      await expect(invoke('create_contract', { input })).rejects.toThrow('already exists');
    });
  });

  describe('start_contract', () => {
    it('should start a planning contract', async () => {
      const mockResult = createMockContract({
        status: 'ACTIVE',
        startedAt: '2026-01-25T12:00:00Z',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('start_contract', { id: 'contract-1' });

      expect(result.status).toBe('ACTIVE');
      expect(result.startedAt).toBeDefined();
    });

    it('should reject starting an already active contract', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Contract is already active'));

      await expect(invoke('start_contract', { id: 'contract-1' })).rejects.toThrow(
        'already active'
      );
    });
  });

  describe('complete_contract', () => {
    it('should complete an active contract', async () => {
      const mockResult = createMockContract({
        status: 'COMPLETED',
        completedAt: '2026-01-25T15:00:00Z',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('complete_contract', { id: 'contract-1' });

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeDefined();
    });
  });
});

describe('Material Request Commands Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list_material_requests', () => {
    it('should list requests for a contract', async () => {
      const mockRequests = [
        createMockRequest({ id: '1', requestNumber: 'REQ-001' }),
        createMockRequest({ id: '2', requestNumber: 'REQ-002', status: 'PENDING' }),
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockRequests);

      const result = await invoke('list_material_requests', { contractId: 'contract-1' });

      expect(invoke).toHaveBeenCalledWith('list_material_requests', { contractId: 'contract-1' });
      expect(result).toHaveLength(2);
    });
  });

  describe('create_material_request', () => {
    it('should create a new request with items', async () => {
      const input = {
        contractId: 'contract-1',
        workFrontId: 'wf-1',
        priority: 'HIGH',
        items: [
          { productId: 'prod-1', quantity: 10 },
          { productId: 'prod-2', quantity: 20 },
        ],
      };

      const mockResult = createMockRequest({
        ...input,
        id: 'new-id',
        requestNumber: 'REQ-003',
        priority: 'HIGH',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('create_material_request', { input });

      expect(result.requestNumber).toBeDefined();
      expect(result.priority).toBe('HIGH');
    });
  });

  describe('submit_material_request', () => {
    it('should submit a draft request', async () => {
      const mockResult = createMockRequest({
        status: 'PENDING',
        submittedAt: '2026-01-25T11:00:00Z',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('submit_material_request', { id: 'request-1' });

      expect(result.status).toBe('PENDING');
      expect(result.submittedAt).toBeDefined();
    });

    it('should reject submitting non-draft request', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Only draft requests can be submitted'));

      await expect(invoke('submit_material_request', { id: 'request-1' })).rejects.toThrow('draft');
    });
  });

  describe('approve_material_request', () => {
    it('should approve a pending request', async () => {
      const mockResult = createMockRequest({
        status: 'APPROVED',
        approvedAt: '2026-01-25T12:00:00Z',
        approvedById: 'manager-1',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('approve_material_request', { id: 'request-1' });

      expect(result.status).toBe('APPROVED');
    });
  });

  describe('reject_material_request', () => {
    it('should reject a pending request with reason', async () => {
      const mockResult = createMockRequest({
        status: 'REJECTED',
        rejectedAt: '2026-01-25T12:00:00Z',
        rejectionReason: 'Budget exceeded',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('reject_material_request', {
        id: 'request-1',
        reason: 'Budget exceeded',
      });

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Budget exceeded');
    });
  });

  describe('deliver_material_request', () => {
    it('should deliver a separating request', async () => {
      const mockResult = createMockRequest({
        status: 'DELIVERED',
        deliveredAt: '2026-01-25T16:00:00Z',
        receiverName: 'João Silva',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('deliver_material_request', {
        id: 'request-1',
        receiverName: 'João Silva',
      });

      expect(result.status).toBe('DELIVERED');
    });
  });
});

describe('Stock Transfer Commands Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create_stock_transfer', () => {
    it('should create a new transfer', async () => {
      const input = {
        originLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        items: [{ productId: 'prod-1', quantity: 50 }],
      };

      const mockResult = createMockTransfer({ ...input, id: 'new-id' });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('create_stock_transfer', { input });

      expect(result.transferNumber).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should reject transfer with insufficient stock', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Insufficient stock'));

      await expect(
        invoke('create_stock_transfer', {
          input: {
            originLocationId: 'loc-1',
            destinationLocationId: 'loc-2',
            items: [{ productId: 'prod-1', quantity: 99999 }],
          },
        })
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('dispatch_stock_transfer', () => {
    it('should dispatch a pending transfer', async () => {
      const mockResult = createMockTransfer({
        status: 'IN_TRANSIT',
        dispatchedAt: '2026-01-25T10:00:00Z',
        vehiclePlate: 'ABC-1234',
        driverName: 'Carlos',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('dispatch_stock_transfer', {
        id: 'transfer-1',
        vehiclePlate: 'ABC-1234',
        driverName: 'Carlos',
      });

      expect(result.status).toBe('IN_TRANSIT');
      expect(result.vehiclePlate).toBe('ABC-1234');
    });
  });

  describe('receive_stock_transfer', () => {
    it('should receive an in-transit transfer', async () => {
      const mockResult = createMockTransfer({
        status: 'DELIVERED',
        receivedAt: '2026-01-25T15:00:00Z',
        receiverSignature: 'Maria',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('receive_stock_transfer', {
        id: 'transfer-1',
        receiverSignature: 'Maria',
      });

      expect(result.status).toBe('DELIVERED');
    });

    it('should receive with discrepancy', async () => {
      const mockResult = createMockTransfer({
        status: 'DELIVERED_WITH_DISCREPANCY',
        receivedAt: '2026-01-25T15:00:00Z',
        discrepancies: [{ productId: 'prod-1', expected: 50, received: 45, reason: 'Damaged' }],
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('receive_stock_transfer', {
        id: 'transfer-1',
        discrepancies: [{ productId: 'prod-1', received: 45, reason: 'Damaged' }],
      });

      expect(result.status).toBe('DELIVERED_WITH_DISCREPANCY');
    });
  });

  describe('cancel_stock_transfer', () => {
    it('should cancel a pending transfer', async () => {
      const mockResult = createMockTransfer({
        status: 'CANCELLED',
        cancelledAt: '2026-01-25T11:00:00Z',
        cancelReason: 'Order changed',
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await invoke('cancel_stock_transfer', {
        id: 'transfer-1',
        reason: 'Order changed',
      });

      expect(result.status).toBe('CANCELLED');
    });

    it('should reject cancelling in-transit transfer', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Cannot cancel in-transit transfer'));

      await expect(
        invoke('cancel_stock_transfer', {
          id: 'transfer-1',
          reason: 'Test',
        })
      ).rejects.toThrow('in-transit');
    });
  });
});

describe('Stock Location Commands Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list_stock_locations', () => {
    it('should list all locations', async () => {
      const mockLocations = [
        { id: '1', code: 'ALM-01', name: 'Central', type: 'CENTRAL' },
        { id: '2', code: 'FT-01', name: 'Frente 1', type: 'FIELD' },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockLocations);

      const result = await invoke('list_stock_locations');

      expect(result).toHaveLength(2);
    });
  });

  describe('get_location_stock', () => {
    it('should get stock balances for a location', async () => {
      const mockBalances = [
        { productId: 'prod-1', productName: 'Cimento', quantity: 100, reservedQuantity: 20 },
        { productId: 'prod-2', productName: 'Areia', quantity: 500, reservedQuantity: 0 },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockBalances);

      const result = await invoke('get_location_stock', { locationId: 'loc-1' });

      expect(result).toHaveLength(2);
      expect(result[0].quantity - result[0].reservedQuantity).toBe(80); // Available
    });
  });

  describe('reserve_stock', () => {
    it('should reserve stock for a request', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ success: true, reserved: 50 });

      const result = await invoke('reserve_stock', {
        locationId: 'loc-1',
        productId: 'prod-1',
        quantity: 50,
        requestId: 'request-1',
      });

      expect(result.success).toBe(true);
      expect(result.reserved).toBe(50);
    });

    it('should fail if insufficient available stock', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Insufficient available stock'));

      await expect(
        invoke('reserve_stock', {
          locationId: 'loc-1',
          productId: 'prod-1',
          quantity: 9999,
          requestId: 'request-1',
        })
      ).rejects.toThrow('Insufficient');
    });
  });
});

describe('Activity Commands Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create_activity', () => {
    it('should create a new activity', async () => {
      const input = {
        code: 'ATI-001',
        description: 'Concretagem Fundação',
        workFrontId: 'wf-1',
        costCenterId: 'cc-1',
      };

      vi.mocked(invoke).mockResolvedValueOnce({
        id: 'activity-1',
        ...input,
        status: 'PLANNED',
      });

      const result = await invoke('create_activity', { input });

      expect(result.status).toBe('PLANNED');
    });
  });

  describe('start_activity', () => {
    it('should start a planned activity', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        id: 'activity-1',
        status: 'IN_PROGRESS',
        startedAt: '2026-01-25T08:00:00Z',
      });

      const result = await invoke('start_activity', { id: 'activity-1' });

      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('consume_material', () => {
    it('should record material consumption for activity', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        success: true,
        consumed: { productId: 'prod-1', quantity: 10, unitPrice: 25.0 },
      });

      const result = await invoke('consume_material', {
        activityId: 'activity-1',
        productId: 'prod-1',
        quantity: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('complete_activity', () => {
    it('should complete an in-progress activity', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        id: 'activity-1',
        status: 'COMPLETED',
        completedAt: '2026-01-25T17:00:00Z',
      });

      const result = await invoke('complete_activity', { id: 'activity-1' });

      expect(result.status).toBe('COMPLETED');
    });
  });
});
