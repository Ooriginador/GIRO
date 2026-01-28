/**
 * @file useContracts.test.ts - Testes para hooks de contratos
 */

import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tauri from '@/lib/tauri';
import {
  useContracts,
  useContract,
  useContractDashboard,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  contractKeys,
} from '../useContracts';

// Mock Tauri
vi.mock('@/lib/tauri', () => ({
  getContracts: vi.fn(),
  getContractById: vi.fn(),
  getContractDashboard: vi.fn(),
  createContract: vi.fn(),
  updateContract: vi.fn(),
  deleteContract: vi.fn(),
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

describe('useContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('contractKeys', () => {
    it('deve gerar chaves de query corretas', () => {
      expect(contractKeys.all).toEqual(['contracts']);
      expect(contractKeys.lists()).toEqual(['contracts', 'list']);
      expect(contractKeys.list({ status: 'active' })).toEqual([
        'contracts',
        'list',
        { status: 'active' },
      ]);
      expect(contractKeys.details()).toEqual(['contracts', 'detail']);
      expect(contractKeys.detail('123')).toEqual(['contracts', 'detail', '123']);
      expect(contractKeys.dashboard('123')).toEqual(['contracts', 'dashboard', '123']);
    });
  });

  describe('useContracts', () => {
    it('deve buscar contratos sem filtros', async () => {
      const mockContracts = [
        { id: '1', title: 'Contrato 1', status: 'active' },
        { id: '2', title: 'Contrato 2', status: 'draft' },
      ];

      vi.mocked(tauri.getContracts).mockResolvedValue(mockContracts as any);

      const { result } = renderHook(() => useContracts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getContracts).toHaveBeenCalledWith(undefined, undefined);
      expect(result.current.data).toEqual(mockContracts);
    });

    it('deve buscar contratos com filtro de status', async () => {
      const mockContracts = [{ id: '1', title: 'Contrato Ativo', status: 'active' }];

      vi.mocked(tauri.getContracts).mockResolvedValue(mockContracts as any);

      const { result } = renderHook(() => useContracts('active'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getContracts).toHaveBeenCalledWith('active', undefined);
      expect(result.current.data).toEqual(mockContracts);
    });

    it('deve buscar contratos com filtro de managerId', async () => {
      const mockContracts = [{ id: '1', managerId: 'mgr-1' }];

      vi.mocked(tauri.getContracts).mockResolvedValue(mockContracts as any);

      const { result } = renderHook(() => useContracts(undefined, 'mgr-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getContracts).toHaveBeenCalledWith(undefined, 'mgr-1');
    });

    it('deve lidar com erros na busca', async () => {
      vi.mocked(tauri.getContracts).mockRejectedValue(new Error('Erro ao buscar contratos'));

      const { result } = renderHook(() => useContracts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useContract', () => {
    it('deve buscar contrato por ID', async () => {
      const mockContract = { id: '123', title: 'Contrato Teste' };

      vi.mocked(tauri.getContractById).mockResolvedValue(mockContract as any);

      const { result } = renderHook(() => useContract('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getContractById).toHaveBeenCalledWith('123');
      expect(result.current.data).toEqual(mockContract);
    });

    it('não deve buscar se ID não fornecido', () => {
      const { result } = renderHook(() => useContract(''), { wrapper: createWrapper() });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getContractById).not.toHaveBeenCalled();
    });

    it('deve retornar null se contrato não encontrado', async () => {
      vi.mocked(tauri.getContractById).mockResolvedValue(null);

      const { result } = renderHook(() => useContract('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
    });
  });

  describe('useContractDashboard', () => {
    it('deve buscar dashboard de contratos', async () => {
      const mockDashboard = {
        total: 10,
        active: 7,
        draft: 2,
        completed: 1,
      };

      vi.mocked(tauri.getContractDashboard).mockResolvedValue(mockDashboard as any);

      const { result } = renderHook(() => useContractDashboard('contract-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getContractDashboard).toHaveBeenCalledWith('contract-123');
      expect(result.current.data).toEqual(mockDashboard);
    });

    it('deve retornar disabled quando id não fornecido', () => {
      const { result } = renderHook(() => useContractDashboard(), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateContract', () => {
    it('deve criar novo contrato', async () => {
      const mockInput = {
        title: 'Novo Contrato',
        clientName: 'Cliente Teste',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };

      const mockCreated = { id: 'new-123', ...mockInput };

      vi.mocked(tauri.createContract).mockResolvedValue(mockCreated as any);

      const { result } = renderHook(() => useCreateContract(), { wrapper: createWrapper() });

      result.current.mutate(mockInput as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.createContract).toHaveBeenCalledWith(mockInput);
      expect(result.current.data).toEqual(mockCreated);
    });

    it('deve invalidar cache após criar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.createContract).mockResolvedValue({ id: '1' } as any);

      const { result } = renderHook(() => useCreateContract(), { wrapper });

      result.current.mutate({ title: 'Test' } as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contractKeys.lists() });
    });
  });

  describe('useUpdateContract', () => {
    it('deve atualizar contrato existente', async () => {
      const mockUpdate = { title: 'Contrato Atualizado' };
      const mockUpdated = { id: '123', ...mockUpdate };

      vi.mocked(tauri.updateContract).mockResolvedValue(mockUpdated as any);

      const { result } = renderHook(() => useUpdateContract(), { wrapper: createWrapper() });

      result.current.mutate({ id: '123', input: mockUpdate });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.updateContract).toHaveBeenCalledWith('123', mockUpdate);
      expect(result.current.data).toEqual(mockUpdated);
    });

    it('deve invalidar caches corretos após atualizar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.updateContract).mockResolvedValue({ id: '123' } as any);

      const { result } = renderHook(() => useUpdateContract(), { wrapper });

      result.current.mutate({ id: '123', input: { title: 'Updated' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contractKeys.detail('123') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contractKeys.lists() });
    });
  });

  describe('useDeleteContract', () => {
    it('deve deletar contrato', async () => {
      vi.mocked(tauri.deleteContract).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteContract(), { wrapper: createWrapper() });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.deleteContract).toHaveBeenCalledWith('123');
    });

    it('deve invalidar cache após deletar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.deleteContract).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteContract(), { wrapper });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contractKeys.lists() });
    });

    it('deve lidar com erro ao deletar', async () => {
      vi.mocked(tauri.deleteContract).mockRejectedValue(new Error('Falha ao deletar'));

      const { result } = renderHook(() => useDeleteContract(), { wrapper: createWrapper() });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });
});
