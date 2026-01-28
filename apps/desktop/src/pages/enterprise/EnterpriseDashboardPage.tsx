/**
 * @file EnterpriseDashboard - Dashboard do módulo Enterprise
 * @description Painel principal com KPIs, requisições recentes e gráficos
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnterpriseDashboard, usePendingRequests, useContracts } from '@/hooks/enterprise';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardList,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EnterpriseKPIs, RecentRequest, ContractConsumption } from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// KPI CARD COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: number;
  icon: typeof Building2;
  iconColor: string;
  href: string;
  loading?: boolean;
}

const KPICard: FC<KPICardProps> = ({ title, value, icon: Icon, iconColor, href, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={() => navigate(href)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`${title}: ${value}. Clique para ver detalhes.`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-lg p-3', iconColor)} aria-hidden="true">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// RECENT REQUESTS WIDGET
// ────────────────────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  PARTIALLY_APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  SEPARATING: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  PARTIALLY_APPROVED: 'Parcial',
  REJECTED: 'Rejeitada',
  SEPARATING: 'Separando',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

interface RecentRequestsWidgetProps {
  requests: RecentRequest[];
  loading?: boolean;
}

const RecentRequestsWidget: FC<RecentRequestsWidgetProps> = ({ requests, loading }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Requisições Recentes</CardTitle>
          <CardDescription>Últimas solicitações de material</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/enterprise/requests')}>
          Ver todas
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma requisição encontrada</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/enterprise/requests/new')}
            >
              Criar primeira requisição
            </Button>
          </div>
        ) : (
          <ul className="space-y-1" role="list" aria-label="Lista de requisições recentes">
            {requests.map((request) => {
              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/enterprise/requests/${request.id}`);
                }
              };

              return (
                <li key={request.id}>
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => navigate(`/enterprise/requests/${request.id}`)}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="link"
                    aria-label={`Requisição ${request.code} de ${request.requesterName}, contrato ${
                      request.contractName
                    }, status ${statusLabels[request.status]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{request.code}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.contractName} • {request.requesterName}
                      </p>
                    </div>
                    <Badge
                      className={cn('font-normal shrink-0 ml-3', statusColors[request.status])}
                      role="status"
                      aria-label={`Status: ${statusLabels[request.status]}`}
                    >
                      {statusLabels[request.status]}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// CONSUMPTION CHART WIDGET
// ────────────────────────────────────────────────────────────────────────────

interface ConsumptionChartWidgetProps {
  data: ContractConsumption[];
  loading?: boolean;
}

const ConsumptionChartWidget: FC<ConsumptionChartWidgetProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consumo por Contrato</CardTitle>
          <CardDescription>Apropriação de materiais do mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Consumo por Contrato</CardTitle>
        <CardDescription>Apropriação de materiais do mês</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum consumo registrado</p>
          </div>
        ) : (
          <ul className="space-y-4" role="list" aria-label="Consumo por contrato">
            {data.map((item) => (
              <li key={item.contractId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]" title={item.contractName}>
                    {item.contractName}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.totalValue)}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(item.percentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.contractName}: ${Math.round(
                    item.percentage
                  )}% do orçamento consumido`}
                >
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ────────────────────────────────────────────────────────────────────────────

export const EnterpriseDashboardPage: FC = () => {
  const navigate = useNavigate();

  // Real hooks with Tauri invoke (React Query)
  // TODO: Create a proper global dashboard hook. Using individual hooks for now to compose.
  const {
    data: contracts,
    isLoading: isLoadingContracts,
    refetch: refetchContracts,
  } = useContracts();
  const {
    data: requests,
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
  } = usePendingRequests();
  // We need stock transfers hook here too for KPIs

  // Calculate KPIs locally until backend aggregator is ready
  const activeContracts = contracts?.filter((c) => c.status === 'ACTIVE').length || 0;
  const pendingRequests = requests?.length || 0;
  // const inTransitTransfers = ...

  const kpis: EnterpriseKPIs = {
    activeContracts,
    pendingRequests,
    inTransitTransfers: 0, // Placeholder
    lowStockAlerts: 0, // Placeholder
  };

  const recentRequests: RecentRequest[] =
    requests?.slice(0, 5).map((r) => ({
      id: r.id,
      code: r.requestNumber,
      status: r.status as any,
      requesterName: 'Unknown', // Need join
      contractName: 'Unknown', // Need join
      requestedAt: r.createdAt || new Date().toISOString(), // Fallback
      priority: r.priority as any,
    })) || [];

  const consumptionData: ContractConsumption[] = []; // Placeholder

  const isLoading = isLoadingContracts || isLoadingRequests;

  const handleRefresh = () => {
    refetchContracts();
    refetchRequests();
  };

  // Transform pending requests to recent requests format
  const recentRequests: RecentRequest[] = (pendingRequests || []).slice(0, 5).map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status as RecentRequest['status'],
    requesterName: r.requesterName,
    contractName: r.contractName,
    createdAt: r.createdAt,
  }));

  // Calculate consumption data from contracts
  const consumptionData: ContractConsumption[] = (contracts || []).slice(0, 4).map((c, i) => ({
    contractId: c.id,
    contractName: `${c.code} - ${c.name}`,
    totalValue: c.budget || 0,
    percentage: Math.min(100, Math.max(0, (4 - i) * 25)), // Placeholder until real consumption data
  }));

  // KPIs from real dashboard data
  const kpis: EnterpriseKPIs = dashboard
    ? {
        activeContracts: dashboard.activeContracts,
        pendingRequests: dashboard.pendingRequests,
        inTransitTransfers: dashboard.inTransitTransfers,
        lowStockAlerts: dashboard.lowStockAlerts,
      }
    : {
        activeContracts: 0,
        pendingRequests: 0,
        inTransitTransfers: 0,
        lowStockAlerts: 0,
      };

  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchRequests();
  }, [refetchDashboard, refetchRequests]);

  return (
    <div className="space-y-6" data-testid="enterprise-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Enterprise</h1>
          <p className="text-muted-foreground">Visão geral do almoxarifado industrial</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Contratos Ativos"
          value={kpis.activeContracts}
          icon={Building2}
          iconColor="bg-blue-600"
          href="/enterprise/contracts"
          loading={isLoading}
        />
        <KPICard
          title="Requisições Pendentes"
          value={kpis.pendingRequests}
          icon={ClipboardList}
          iconColor="bg-amber-600"
          href="/enterprise/requests?status=PENDING"
          loading={isLoading}
        />
        <KPICard
          title="Em Trânsito"
          value={kpis.inTransitTransfers}
          icon={Truck}
          iconColor="bg-purple-600"
          href="/enterprise/transfers?status=IN_TRANSIT"
          loading={isLoading}
        />
        <KPICard
          title="Alertas de Estoque"
          value={kpis.lowStockAlerts}
          icon={AlertTriangle}
          iconColor="bg-red-600"
          href="/enterprise/alerts"
          loading={isLoading}
        />
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentRequestsWidget requests={recentRequests} loading={isLoadingRequests} />
        <ConsumptionChartWidget data={consumptionData} loading={isLoadingContracts} />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          <CardDescription>Acesso direto às principais operações</CardDescription>
        </CardHeader>
        <CardContent>
          <nav aria-label="Ações rápidas do módulo Enterprise">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <Button
                onClick={() => navigate('/enterprise/requests/new')}
                className="justify-start sm:justify-center"
              >
                <ClipboardList className="mr-2 h-4 w-4" aria-hidden="true" />
                Nova Requisição
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/enterprise/transfers/new')}
                className="justify-start sm:justify-center"
              >
                <Truck className="mr-2 h-4 w-4" aria-hidden="true" />
                Nova Transferência
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/enterprise/contracts/new')}
                className="justify-start sm:justify-center"
              >
                <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Novo Contrato
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/enterprise/inventory')}
                className="justify-start sm:justify-center"
              >
                <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                Inventário Rotativo
              </Button>
            </div>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
};
