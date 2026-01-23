/**
 * Store de configurações do app
 */

import { STORAGE_KEYS } from '@lib/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsStore {
  // Scanner
  scannerVibration: boolean;
  scannerSound: boolean;
  scannerTorch: boolean;
  continuousScan: boolean;

  // UI
  theme: 'light' | 'dark' | 'system';
  hapticFeedback: boolean;
  showStockWarnings: boolean;

  // Inventário
  autoAdvanceOnCount: boolean;
  confirmInventoryFinish: boolean;

  // Notificações
  stockAlerts: boolean;
  expirationAlerts: boolean;

  // Compatibilidade
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoFlash: boolean;
  darkMode: boolean;

  // Actions
  setScannerVibration: (enabled: boolean) => void;
  setScannerSound: (enabled: boolean) => void;
  setScannerTorch: (enabled: boolean) => void;
  setContinuousScan: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHapticFeedback: (enabled: boolean) => void;
  setShowStockWarnings: (enabled: boolean) => void;
  setAutoAdvanceOnCount: (enabled: boolean) => void;
  setConfirmInventoryFinish: (enabled: boolean) => void;
  setStockAlerts: (enabled: boolean) => void;
  setExpirationAlerts: (enabled: boolean) => void;

  // Actions de Compatibilidade
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setAutoFlash: (enabled: boolean) => void;
  setDarkMode: (enabled: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  // Scanner
  scannerVibration: true,
  scannerSound: true,
  scannerTorch: false,
  continuousScan: false,

  // UI
  theme: 'system' as const,
  hapticFeedback: true,
  showStockWarnings: true,

  // Inventário
  autoAdvanceOnCount: true,
  confirmInventoryFinish: true,

  // Notificações
  stockAlerts: true,
  expirationAlerts: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,
      soundEnabled: initialState.scannerSound,
      vibrationEnabled: initialState.scannerVibration,
      autoFlash: initialState.scannerTorch,
      darkMode: (initialState.theme as string) === 'dark',

      // Actions
      setScannerVibration: (enabled) => set({ scannerVibration: enabled }),
      setScannerSound: (enabled) => set({ scannerSound: enabled }),
      setScannerTorch: (enabled) => set({ scannerTorch: enabled }),
      setContinuousScan: (enabled) => set({ continuousScan: enabled }),
      setTheme: (theme) => set({ theme }),
      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setShowStockWarnings: (enabled) => set({ showStockWarnings: enabled }),
      setAutoAdvanceOnCount: (enabled) => set({ autoAdvanceOnCount: enabled }),
      setConfirmInventoryFinish: (enabled) => set({ confirmInventoryFinish: enabled }),
      setStockAlerts: (enabled) => set({ stockAlerts: enabled }),
      setExpirationAlerts: (enabled) => set({ expirationAlerts: enabled }),

      // Compatibilidade
      setSoundEnabled: (enabled) => set({ scannerSound: enabled, soundEnabled: enabled }),
      setVibrationEnabled: (enabled) =>
        set({ scannerVibration: enabled, vibrationEnabled: enabled }),
      setAutoFlash: (enabled) => set({ scannerTorch: enabled, autoFlash: enabled }),
      setDarkMode: (enabled) => set({ theme: enabled ? 'dark' : 'light', darkMode: enabled }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
