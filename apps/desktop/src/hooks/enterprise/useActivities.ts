/**
 * @file useActivities - React Query hooks para Atividades
 * @description Hooks otimizados com cache para operações de atividades
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';

// Query Keys
export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  listByWorkFront: (workFrontId: string) =>
    [...activityKeys.lists(), 'workFront', workFrontId] as const,
  listByCostCenter: (costCenter: string) =>
    [...activityKeys.lists(), 'costCenter', costCenter] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
};

/**
 * Hook para listar atividades por frente de trabalho
 */
export function useActivitiesByWorkFront(workFrontId: string) {
  return useQuery({
    queryKey: activityKeys.listByWorkFront(workFrontId),
    queryFn: () => tauri.getActivitiesByWorkFront(workFrontId),
    enabled: !!workFrontId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para listar atividades por centro de custo
 */
export function useActivitiesByCostCenter(costCenter: string) {
  return useQuery({
    queryKey: activityKeys.listByCostCenter(costCenter),
    queryFn: () => tauri.getActivitiesByCostCenter(costCenter),
    enabled: !!costCenter,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para buscar atividade por ID
 */
export function useActivity(id: string) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => tauri.getActivityById(id),
    enabled: !!id,
  });
}

/**
 * Hook para criar atividade
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: tauri.CreateActivityInput) => tauri.createActivity(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: activityKeys.listByWorkFront(variables.workFrontId),
      });
    },
  });
}

/**
 * Hook para atualizar atividade
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<tauri.CreateActivityInput> }) =>
      tauri.updateActivity(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Hook para atualizar progresso da atividade
 */
export function useUpdateActivityProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, executedQty }: { id: string; executedQty: number }) =>
      tauri.updateActivityProgress(id, executedQty),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Hook para deletar atividade
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}
