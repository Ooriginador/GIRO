import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { FeatureKey } from '@/types/business-profile';
import { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE GATE - Renderização Condicional por Feature
// ═══════════════════════════════════════════════════════════════════════════

interface FeatureGateProps {
  /**
   * Feature que deve estar habilitada para renderizar o children
   */
  feature: FeatureKey;

  /**
   * Conteúdo a ser renderizado se a feature estiver habilitada
   */
  children: ReactNode;

  /**
   * Conteúdo alternativo se a feature estiver desabilitada
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Inverter a lógica (renderizar se a feature estiver DESABILITADA)
   * @default false
   */
  inverted?: boolean;
}

/**
 * Componente que renderiza children apenas se a feature estiver habilitada
 * no perfil de negócio atual.
 *
 * @example
 * // Renderiza apenas para motopeças
 * <FeatureGate feature="vehicleCompatibility">
 *   <VehicleSelector />
 * </FeatureGate>
 *
 * @example
 * // Renderiza apenas para mercearias (com validade)
 * <FeatureGate feature="expirationControl">
 *   <ExpirationAlerts />
 * </FeatureGate>
 *
 * @example
 * // Renderiza algo diferente se a feature não estiver habilitada
 * <FeatureGate
 *   feature="serviceOrders"
 *   fallback={<p>Ordens de serviço não disponíveis</p>}
 * >
 *   <ServiceOrderList />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  inverted = false,
}: FeatureGateProps) {
  const { isFeatureEnabled } = useBusinessProfile();

  const isEnabled = isFeatureEnabled(feature);
  const shouldRender = inverted ? !isEnabled : isEnabled;

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI FEATURE GATE - Múltiplas Features
// ═══════════════════════════════════════════════════════════════════════════

interface MultiFeatureGateProps {
  /**
   * Features que devem estar habilitadas
   */
  features: FeatureKey[];

  /**
   * Modo de verificação:
   * - 'all': Todas as features devem estar habilitadas
   * - 'any': Pelo menos uma feature deve estar habilitada
   * @default 'all'
   */
  mode?: 'all' | 'any';

  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que renderiza children baseado em múltiplas features
 *
 * @example
 * // Renderiza se TODAS as features estiverem habilitadas
 * <MultiFeatureGate features={['vehicleCompatibility', 'serviceOrders']}>
 *   <ServiceOrderWithVehicle />
 * </MultiFeatureGate>
 *
 * @example
 * // Renderiza se QUALQUER feature estiver habilitada
 * <MultiFeatureGate features={['expirationControl', 'lotTracking']} mode="any">
 *   <LotManagement />
 * </MultiFeatureGate>
 */
export function MultiFeatureGate({
  features,
  mode = 'all',
  children,
  fallback = null,
}: MultiFeatureGateProps) {
  const { isFeatureEnabled } = useBusinessProfile();

  const shouldRender =
    mode === 'all'
      ? features.every((f) => isFeatureEnabled(f))
      : features.some((f) => isFeatureEnabled(f));

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS TYPE GATE - Por Tipo de Negócio
// ═══════════════════════════════════════════════════════════════════════════

interface BusinessTypeGateProps {
  /**
   * Tipos de negócio que podem ver o conteúdo
   */
  types: Array<'GROCERY' | 'MOTOPARTS' | 'PETSHOP' | 'GENERAL'>;

  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que renderiza children apenas para tipos específicos de negócio
 *
 * @example
 * <BusinessTypeGate types={['MOTOPARTS']}>
 *   <MotorcycleDatabase />
 * </BusinessTypeGate>
 */
export function BusinessTypeGate({ types, children, fallback = null }: BusinessTypeGateProps) {
  const { businessType } = useBusinessProfile();

  if (!types.includes(businessType)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PARA VERIFICAÇÃO IMPERATIVA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para verificação imperativa de features
 * Útil para lógica condicional fora do JSX
 *
 * @example
 * const { canUse } = useFeatureCheck();
 *
 * const menuItems = [
 *   { label: 'Produtos', path: '/products' },
 *   canUse('vehicleCompatibility') && { label: 'Veículos', path: '/vehicles' },
 *   canUse('serviceOrders') && { label: 'Ordens de Serviço', path: '/orders' },
 * ].filter(Boolean);
 */
export function useFeatureCheck() {
  const { isFeatureEnabled, businessType, profile } = useBusinessProfile();

  return {
    /**
     * Verifica se uma feature pode ser usada
     */
    canUse: (feature: FeatureKey) => isFeatureEnabled(feature),

    /**
     * Verifica se o negócio é de um tipo específico
     */
    isBusinessType: (type: 'GROCERY' | 'MOTOPARTS' | 'PETSHOP' | 'GENERAL') =>
      businessType === type,

    /**
     * Verifica múltiplas features (all)
     */
    canUseAll: (features: FeatureKey[]) => features.every((f) => isFeatureEnabled(f)),

    /**
     * Verifica múltiplas features (any)
     */
    canUseAny: (features: FeatureKey[]) => features.some((f) => isFeatureEnabled(f)),

    /**
     * Perfil atual
     */
    profile,

    /**
     * Tipo de negócio atual
     */
    businessType,
  };
}
