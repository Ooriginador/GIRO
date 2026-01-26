/**
 * @file useStockTransfers - React Query hooks para Transferências de Estoque
 * @description Hooks otimizados com cache para operações de transferências
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';

// Query Keys
export const transferKeys = {
  all: ['stockTransfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  listFiltered: (filters: { sourceId?: string; destId?: string; status?: string }) =>
    [...transferKeys.lists(), filters] as const,
  pending: () => [...transferKeys.lists(), 'pending'] as const,
  details: () => [...transferKeys.all, 'detail'] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
  items: (transferId: string) => [...transferKeys.all, 'items', transferId] as const,
};

/**
 * Hook para listar transferências com filtros
 */
export function useStockTransfers(
  sourceLocationId?: string,
  destinationLocationId?: string,
  status?: string
) {
  return useQuery({
    queryKey: transferKeys.listFiltered({
      sourceId: sourceLocationId,
      destId: destinationLocationId,
      status,
    }),
    queryFn: () => tauri.getStockTransfers(sourceLocationId, destinationLocationId, status),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook para buscar transferência por ID
 */
export function useStockTransfer(id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => tauri.getStockTransferById(id),
    enabled: !!id,
  });
}

/**
 * Hook para listar itens de uma transferência
 */
export function useTransferItems(transferId: string) {
  return useQuery({
    queryKey: transferKeys.items(transferId),
    queryFn: () => tauri.getTransferItems(transferId),
    enabled: !!transferId,
  });
}

/**
 * Hook para criar transferência
 */
export function useCreateStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: tauri.CreateStockTransferInput) => tauri.createStockTransfer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Hook para adicionar item à transferência
 */
export function useAddTransferItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transferId, item }: { transferId: string; item: tauri.AddTransferItemInput }) =>
      tauri.addTransferItem(transferId, item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.items(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(variables.transferId) });
    },
  });
}

/**
 * Hook para aprovar transferência
 */
export function useApproveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.approveTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Hook para rejeitar transferência
 */
export function useRejectTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      tauri.rejectTransfer(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Hook para despachar transferência
 */
export function useShipTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      shippedItems,
    }: {
      id: string;
      shippedItems: Array<{ itemId: string; shippedQty: number }>;
    }) => tauri.shipTransfer(id, shippedItems),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Hook para receber transferência
 */
export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      receivedItems,
    }: {
      id: string;
      receivedItems: Array<{ itemId: string; receivedQty: number }>;
    }) => tauri.receiveTransfer(id, receivedItems),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Hook para cancelar transferência
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.cancelTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}
