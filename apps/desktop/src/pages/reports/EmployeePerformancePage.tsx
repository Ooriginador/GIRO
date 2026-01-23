import React, { useState } from 'react';
import { BaseReportLayout } from '@/components/reports/BaseReportLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEmployeePerformance } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/formatters';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  Trophy,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Calendar as CalendarIcon,
  ArrowUpRight,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444'];

export const EmployeePerformancePage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: performance, isLoading } = useEmployeePerformance(
    dateRange?.from?.toISOString(),
    dateRange?.to?.toISOString()
  );

  const presetRanges = [
    { label: 'Hoje', from: new Date(), to: new Date() },
    { label: 'Últimos 7 dias', from: subDays(new Date(), 7), to: new Date() },
    { label: 'Últimos 30 dias', from: subDays(new Date(), 30), to: new Date() },
    { label: 'Este mês', from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  ];

  const chartData =
    performance?.map((item) => ({
      name: item.employeeName,
      total: item.totalAmount,
      sales: item.salesCount,
    })) || [];

  const stats = (
    <>
      <Card className="border-none shadow-none bg-sky-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sky-600 uppercase">Top Vendedor</CardTitle>
          <Trophy className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-sky-600 truncate">
            {performance?.[0]?.employeeName || '---'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Líder em vendas no período</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-600 uppercase">
            Total Comissões
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(performance?.reduce((acc, curr) => acc + curr.totalCommission, 0) ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Valor a ser pago</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-violet-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-violet-600 uppercase">
            Total Vendas
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-600">
            {performance?.reduce((acc, curr) => acc + curr.salesCount, 0) ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Volume de transações</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-amber-600 uppercase">
            Ticket Médio (Geral)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(
              (performance?.reduce((acc, curr) => acc + curr.totalAmount, 0) ?? 0) /
                (performance?.reduce((acc, curr) => acc + curr.salesCount, 0) || 1)
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Média por atendimento</p>
        </CardContent>
      </Card>
    </>
  );

  const filters = (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Período de Apuração:
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
  );

  return (
    <BaseReportLayout
      title="Desempenho da Equipe"
      subtitle="Vendas, metas e comissionamento por funcionário"
      stats={stats}
      filters={filters}
      isLoading={isLoading}
    >
      <div className="grid gap-6">
        {/* Gráfico de Vendas por Vendedor */}
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-500" />
              <div>
                <CardTitle className="text-xl font-bold">Faturamento por Vendedor</CardTitle>
                <CardDescription>Volume financeiro processado por cada membro</CardDescription>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[350px]">
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
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
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

        {/* Tabela de Comissionamento */}
        <Card className="border-none shadow-sm bg-card/50 overflow-hidden">
          <CardHeader>
            <CardTitle>Detalhamento de Comissões e Vendas</CardTitle>
            <CardDescription>Valores acumulados para fechamento de folha</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="p-4 uppercase text-xs font-bold tracking-widest pl-8">
                    Funcionário
                  </th>
                  <th className="p-4 uppercase text-xs font-bold tracking-widest text-center">
                    Vendas
                  </th>
                  <th className="p-4 uppercase text-xs font-bold tracking-widest text-right">
                    Faturamento
                  </th>
                  <th className="p-4 uppercase text-xs font-bold tracking-widest text-right">
                    Ticket Médio
                  </th>
                  <th className="p-4 uppercase text-xs font-bold tracking-widest text-right pr-8 text-emerald-500">
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y overflow-hidden">
                {performance?.map((item) => (
                  <tr key={item.employeeId} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 pl-8">
                      <div className="font-bold uppercase text-sm">{item.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {item.employeeId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-muted/50 font-bold text-xs">
                        {item.salesCount}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="p-4 text-right font-bold text-muted-foreground tabular-nums">
                      {formatCurrency(item.totalAmount / (item.salesCount || 1))}
                    </td>
                    <td className="p-4 text-right pr-8 font-black text-emerald-600 tabular-nums">
                      {formatCurrency(item.totalCommission)}
                    </td>
                  </tr>
                ))}
                {(!performance || performance.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      Nenhuma atividade registrada no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </BaseReportLayout>
  );
};
