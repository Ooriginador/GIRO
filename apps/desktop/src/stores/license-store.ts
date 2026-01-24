import { getStoredLicense } from '@/lib/tauri';
import { LicenseInfo } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LicenseState = 'loading' | 'unlicensed' | 'valid' | 'expired' | 'suspended' | 'error';

interface LicenseStore {
  // Estado
  licenseKey: string | null;
  licenseInfo: LicenseInfo | null;
  state: LicenseState;
  error: string | null;
  lastValidation: string | null;
  cloudToken: string | null;
  isHydrated: boolean;

  // Ações
  setLicenseKey: (key: string | null) => void;
  setLicenseInfo: (info: LicenseInfo) => void;
  setState: (state: LicenseState) => void;
  setError: (error: string | null) => void;
  updateLastValidation: () => void;
  setCloudToken: (token: string | null) => void;
  clearLicense: () => void;

  // Verificações
  isLicenseValid: () => boolean;
  needsValidation: () => boolean;
  isWithinGracePeriod: () => boolean;
  hydrateFromDisk: () => Promise<void>;
  resetHydration: () => void;
}

// Validade da cache de licença (1 hora)
const VALIDATION_CACHE_MS = 1 * 60 * 60 * 1000;
// Período de graça offline (7 dias) - Fallback
// const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export const useLicenseStore = create<LicenseStore>()(
  persist(
    (set, get) => ({
      licenseKey: null,
      licenseInfo: null,
      state: 'loading',
      error: null,
      lastValidation: null,
      cloudToken: null,
      isHydrated: false,

      setLicenseKey: (key) => set({ licenseKey: key }),

      setLicenseInfo: (info) => {
        const newState: LicenseState =
          info.status === 'active'
            ? 'valid'
            : info.status === 'expired'
            ? 'expired'
            : info.status === 'suspended'
            ? 'suspended'
            : 'error';

        set({
          licenseInfo: info,
          state: newState,
          error: null,
          isHydrated: true,
        });
      },

      setState: (state) => set({ state }),

      setError: (error) => set({ error, state: error ? 'error' : get().state }),

      updateLastValidation: () => set({ lastValidation: new Date().toISOString() }),

      setCloudToken: (cloudToken) => set({ cloudToken }),

      clearLicense: () =>
        set({
          licenseKey: null,
          licenseInfo: null,
          state: 'unlicensed',
          error: null,
          lastValidation: null,
          cloudToken: null,
          isHydrated: true,
        }),

      resetHydration: () => set({ isHydrated: false }),

      isLicenseValid: () => {
        const { state, licenseInfo } = get();
        if (state !== 'valid') return false;
        if (!licenseInfo) return false;

        // Verificar expiração local
        if (licenseInfo.expires_at) {
          const expiresAt = new Date(licenseInfo.expires_at);
          if (expiresAt < new Date()) return false;
        }

        return true;
      },

      needsValidation: () => {
        const { lastValidation, licenseKey, state, isHydrated } = get();
        if (!isHydrated) return false; // Wait for hydration
        if (!licenseKey) return false;

        // Se já deu erro, tenta validar de novo ao abrir/precisar
        if (state === 'error') return true;

        if (!lastValidation) return true;

        const lastCheck = new Date(lastValidation).getTime();
        const now = Date.now();
        return now - lastCheck > VALIDATION_CACHE_MS;
      },

      isWithinGracePeriod: () => {
        const { lastValidation, licenseKey, state, isHydrated, licenseInfo } = get();
        if (!isHydrated) return false; // Wait for hydration truth
        if (!licenseKey) return false;

        // Se já está válido, não precisa de grace period
        if (state === 'valid') return true;

        if (!lastValidation) return false;

        const lastCheck = new Date(lastValidation).getTime();
        const now = Date.now();
        const diff = now - lastCheck;

        const gracePeriodDays = licenseInfo?.grace_period_days ?? 7;
        const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;

        return diff < gracePeriodMs;
      },

      hydrateFromDisk: async () => {
        try {
          let data: {
            key?: string;
            info?: LicenseInfo;
            last_validated_at?: string;
            activated_at?: string;
          } | null;

          try {
            data = (await getStoredLicense()) as {
              key?: string;
              info?: LicenseInfo;
              last_validated_at?: string;
              activated_at?: string;
            } | null;
          } catch (err) {
            // Log only the error message to avoid printing stack traces in stderr
            console.error(
              '[LicenseStore] getStoredLicense rejected:',
              (err as Error)?.message ?? String(err)
            );
            set({ state: 'error', isHydrated: true });
            return;
          }

          if (data && data.key) {
            const info = data.info || null;
            const lastVal = data.last_validated_at || data.activated_at || null;

            // Determine initial state based on grace period
            let initialState: LicenseState = 'loading';
            if (info?.status === 'active') {
              const lastCheck = lastVal ? new Date(lastVal).getTime() : 0;
              const now = Date.now();
              // Se validado nos últimos X dias (grace period), consideramos válido imediatamente
              const gracePeriodDays = info.grace_period_days ?? 7;
              const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;

              if (now - lastCheck < gracePeriodMs) {
                initialState = 'valid';
              }
            }

            set({
              licenseKey: data.key,
              licenseInfo: info,
              lastValidation: lastVal,
              state: initialState,
              isHydrated: true,
            });
          } else {
            set({
              licenseKey: null,
              licenseInfo: null,
              state: 'unlicensed',
              isHydrated: true,
            });
          }
        } catch (error) {
          // Log only the error message to reduce noisy stack traces
          console.error(
            '[LicenseStore] Failed to hydrate license from disk:',
            (error as Error)?.message ?? String(error)
          );
          set({ state: 'error', isHydrated: true });
        }
      },
    }),
    {
      name: 'giro-license',
      partialize: (state) => ({
        licenseKey: state.licenseKey,
        licenseInfo: state.licenseInfo,
        lastValidation: state.lastValidation,
        cloudToken: state.cloudToken,
      }),
    }
  )
);
