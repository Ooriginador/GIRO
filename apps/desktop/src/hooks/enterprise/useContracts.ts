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
 * Hook para dashboard geral de contratos (Enterprise Global)
 */
export function useEnterpriseDashboard() {
  return useQuery({
    queryKey: ['enterprise', 'dashboard'] as const,
    queryFn: () => tauri.getEnterpriseDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para consumo agregado por contrato (Dashboard Chart)
 */
export function useContractsConsumptionSummary(limit: number = 5) {
  return useQuery({
    queryKey: ['enterprise', 'consumption-summary', limit] as const,
    queryFn: () => tauri.getContractsConsumptionSummary(limit),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para dashboard de um contrato específico
 */
export function useContractDashboard(id?: string) {
  // If no ID provided, fail or return null (legacy behaviour support if needed)
  // But previously it was calling the wrong command.
  // We will deprecate the no-arg usage.

  return useQuery({
    queryKey: contractKeys.dashboard(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Contract ID required');
      return tauri.getContractDashboard(id); // Check if tauri.getContractDashboard accepts ID now
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
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

// ────────────────────────────────────────────────────────────────────────────
// LOW STOCK ALERTS HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para alertas de estoque baixo
 */
export function useLowStockAlerts(params?: {
  locationId?: string;
  categoryId?: string;
  criticality?: 'CRITICAL' | 'WARNING' | 'LOW';
}) {
  return useQuery({
    queryKey: ['enterprise', 'low-stock-alerts', params] as const,
    queryFn: () => tauri.getLowStockAlerts(params),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para contagem de alertas de estoque baixo (para badges)
 */
export function useLowStockAlertsCount() {
  return useQuery({
    queryKey: ['enterprise', 'low-stock-alerts-count'] as const,
    queryFn: () => tauri.getLowStockAlertsCount(),
    staleTime: 1000 * 60 * 1, // 1 minuto - atualiza mais frequentemente
    refetchInterval: 1000 * 60 * 5, // Auto-refetch a cada 5 minutos
  });
}
