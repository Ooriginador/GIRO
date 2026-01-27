/**
 * @file Sidebar - Navegação lateral
 * @description Menu de navegação principal com controle de visibilidade por perfil
 */

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { FeatureKey, BusinessType } from '@/types/business-profile';
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Contact,
  HelpCircle,
  HardHat,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Wrench,
  ArrowLeftRight,
  Construction,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuração de visibilidade de um item do menu
 */
interface NavItemVisibility {
  /** Feature que deve estar habilitada */
  feature?: FeatureKey;
  /** Lista de features (usa featureMode para verificação) */
  features?: FeatureKey[];
  /** Modo de verificação: 'all' = todas, 'any' = qualquer uma */
  featureMode?: 'all' | 'any';
  /** Tipos de negócio que podem ver este item */
  allowedTypes?: BusinessType[];
}

/**
 * Configuração de um item do menu
 */
interface NavItemConfig {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
  tutorialId?: string;
  testId?: string;
  /** Regras de visibilidade */
  visibility?: NavItemVisibility;
}

/**
 * Grupo de navegação (para separação visual)
 */
interface NavGroup {
  id: string;
  label?: string;
  items: NavItemConfig[];
  /** Regras de visibilidade do grupo inteiro */
  visibility?: NavItemVisibility;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CENTRALIZADA DO MENU
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuração completa do menu lateral
 * Edite aqui para adicionar/remover itens ou alterar visibilidade
 */
const NAV_GROUPS: NavGroup[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'main',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/dashboard',
        tutorialId: 'nav-dashboard',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ENTERPRISE (apenas para perfil ENTERPRISE)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'enterprise',
    label: 'Enterprise',
    visibility: { feature: 'enterprise' },
    items: [
      {
        icon: HardHat,
        label: 'Enterprise',
        href: '/enterprise',
        tutorialId: 'nav-enterprise',
        testId: 'nav-enterprise',
      },
      {
        icon: Building2,
        label: 'Contratos',
        href: '/enterprise/contracts',
        testId: 'nav-contracts',
        visibility: { feature: 'contracts' },
      },
      {
        icon: Construction,
        label: 'Frentes',
        href: '/enterprise/work-fronts',
        testId: 'nav-work-fronts',
        visibility: { feature: 'workFronts' },
      },
      {
        icon: MapPin,
        label: 'Locais',
        href: '/enterprise/locations',
        testId: 'nav-locations',
        visibility: { feature: 'multiLocation' },
      },
      {
        icon: ClipboardList,
        label: 'Requisições',
        href: '/enterprise/requests',
        testId: 'nav-requests',
        visibility: { feature: 'materialRequests' },
      },
      {
        icon: ArrowLeftRight,
        label: 'Transferências',
        href: '/enterprise/transfers',
        testId: 'nav-transfers',
        visibility: { feature: 'stockTransfers' },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MOTOPEÇAS (apenas para perfil MOTOPARTS ou GENERAL)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'motoparts',
    label: 'Oficina',
    visibility: { features: ['serviceOrders', 'warranties'], featureMode: 'any' },
    items: [
      {
        icon: BarChart3,
        label: 'Dashboard (Oficina)',
        href: '/motoparts/dashboard',
        visibility: { feature: 'serviceOrders' },
      },
      {
        icon: Wrench,
        label: 'Ordens de Serviço',
        href: '/service-orders',
        visibility: { feature: 'serviceOrders' },
      },
      {
        icon: ShieldCheck,
        label: 'Garantias',
        href: '/warranties',
        visibility: { feature: 'warranties' },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VENDAS (PDV e Caixa)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'sales',
    items: [
      {
        icon: ShoppingCart,
        label: 'PDV',
        href: '/pdv',
        tutorialId: 'nav-pdv',
        visibility: { feature: 'pdv' },
      },
      {
        icon: ClipboardCheck,
        label: 'Pedidos',
        href: '/pdv/pending-orders',
        visibility: { feature: 'pdv' },
      },
      {
        icon: Contact,
        label: 'Clientes',
        href: '/customers',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ESTOQUE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    items: [
      {
        icon: Package,
        label: 'Produtos',
        href: '/products',
        tutorialId: 'nav-products',
      },
      {
        icon: Boxes,
        label: 'Estoque',
        href: '/stock',
        tutorialId: 'nav-stock',
      },
      {
        icon: Truck,
        label: 'Fornecedores',
        href: '/suppliers',
        tutorialId: 'nav-suppliers',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GESTÃO
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'management',
    items: [
      {
        icon: Users,
        label: 'Funcionários',
        href: '/employees',
        tutorialId: 'nav-employees',
      },
      {
        icon: Wallet,
        label: 'Caixa',
        href: '/cash',
        tutorialId: 'nav-cash',
        visibility: { feature: 'cashControl' },
      },
      {
        icon: BarChart3,
        label: 'Relatórios',
        href: '/reports',
        tutorialId: 'nav-reports',
      },
      {
        icon: Bell,
        label: 'Alertas',
        href: '/alerts',
        tutorialId: 'nav-alerts',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURAÇÕES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'settings',
    items: [
      {
        icon: Shield,
        label: 'Meus Dados',
        href: '/my-data',
        tutorialId: 'nav-my-data',
      },
      {
        icon: Settings,
        label: 'Configurações',
        href: '/settings',
        tutorialId: 'nav-settings',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HOOK DE VISIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para verificar visibilidade de itens do menu
 */
function useNavVisibility() {
  const { isFeatureEnabled, businessType } = useBusinessProfile();

  /**
   * Verifica se um item deve ser visível
   */
  const isVisible = (visibility?: NavItemVisibility): boolean => {
    if (!visibility) return true;

    // Verifica tipo de negócio
    if (visibility.allowedTypes && !visibility.allowedTypes.includes(businessType)) {
      return false;
    }

    // Verifica feature única
    if (visibility.feature && !isFeatureEnabled(visibility.feature)) {
      return false;
    }

    // Verifica múltiplas features
    if (visibility.features && visibility.features.length > 0) {
      const mode = visibility.featureMode ?? 'all';
      const hasAccess =
        mode === 'all'
          ? visibility.features.every((f) => isFeatureEnabled(f))
          : visibility.features.some((f) => isFeatureEnabled(f));

      if (!hasAccess) {
        return false;
      }
    }

    return true;
  };

  return { isVisible, businessType };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const Sidebar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isVisible, businessType } = useNavVisibility();

  // Filtra grupos e itens baseado na visibilidade
  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => {
      // Se o grupo tem regra de visibilidade e não passa, retorna null
      if (!isVisible(group.visibility)) {
        return null;
      }

      // Filtra itens do grupo
      const visibleItems = group.items.filter((item) => isVisible(item.visibility));

      // Se não tem itens visíveis, não mostra o grupo
      if (visibleItems.length === 0) {
        return null;
      }

      return {
        ...group,
        items: visibleItems,
      };
    }).filter(Boolean) as NavGroup[];
  }, [isVisible, businessType]);

  return (
    <aside
      data-tutorial="sidebar"
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GIRO" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-foreground">GIRO</span>
          </div>
        )}
        {isCollapsed && <img src="/logo.png" alt="GIRO" className="h-8 w-8 rounded-lg mx-auto" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {visibleGroups.map((group, index) => (
          <div key={group.id}>
            {/* Separador entre grupos (exceto o primeiro) */}
            {index > 0 && <Separator className="my-2" />}

            {/* Label do grupo (se tiver e não estiver colapsado) */}
            {group.label && !isCollapsed && (
              <div className="px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
              </div>
            )}

            {/* Itens do grupo */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    data-tutorial={item.tutorialId}
                    data-testid={item.testId}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isActive
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        : 'text-muted-foreground',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                    {!isCollapsed && item.badge && item.badge > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Ajuda / Tutoriais */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          data-tutorial="help-button"
          onClick={() => navigate('/tutorials')}
          className={cn('w-full justify-start', isCollapsed && 'px-2 justify-center')}
          title="Central de Treinamentos (F1)"
        >
          <HelpCircle className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Ajuda</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('w-full', isCollapsed && 'px-2')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS PARA CONFIGURAÇÃO EXTERNA
// ═══════════════════════════════════════════════════════════════════════════

export type { NavItemConfig, NavGroup, NavItemVisibility };
export { NAV_GROUPS };
