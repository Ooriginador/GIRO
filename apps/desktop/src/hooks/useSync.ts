/**
 * Hook para sincronização multi-PC
 *
 * Gerencia operações de sync entre dispositivos conectados à mesma licença
 */

import { invoke } from '@/lib/tauri';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type SyncEntityType =
  | 'product'
  | 'category'
  | 'supplier'
  | 'customer'
  | 'employee'
  | 'setting';

export type SyncItemStatus = 'ok' | 'conflict' | 'error';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncEntityCount {
  entityType: SyncEntityType;
  count: number;
  lastVersion: number;
  syncedVersion: number;
}

export interface SyncStatusResult {
  entityCounts: SyncEntityCount[];
  lastSync: string | null;
  pendingChanges: number;
}

export interface SyncItemResultLocal {
  entityType: SyncEntityType;
  entityId: string;
  status: SyncItemStatus;
  serverVersion: number;
  message: string | null;
}

export interface SyncPushResult {
  success: boolean;
  processed: number;
  results: SyncItemResultLocal[];
  serverTime: string;
}

export interface SyncPullItemLocal {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  data: unknown;
  version: number;
  updatedAt: string;
}

export interface SyncPullResult {
  items: SyncPullItemLocal[];
  hasMore: boolean;
  serverTime: string;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  message: string;
}

// ────────────────────────────────────────────────────────────────────────────
// QUERIES
// ────────────────────────────────────────────────────────────────────────────

const SYNC_QUERY_KEY = ['sync', 'status'];

/**
 * Query para obter status de sincronização
 */
export function useSyncStatus(enabled = true) {
  return useQuery({
    queryKey: SYNC_QUERY_KEY,
    queryFn: async () => {
      const result = await invoke<SyncStatusResult>('get_sync_status');
      return result;
    },
    enabled,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 10000, // Considera stale após 10 segundos
    retry: 1,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mutation para enviar dados locais para o servidor
 */
export function useSyncPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityTypes: SyncEntityType[]) => {
      const result = await invoke<SyncPushResult>('sync_push', {
        payload: { entityTypes },
      });
      return result;
    },
    onSuccess: () => {
      // Invalida todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: SYNC_QUERY_KEY });
    },
  });
}

/**
 * Mutation para baixar dados do servidor
 */
export function useSyncPull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityTypes: SyncEntityType[]) => {
      const result = await invoke<SyncPullResult>('sync_pull', {
        entityTypes,
      });
      return result;
    },
    onSuccess: () => {
      // Invalida todas as queries para refletir dados atualizados
      queryClient.invalidateQueries({ queryKey: SYNC_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

/**
 * Mutation para sincronização completa (push + pull)
 * Sincroniza todas as entidades automaticamente
 */
export function useSyncFull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // sync_full não recebe parâmetros - sincroniza todas entidades
      const result = await invoke<SyncResult>('sync_full');
      return result;
    },
    onSuccess: () => {
      // Invalida todas as queries
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Mutation para resetar sincronização
 * @param entityType - Tipo de entidade para resetar (opcional, se não informado reseta todas)
 */
export function useSyncReset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityType?: SyncEntityType) => {
      // sync_reset retorna void, não SyncResult
      await invoke<void>('sync_reset', { entityType: entityType ?? null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYNC_QUERY_KEY });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook principal para sincronização multi-PC
 */
export function useSync() {
  const status = useSyncStatus();
  const pushMutation = useSyncPush();
  const pullMutation = useSyncPull();
  const fullMutation = useSyncFull();
  const resetMutation = useSyncReset();

  const allEntityTypes: SyncEntityType[] = useMemo(
    () => ['product', 'category', 'supplier', 'customer', 'setting'],
    []
  );

  /**
   * Sincronização completa de todas as entidades
   */
  const syncAll = useCallback(async () => {
    return fullMutation.mutateAsync();
  }, [fullMutation]);

  /**
   * Push de todas as entidades
   */
  const pushAll = useCallback(async () => {
    return pushMutation.mutateAsync(allEntityTypes);
  }, [pushMutation, allEntityTypes]);

  /**
   * Pull de todas as entidades
   */
  const pullAll = useCallback(async () => {
    return pullMutation.mutateAsync(allEntityTypes);
  }, [pullMutation, allEntityTypes]);

  /**
   * Reset da sincronização
   */
  const reset = useCallback(async () => {
    return resetMutation.mutateAsync();
  }, [resetMutation]);

  const isLoading =
    status.isLoading ||
    pushMutation.isPending ||
    pullMutation.isPending ||
    fullMutation.isPending ||
    resetMutation.isPending;

  const hasPendingChanges = (status.data?.pendingChanges ?? 0) > 0;

  return {
    // Status
    status: status.data,
    isLoading,
    error: status.error,
    hasPendingChanges,

    // Operações
    syncAll,
    pushAll,
    pullAll,
    reset,

    // Mutations individuais
    push: pushMutation,
    pull: pullMutation,
    full: fullMutation,
    resetSync: resetMutation,

    // Refetch
    refetchStatus: status.refetch,
  };
}

export default useSync;
