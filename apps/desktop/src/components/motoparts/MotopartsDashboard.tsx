import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, DollarSign, Package, TrendingUp, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getMotopartsDashboardStats,
  getServiceOrderStats,
  getTopProductsMotoparts,
} from '@/lib/tauri';
import { DashboardStats, ServiceOrderStats, TopItem } from '@/types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function MotopartsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [soStats, setSoStats] = useState<ServiceOrderStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dStats, sStats, tProds] = await Promise.all([
        getMotopartsDashboardStats(),
        getServiceOrderStats(),
        getTopProductsMotoparts(5),
      ]);
      setStats(dStats);
      setSoStats(sStats);
      setTopProducts(tProds);
    } catch (error) {
      console.error('Failed to load dashboard stats:', (error as Error)?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px] rounded-xl" />
          <Skeleton className="col-span-3 h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="flex flex-col space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral da oficina e vendas de hoje.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadData} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vendas Hoje"
          value={formatCurrency(stats?.totalSalesToday || 0)}
          trend={
            stats?.totalSalesYesterday && stats.totalSalesYesterday > 0
              ? {
                  value: Math.round(
                    ((stats.totalSalesToday - stats.totalSalesYesterday) /
                      stats.totalSalesYesterday) *
                      100
                  ),
                  isPositive: stats.totalSalesToday >= stats.totalSalesYesterday,
                }
              : undefined
          }
          icon={DollarSign}
          variant="success"
        />

        <StatCard
          title="OS em Aberto"
          value={stats?.openServiceOrders || 0}
          description="Ordens de serviço ativas"
          icon={Wrench}
          variant="default"
        />

        <StatCard
          title="Ticket Médio (OS)"
          value={formatCurrency(soStats?.averageTicket || 0)}
          description="Baseado em OS finalizadas"
          icon={TrendingUp}
          variant="blue"
        />

        <StatCard
          title="Estoque Baixo"
          value={stats?.lowStockProducts || 0}
          description="Produtos precisam de reposição"
          icon={AlertTriangle}
          variant={(stats?.lowStockProducts || 0) > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle>Receita Semanal</CardTitle>
            <CardDescription>Vendas + Serviços nos últimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.revenueWeekly || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--muted))"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })
                    }
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
            <CardDescription>Itens mais vendidos recentemente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {topProducts.map((item) => (
                <div key={item.id} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} unidades vendidas
                    </p>
                  </div>
                  <div className="ml-auto font-medium">{formatCurrency(item.totalValue)}</div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Receita de Serviços</CardTitle>
            <CardDescription>Peças vs. Mão de Obra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Mão de Obra</span>
                </div>
                <span className="font-bold">{formatCurrency(soStats?.revenueLabor || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Peças</span>
                </div>
                <span className="font-bold">{formatCurrency(soStats?.revenueParts || 0)}</span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">
                    {formatCurrency((soStats?.revenueLabor || 0) + (soStats?.revenueParts || 0))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
