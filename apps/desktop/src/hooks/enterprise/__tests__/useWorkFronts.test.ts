/**
 * @file useWorkFronts.test.ts - Testes para hooks de frentes de trabalho
 */

import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tauri from '@/lib/tauri';
import {
  useWorkFrontsByContract,
  useWorkFronts,
  useWorkFrontsBySupervisor,
  useWorkFront,
  useCreateWorkFront,
  useUpdateWorkFront,
  useDeleteWorkFront,
  workFrontKeys,
} from '../useWorkFronts';

// Mock Tauri
vi.mock('@/lib/tauri', () => ({
  getWorkFronts: vi.fn(),
  getWorkFrontsBySupervisor: vi.fn(),
  getWorkFrontById: vi.fn(),
  createWorkFront: vi.fn(),
  updateWorkFront: vi.fn(),
  deleteWorkFront: vi.fn(),
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

describe('useWorkFronts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('workFrontKeys', () => {
    it('deve gerar chaves de query corretas', () => {
      expect(workFrontKeys.all).toEqual(['workFronts']);
      expect(workFrontKeys.lists()).toEqual(['workFronts', 'list']);
      expect(workFrontKeys.listByContract('c1')).toEqual(['workFronts', 'list', 'contract', 'c1']);
      expect(workFrontKeys.listBySupervisor('s1')).toEqual([
        'workFronts',
        'list',
        'supervisor',
        's1',
      ]);
      expect(workFrontKeys.detail('wf1')).toEqual(['workFronts', 'detail', 'wf1']);
    });
  });

  describe('useWorkFrontsByContract', () => {
    it('deve buscar frentes por contrato', async () => {
      const mockWorkFronts = [
        { id: 'wf1', contractId: 'c1', name: 'Frente Norte' },
        { id: 'wf2', contractId: 'c1', name: 'Frente Sul' },
      ];

      vi.mocked(tauri.getWorkFronts).mockResolvedValue(mockWorkFronts as any);

      const { result } = renderHook(() => useWorkFrontsByContract('c1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getWorkFronts).toHaveBeenCalledWith('c1');
      expect(result.current.data).toEqual(mockWorkFronts);
    });

    it('não deve buscar se contractId não fornecido', () => {
      const { result } = renderHook(() => useWorkFrontsByContract(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getWorkFronts).not.toHaveBeenCalled();
    });
  });

  describe('useWorkFronts genérico', () => {
    it('deve buscar frentes por contrato quando fornecido', async () => {
      const mockWorkFronts = [{ id: 'wf1', contractId: 'c1' }];
      vi.mocked(tauri.getWorkFronts).mockResolvedValue(mockWorkFronts as any);

      const { result } = renderHook(() => useWorkFronts('c1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getWorkFronts).toHaveBeenCalledWith('c1');
    });

    it('deve buscar todas as frentes quando contractId não fornecido', async () => {
      const mockWorkFronts = [{ id: 'wf1' }, { id: 'wf2' }];
      vi.mocked(tauri.getWorkFronts).mockResolvedValue(mockWorkFronts as any);

      const { result } = renderHook(() => useWorkFronts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getWorkFronts).toHaveBeenCalledWith('');
    });
  });

  describe('useWorkFrontsBySupervisor', () => {
    it('deve buscar frentes por supervisor', async () => {
      const mockWorkFronts = [{ id: 'wf1', supervisorId: 's1' }];
      vi.mocked(tauri.getWorkFrontsBySupervisor).mockResolvedValue(mockWorkFronts as any);

      const { result } = renderHook(() => useWorkFrontsBySupervisor('s1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getWorkFrontsBySupervisor).toHaveBeenCalledWith('s1');
    });

    it('não deve buscar se supervisorId não fornecido', () => {
      const { result } = renderHook(() => useWorkFrontsBySupervisor(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getWorkFrontsBySupervisor).not.toHaveBeenCalled();
    });
  });

  describe('useWorkFront', () => {
    it('deve buscar frente por ID', async () => {
      const mockWorkFront = { id: 'wf1', name: 'Frente Teste' };
      vi.mocked(tauri.getWorkFrontById).mockResolvedValue(mockWorkFront as any);

      const { result } = renderHook(() => useWorkFront('wf1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getWorkFrontById).toHaveBeenCalledWith('wf1');
      expect(result.current.data).toEqual(mockWorkFront);
    });

    it('não deve buscar se ID não fornecido', () => {
      const { result } = renderHook(() => useWorkFront(''), { wrapper: createWrapper() });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getWorkFrontById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateWorkFront', () => {
    it('deve criar nova frente', async () => {
      const mockInput = {
        contractId: 'c1',
        name: 'Nova Frente',
        supervisorId: 's1',
      };
      const mockCreated = { id: 'new-wf', ...mockInput };

      vi.mocked(tauri.createWorkFront).mockResolvedValue(mockCreated as any);

      const { result } = renderHook(() => useCreateWorkFront(), { wrapper: createWrapper() });

      result.current.mutate(mockInput as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.createWorkFront).toHaveBeenCalledWith(mockInput);
      expect(result.current.data).toEqual(mockCreated);
    });

    it('deve invalidar cache do contrato após criar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.createWorkFront).mockResolvedValue({ id: 'wf1' } as any);

      const { result } = renderHook(() => useCreateWorkFront(), { wrapper });

      result.current.mutate({ contractId: 'c1', name: 'Test' } as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: workFrontKeys.listByContract('c1'),
      });
    });
  });

  describe('useUpdateWorkFront', () => {
    it('deve atualizar frente existente', async () => {
      const mockUpdate = { name: 'Frente Atualizada' };
      const mockUpdated = { id: 'wf1', ...mockUpdate };

      vi.mocked(tauri.updateWorkFront).mockResolvedValue(mockUpdated as any);

      const { result } = renderHook(() => useUpdateWorkFront(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'wf1', input: mockUpdate });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.updateWorkFront).toHaveBeenCalledWith('wf1', mockUpdate);
    });

    it('deve invalidar caches corretos após atualizar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.updateWorkFront).mockResolvedValue({ id: 'wf1' } as any);

      const { result } = renderHook(() => useUpdateWorkFront(), { wrapper });

      result.current.mutate({ id: 'wf1', input: { name: 'Updated' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workFrontKeys.detail('wf1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workFrontKeys.lists() });
    });
  });

  describe('useDeleteWorkFront', () => {
    it('deve deletar frente', async () => {
      vi.mocked(tauri.deleteWorkFront).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteWorkFront(), { wrapper: createWrapper() });

      result.current.mutate('wf1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.deleteWorkFront).toHaveBeenCalledWith('wf1');
    });

    it('deve invalidar cache após deletar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.deleteWorkFront).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteWorkFront(), { wrapper });

      result.current.mutate('wf1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workFrontKeys.lists() });
    });
  });
});
