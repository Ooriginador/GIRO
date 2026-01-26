/**
 * @file ReportsPage - Hub de relatórios
 * @description Página central de acesso aos relatórios do sistema
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/formatters';
import {
  getMonthlySummary,
  getTopProducts,
  type MonthlySalesSummary,
  type TopProduct,
  type DailyRevenue,
} from '@/lib/tauri';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format } from 'date-fns';

// ────────────────────────────────────────────────────────────────────────────
// REPORT CARDS
// ────────────────────────────────────────────────────────────────────────────

const REPORTS = [
  {
    id: 'sales',
    title: 'Vendas',
    description: 'Análise detalhada por período e pagamento',
    icon: ShoppingCart,
    href: '/reports/sales',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'financial',
    title: 'Financeiro',
    description: 'Lucro, CMV e fluxo de caixa',
    icon: DollarSign,
    href: '/reports/financial',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  {
    id: 'stock',
    title: 'Estoque',
    description: 'Valorização e movimentações',
    icon: Package,
    href: '/reports/stock',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'products',
    title: 'Produtos',
    description: 'Ranking de mais vendidos e margem',
    icon: TrendingUp,
    href: '/reports/products',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'employees',
    title: 'Equipe',
    description: 'Desempenho e comissões',
    icon: Users,
    href: '/reports/employees',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    id: 'alerts',
    title: 'Alertas',
    description: 'Estoque baixo e vencimentos',
    icon: AlertTriangle,
    href: '/reports/alerts',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const ReportsPage: FC = () => {
  const { data: stats } = useDashboardStats();

  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const { data: monthlyStats } = useQuery<MonthlySalesSummary>({
    queryKey: ['monthly-summary', currentYearMonth],
    queryFn: () => getMonthlySummary(currentYearMonth),
  });

  const { data: topProducts } = useQuery<TopProduct[]>({
    queryKey: ['top-products', 5],
    queryFn: () => getTopProducts(5),
  });

  const todayRevenue = stats?.totalSalesToday || 0;
  const averageTicket = stats?.averageTicket || 0;
  const todayCount = stats?.countSalesToday || 0;
  const lowStock = stats?.lowStockProducts || 0;

  const chartData =
    stats?.revenueWeekly?.map((d: DailyRevenue) => ({
      name: format(new Date(d.date), 'dd/MM'),
      value: d.amount,
    })) || [];

  return (
    <div className="flex flex-col gap-8 p-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">
          Estatísticas & Relatórios
        </h1>
        <p className="text-muted-foreground text-lg">Visão geral do desempenho do seu negócio</p>
      </div>

      {/* Quick Stats Grid */}
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        role="region"
        aria-label="Estatísticas rápidas"
      >
        {[
          {
            label: 'Faturamento Hoje',
            value: todayRevenue,
            sub: `${todayCount} vendas`,
            icon: DollarSign,
            color: 'text-emerald-500',
          },
          {
            label: 'Faturamento Mês',
            value: monthlyStats?.totalAmount || 0,
            sub: `${monthlyStats?.totalSales || 0} vendas`,
            icon: Calendar,
            color: 'text-sky-500',
          },
          {
            label: 'Ticket Médio (Hoje)',
            value: averageTicket,
            sub: 'Média por venda',
            icon: BarChart3,
            color: 'text-violet-500',
          },
          {
            label: 'Alertas de Estoque',
            value: lowStock,
            sub: 'Itens em falta/baixo',
            icon: AlertTriangle,
            color: lowStock > 0 ? 'text-amber-500' : 'text-muted-foreground',
          },
        ].map((item, i) => (
          <Card
            key={i}
            className="border-none shadow-sm bg-card/50 backdrop-blur-sm"
            role="article"
            aria-label={`${item.label}: ${
              typeof item.value === 'number' &&
              (item.label.includes('Faturamento') || item.label.includes('Ticket'))
                ? formatCurrency(item.value)
                : item.value
            }. ${item.sub}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
              <item.icon className={`h-4 w-4 ${item.color}`} aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof item.value === 'number' &&
                (item.label.includes('Faturamento') || item.label.includes('Ticket'))
                  ? formatCurrency(item.value)
                  : item.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="lg:col-span-4 border-none shadow-sm overflow-hidden bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Resumo de Vendas (7 dias)</CardTitle>
            <CardDescription>Evolução do faturamento diário</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_: { name: string; value: number }, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Preview */}
        <Card className="lg:col-span-3 border-none shadow-sm bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Mais Vendidos</CardTitle>
            <CardDescription>Produtos com maior saída</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6" role="list" aria-label="Top 5 produtos mais vendidos">
              {topProducts?.slice(0, 5).map((item, i) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-4"
                  role="listitem"
                  aria-label={`${i + 1}º: ${item.product.name}, ${
                    item.quantity
                  } unidades, ${formatCurrency(item.revenue)}`}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-sm font-bold"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.quantity} unidades vendidas
                    </p>
                  </div>
                  <div className="text-sm font-bold">{formatCurrency(item.revenue)}</div>
                </div>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <div
                  className="flex flex-col items-center justify-center h-40 text-muted-foreground"
                  role="status"
                >
                  <ShoppingCart className="h-8 w-8 mb-2 opacity-20" aria-hidden="true" />
                  <p className="text-sm">Nenhuma venda registrada</p>
                </div>
              )}
            </div>
            {topProducts && topProducts.length > 0 && (
              <Button variant="ghost" className="w-full mt-6 text-primary font-bold" asChild>
                <Link to="/reports/products">Ver ranking completo</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports Menu */}
      <nav
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        role="navigation"
        aria-label="Menu de relatórios"
      >
        {REPORTS.map((report) => (
          <Link
            key={report.id}
            to={report.href}
            className="group relative overflow-hidden rounded-xl border-none p-6 shadow-sm bg-card/50 hover:bg-card/80 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Relatório de ${report.title}: ${report.description}`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2">
                <div
                  className={`inline-flex items-center justify-center rounded-lg p-3 ${report.bgColor}`}
                  aria-hidden="true"
                >
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <h3 className="text-xl font-bold tracking-tight">{report.title}</h3>
                <p className="text-sm text-muted-foreground pr-4">{report.description}</p>
              </div>
              <ArrowRight
                className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
                aria-hidden="true"
              />
            </div>
            {/* Background Accent */}
            <div
              className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity ${report.bgColor}`}
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>
    </div>
  );
};
