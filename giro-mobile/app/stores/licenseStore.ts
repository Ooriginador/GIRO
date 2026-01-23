/**
 * License Store - manages license state for mobile app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { validateLicense as apiValidateLicense, LicenseInfo } from '@lib/api';

const STORAGE_KEY = 'giro-license-store';

interface LicenseState {
  // State
  isLicenseValid: boolean;
  licenseInfo: LicenseInfo | null;
  licenseKey: string | null;
  lastValidated: number | null;
  isValidating: boolean;
  error: string | null;

  // Actions
  validateLicense: (licenseKey: string) => Promise<boolean>;
  setLicenseKey: (key: string) => void;
  clearLicense: () => void;
  checkLicenseExpiry: () => boolean;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLicenseValid: false,
      licenseInfo: null,
      licenseKey: null,
      lastValidated: null,
      isValidating: false,
      error: null,

      // Actions
      validateLicense: async (licenseKey: string) => {
        set({ isValidating: true, error: null });

        try {
          const response = await apiValidateLicense(licenseKey);

          if (response.valid && response.license) {
            set({
              isLicenseValid: true,
              licenseInfo: response.license,
              licenseKey,
              lastValidated: Date.now(),
              isValidating: false,
              error: null,
            });
            return true;
          } else {
            set({
              isLicenseValid: false,
              error: response.message || 'Licença inválida',
              isValidating: false,
            });
            return false;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao validar licença';
          set({
            isLicenseValid: false,
            error: message,
            isValidating: false,
          });
          return false;
        }
      },

      setLicenseKey: (key: string) => set({ licenseKey: key }),

      clearLicense: () =>
        set({
          isLicenseValid: false,
          licenseInfo: null,
          licenseKey: null,
          lastValidated: null,
          error: null,
        }),

      checkLicenseExpiry: () => {
        const { licenseInfo } = get();
        if (!licenseInfo?.expires_at) return true; // No expiry = valid

        const expiryDate = new Date(licenseInfo.expires_at);
        return expiryDate > new Date();
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        licenseKey: state.licenseKey,
        licenseInfo: state.licenseInfo,
        lastValidated: state.lastValidated,
        isLicenseValid: state.isLicenseValid,
      }),
    }
  )
);
