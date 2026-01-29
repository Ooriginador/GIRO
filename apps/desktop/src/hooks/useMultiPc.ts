/**
 * Hook para gerenciamento de rede Multi-PC
 *
 * Utiliza a nova infraestrutura de Connection Manager para:
 * - Status geral da rede Multi-PC
 * - Gerenciamento de peers
 * - Estatísticas de conexão
 * - Discovery automático
 */

import { commands } from '@/lib/bindings';
import type {
  ConnectionStats,
  MultiPcNetworkStatus,
  NetworkModeConfig,
  OperationMode,
  PeerInfo,
} from '@/lib/bindings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ────────────────────────────────────────────────────────────────────────────

export const MULTI_PC_QUERY_KEYS = {
  status: ['multiPc', 'status'] as const,
  peers: ['multiPc', 'peers'] as const,
  stats: ['multiPc', 'stats'] as const,
  config: ['multiPc', 'config'] as const,
};

// ────────────────────────────────────────────────────────────────────────────
// HOOKS - STATUS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Status geral da rede Multi-PC
 */
export function useMultiPcStatus(enabled = true) {
  return useQuery({
    queryKey: MULTI_PC_QUERY_KEYS.status,
    queryFn: async (): Promise<MultiPcNetworkStatus> => {
      const result = await commands.getMultiPcStatus();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao obter status Multi-PC');
      }
      return result.data;
    },
    enabled,
    refetchInterval: 3000, // Atualiza a cada 3 segundos
    staleTime: 1000,
    retry: 2,
  });
}

/**
 * Lista de peers conectados
 */
export function useNetworkPeers(enabled = true) {
  return useQuery({
    queryKey: MULTI_PC_QUERY_KEYS.peers,
    queryFn: async (): Promise<PeerInfo[]> => {
      const result = await commands.listNetworkPeers();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao listar peers');
      }
      return result.data;
    },
    enabled,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/**
 * Estatísticas de conexão
 */
export function useConnectionStats(enabled = true) {
  return useQuery({
    queryKey: MULTI_PC_QUERY_KEYS.stats,
    queryFn: async (): Promise<ConnectionStats> => {
      const result = await commands.getConnectionStats();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao obter estatísticas');
      }
      return result.data;
    },
    enabled,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

/**
 * Configuração atual do modo de rede
 */
export function useNetworkModeConfig(enabled = true) {
  return useQuery({
    queryKey: MULTI_PC_QUERY_KEYS.config,
    queryFn: async (): Promise<NetworkModeConfig> => {
      const result = await commands.getNetworkModeConfig();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao obter configuração');
      }
      return result.data;
    },
    enabled,
    staleTime: 30000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HOOKS - MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Iniciar Connection Manager
 */
export function useStartConnectionManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: NetworkModeConfig) => {
      const result = await commands.startConnectionManager(config);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao iniciar Connection Manager');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.config });
    },
  });
}

/**
 * Parar Connection Manager
 */
export function useStopConnectionManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await commands.stopConnectionManager();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao parar Connection Manager');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
    },
  });
}

/**
 * Adicionar peer manualmente
 */
export function useAddNetworkPeer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ip, port, name }: { ip: string; port?: number; name?: string }) => {
      const result = await commands.addNetworkPeer(ip, port ?? null, name ?? null);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao adicionar peer');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.peers });
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
    },
  });
}

/**
 * Remover peer
 */
export function useRemoveNetworkPeer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (peerId: string) => {
      const result = await commands.removeNetworkPeer(peerId);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao remover peer');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.peers });
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
    },
  });
}

/**
 * Conectar ao Master (modo Satellite)
 */
export function useConnectToMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ip, port }: { ip: string; port?: number }) => {
      const result = await commands.connectToMaster(ip, port ?? null);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao conectar ao Master');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
    },
  });
}

/**
 * Desconectar do Master
 */
export function useDisconnectFromMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await commands.disconnectFromMaster();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao desconectar do Master');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
    },
  });
}

/**
 * Forçar re-discovery de peers
 */
export function useRefreshPeerDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await commands.refreshPeerDiscovery();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao atualizar discovery');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.peers });
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.status });
    },
  });
}

/**
 * Salvar configuração do modo de rede
 */
export function useSaveNetworkModeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: NetworkModeConfig) => {
      const result = await commands.saveNetworkModeConfig(config);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Erro ao salvar configuração');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTI_PC_QUERY_KEYS.config });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// COMPOSITE HOOK
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook composto com todas as funcionalidades Multi-PC
 */
export function useMultiPc() {
  const queryClient = useQueryClient();

  // Queries
  const status = useMultiPcStatus();
  const peers = useNetworkPeers();
  const stats = useConnectionStats();
  const config = useNetworkModeConfig();

  // Mutations
  const startManager = useStartConnectionManager();
  const stopManager = useStopConnectionManager();
  const addPeer = useAddNetworkPeer();
  const removePeer = useRemoveNetworkPeer();
  const connectMaster = useConnectToMaster();
  const disconnectMaster = useDisconnectFromMaster();
  const refreshDiscovery = useRefreshPeerDiscovery();
  const saveConfig = useSaveNetworkModeConfig();

  // Helpers
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['multiPc'] });
  }, [queryClient]);

  const isLoading =
    status.isLoading || peers.isLoading || stats.isLoading || config.isLoading;

  const isError = status.isError || peers.isError || stats.isError || config.isError;

  const error =
    status.error?.message ||
    peers.error?.message ||
    stats.error?.message ||
    config.error?.message;

  return {
    // Data
    status: status.data,
    peers: peers.data ?? [],
    stats: stats.data,
    config: config.data,

    // State
    isLoading,
    isError,
    error,
    isRunning: status.data?.isRunning ?? false,
    mode: status.data?.mode ?? ('Standalone' as OperationMode),
    connectedToMaster: status.data?.connectedToMaster ?? false,
    peerCount: peers.data?.length ?? 0,
    onlinePeers: stats.data?.onlinePeers ?? 0,

    // Mutations
    startManager,
    stopManager,
    addPeer,
    removePeer,
    connectMaster,
    disconnectMaster,
    refreshDiscovery,
    saveConfig,

    // Helpers
    refreshAll,

    // Query objects (for fine-grained control)
    queries: { status, peers, stats, config },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export type {
  ConnectionStats,
  MultiPcNetworkStatus,
  NetworkModeConfig,
  OperationMode,
  PeerInfo,
};
