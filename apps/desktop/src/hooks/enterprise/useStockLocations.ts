/**
 * @file useStockLocations - React Query hooks para Locais de Estoque
 * @description Hooks otimizados com cache para operações de locais
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';

// Query Keys
export const locationKeys = {
  all: ['stockLocations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  listByType: (type: string) => [...locationKeys.lists(), 'type', type] as const,
  listByContract: (contractId: string) =>
    [...locationKeys.lists(), 'contract', contractId] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
  balances: (locationId: string) => [...locationKeys.all, 'balances', locationId] as const,
};

/**
 * Hook para listar locais de estoque com filtros opcionais
 */
export function useStockLocations(contractId?: string, locationType?: string) {
  return useQuery({
    queryKey: [...locationKeys.lists(), { contractId, locationType }] as const,
    queryFn: () => tauri.getStockLocations(contractId, locationType),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para listar locais por tipo
 */
export function useStockLocationsByType(locationType: string) {
  return useQuery({
    queryKey: locationKeys.listByType(locationType),
    queryFn: () => tauri.getStockLocationsByType(locationType),
    enabled: !!locationType,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para listar locais por contrato
 */
export function useStockLocationsByContract(contractId: string) {
  return useQuery({
    queryKey: locationKeys.listByContract(contractId),
    queryFn: () => tauri.getStockLocationsByContract(contractId),
    enabled: !!contractId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para buscar local por ID
 */
export function useStockLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => tauri.getStockLocationById(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar saldos de estoque em um local
 */
export function useStockBalances(locationId: string) {
  return useQuery({
    queryKey: locationKeys.balances(locationId),
    queryFn: () => tauri.getStockBalances(locationId),
    enabled: !!locationId,
    staleTime: 1000 * 60 * 1, // 1 minuto - saldos mudam frequentemente
  });
}

/**
 * Hook para criar local de estoque
 */
export function useCreateStockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: tauri.CreateStockLocationInput) => tauri.createStockLocation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Hook para deletar local de estoque
 */
export function useDeleteStockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauri.deleteStockLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Hook para ajustar saldo de estoque
 */
export function useAdjustStockBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      locationId,
      productId,
      quantity,
      reason,
    }: {
      locationId: string;
      productId: string;
      quantity: number;
      reason: string;
    }) => tauri.adjustStockBalance(locationId, productId, quantity, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.balances(variables.locationId) });
    },
  });
}
