/**
 * @file DashboardPage - Painel principal
 * @description Dashboard com KPIs e resumo do dia
 */

import { MotopartsDashboard } from '@/components/motoparts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/formatters';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: typeof ShoppingCart;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export const StatCard: FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-full p-2 ${variantStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-success" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            )}
            <span
              className={`text-xs font-medium ${
                trend.isPositive ? 'text-success' : 'text-destructive'
              }`}
            >
              {trend.value}% vs ontem
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardPage: FC = () => {
  const { businessType } = useBusinessProfile();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  if (businessType === 'MOTOPARTS') {
    return <MotopartsDashboard />;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dashboard...</div>;
  }

  // Fallback if data loading failed or is null
  const data = stats || {
    countSalesToday: 0,
    totalSalesToday: 0,
    averageTicket: 0,
    lowStockProducts: 0,
    expiringCount: 0,
    activeAlerts: 0,
    recentSales: [],
    topProducts: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumo das operações de hoje</p>
        </div>
        <Button onClick={() => navigate('/pdv')}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Ir para PDV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vendas Hoje"
          value={data.countSalesToday}
          description="vendas realizadas"
          icon={ShoppingCart}
          variant="success"
        />
        <StatCard
          title="Faturamento"
          value={formatCurrency(data.totalSalesToday)}
          description="receita do dia"
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(data.averageTicket)}
          description="por venda"
          icon={TrendingUp}
        />
        <StatCard
          title="Alertas Ativos"
          value={data.activeAlerts}
          description={`${data.lowStockProducts} estoque baixo, ${data.expiringCount} vencendo`}
          icon={AlertTriangle}
          variant={data.activeAlerts > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vendas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>Últimas vendas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentSales.length > 0 ? (
                data.recentSales.map(
                  (sale: { id: string; items: number; time: string; total: number }) => (
                    <div key={sale.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Venda #{sale.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {sale.items} itens • {sale.time}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(sale.total)}</span>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma venda hoje.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Top 5 do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topProducts.length > 0 ? (
                data.topProducts.map(
                  (product: { name: string; quantity: number; revenue: number }, index: number) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.quantity} vendidos
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(product.revenue)}</span>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem dados de produtos.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/products/new')}>
              <Package className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
            <Button variant="outline" onClick={() => navigate('/stock/entry')}>
              <Package className="mr-2 h-4 w-4" />
              Entrada de Estoque
            </Button>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Ver Relatórios
            </Button>
            <Button variant="outline" onClick={() => navigate('/alerts')}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Ver Alertas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
