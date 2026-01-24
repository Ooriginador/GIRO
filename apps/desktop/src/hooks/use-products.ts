/**
 * @file useProducts - Hook para gerenciamento de produtos
 * @description TanStack Query hooks para CRUD de produtos
 */

import {
  createProduct,
  deactivateProduct,
  deleteProduct,
  getAllProducts,
  getInactiveProducts,
  getProductByBarcode,
  getProductById,
  getProducts,
  getProductsPaginated,
  reactivateProduct,
  searchProducts,
  updateProduct,
} from '@/lib/tauri';
import type { CreateProductInput, ProductFilter, UpdateProductInput } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ════════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ════════════════════════════════════════════════════════════════════════════

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: ProductFilter) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// ════════════════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca todos os produtos com filtro opcional
 */
/**
 * Busca todos os produtos com filtro opcional
 */
export function useProducts(filter?: ProductFilter) {
  return useQuery({
    queryKey: ['products', filter],
    queryFn: () => getProducts(filter),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Busca produtos paginados
 */
export function useProductsPaginated(
  page: number,
  perPage: number,
  search?: string,
  categoryId?: string,
  isActive?: boolean
) {
  return useQuery({
    queryKey: ['products', 'paginated', { page, perPage, search, categoryId, isActive }],
    queryFn: () => getProductsPaginated(page, perPage, search, categoryId, isActive),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    staleTime: 1000 * 60, // 1 minuto
  });
}

/**
 * Busca produto por ID
 */
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });
}

/**
 * Busca produto por código de barras
 */
export function useProductByBarcode(barcode: string | null) {
  return useQuery({
    queryKey: ['product', 'barcode', barcode],
    queryFn: () => getProductByBarcode(barcode!),
    enabled: !!barcode && barcode.length > 0,
  });
}

/**
 * Busca produtos por texto (nome, código)
 */
export function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () => searchProducts(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 30, // 30 segundos
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cria novo produto
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Atualiza produto existente
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
}

/**
 * Deleta produto
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Desativa produto (soft delete)
 */
export function useDeactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inactiveProducts'] });
    },
  });
}

/**
 * Reativa um produto desativado
 */
export function useReactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inactiveProducts'] });
    },
  });
}

/**
 * Lista todos os produtos (ativos e inativos)
 */
export function useAllProducts(includeInactive = false) {
  return useQuery({
    queryKey: ['products', 'all', includeInactive],
    queryFn: () => getAllProducts(includeInactive),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Lista apenas produtos inativos
 */
export function useInactiveProducts() {
  return useQuery({
    queryKey: ['inactiveProducts'],
    queryFn: () => getInactiveProducts(),
    staleTime: 1000 * 60 * 5,
  });
}
