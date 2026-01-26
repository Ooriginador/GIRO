/**
 * @file useActivities.test.ts - Testes para hooks de atividades
 */

import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tauri from '@/lib/tauri';
import {
  useActivitiesByWorkFront,
  useActivitiesByCostCenter,
  useActivity,
  useCreateActivity,
  useUpdateActivity,
  useUpdateActivityProgress,
  useDeleteActivity,
  activityKeys,
} from '../useActivities';

// Mock Tauri
vi.mock('@/lib/tauri', () => ({
  getActivitiesByWorkFront: vi.fn(),
  getActivitiesByCostCenter: vi.fn(),
  getActivityById: vi.fn(),
  createActivity: vi.fn(),
  updateActivity: vi.fn(),
  updateActivityProgress: vi.fn(),
  deleteActivity: vi.fn(),
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

describe('useActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('activityKeys', () => {
    it('deve gerar chaves de query corretas', () => {
      expect(activityKeys.all).toEqual(['activities']);
      expect(activityKeys.lists()).toEqual(['activities', 'list']);
      expect(activityKeys.listByWorkFront('wf-1')).toEqual([
        'activities',
        'list',
        'workFront',
        'wf-1',
      ]);
      expect(activityKeys.listByCostCenter('cc-100')).toEqual([
        'activities',
        'list',
        'costCenter',
        'cc-100',
      ]);
      expect(activityKeys.details()).toEqual(['activities', 'detail']);
      expect(activityKeys.detail('act-1')).toEqual(['activities', 'detail', 'act-1']);
    });
  });

  describe('useActivitiesByWorkFront', () => {
    it('deve buscar atividades por frente de trabalho', async () => {
      const mockActivities = [
        { id: '1', workFrontId: 'wf-1', description: 'Atividade 1' },
        { id: '2', workFrontId: 'wf-1', description: 'Atividade 2' },
      ];

      vi.mocked(tauri.getActivitiesByWorkFront).mockResolvedValue(mockActivities as any);

      const { result } = renderHook(() => useActivitiesByWorkFront('wf-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getActivitiesByWorkFront).toHaveBeenCalledWith('wf-1');
      expect(result.current.data).toEqual(mockActivities);
    });

    it('não deve buscar se workFrontId não fornecido', () => {
      const { result } = renderHook(() => useActivitiesByWorkFront(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getActivitiesByWorkFront).not.toHaveBeenCalled();
    });
  });

  describe('useActivitiesByCostCenter', () => {
    it('deve buscar atividades por centro de custo', async () => {
      const mockActivities = [{ id: '1', costCenter: 'cc-100', description: 'Atividade A' }];

      vi.mocked(tauri.getActivitiesByCostCenter).mockResolvedValue(mockActivities as any);

      const { result } = renderHook(() => useActivitiesByCostCenter('cc-100'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getActivitiesByCostCenter).toHaveBeenCalledWith('cc-100');
      expect(result.current.data).toEqual(mockActivities);
    });

    it('não deve buscar se costCenter não fornecido', () => {
      const { result } = renderHook(() => useActivitiesByCostCenter(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(tauri.getActivitiesByCostCenter).not.toHaveBeenCalled();
    });
  });

  describe('useActivity', () => {
    it('deve buscar atividade por ID', async () => {
      const mockActivity = { id: 'act-1', description: 'Teste' };

      vi.mocked(tauri.getActivityById).mockResolvedValue(mockActivity as any);

      const { result } = renderHook(() => useActivity('act-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.getActivityById).toHaveBeenCalledWith('act-1');
      expect(result.current.data).toEqual(mockActivity);
    });
  });

  describe('useCreateActivity', () => {
    it('deve criar nova atividade', async () => {
      const mockInput = {
        workFrontId: 'wf-1',
        description: 'Nova Atividade',
        plannedQty: 100,
      };

      const mockCreated = { id: 'new-1', ...mockInput };

      vi.mocked(tauri.createActivity).mockResolvedValue(mockCreated as any);

      const { result } = renderHook(() => useCreateActivity(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockInput as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.createActivity).toHaveBeenCalledWith(mockInput);
      expect(result.current.data).toEqual(mockCreated);
    });

    it('deve invalidar cache da frente de trabalho após criar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.createActivity).mockResolvedValue({ id: '1' } as any);

      const { result } = renderHook(() => useCreateActivity(), { wrapper });

      result.current.mutate({ workFrontId: 'wf-1', description: 'Test' } as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: activityKeys.listByWorkFront('wf-1'),
      });
    });
  });

  describe('useUpdateActivity', () => {
    it('deve atualizar atividade existente', async () => {
      const mockUpdate = { description: 'Atividade Atualizada' };
      const mockUpdated = { id: 'act-1', ...mockUpdate };

      vi.mocked(tauri.updateActivity).mockResolvedValue(mockUpdated as any);

      const { result } = renderHook(() => useUpdateActivity(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'act-1', input: mockUpdate });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.updateActivity).toHaveBeenCalledWith('act-1', mockUpdate);
      expect(result.current.data).toEqual(mockUpdated);
    });

    it('deve invalidar caches corretos após atualizar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.updateActivity).mockResolvedValue({ id: 'act-1' } as any);

      const { result } = renderHook(() => useUpdateActivity(), { wrapper });

      result.current.mutate({ id: 'act-1', input: { description: 'Updated' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.detail('act-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.lists() });
    });
  });

  describe('useUpdateActivityProgress', () => {
    it('deve atualizar progresso da atividade', async () => {
      const mockUpdated = { id: 'act-1', executedQty: 50 };

      vi.mocked(tauri.updateActivityProgress).mockResolvedValue(mockUpdated as any);

      const { result } = renderHook(() => useUpdateActivityProgress(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'act-1', executedQty: 50 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.updateActivityProgress).toHaveBeenCalledWith('act-1', 50);
      expect(result.current.data).toEqual(mockUpdated);
    });

    it('deve invalidar caches após atualizar progresso', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.updateActivityProgress).mockResolvedValue({ id: 'act-1' } as any);

      const { result } = renderHook(() => useUpdateActivityProgress(), { wrapper });

      result.current.mutate({ id: 'act-1', executedQty: 75 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.detail('act-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.lists() });
    });
  });

  describe('useDeleteActivity', () => {
    it('deve deletar atividade', async () => {
      vi.mocked(tauri.deleteActivity).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteActivity(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('act-1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tauri.deleteActivity).toHaveBeenCalledWith('act-1');
    });

    it('deve invalidar cache após deletar', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      vi.mocked(tauri.deleteActivity).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteActivity(), { wrapper });

      result.current.mutate('act-1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.lists() });
    });
  });
});
