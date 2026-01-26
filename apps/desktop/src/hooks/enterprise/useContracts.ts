/**
 * @file useContracts - React Query hooks para Contratos
 * @description Hooks otimizados com cache para operações de contratos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';

// Query Keys
export const contractKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters: { status?: string; managerId?: string }) =>
    [...contractKeys.lists(), filters] as const,
  details: () => [...contractKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  dashboard: (id: string) => [...contractKeys.all, 'dashboard', id] as const,
};

/**
 * Hook para listar contratos com filtros opcionais
 */
export function useContracts(status?: string, managerId?: string) {
  return useQuery({
    queryKey: contractKeys.list({ status, managerId }),
    queryFn: () => tauri.getContracts(status, managerId),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar contrato por ID
 */
export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => tauri.getContractById(id),
    enabled: !!id,
  });
}

/**
 * Hook para dashboard geral de contratos
 */
export function useContractDashboard() {
  return useQuery({
    queryKey: ['contracts', 'dashboard'] as const,
    queryFn: () => tauri.getContractDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para criar contrato
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: tauri.CreateContractInput) => tauri.createContract(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

/**
 * Hook para atualizar contrato
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<tauri.CreateContractInput> }) =>
      tauri.updateContract(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

/**
 * Hook para deletar contrato
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}
