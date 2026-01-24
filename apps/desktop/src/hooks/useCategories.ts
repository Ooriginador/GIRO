/**
 * @file useCategories - Hook para gerenciamento de categorias
 * @description Usa TanStack Query para cache de categorias
 */

import { useToast } from '@/hooks/use-toast';
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  getAllCategories,
  getCategories,
  getCategoryById,
  getInactiveCategories,
  reactivateCategory,
  updateCategory,
} from '@/lib/tauri';
import type { Category } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ────────────────────────────────────────────────────────────────────────────

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  listAll: () => [...categoryKeys.all, 'listAll'] as const,
  listInactive: () => [...categoryKeys.all, 'listInactive'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
};

// ────────────────────────────────────────────────────────────────────────────
// QUERIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lista todas as categorias ativas
 */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutos - categorias mudam pouco
  });
}

/**
 * Lista todas as categorias (ativas e inativas)
 */
export function useAllCategories() {
  return useQuery({
    queryKey: categoryKeys.listAll(),
    queryFn: getAllCategories,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Lista apenas categorias inativas
 */
export function useInactiveCategories() {
  return useQuery({
    queryKey: categoryKeys.listInactive(),
    queryFn: getInactiveCategories,
    staleTime: 10 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca uma categoria por ID
 */
export function useCategory(id?: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id || ''),
    queryFn: () => (id ? getCategoryById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Cria uma nova categoria com atualização otimista
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (input: {
      name: string;
      color?: string;
      icon?: string;
      parentId?: string;
      description?: string;
    }) => createCategory(input),
    onMutate: async (newCategory) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<Category[]>(categoryKeys.lists());

      // Optimistically add new category with temp ID
      const tempCategory: Category = {
        id: `temp-${Date.now()}`,
        name: newCategory.name,
        color: newCategory.color,
        description: newCategory.description,
        parentId: newCategory.parentId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productCount: 0,
      };

      queryClient.setQueryData<Category[]>(categoryKeys.lists(), (old) =>
        old ? [...old, tempCategory] : [tempCategory]
      );

      return { previousCategories };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(categoryKeys.lists(), context.previousCategories);
      }
      error('Erro ao criar categoria', err.message);
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      success('Categoria criada', `${category.name} foi cadastrada com sucesso.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Atualiza uma categoria com atualização otimista
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => updateCategory(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      const previousCategories = queryClient.getQueryData<Category[]>(categoryKeys.lists());

      // Optimistic update
      queryClient.setQueryData<Category[]>(categoryKeys.lists(), (old) =>
        old?.map((cat) =>
          cat.id === id ? { ...cat, ...data, updatedAt: new Date().toISOString() } : cat
        )
      );

      return { previousCategories };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(categoryKeys.lists(), context.previousCategories);
      }
      error('Erro ao atualizar categoria', err.message);
    },
    onSuccess: (category) => {
      success('Categoria atualizada', `${category.name} foi atualizada com sucesso.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Remove uma categoria (hard delete) com atualização otimista
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      const previousCategories = queryClient.getQueryData<Category[]>(categoryKeys.lists());

      // Optimistic removal
      queryClient.setQueryData<Category[]>(categoryKeys.lists(), (old) =>
        old?.filter((cat) => cat.id !== id)
      );

      return { previousCategories };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(categoryKeys.lists(), context.previousCategories);
      }
      error('Erro ao remover categoria', err.message);
    },
    onSuccess: () => {
      success('Categoria removida', 'Categoria excluída com sucesso');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Desativa uma categoria (soft delete) com atualização otimista
 */
export function useDeactivateCategory() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deactivateCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      const previousCategories = queryClient.getQueryData<Category[]>(categoryKeys.lists());

      // Optimistic update - mark as inactive
      queryClient.setQueryData<Category[]>(categoryKeys.lists(), (old) =>
        old?.map((cat) => (cat.id === id ? { ...cat, isActive: false } : cat))
      );

      return { previousCategories };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(categoryKeys.lists(), context.previousCategories);
      }
      error('Erro ao desativar categoria', err.message);
    },
    onSuccess: () => {
      success('Categoria desativada', 'Categoria desativada com sucesso');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Reativa uma categoria com atualização otimista
 */
export function useReactivateCategory() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => reactivateCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      const previousInactive = queryClient.getQueryData<Category[]>(categoryKeys.listInactive());

      // Optimistic update - mark as active
      queryClient.setQueryData<Category[]>(categoryKeys.listInactive(), (old) =>
        old?.map((cat) => (cat.id === id ? { ...cat, isActive: true } : cat))
      );

      return { previousInactive };
    },
    onError: (err, _variables, context) => {
      if (context?.previousInactive) {
        queryClient.setQueryData(categoryKeys.listInactive(), context.previousInactive);
      }
      error('Erro ao reativar categoria', err.message);
    },
    onSuccess: (category) => {
      success('Categoria reativada', `${category.name} foi reativada`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Desativa múltiplas categorias de uma vez (batch operation)
 */
export function useBatchDeactivateCategories() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Execute deactivations sequentially to avoid overwhelming the backend
      for (const id of ids) {
        await deactivateCategory(id);
      }
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });

      const previousCategories = queryClient.getQueryData<Category[]>(categoryKeys.lists());

      // Optimistic batch deactivation
      queryClient.setQueryData<Category[]>(categoryKeys.lists(), (old) =>
        old?.map((cat) => (ids.includes(cat.id) ? { ...cat, isActive: false } : cat))
      );

      return { previousCategories };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(categoryKeys.lists(), context.previousCategories);
      }
      error('Erro na operação em lote', err.message);
    },
    onSuccess: (ids) => {
      success('Categorias desativadas', `${ids.length} categorias desativadas com sucesso`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Cores padrão para categorias
 */
export const CATEGORY_COLORS = [
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Âmbar', value: '#f59e0b' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cinza', value: '#6b7280' },
];

/**
 * Ícones padrão para categorias
 */
export const CATEGORY_ICONS = [
  'shopping-basket',
  'milk',
  'beef',
  'apple',
  'croissant',
  'spray-can',
  'pill',
  'cookie',
  'wine',
  'package',
];
