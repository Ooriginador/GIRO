/**
 * @file useMaterialRequests - React Query hooks para Requisições de Material
 * @description Hooks otimizados com cache para operações de requisições
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';

// Query Keys
export const requestKeys = {
  all: ['materialRequests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  listPaginated: (page: number, perPage: number, filters?: Record<string, unknown>) =>
    [...requestKeys.lists(), 'paginated', { page, perPage, ...filters }] as const,
  pending: (approverId?: string) => [...requestKeys.lists(), 'pending', approverId] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
  items: (requestId: string) => [...requestKeys.all, 'items', requestId] as const,
};

/**
 * Hook para listar requisições paginadas com filtros
 */
export function useMaterialRequestsPaginated(
  page: number = 1,
  perPage: number = 20,
  filters?: {
    search?: string;
    contractId?: string;
    workFrontId?: string;
    status?: string;
    priority?: string;
    requesterId?: string;
  }
) {
  return useQuery({
    queryKey: requestKeys.listPaginated(page, perPage, filters),
    queryFn: () =>
      tauri.getMaterialRequestsPaginated(page, perPage, {
        search: filters?.search ?? null,
        contractId: filters?.contractId ?? null,
        workFrontId: filters?.workFrontId ?? null,
        status: filters?.status ?? null,
        priority: filters?.priority ?? null,
        requesterId: filters?.requesterId ?? null,
        approverId: null,
        dateFrom: null,
        dateTo: null,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para listar requisições por contrato
 */
export function useMaterialRequestsByContract(contractId: string) {
  return useQuery({
    queryKey: [...requestKeys.lists(), 'byContract', contractId] as const,
    queryFn: () => tauri.getMaterialRequests(contractId),
    enabled: !!contractId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook genérico para listar requisições com filtros opcionais
 */
export function useMaterialRequests(contractId?: string, status?: string) {
  return useQuery({
    queryKey: [...requestKeys.lists(), 'filtered', { contractId, status }] as const,
    queryFn: () => tauri.getMaterialRequests(contractId, status),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para listar requisições pendentes de aprovação
 */
export function usePendingRequests(approverId?: string) {
  return useQuery({
    queryKey: requestKeys.pending(approverId),
    queryFn: () => tauri.getPendingRequests(approverId),
    staleTime: 1000 * 60 * 1, // 1 minuto
  });
}

/**
 * Hook para buscar requisição por ID
 */
export function useMaterialRequest(id: string) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: () => tauri.getMaterialRequestById(id),
    enabled: !!id,
  });
}

/**
 * Hook para listar itens de uma requisição
 */
export function useRequestItems(requestId: string) {
  return useQuery({
    queryKey: requestKeys.items(requestId),
    queryFn: () => tauri.getRequestItems(requestId),
    enabled: !!requestId,
  });
}

/**
 * Hook para criar requisição
 */
export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: tauri.CreateMaterialRequestInput) => tauri.createMaterialRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Hook para adicionar item à requisição
 */
export function useAddRequestItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, item }: { requestId: string; item: tauri.AddRequestItemInput }) =>
      tauri.addRequestItem(requestId, item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.items(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.requestId) });
    },
  });
}

/**
 * Hook para submeter requisição para aprovação
 */
export function useSubmitRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.submitMaterialRequest(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Hook para aprovar requisição
 */
export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.approveMaterialRequest(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.pending() });
    },
  });
}

/**
 * Hook para rejeitar requisição
 */
export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      tauri.rejectMaterialRequest(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.pending() });
    },
  });
}

/**
 * Hook para iniciar separação
 */
export function useStartSeparation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.startRequestSeparation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Hook para completar separação
 */
export function useCompleteSeparation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.completeRequestSeparation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Hook para entregar requisição
 */
export function useDeliverRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.deliverMaterialRequest(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}
