/**
 * 📊 MotopartsDashboard - Dashboard Principal de Motopeças
 *
 * Visão consolidada de Vendas, Oficina e Estoque.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMotopartsReports } from '@/hooks/useMotopartsReports';
import { ServiceOrderUtils, type ServiceOrderStatus } from '@/hooks/useServiceOrders';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  BadgeDollarSign,
  ClipboardList,
  Package,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Open: '#2563eb', // blue
  InProgress: '#eab308', // yellow
  WaitingParts: '#f97316', // orange
  Completed: '#16a34a', // green
  Delivered: '#10b981', // emerald
  Canceled: '#ef4444', // red
};

export function MotopartsDashboard() {
  const { dashboardStats, isLoadingDashboard, serviceOrderStats, topProducts } =
    useMotopartsReports();

  if (isLoadingDashboard || !dashboardStats || !serviceOrderStats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Cards de Resumo
  const cards = [
    {
      title: 'Vendas Hoje',
      value: formatCurrency(dashboardStats.total_sales_today),
      description: `${dashboardStats.count_sales_today} vendas registradas`,
      icon: <BadgeDollarSign className="h-6 w-6 text-emerald-600" />,
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'OS em Aberto',
      value: dashboardStats.open_service_orders.toString(),
      description: 'Veículos em manutenção',
      icon: <ClipboardList className="h-6 w-6 text-blue-600" />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Garantias Ativas',
      value: dashboardStats.active_warranties.toString(),
      description: 'Processos em análise',
      icon: <ShieldCheck className="h-6 w-6 text-purple-600" />,
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Estoque Baixo',
      value: dashboardStats.low_stock_products.toString(),
      description: 'Produtos abaixo do mínimo',
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      bgColor: 'bg-orange-50',
    },
  ];

  // Gráfico Receita Semanal
  const revenueData = dashboardStats.revenue_weekly.map((item) => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    receita: item.amount,
  }));

  // Gráfico Status OS
  const osStatusData = serviceOrderStats.by_status
    .map((s) => ({
      name: ServiceOrderUtils.getStatusLabel(s.status as ServiceOrderStatus),
      value: s.count,
      color: STATUS_COLORS[s.status] || '#888888',
    }))
    .filter((i) => i.value > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      {/* Grid de Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>{card.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Gráfico de Receita */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Receita Semanal</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar
                    dataKey="receita"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                    barSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status das Ordens de Serviço */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status da Oficina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={osStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {osStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Receita por Tipo (Peças vs Serviços) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Composição de Receita (OS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Mão de Obra</span>
              </div>
              <span className="font-bold">{formatCurrency(serviceOrderStats.revenue_labor)}</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Peças</span>
              </div>
              <span className="font-bold">{formatCurrency(serviceOrderStats.revenue_parts)}</span>
            </div>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Ticket Médio:{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(serviceOrderStats.average_ticket)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts?.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6 text-muted-foreground">#{index + 1}</span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-none">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} unidades</p>
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(item.total_value)}</div>
                </div>
              ))}
              {!topProducts?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma venda registrada.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
