/**
 * @file useStockLocations.test.ts - Testes para hooks de locais de estoque
 */

import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tauri from '@/lib/tauri';
import {
  useStockLocations,
  useStockLocationsByType,
  useStockLocationsByContract,
  useStockLocation,
  useStockBalances,
  useCreateStockLocation,
  useAdjustStockBalance,
  useDeleteStockLocation,
  locationKeys,
} from '../useStockLocations';

// Mock Tauri
vi.mock('@/lib/tauri', () => ({
  getStockLocations: vi.fn(),
  getStockLocationsByType: vi.fn(),
  getStockLocationsByContract: vi.fn(),
  getStockLocationById: vi.fn(),
  getStockBalances: vi.fn(),
  createStockLocation: vi.fn(),

  adjustStockBalance: vi.fn(),
  deleteStockLocation: vi.fn(),
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useStockLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('locationKeys', () => {
    it('deve gerar chaves de query corretas', () => {
      expect(locationKeys.all).toEqual(['stockLocations']);
      expect(locationKeys.lists()).toEqual(['stockLocations', 'list']);
      expect(locationKeys.listByType('warehouse')).toEqual([
        'stockLocations',
        'list',
        'type',
        'warehouse',
      ]);
      expect(locationKeys.listByContract('c1')).toEqual([
        'stockLocations',
        'list',
        'contract',
        'c1',
      ]);
      expect(locationKeys.detail('loc1')).toEqual(['stockLocations', 'detail', 'loc1']);
      expect(locationKeys.balances('loc1')).toEqual(['stockLocations', 'balances', 'loc1']);
    });
  });

  describe('useStockLocations', () => {
    it('deve buscar locais sem filtros', async () => {
      const mockLocations = [{ id: '1', name: 'Almoxarifado Central' }];
      vi.mocked(tauri.getStockLocations).mockResolvedValue(mockLocations as any);

      const { result } = renderHook(() => useStockLocations(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockLocations).toHaveBeenCalledWith(undefined, undefined);
      expect(result.current.data).toEqual(mockLocations);
    });

    it('deve buscar locais por contrato', async () => {
      const mockLocations = [{ id: '1', contractId: 'c1' }];
      vi.mocked(tauri.getStockLocations).mockResolvedValue(mockLocations as any);

      const { result } = renderHook(() => useStockLocations('c1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockLocations).toHaveBeenCalledWith('c1', undefined);
    });

    it('deve buscar locais por tipo', async () => {
      const mockLocations = [{ id: '1', type: 'warehouse' }];
      vi.mocked(tauri.getStockLocations).mockResolvedValue(mockLocations as any);

      const { result } = renderHook(() => useStockLocations(undefined, 'warehouse'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockLocations).toHaveBeenCalledWith(undefined, 'warehouse');
    });
  });

  describe('useStockLocationsByType', () => {
    it('deve buscar locais por tipo', async () => {
      const mockLocations = [{ id: '1', type: 'warehouse' }];
      vi.mocked(tauri.getStockLocationsByType).mockResolvedValue(mockLocations as any);

      const { result } = renderHook(() => useStockLocationsByType('warehouse'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockLocationsByType).toHaveBeenCalledWith('warehouse');
    });

    it('não deve buscar se tipo não fornecido', () => {
      const { result } = renderHook(() => useStockLocationsByType(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getStockLocationsByType).not.toHaveBeenCalled();
    });
  });

  describe('useStockLocationsByContract', () => {
    it('deve buscar locais por contrato', async () => {
      const mockLocations = [{ id: '1', contractId: 'c1' }];
      vi.mocked(tauri.getStockLocationsByContract).mockResolvedValue(mockLocations as any);

      const { result } = renderHook(() => useStockLocationsByContract('c1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockLocationsByContract).toHaveBeenCalledWith('c1');
    });
  });

  describe('useStockLocation', () => {
    it('deve buscar local por ID', async () => {
      const mockLocation = { id: 'loc1', name: 'Almoxarifado 1' };
      vi.mocked(tauri.getStockLocationById).mockResolvedValue(mockLocation as any);

      const { result } = renderHook(() => useStockLocation('loc1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockLocationById).toHaveBeenCalledWith('loc1');
      expect(result.current.data).toEqual(mockLocation);
    });
  });

  describe('useStockBalances', () => {
    it('deve buscar saldos de estoque', async () => {
      const mockBalances = [
        { productId: 'p1', quantity: 100 },
        { productId: 'p2', quantity: 50 },
      ];
      vi.mocked(tauri.getStockBalances).mockResolvedValue(mockBalances as any);

      const { result } = renderHook(() => useStockBalances('loc1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getStockBalances).toHaveBeenCalledWith('loc1');
      expect(result.current.data).toEqual(mockBalances);
    });
  });

  describe('useCreateStockLocation', () => {
    it('deve criar novo local', async () => {
      const mockInput = { name: 'Novo Almoxarifado', contractId: 'c1', type: 'warehouse' };
      const mockCreated = { id: 'new-loc', ...mockInput };

      vi.mocked(tauri.createStockLocation).mockResolvedValue(mockCreated as any);

      const { result } = renderHook(() => useCreateStockLocation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockInput as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.createStockLocation).toHaveBeenCalledWith(mockInput);
      expect(result.current.data).toEqual(mockCreated);
    });
  });

  describe('useAdjustStockBalance', () => {
    it('deve ajustar saldo de estoque', async () => {
      vi.mocked(tauri.adjustStockBalance).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdjustStockBalance(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        locationId: 'loc1',
        productId: 'p1',
        quantity: 10,
        reason: 'Ajuste de inventário',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.adjustStockBalance).toHaveBeenCalledWith(
        'loc1',
        'p1',
        10,
        'Ajuste de inventário'
      );
    });

    it('deve invalidar balances após ajustar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.adjustStockBalance).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdjustStockBalance(), { wrapper });

      result.current.mutate({
        locationId: 'loc1',
        productId: 'p1',
        quantity: 10,
        reason: 'Test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: locationKeys.balances('loc1') });
    });
  });

  describe('useDeleteStockLocation', () => {
    it('deve deletar local', async () => {
      vi.mocked(tauri.deleteStockLocation).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteStockLocation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('loc1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.deleteStockLocation).toHaveBeenCalledWith('loc1');
    });
  });
});
