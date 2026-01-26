/**
 * @file useWorkFronts - React Query hooks para Frentes de Trabalho
 * @description Hooks otimizados com cache para operações de frentes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';

// Query Keys
export const workFrontKeys = {
  all: ['workFronts'] as const,
  lists: () => [...workFrontKeys.all, 'list'] as const,
  listByContract: (contractId: string) =>
    [...workFrontKeys.lists(), 'contract', contractId] as const,
  listBySupervisor: (supervisorId: string) =>
    [...workFrontKeys.lists(), 'supervisor', supervisorId] as const,
  details: () => [...workFrontKeys.all, 'detail'] as const,
  detail: (id: string) => [...workFrontKeys.details(), id] as const,
};

/**
 * Hook para listar frentes de trabalho por contrato
 */
export function useWorkFrontsByContract(contractId: string) {
  return useQuery({
    queryKey: workFrontKeys.listByContract(contractId),
    queryFn: () => tauri.getWorkFronts(contractId),
    enabled: !!contractId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook genérico para listar frentes de trabalho (por contrato opcional)
 */
export function useWorkFronts(contractId?: string) {
  return useQuery({
    queryKey: contractId
      ? workFrontKeys.listByContract(contractId)
      : ([...workFrontKeys.lists(), 'all'] as const),
    queryFn: () => tauri.getWorkFronts(contractId || ''),
    enabled: contractId ? !!contractId : true,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para listar frentes de trabalho por supervisor
 */
export function useWorkFrontsBySupervisor(supervisorId: string) {
  return useQuery({
    queryKey: workFrontKeys.listBySupervisor(supervisorId),
    queryFn: () => tauri.getWorkFrontsBySupervisor(supervisorId),
    enabled: !!supervisorId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para buscar frente por ID
 */
export function useWorkFront(id: string) {
  return useQuery({
    queryKey: workFrontKeys.detail(id),
    queryFn: () => tauri.getWorkFrontById(id),
    enabled: !!id,
  });
}

/**
 * Hook para criar frente de trabalho
 */
export function useCreateWorkFront() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: tauri.CreateWorkFrontInput) => tauri.createWorkFront(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workFrontKeys.listByContract(variables.contractId),
      });
    },
  });
}

/**
 * Hook para atualizar frente de trabalho
 */
export function useUpdateWorkFront() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<tauri.CreateWorkFrontInput> }) =>
      tauri.updateWorkFront(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workFrontKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: workFrontKeys.lists() });
    },
  });
}

/**
 * Hook para deletar frente de trabalho
 */
export function useDeleteWorkFront() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.deleteWorkFront(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workFrontKeys.lists() });
    },
  });
}
