/**
 * @file DashboardPage - Painel principal
 * @description Dashboard com KPIs e resumo do dia
 */

import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/formatters';
import { AlertTriangle, DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div
        className="p-8 text-center text-muted-foreground"
        role="status"
        aria-label="Carregando dashboard"
      >
        Carregando dashboard...
      </div>
    );
  }

  // Fallback if data loading failed or is null
  const data = stats || {
    countSalesToday: 0,
    totalSalesToday: 0,
    totalSalesYesterday: 0,
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
        <Button onClick={() => navigate('/pdv')} aria-label="Ir para o ponto de venda">
          <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
          Ir para PDV
        </Button>
      </div>

      {/* KPIs */}
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        role="region"
        aria-label="Indicadores de desempenho"
      >
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
          trend={
            data.totalSalesYesterday > 0
              ? {
                  value: Math.round(
                    ((data.totalSalesToday - data.totalSalesYesterday) / data.totalSalesYesterday) *
                      100
                  ),
                  isPositive: data.totalSalesToday >= data.totalSalesYesterday,
                }
              : undefined
          }
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(data.averageTicket)}
          description="por venda"
          icon={TrendingUp}
          variant="blue"
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
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>Últimas vendas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" role="list" aria-label="Lista de vendas recentes">
              {data.recentSales.length > 0 ? (
                data.recentSales.map(
                  (sale: { id: string; items: number; time: string; total: number }) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between"
                      role="listitem"
                      aria-label={`Venda ${sale.id.slice(0, 8)}, ${
                        sale.items
                      } itens, ${formatCurrency(sale.total)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
                          aria-hidden="true"
                        >
                          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
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
                <p className="text-sm text-muted-foreground text-center py-4" role="status">
                  Nenhuma venda hoje.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Top 5 do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" role="list" aria-label="Lista dos produtos mais vendidos">
              {data.topProducts.length > 0 ? (
                data.topProducts.map(
                  (product: { name: string; quantity: number; revenue: number }, index: number) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between"
                      role="listitem"
                      aria-label={`${index + 1}º lugar: ${product.name}, ${
                        product.quantity
                      } vendidos, ${formatCurrency(product.revenue)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium"
                          aria-hidden="true"
                        >
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
                <p className="text-sm text-muted-foreground text-center py-4" role="status">
                  Sem dados de produtos.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ações rápidas do sistema">
            <Button variant="outline" onClick={() => navigate('/products/new')}>
              <Package className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo Produto
            </Button>
            <Button variant="outline" onClick={() => navigate('/stock/entry')}>
              <Package className="mr-2 h-4 w-4" aria-hidden="true" />
              Entrada de Estoque
            </Button>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <TrendingUp className="mr-2 h-4 w-4" aria-hidden="true" />
              Ver Relatórios
            </Button>
            <Button variant="outline" onClick={() => navigate('/alerts')}>
              <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
              Ver Alertas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
