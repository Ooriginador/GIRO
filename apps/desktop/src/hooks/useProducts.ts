/**
 * @file useProducts - React Query hooks para Produtos
 * @description Hooks para operações com produtos
 */

import { useQuery } from '@tanstack/react-query';
import * as tauri from '@/lib/tauri';
import type { ProductFilter } from '@/types';

// Query Keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  listFiltered: (filter?: ProductFilter) => [...productKeys.lists(), filter] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/**
 * Hook para listar produtos com filtros opcionais
 */
export function useProducts(filter?: ProductFilter) {
  return useQuery({
    queryKey: productKeys.listFiltered(filter),
    queryFn: () => tauri.getProducts(filter),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar produtos por query
 */
export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => tauri.searchProducts(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para buscar produto por ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => tauri.getProductById(id),
    enabled: !!id,
  });
}
