/**
 * Hook para gerenciar conexão WebSocket com o Desktop
 */

import { WS_PORT } from '@lib/constants';
import { WebSocketClient, createWebSocketClient } from '@lib/websocket';
import { useConnectionStore } from '@stores/connectionStore';
import { useProductsStore } from '@stores/productsStore';
import type { ConnectionState, DiscoveredDesktop } from '@/types/connection';
import type {
  AuthLoginPayload,
  AuthLoginResponse,
  ProductGetPayload,
  ProductSearchPayload,
  StockAdjustPayload,
  StockAdjustResponse,
  WSActionType,
  WSEventType,
  WSResponse,
} from '@/types/message';
import type { Product } from '@/types/product';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface UseWebSocketResult {
  // State
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;

  // Actions
  connect: (desktop: DiscoveredDesktop) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Auth
  login: (pin: string) => Promise<AuthLoginResponse>;
  logout: () => Promise<void>;

  // Produtos
  getProduct: (barcode: string) => Promise<Product | null>;
  searchProducts: (query: string, options?: Partial<ProductSearchPayload>) => Promise<Product[]>;

  // Estoque
  adjustStock: (payload: StockAdjustPayload) => Promise<StockAdjustResponse>;

  // Generic send
  send: <TPayload = unknown, TResponse = unknown>(
    action: WSActionType,
    payload: TPayload
  ) => Promise<WSResponse<TResponse>>;

  // Events
  onEvent: <T = unknown>(event: WSEventType, handler: (data: T) => void) => () => void;
}

// Singleton do cliente WebSocket
let wsClient: WebSocketClient | null = null;

export function useWebSocket(): UseWebSocketResult {
  const {
    connectionState,
    setConnectionState,
    selectedDesktop,
    setSelectedDesktop,
    setToken,
    setOperator,
    token,
    deviceId,
    addToHistory,
    setLastError,
  } = useConnectionStore();

  const { setProduct, updateProductStock } = useProductsStore();

  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Registrar handlers de eventos
  useEffect(() => {
    if (!wsClient) return;

    const unsubStock = wsClient.onEvent('stock.updated', (event) => {
      const data = event.data as { productId: string; newStock: number };
      updateProductStock(data.productId, data.newStock);
    });

    const unsubState = wsClient.onStateChange((newState) => {
      if (isMountedRef.current) {
        setConnectionState(newState);
      }
    });

    return () => {
      unsubStock();
      unsubState();
    };
  }, [setConnectionState, updateProductStock]);

  const connect = useCallback(
    async (desktop: DiscoveredDesktop) => {
      try {
        setLastError(null);
        setConnectionState('connecting');

        const url = `ws://${desktop.ip}:${desktop.port || WS_PORT}`;

        // Criar novo cliente ou reutilizar
        if (wsClient) {
          wsClient.disconnect();
        }
        wsClient = createWebSocketClient(url);

        // Registrar handler de estado
        wsClient.onStateChange((newState) => {
          if (isMountedRef.current) {
            setConnectionState(newState);
          }
        });

        await wsClient.connect();

        setSelectedDesktop(desktop);
        addToHistory(desktop);
        setConnectionState('connected');
      } catch (error) {
        setConnectionState('error');
        setLastError((error as Error).message);
        throw error;
      }
    },
    [setConnectionState, setSelectedDesktop, addToHistory, setLastError]
  );

  const disconnect = useCallback(() => {
    wsClient?.disconnect();
    wsClient = null;
    setToken(null);
    setOperator(null);
    setConnectionState('disconnected');
  }, [setConnectionState, setToken, setOperator]);

  const reconnect = useCallback(async () => {
    if (selectedDesktop) {
      await connect(selectedDesktop);

      // Re-autenticar se tinha token
      if (token) {
        wsClient?.setToken(token);
        setConnectionState('authenticated');
      }
    }
  }, [selectedDesktop, connect, token, setConnectionState]);

  const login = useCallback(
    async (pin: string): Promise<AuthLoginResponse> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      const payload: AuthLoginPayload = {
        pin,
        deviceId: deviceId || 'unknown',
        deviceName: 'GIRO Mobile',
      };

      const response = await wsClient.send<AuthLoginPayload, AuthLoginResponse>(
        'auth.login',
        payload
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Login failed');
      }

      setToken(response.data.token);
      setOperator(response.data.employee);
      wsClient.setToken(response.data.token);
      setConnectionState('authenticated');

      return response.data;
    },
    [deviceId, setToken, setOperator, setConnectionState]
  );

  const logout = useCallback(async () => {
    if (wsClient?.isAuthenticated()) {
      await wsClient.send('auth.logout', {});
    }

    setToken(null);
    setOperator(null);
    wsClient?.setToken(null);
    setConnectionState('connected');
  }, [setToken, setOperator, setConnectionState]);

  const getProduct = useCallback(
    async (barcode: string): Promise<Product | null> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      const response = await wsClient.send<ProductGetPayload, Product>('product.get', { barcode });

      if (response.success && response.data) {
        setProduct(response.data);
        return response.data;
      }

      return null;
    },
    [setProduct]
  );

  const searchProducts = useCallback(
    async (query: string, options?: Partial<ProductSearchPayload>): Promise<Product[]> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      const payload: ProductSearchPayload = {
        query,
        limit: 20,
        offset: 0,
        ...options,
      };

      const response = await wsClient.send<ProductSearchPayload, { products: Product[] }>(
        'product.search',
        payload
      );

      if (response.success && response.data) {
        return response.data.products;
      }

      return [];
    },
    []
  );

  const adjustStock = useCallback(
    async (payload: StockAdjustPayload): Promise<StockAdjustResponse> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      const response = await wsClient.send<StockAdjustPayload, StockAdjustResponse>(
        'stock.adjust',
        payload
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Stock adjustment failed');
      }

      updateProductStock(payload.productId, response.data.newStock);

      return response.data;
    },
    [updateProductStock]
  );

  const send = useCallback(
    async <TPayload = unknown, TResponse = unknown>(
      action: WSActionType,
      payload: TPayload
    ): Promise<WSResponse<TResponse>> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      return wsClient.send<TPayload, TResponse>(action, payload);
    },
    []
  );

  const onEvent = useCallback(
    <T = unknown>(event: WSEventType, handler: (data: T) => void): (() => void) => {
      if (!wsClient) {
        return () => {};
      }

      return wsClient.onEvent(event, (wsEvent) => {
        handler(wsEvent.data as T);
      });
    },
    []
  );

  const isConnected = useMemo(
    () => connectionState === 'connected' || connectionState === 'authenticated',
    [connectionState]
  );

  const isAuthenticated = useMemo(() => connectionState === 'authenticated', [connectionState]);

  return {
    connectionState,
    isConnected,
    isConnecting: connectionState === 'connecting',
    isAuthenticated,
    connect,
    disconnect,
    reconnect,
    login,
    logout,
    getProduct,
    searchProducts,
    adjustStock,
    send,
    onEvent,
  };
}
