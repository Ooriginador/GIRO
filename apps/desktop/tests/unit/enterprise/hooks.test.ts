/**
 * @file Testes - Enterprise Hooks
 * @description Testes unitários para React Query hooks do módulo Enterprise
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock do Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock Tauri lib
vi.mock('@/lib/tauri', () => ({
  getContracts: vi.fn(),
  getMaterialRequests: vi.fn(),
  getStockTransfers: vi.fn(),
}));

// Import mocked modules
import * as tauri from '@/lib/tauri';

// Import hooks
import { useContracts } from '@/hooks/enterprise/useContracts';
import { useMaterialRequests } from '@/hooks/enterprise/useMaterialRequests';
import { useStockTransfers } from '@/hooks/enterprise/useStockTransfers';

// Wrapper com QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('Enterprise Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useContracts', () => {
    it('should fetch contracts successfully', async () => {
      const mockContracts = [
        { id: 'c-1', code: 'OBRA-001', name: 'Contrato 1', status: 'ACTIVE' },
        { id: 'c-2', code: 'OBRA-002', name: 'Contrato 2', status: 'PLANNING' },
      ];

      vi.mocked(tauri.getContracts).mockResolvedValueOnce(mockContracts as any);

      const { result } = renderHook(() => useContracts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContracts);
    });

    it('should filter contracts by status', async () => {
      const mockContracts = [{ id: 'c-1', code: 'OBRA-001', status: 'ACTIVE' }];
      vi.mocked(tauri.getContracts).mockResolvedValueOnce(mockContracts as any);

      const { result } = renderHook(() => useContracts('ACTIVE'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tauri.getContracts).toHaveBeenCalledWith('ACTIVE', undefined);
    });

    it('should handle fetch error', async () => {
      vi.mocked(tauri.getContracts).mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() => useContracts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Database error');
    });
  });

  describe('useMaterialRequests', () => {
    it('should fetch material requests', async () => {
      const mockRequests = [
        { id: 'r-1', code: 'REQ-001', status: 'PENDING' },
        { id: 'r-2', code: 'REQ-002', status: 'APPROVED' },
      ];

      vi.mocked(tauri.getMaterialRequests).mockResolvedValueOnce(mockRequests as any);

      const { result } = renderHook(() => useMaterialRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRequests);
    });

    it('should filter by contract', async () => {
      const mockRequests = [{ id: 'r-1', contractId: 'c-1' }];
      vi.mocked(tauri.getMaterialRequests).mockResolvedValueOnce(mockRequests as any);

      const { result } = renderHook(() => useMaterialRequests('c-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tauri.getMaterialRequests).toHaveBeenCalledWith('c-1', undefined);
    });

    it('should filter by status', async () => {
      vi.mocked(tauri.getMaterialRequests).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useMaterialRequests(undefined, 'PENDING'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tauri.getMaterialRequests).toHaveBeenCalledWith(undefined, 'PENDING');
    });
  });

  describe('useStockTransfers', () => {
    it('should fetch stock transfers', async () => {
      const mockTransfers = [
        { id: 't-1', code: 'TRF-001', status: 'PENDING' },
      ];

      vi.mocked(tauri.getStockTransfers).mockResolvedValueOnce(mockTransfers as any);

      const { result } = renderHook(() => useStockTransfers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTransfers);
    });

    it('should filter by location', async () => {
      vi.mocked(tauri.getStockTransfers).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useStockTransfers('loc-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(tauri.getStockTransfers).toHaveBeenCalledWith('loc-1', undefined, undefined);
    });
  });
});
