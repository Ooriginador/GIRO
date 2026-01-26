/**
 * Enterprise Dashboard - Componente Principal
 *
 * Dashboard visual para o modulo Enterprise com KPIs, graficos e resumos.
 * Otimizado com React.memo para performance.
 */

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ContractIcon,
  MaterialRequestIcon,
  StockTransferIcon,
  WorkFrontIcon,
} from '../icons/EnterpriseIcons';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Package,
  TrendingUp,
  Warehouse,
} from 'lucide-react';

// Re-exportar icones para evitar tree-shaking
export const EnterpriseIcons = {
  ContractIcon,
  MaterialRequestIcon,
  StockTransferIcon,
  WorkFrontIcon,
};
export const InventoryIcon = Warehouse;

// =============================================================================
// TIPOS
// =============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface ContractSummary {
  id: string;
  code: string;
  name: string;
  status: 'PLANNING' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  progress: number;
  pendingRequests: number;
}

interface PendingItem {
  id: string;
  type: 'request' | 'transfer' | 'approval';
  code: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
}

interface EnterpriseDashboardProps {
  contracts: ContractSummary[];
  pendingItems: PendingItem[];
  kpis: {
    activeContracts: number;
    pendingRequests: number;
    inTransitTransfers: number;
    lowStockItems: number;
    monthlyConsumption: number;
    consumptionTrend: number;
  };
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/**
 * Card de KPI com icone e tendencia
 */
export const KPICard: React.FC<KPICardProps> = memo(function KPICard({
  title,
  value,
  description,
  icon,
  trend,
  variant = 'default',
}: KPICardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
    danger: 'border-l-4 border-l-red-500',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            {trend.direction === 'up' ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span className={trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}>
              {trend.value}%
            </span>
            {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Card de contrato com progresso
 */
export const ContractCard: React.FC<{ contract: ContractSummary }> = memo(function ContractCard({
  contract,
}: {
  contract: ContractSummary;
}) {
  const statusColors = {
    PLANNING: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    PLANNING: 'Planejamento',
    ACTIVE: 'Ativo',
    SUSPENDED: 'Suspenso',
    COMPLETED: 'Concluido',
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer focus-within:ring-2 focus-within:ring-primary"
      tabIndex={0}
      role="article"
      aria-label={`Contrato ${contract.code}: ${contract.name}, ${statusLabels[contract.status]}, ${
        contract.progress
      }% concluido`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ContractIcon size={20} className="text-primary" />
            <CardTitle className="text-sm font-medium">{contract.code}</CardTitle>
          </div>
          <Badge className={statusColors[contract.status]}>{statusLabels[contract.status]}</Badge>
        </div>
        <CardDescription className="truncate">{contract.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{contract.progress}%</span>
          </div>
          <Progress value={contract.progress} className="h-2" />
          {contract.pendingRequests > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <Clock className="h-3 w-3" />
              {contract.pendingRequests} requisicoes pendentes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Item pendente na lista
 */
export const PendingItemRow: React.FC<{ item: PendingItem }> = memo(function PendingItemRow({
  item,
}: {
  item: PendingItem;
}) {
  const priorityStyles = {
    LOW: 'bg-gray-100 text-gray-600',
    NORMAL: 'bg-blue-100 text-blue-600',
    HIGH: 'bg-orange-100 text-orange-600',
    URGENT: 'bg-red-100 text-red-600',
  };

  const priorityLabels = {
    LOW: 'Baixa',
    NORMAL: 'Normal',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  const typeIcons = {
    request: <MaterialRequestIcon size={16} />,
    transfer: <StockTransferIcon size={16} />,
    approval: <CheckCircle2 size={16} />,
  };

  const typeLabels = {
    request: 'Requisicao',
    transfer: 'Transferencia',
    approval: 'Aprovacao',
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-primary cursor-pointer"
      tabIndex={0}
      role="listitem"
      aria-label={`${typeLabels[item.type]} ${item.code}: ${item.description}, prioridade ${
        priorityLabels[item.priority]
      }`}
    >
      <div className="text-muted-foreground" aria-hidden="true">
        {typeIcons[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{item.code}</span>
          <Badge variant="outline" className={priorityStyles[item.priority]}>
            {item.priority}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.createdAt}</span>
    </div>
  );
});

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const EnterpriseDashboard: React.FC<EnterpriseDashboardProps> = ({
  contracts,
  pendingItems,
  kpis,
}) => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Enterprise</h1>
          <p className="text-muted-foreground">Visao geral do almoxarifado industrial</p>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Contratos Ativos"
          value={kpis.activeContracts}
          icon={<ContractIcon size={20} />}
          description="Em execucao"
        />
        <KPICard
          title="Requisicoes Pendentes"
          value={kpis.pendingRequests}
          icon={<MaterialRequestIcon size={20} />}
          variant={kpis.pendingRequests > 10 ? 'warning' : 'default'}
          description="Aguardando aprovacao"
        />
        <KPICard
          title="Transferencias em Transito"
          value={kpis.inTransitTransfers}
          icon={<StockTransferIcon size={20} />}
          description="Em andamento"
        />
        <KPICard
          title="Alertas de Estoque"
          value={kpis.lowStockItems}
          icon={<AlertTriangle size={20} />}
          variant={kpis.lowStockItems > 0 ? 'danger' : 'default'}
          description="Itens abaixo do minimo"
        />
      </div>

      {/* Consumo do Mes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Consumo Mensal
            </CardTitle>
            <CardDescription>Valor total de materiais consumidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(kpis.monthlyConsumption)}
              </span>
              <span
                className={`text-sm flex items-center ${
                  kpis.consumptionTrend >= 0 ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {kpis.consumptionTrend >= 0 ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                {Math.abs(kpis.consumptionTrend)}% vs mes anterior
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estoque Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SKUs Cadastrados</span>
                <span className="font-medium">1.247</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="font-medium">R$ 2.4M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Locais Ativos</span>
                <span className="font-medium">12</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contratos e Pendencias */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contratos Ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WorkFrontIcon size={20} />
              Contratos em Andamento
            </CardTitle>
            <CardDescription>Ultimos contratos ativos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contracts.slice(0, 4).map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </CardContent>
        </Card>

        {/* Pendencias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Acoes Pendentes
            </CardTitle>
            <CardDescription>Itens aguardando sua acao</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {pendingItems.slice(0, 5).map((item) => (
              <PendingItemRow key={item.id} item={item} />
            ))}
            {pendingItems.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>Nenhuma pendencia!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnterpriseDashboard;
