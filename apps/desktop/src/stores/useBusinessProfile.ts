import {
  BusinessFeatures,
  BusinessLabels,
  BusinessProfile,
  BusinessType,
  DEFAULT_BUSINESS_TYPE,
  FeatureKey,
  getBusinessProfile,
} from '@/types/business-profile';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS PROFILE STORE
// ═══════════════════════════════════════════════════════════════════════════

interface BusinessProfileState {
  // Estado
  businessType: BusinessType;
  isConfigured: boolean; // Se o usuário já selecionou um perfil

  // Computed (derivado do tipo)
  profile: BusinessProfile;
  features: BusinessFeatures;
  labels: BusinessLabels;

  // Ações
  setBusinessType: (type: BusinessType) => void;
  markAsConfigured: () => void;
  resetProfile: () => void;

  // Helpers
  isFeatureEnabled: (feature: FeatureKey) => boolean;
  getLabel: (key: keyof BusinessLabels) => string;
}

export const useBusinessProfileStore = create<BusinessProfileState>()(
  persist(
    (set, get) => {
      const initialProfile = getBusinessProfile(DEFAULT_BUSINESS_TYPE);

      return {
        // Estado inicial
        businessType: DEFAULT_BUSINESS_TYPE,
        isConfigured: false,
        profile: initialProfile,
        features: initialProfile.features,
        labels: initialProfile.labels,

        // Ações
        setBusinessType: (type: BusinessType) => {
          const profile = getBusinessProfile(type);
          set({
            businessType: type,
            profile,
            features: profile.features,
            labels: profile.labels,
          });
        },

        markAsConfigured: () => {
          set({ isConfigured: true });
        },

        resetProfile: () => {
          const initialProfile = getBusinessProfile(DEFAULT_BUSINESS_TYPE);
          set({
            businessType: DEFAULT_BUSINESS_TYPE,
            isConfigured: false,
            profile: initialProfile,
            features: initialProfile.features,
            labels: initialProfile.labels,
          });
        },

        // Helpers
        isFeatureEnabled: (feature: FeatureKey) => {
          return get().features[feature] === true;
        },

        getLabel: (key: keyof BusinessLabels) => {
          return get().labels[key];
        },
      };
    },
    {
      name: 'giro-business-profile',
      partialize: (state) => ({
        businessType: state.businessType,
        isConfigured: state.isConfigured,
      }),
      // Rehidratar o profile completo baseado no tipo salvo
      onRehydrateStorage: () => (state) => {
        if (state) {
          const profile = getBusinessProfile(state.businessType);
          state.profile = profile;
          state.features = profile.features;
          state.labels = profile.labels;
        }
      },
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// HOOK SIMPLIFICADO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para acessar o perfil de negócio atual
 * Uso: const { profile, isFeatureEnabled } = useBusinessProfile();
 */
export function useBusinessProfile() {
  const store = useBusinessProfileStore();

  return {
    // Estado
    businessType: store.businessType,
    profile: store.profile,
    features: store.features,
    labels: store.labels,
    isConfigured: store.isConfigured,

    // Ações
    setBusinessType: store.setBusinessType,
    markAsConfigured: store.markAsConfigured,
    resetProfile: store.resetProfile,

    // Helpers
    isFeatureEnabled: store.isFeatureEnabled,
    getLabel: store.getLabel,
  };
}
