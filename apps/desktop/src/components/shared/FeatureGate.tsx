import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { FeatureKey, BusinessType } from '@/types/business-profile';
import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

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
  types: Array<'GROCERY' | 'MOTOPARTS' | 'GENERAL' | 'ENTERPRISE'>;

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

  if (!types.includes(businessType as (typeof types)[number])) {
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
    isBusinessType: (type: 'GROCERY' | 'MOTOPARTS' | 'GENERAL') => businessType === type,

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

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE ROUTE - Proteção de Rotas por Feature
// ═══════════════════════════════════════════════════════════════════════════

interface FeatureRouteProps {
  /**
   * Feature requerida para acessar a rota
   */
  feature?: FeatureKey;

  /**
   * Múltiplas features (usa mode para verificação)
   */
  features?: FeatureKey[];

  /**
   * Tipos de negócio permitidos
   */
  allowedTypes?: BusinessType[];

  /**
   * Modo de verificação para múltiplas features
   * @default 'all'
   */
  mode?: 'all' | 'any';

  /**
   * Rota para redirecionar se não tiver acesso
   * @default '/dashboard'
   */
  redirectTo?: string;

  /**
   * Conteúdo a ser renderizado
   */
  children?: ReactNode;
}

/**
 * Componente de rota que verifica se o usuário tem acesso baseado no perfil
 *
 * @example
 * // Protege rota enterprise
 * <Route
 *   path="enterprise/*"
 *   element={
 *     <FeatureRoute feature="enterprise" redirectTo="/pdv">
 *       <Outlet />
 *     </FeatureRoute>
 *   }
 * />
 *
 * @example
 * // Protege por tipo de negócio
 * <Route
 *   path="motoparts/*"
 *   element={
 *     <FeatureRoute allowedTypes={['MOTOPARTS']} redirectTo="/dashboard">
 *       <MotopartsPage />
 *     </FeatureRoute>
 *   }
 * />
 */
export function FeatureRoute({
  feature,
  features,
  allowedTypes,
  mode = 'all',
  redirectTo = '/dashboard',
  children,
}: FeatureRouteProps) {
  const { isFeatureEnabled, businessType } = useBusinessProfile();

  // Verifica tipo de negócio
  if (allowedTypes && !allowedTypes.includes(businessType)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Verifica feature única
  if (feature && !isFeatureEnabled(feature)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Verifica múltiplas features
  if (features && features.length > 0) {
    const hasAccess =
      mode === 'all'
        ? features.every((f) => isFeatureEnabled(f))
        : features.some((f) => isFeatureEnabled(f));

    if (!hasAccess) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Renderiza children ou Outlet (para nested routes)
  return <>{children ?? <Outlet />}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PARA NAVEGAÇÃO PERMITIDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuração de uma rota com restrição de acesso
 */
export interface RoutePermission {
  path: string;
  feature?: FeatureKey;
  features?: FeatureKey[];
  allowedTypes?: BusinessType[];
  mode?: 'all' | 'any';
}

/**
 * Hook para verificar se o usuário pode acessar uma rota
 */
export function useRoutePermission() {
  const { isFeatureEnabled, businessType } = useBusinessProfile();

  /**
   * Verifica se uma rota está acessível
   */
  const canAccessRoute = (permission: RoutePermission): boolean => {
    // Verifica tipo de negócio
    if (permission.allowedTypes && !permission.allowedTypes.includes(businessType)) {
      return false;
    }

    // Verifica feature única
    if (permission.feature && !isFeatureEnabled(permission.feature)) {
      return false;
    }

    // Verifica múltiplas features
    if (permission.features && permission.features.length > 0) {
      const mode = permission.mode ?? 'all';
      const hasAccess =
        mode === 'all'
          ? permission.features.every((f) => isFeatureEnabled(f))
          : permission.features.some((f) => isFeatureEnabled(f));

      if (!hasAccess) {
        return false;
      }
    }

    return true;
  };

  /**
   * Filtra lista de itens baseado em permissões
   */
  const filterByPermission = <T extends { permission?: RoutePermission }>(items: T[]): T[] => {
    return items.filter((item) => !item.permission || canAccessRoute(item.permission));
  };

  return {
    canAccessRoute,
    filterByPermission,
    businessType,
    isFeatureEnabled,
  };
}
