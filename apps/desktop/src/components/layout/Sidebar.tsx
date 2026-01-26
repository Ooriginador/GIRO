/**
 * @file Sidebar - Navegação lateral
 * @description Menu de navegação principal com ícones
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import { useState, type FC } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  icon: typeof ShoppingCart;
  label: string;
  href: string;
  badge?: number;
  tutorialId?: string;
  testId?: string;
}

export const Sidebar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isFeatureEnabled } = useBusinessProfile();

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', tutorialId: 'nav-dashboard' },
    ...(isFeatureEnabled('serviceOrders')
      ? [
          {
            icon: BarChart3,
            label: 'Dashboard (Oficina)',
            href: '/motoparts/dashboard',
          },
          { icon: Wrench, label: 'Ordens de Serviço', href: '/service-orders' },
        ]
      : []),
    ...(isFeatureEnabled('warranties')
      ? [{ icon: ShieldCheck, label: 'Garantias', href: '/warranties' }]
      : []),
    // Enterprise Module
    ...(isFeatureEnabled('enterprise')
      ? [
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
          },
          {
            icon: Construction,
            label: 'Frentes',
            href: '/enterprise/work-fronts',
            testId: 'nav-work-fronts',
          },
          { icon: MapPin, label: 'Locais', href: '/enterprise/locations', testId: 'nav-locations' },
          {
            icon: ClipboardList,
            label: 'Requisições',
            href: '/enterprise/requests',
            testId: 'nav-requests',
          },
          {
            icon: ArrowLeftRight,
            label: 'Transferências',
            href: '/enterprise/transfers',
            testId: 'nav-transfers',
          },
        ]
      : []),
    { icon: ShoppingCart, label: 'PDV', href: '/pdv', tutorialId: 'nav-pdv' },
    { icon: Contact, label: 'Clientes', href: '/customers' },
    { icon: Package, label: 'Produtos', href: '/products', tutorialId: 'nav-products' },
    { icon: Boxes, label: 'Estoque', href: '/stock', tutorialId: 'nav-stock' },
    { icon: Truck, label: 'Fornecedores', href: '/suppliers', tutorialId: 'nav-suppliers' },
    { icon: Users, label: 'Funcionários', href: '/employees', tutorialId: 'nav-employees' },
    { icon: Wallet, label: 'Caixa', href: '/cash', tutorialId: 'nav-cash' },
    { icon: BarChart3, label: 'Relatórios', href: '/reports', tutorialId: 'nav-reports' },
    { icon: Bell, label: 'Alertas', href: '/alerts', tutorialId: 'nav-alerts' },
    { icon: Shield, label: 'Meus Dados', href: '/my-data', tutorialId: 'nav-my-data' },
    { icon: Settings, label: 'Configurações', href: '/settings', tutorialId: 'nav-settings' },
  ];

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
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
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
