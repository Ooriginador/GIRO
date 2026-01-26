/**
 * Feature Flags para GIRO
 * Controle granular de funcionalidades por ambiente e perfil
 */

export interface FeatureFlags {
  // Core
  enableEnterprise: boolean;
  enableGrocery: boolean;
  enableMotoparts: boolean;

  // Enterprise específicos
  enterpriseContracts: boolean;
  enterpriseWorkFronts: boolean;
  enterpriseMaterialRequests: boolean;
  enterpriseTransfers: boolean;
  enterpriseInventory: boolean;
  enterpriseActivities: boolean;
  enterpriseCostCenters: boolean;

  // Integrações
  enterpriseSiengeExport: boolean;
  enterpriseUAUExport: boolean;
  enterpriseMobileSync: boolean;

  // Relatórios
  enterpriseReports: boolean;
  enterpriseAnalytics: boolean;

  // Experimental
  experimentalAI: boolean;
  experimentalVoice: boolean;
}

export type Environment = 'development' | 'staging' | 'production';

// Flags padrão por ambiente
export const DEFAULT_FLAGS: Record<Environment, FeatureFlags> = {
  development: {
    // Core - todos habilitados em dev
    enableEnterprise: true,
    enableGrocery: true,
    enableMotoparts: true,

    // Enterprise - todos habilitados em dev
    enterpriseContracts: true,
    enterpriseWorkFronts: true,
    enterpriseMaterialRequests: true,
    enterpriseTransfers: true,
    enterpriseInventory: true,
    enterpriseActivities: true,
    enterpriseCostCenters: true,

    // Integrações - habilitadas em dev
    enterpriseSiengeExport: true,
    enterpriseUAUExport: true,
    enterpriseMobileSync: true,

    // Relatórios
    enterpriseReports: true,
    enterpriseAnalytics: true,

    // Experimental - habilitados em dev
    experimentalAI: true,
    experimentalVoice: true,
  },

  staging: {
    // Core
    enableEnterprise: true,
    enableGrocery: true,
    enableMotoparts: true,

    // Enterprise
    enterpriseContracts: true,
    enterpriseWorkFronts: true,
    enterpriseMaterialRequests: true,
    enterpriseTransfers: true,
    enterpriseInventory: true,
    enterpriseActivities: true,
    enterpriseCostCenters: true,

    // Integrações
    enterpriseSiengeExport: true,
    enterpriseUAUExport: true,
    enterpriseMobileSync: true,

    // Relatórios
    enterpriseReports: true,
    enterpriseAnalytics: true,

    // Experimental
    experimentalAI: false,
    experimentalVoice: false,
  },

  production: {
    // Core - Enterprise desabilitado por padrão (gradual rollout)
    enableEnterprise: false,
    enableGrocery: true,
    enableMotoparts: true,

    // Enterprise - desabilitados em produção inicialmente
    enterpriseContracts: false,
    enterpriseWorkFronts: false,
    enterpriseMaterialRequests: false,
    enterpriseTransfers: false,
    enterpriseInventory: false,
    enterpriseActivities: false,
    enterpriseCostCenters: false,

    // Integrações - desabilitadas
    enterpriseSiengeExport: false,
    enterpriseUAUExport: false,
    enterpriseMobileSync: false,

    // Relatórios
    enterpriseReports: false,
    enterpriseAnalytics: false,

    // Experimental - sempre desabilitados em prod
    experimentalAI: false,
    experimentalVoice: false,
  },
};

/**
 * Obtém as feature flags para o ambiente atual
 */
export function getFeatureFlags(env?: Environment): FeatureFlags {
  const environment = env || (import.meta.env?.MODE as Environment) || 'development';
  const baseFlags = DEFAULT_FLAGS[environment] || DEFAULT_FLAGS.development;

  // Permitir override via variáveis de ambiente
  return {
    ...baseFlags,
    enableEnterprise: parseEnvBool('VITE_ENABLE_ENTERPRISE', baseFlags.enableEnterprise),
    enterpriseContracts: parseEnvBool('VITE_ENTERPRISE_CONTRACTS', baseFlags.enterpriseContracts),
    enterpriseWorkFronts: parseEnvBool(
      'VITE_ENTERPRISE_WORK_FRONTS',
      baseFlags.enterpriseWorkFronts
    ),
    enterpriseMaterialRequests: parseEnvBool(
      'VITE_ENTERPRISE_REQUESTS',
      baseFlags.enterpriseMaterialRequests
    ),
    enterpriseTransfers: parseEnvBool('VITE_ENTERPRISE_TRANSFERS', baseFlags.enterpriseTransfers),
    enterpriseInventory: parseEnvBool('VITE_ENTERPRISE_INVENTORY', baseFlags.enterpriseInventory),
    enterpriseSiengeExport: parseEnvBool(
      'VITE_ENTERPRISE_SIENGE',
      baseFlags.enterpriseSiengeExport
    ),
    enterpriseUAUExport: parseEnvBool('VITE_ENTERPRISE_UAU', baseFlags.enterpriseUAUExport),
    enterpriseMobileSync: parseEnvBool(
      'VITE_ENTERPRISE_MOBILE_SYNC',
      baseFlags.enterpriseMobileSync
    ),
  };
}

/**
 * Verifica se uma feature está habilitada
 */
export function isFeatureEnabled(flag: keyof FeatureFlags, env?: Environment): boolean {
  const flags = getFeatureFlags(env);
  return flags[flag];
}

/**
 * Hook para usar feature flags em componentes React
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return isFeatureEnabled(flag);
}

/**
 * Componente wrapper para renderização condicional
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(feature);
  return isEnabled ? children : fallback;
}

// Helpers
function parseEnvBool(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env?.[key];
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}

// Type exports
export type FeatureFlagKey = keyof FeatureFlags;
