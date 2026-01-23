/**
 * Store de conexão - gerencia estado da conexão com o Desktop
 */

import { LIMITS, STORAGE_KEYS } from '@lib/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ConnectionHistory,
  ConnectionState,
  DiscoveredDesktop,
  Operator,
} from '@/types/connection';
import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';

interface ConnectionStore {
  // State
  connectionState: ConnectionState;
  selectedDesktop: DiscoveredDesktop | null;
  discoveredDesktops: DiscoveredDesktop[];
  operator: Operator | null;
  token: string | null;
  deviceId: string | null;
  connectionHistory: ConnectionHistory[];
  lastError: string | null;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setSelectedDesktop: (desktop: DiscoveredDesktop | null) => void;
  setDiscoveredDesktops: (desktops: DiscoveredDesktop[]) => void;
  addDiscoveredDesktop: (desktop: DiscoveredDesktop) => void;
  removeDiscoveredDesktop: (desktopId: string) => void;
  setOperator: (operator: Operator | null) => void;
  setToken: (token: string | null) => void;
  setDeviceId: (deviceId: string) => void;
  addToHistory: (desktop: DiscoveredDesktop) => void;
  setLastError: (error: string | null) => void;

  // Computed
  isConnected: () => boolean;
  isAuthenticated: () => boolean;

  // Reset
  reset: () => void;
  logout: () => void;
  disconnect: () => void;
  clearHistory: () => void;
}

const initialState = {
  connectionState: 'disconnected' as ConnectionState,
  selectedDesktop: null,
  discoveredDesktops: [],
  operator: null,
  token: null,
  deviceId: null,
  connectionHistory: [],
  lastError: null,
};

export const useConnectionStore = create<ConnectionStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Actions
        setConnectionState: (state) => set({ connectionState: state }),

        setSelectedDesktop: (desktop) => set({ selectedDesktop: desktop }),

        setDiscoveredDesktops: (desktops) => set({ discoveredDesktops: desktops }),

        addDiscoveredDesktop: (desktop) =>
          set((state) => {
            const exists = state.discoveredDesktops.find((d) => d.id === desktop.id);
            if (exists) {
              // Atualiza desktop existente
              return {
                discoveredDesktops: state.discoveredDesktops.map((d) =>
                  d.id === desktop.id ? { ...d, ...desktop, lastSeen: Date.now() } : d
                ),
              };
            }
            return {
              discoveredDesktops: [...state.discoveredDesktops, desktop],
            };
          }),

        removeDiscoveredDesktop: (desktopId) =>
          set((state) => ({
            discoveredDesktops: state.discoveredDesktops.filter((d) => d.id !== desktopId),
          })),

        setOperator: (operator) => set({ operator }),

        setToken: (token) => set({ token }),

        setDeviceId: (deviceId) => set({ deviceId }),

        addToHistory: (desktop) =>
          set((state) => {
            const existing = state.connectionHistory.find((h) => h.desktop.id === desktop.id);

            if (existing) {
              // Atualiza histórico existente
              const updated = state.connectionHistory.map((h) =>
                h.desktop.id === desktop.id
                  ? {
                      ...h,
                      desktop,
                      lastConnected: Date.now(),
                      timesConnected: h.timesConnected + 1,
                    }
                  : h
              );
              return { connectionHistory: updated };
            }

            // Adiciona novo ao histórico
            const newHistory: ConnectionHistory = {
              desktop,
              lastConnected: Date.now(),
              timesConnected: 1,
            };

            const updated = [newHistory, ...state.connectionHistory].slice(
              0,
              LIMITS.CONNECTION_HISTORY_MAX
            );

            return { connectionHistory: updated };
          }),

        setLastError: (error) => set({ lastError: error }),

        // Computed
        isConnected: () => {
          const state = get().connectionState;
          return state === 'connected' || state === 'authenticated';
        },

        isAuthenticated: () => {
          return get().connectionState === 'authenticated';
        },

        // Reset
        reset: () => set(initialState),

        logout: () =>
          set({
            connectionState: 'connected',
            operator: null,
            token: null,
          }),

        disconnect: () =>
          set({
            connectionState: 'disconnected',
            operator: null,
            token: null,
            selectedDesktop: null,
          }),

        clearHistory: () => set({ connectionHistory: [] }),
      }),
      {
        name: STORAGE_KEYS.SELECTED_DESKTOP,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          selectedDesktop: state.selectedDesktop,
          deviceId: state.deviceId,
          connectionHistory: state.connectionHistory,
        }),
      }
    )
  )
);
