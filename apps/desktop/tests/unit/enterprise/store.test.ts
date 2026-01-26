/**
 * @file Testes - Enterprise Store
 * @description Testes unitários para o store Zustand do módulo Enterprise
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnterpriseStore } from '@/stores/useEnterpriseStore';
import type { Contract, MaterialRequest, StockTransfer, WorkFront, StockLocation } from '@/types/enterprise';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Enterprise Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEnterpriseStore());
    act(() => {
      result.current.resetStore();
    });
    vi.clearAllMocks();
  });

  describe('Contract State', () => {
    const mockContract: Contract = {
      id: 'c-001',
      code: 'OBRA-2026-001',
      name: 'Construção Industrial',
      clientName: 'Cliente XPTO',
      clientDocument: '12.345.678/0001-90',
      managerId: 'mgr-1',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should set selected contract', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.selectContract(mockContract);
      });
      expect(result.current.selectedContract).toEqual(mockContract);
    });

    it('should clear selected contract', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.selectContract(mockContract);
      });
      act(() => {
        result.current.selectContract(null);
      });
      expect(result.current.selectedContract).toBeNull();
    });

    it('should track contracts list', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      const contracts = [mockContract, { ...mockContract, id: 'c-002', code: 'OBRA-002' }];
      act(() => {
        result.current.setContracts(contracts);
      });
      expect(result.current.contracts).toHaveLength(2);
    });

    it('should set contract filters', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setContractFilters({ status: 'ACTIVE', search: 'test' });
      });
      expect(result.current.contractFilters.status).toBe('ACTIVE');
      expect(result.current.contractFilters.search).toBe('test');
    });

    it('should reset contract filters', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setContractFilters({ status: 'ACTIVE' });
        result.current.resetContractFilters();
      });
      expect(result.current.contractFilters.status).toBe('ALL');
    });
  });

  describe('Request State', () => {
    const mockRequest: MaterialRequest = {
      id: 'req-001',
      code: 'REQ-2026-001',
      contractId: 'c-001',
      workFrontId: 'wf-001',
      requesterId: 'user-1',
      destinationLocationId: 'loc-1',
      status: 'PENDING',
      priority: 'NORMAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should set requests list', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setRequests([mockRequest]);
      });
      expect(result.current.requests).toHaveLength(1);
    });

    it('should select request', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.selectRequest(mockRequest);
      });
      expect(result.current.selectedRequest).toEqual(mockRequest);
    });

    it('should set request filters', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setRequestFilters({ status: 'APPROVED', priority: 'HIGH' });
      });
      expect(result.current.requestFilters.status).toBe('APPROVED');
      expect(result.current.requestFilters.priority).toBe('HIGH');
    });
  });

  describe('Transfer State', () => {
    const mockTransfer: StockTransfer = {
      id: 'tr-001',
      code: 'TRF-2026-001',
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
      requesterId: 'user-1',
      status: 'PENDING',
      priority: 'NORMAL',
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should set transfers list', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setTransfers([mockTransfer]);
      });
      expect(result.current.transfers).toHaveLength(1);
    });

    it('should select transfer', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.selectTransfer(mockTransfer);
      });
      expect(result.current.selectedTransfer).toEqual(mockTransfer);
    });

    it('should set transfer filters', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setTransferFilters({ status: 'IN_TRANSIT' });
      });
      expect(result.current.transferFilters.status).toBe('IN_TRANSIT');
    });
  });

  describe('Work Front State', () => {
    const mockWorkFront: WorkFront = {
      id: 'wf-001',
      code: 'FR-001',
      name: 'Frente A',
      contractId: 'c-001',
      supervisorId: 'sup-1',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should set work fronts list', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setWorkFronts([mockWorkFront]);
      });
      expect(result.current.workFronts).toHaveLength(1);
    });

    it('should select work front', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.selectWorkFront(mockWorkFront);
      });
      expect(result.current.selectedWorkFront).toEqual(mockWorkFront);
    });
  });

  describe('Location State', () => {
    const mockLocation: StockLocation = {
      id: 'loc-001',
      code: 'ALM-01',
      name: 'Almoxarifado Central',
      type: 'WAREHOUSE',
      contractId: 'c-001',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should set locations list', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setLocations([mockLocation]);
      });
      expect(result.current.locations).toHaveLength(1);
    });

    it('should select location', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.selectLocation(mockLocation);
      });
      expect(result.current.selectedLocation).toEqual(mockLocation);
    });
  });

  describe('KPIs State', () => {
    it('should set KPIs', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setKPIs({
          activeContracts: 5,
          pendingRequests: 10,
          inTransitTransfers: 3,
          lowStockAlerts: 2,
        });
      });
      expect(result.current.kpis.activeContracts).toBe(5);
      expect(result.current.kpis.pendingRequests).toBe(10);
    });

    it('should set loading state for KPIs', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setLoadingKPIs(true);
      });
      expect(result.current.isLoadingKPIs).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should track contracts loading state', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setLoadingContracts(true);
      });
      expect(result.current.isLoadingContracts).toBe(true);
      act(() => {
        result.current.setLoadingContracts(false);
      });
      expect(result.current.isLoadingContracts).toBe(false);
    });

    it('should track requests loading state', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setLoadingRequests(true);
      });
      expect(result.current.isLoadingRequests).toBe(true);
    });

    it('should track transfers loading state', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setLoadingTransfers(true);
      });
      expect(result.current.isLoadingTransfers).toBe(true);
    });
  });

  describe('Reset Store', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useEnterpriseStore());
      act(() => {
        result.current.setKPIs({
          activeContracts: 5,
          pendingRequests: 10,
          inTransitTransfers: 3,
          lowStockAlerts: 2,
        });
        result.current.setContractFilters({ status: 'ACTIVE' });
      });
      act(() => {
        result.current.resetStore();
      });
      expect(result.current.kpis.activeContracts).toBe(0);
      expect(result.current.contractFilters.status).toBe('ALL');
      expect(result.current.contracts).toHaveLength(0);
    });
  });
});
