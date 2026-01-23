/**
 * @file SalesReportPage - Relatório de vendas
 * @description Relatório detalhado de vendas com filtros e gráficos modernizados
 */

import React, { useState } from 'react';
import { BaseReportLayout } from '@/components/reports/BaseReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalesReport } from '@/hooks/useSales';
import { formatCurrency } from '@/lib/formatters';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  DollarSign,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

export const SalesReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: report, isLoading } = useSalesReport({
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
    groupBy,
  });

  const presetRanges = [
    { label: 'Hoje', from: new Date(), to: new Date() },
    { label: 'Últimos 7 dias', from: subDays(new Date(), 7), to: new Date() },
    { label: 'Últimos 30 dias', from: subDays(new Date(), 30), to: new Date() },
    { label: 'Este mês', from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  ];

  const handleExportCSV = () => {
    if (!report?.periods || report.periods.length === 0) return;

    const headers = ['Periodo', 'Vendas', 'Valor', 'Ticket Médio', 'Porcentagem'];
    const rows = report.periods.map((p) => [
      p.date,
      p.salesCount,
      p.revenue.toFixed(2),
      (p.revenue / (p.salesCount || 1)).toFixed(2),
      p.percentage.toFixed(1),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = (
    <>
      <Card className="border-none shadow-none bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-600 uppercase">
            Total de Vendas
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(report?.totalAmount ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{report?.salesCount ?? 0} transações</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-sky-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sky-600 uppercase">Ticket Médio</CardTitle>
          <BarChart3 className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sky-600">
            {formatCurrency(report?.averageTicket ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Média por venda</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-violet-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-violet-600 uppercase">
            Itens Vendidos
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-600">{report?.totalItems ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Produtos processados</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-amber-600 uppercase">
            Lucro Bruto
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(report?.grossProfit ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Margem de {report?.profitMargin?.toFixed(1) ?? 0}%
          </p>
        </CardContent>
      </Card>
    </>
  );

  const filters = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Período:
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[240px] justify-start text-left font-normal border-dashed"
            >
              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                    {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, 'PPP', { locale: ptBR })
                )
              ) : (
                <span>Selecione uma data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="flex flex-col gap-1 p-3 border-r">
                {presetRanges.map((range) => (
                  <Button
                    key={range.label}
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => setDateRange({ from: range.from, to: range.to })}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Agrupar:
        </span>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
          <SelectTrigger className="w-[140px] border-dashed">
            <SelectValue placeholder="Agrupar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por Dia</SelectItem>
            <SelectItem value="week">Por Semana</SelectItem>
            <SelectItem value="month">Por Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <BaseReportLayout
      title="Relatório de Vendas"
      subtitle="Analise tendências e faturamento do período"
      stats={stats}
      filters={filters}
      onExportCSV={handleExportCSV}
      isLoading={isLoading}
    >
      <div className="grid gap-6">
        {/* Gráfico de Evolução */}
        <Card className="border-none shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Evolução do Faturamento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vendas acumuladas por{' '}
                {groupBy === 'day' ? 'dia' : groupBy === 'week' ? 'semana' : 'mês'}
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[350px] p-0 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report?.periods || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vendas por Pagamento */}
          <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <CreditCard className="h-5 w-5 text-sky-500" />
              <CardTitle className="text-xl font-bold">Meios de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report?.paymentBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {(report?.paymentBreakdown || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Produtos */}
          <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-xl font-bold">Produtos de Destaque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mt-2">
                {(report?.topProducts || [])
                  .slice(0, 5)
                  .map(
                    (
                      product: { id: string; name: string; quantity: number; amount: number },
                      index: number
                    ) => (
                      <div key={product.id || index} className="flex items-center gap-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate uppercase">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.quantity} unidades vendidas
                          </p>
                        </div>
                        <div className="text-sm font-black text-foreground/80">
                          {formatCurrency(product.amount)}
                        </div>
                      </div>
                    )
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Detalhes (Hidden on small screens when printing) */}
        <Card className="border-none shadow-sm bg-card/50 overflow-hidden">
          <CardHeader>
            <CardTitle>Detalhamento por Período</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6 uppercase text-xs font-bold tracking-widest">
                    Período
                  </TableHead>
                  <TableHead className="text-center uppercase text-xs font-bold tracking-widest">
                    Vendas
                  </TableHead>
                  <TableHead className="text-right uppercase text-xs font-bold tracking-widest">
                    Faturamento
                  </TableHead>
                  <TableHead className="text-right pr-6 uppercase text-xs font-bold tracking-widest">
                    % do Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.periods || []).map(
                  (
                    period: {
                      date: string;
                      salesCount: number;
                      revenue: number;
                      percentage: number;
                    },
                    index: number
                  ) => (
                    <TableRow key={index} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-6 font-medium">{period.date}</TableCell>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {period.salesCount}
                      </TableCell>
                      <TableCell className="text-right font-black">
                        {formatCurrency(period.revenue)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${period.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-muted-foreground tabular-nums">
                            {period.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </BaseReportLayout>
  );
};
