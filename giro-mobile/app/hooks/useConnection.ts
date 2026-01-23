/**
 * Hook para gerenciar estado de conexão global
 */

import { generateDeviceId } from '@lib/utils';
import { useConnectionStore } from '@stores/connectionStore';
import type { DiscoveredDesktop, NetworkInfo } from '@/types/connection';
import * as Network from 'expo-network';
import { useCallback, useEffect, useMemo } from 'react';
import { useDiscovery } from './useDiscovery';
import { useWebSocket } from './useWebSocket';

interface UseConnectionResult {
  // Network
  networkInfo: NetworkInfo | null;
  isNetworkAvailable: boolean;

  // Discovery
  discoveredDesktops: DiscoveredDesktop[];
  isSearching: boolean;
  discoveryError: string | null;

  // Connection
  connectionState: ReturnType<typeof useWebSocket>['connectionState'];
  selectedDesktop: DiscoveredDesktop | null;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  lastError: string | null;

  // Actions
  startDiscovery: () => Promise<void>;
  stopDiscovery: () => void;
  connect: (desktop: DiscoveredDesktop) => Promise<void>;
  disconnect: () => void;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;

  // Quick connect
  connectToLastDesktop: () => Promise<boolean>;
}

export function useConnection(): UseConnectionResult {
  const { selectedDesktop, connectionHistory, deviceId, setDeviceId, lastError } =
    useConnectionStore();

  const {
    desktops,
    isSearching,
    error: discoveryError,
    startDiscovery,
    stopDiscovery,
  } = useDiscovery();

  const {
    connectionState,
    isConnected,
    isConnecting,
    isAuthenticated,
    connect,
    disconnect,
    login: wsLogin,
    logout: wsLogout,
  } = useWebSocket();

  // Garantir device ID
  useEffect(() => {
    if (!deviceId) {
      setDeviceId(generateDeviceId());
    }
  }, [deviceId, setDeviceId]);

  // Estado da rede
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        let type: NetworkInfo['type'] = 'unknown';

        switch (state.type) {
          case Network.NetworkStateType.WIFI:
            type = 'wifi';
            break;
          case Network.NetworkStateType.CELLULAR:
            type = 'cellular';
            break;
          case Network.NetworkStateType.NONE:
            type = 'none';
            break;
        }

        setNetworkInfo({
          isConnected: state.isConnected ?? false,
          type,
        });
      } catch {
        setNetworkInfo({
          isConnected: false,
          type: 'unknown',
        });
      }
    };

    checkNetwork();

    // Verificar periodicamente
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, []);

  const isNetworkAvailable = useMemo(
    () => networkInfo?.isConnected === true && networkInfo?.type === 'wifi',
    [networkInfo]
  );

  const login = useCallback(
    async (pin: string) => {
      await wsLogin(pin);
    },
    [wsLogin]
  );

  const logout = useCallback(async () => {
    await wsLogout();
  }, [wsLogout]);

  const connectToLastDesktop = useCallback(async (): Promise<boolean> => {
    // Primeiro tentar o desktop selecionado
    if (selectedDesktop) {
      try {
        await connect(selectedDesktop);
        return true;
      } catch {
        // Falhou, tentar histórico
      }
    }

    // Tentar último do histórico
    if (connectionHistory.length > 0) {
      const lastDesktop = connectionHistory[0].desktop;
      try {
        await connect(lastDesktop);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }, [selectedDesktop, connectionHistory, connect]);

  return {
    networkInfo,
    isNetworkAvailable,
    discoveredDesktops: desktops,
    isSearching,
    discoveryError,
    connectionState,
    selectedDesktop,
    isConnected,
    isConnecting,
    isAuthenticated,
    lastError,
    startDiscovery,
    stopDiscovery,
    connect,
    disconnect,
    login,
    logout,
    connectToLastDesktop,
  };
}

// Precisamos importar useState que estava faltando
import { useState } from 'react';
