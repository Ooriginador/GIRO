import React, { useState } from 'react';
import { BaseReportLayout } from '@/components/reports/BaseReportLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFinancialReport } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/formatters';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Percent,
  Wallet,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export const FinancialReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: report, isLoading } = useFinancialReport(
    dateRange?.from?.toISOString(),
    dateRange?.to?.toISOString()
  );

  const handleExportCSV = () => {
    if (!report) return;

    const headers = ['Descricao', 'Valor'];
    const rows = [
      ['Receita Bruta', report.revenue.toFixed(2)],
      ['Custo (CMV)', report.cogs.toFixed(2)],
      ['Lucro Bruto', report.grossProfit.toFixed(2)],
      ['Despesas', report.expenses.toFixed(2)],
      ['Lucro Liquido', report.netProfit.toFixed(2)],
      ['Margem (%)', report.margin.toFixed(1)],
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presetRanges = [
    { label: 'Hoje', from: new Date(), to: new Date() },
    { label: 'Últimos 7 dias', from: subDays(new Date(), 7), to: new Date() },
    { label: 'Últimos 30 dias', from: subDays(new Date(), 30), to: new Date() },
    { label: 'Este mês', from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    {
      label: 'Mês anterior',
      from: startOfMonth(subDays(startOfMonth(new Date()), 1)),
      to: endOfMonth(subDays(startOfMonth(new Date()), 1)),
    },
  ];

  const pieData = report
    ? [
        { name: 'Custo (CMV)', value: report.cogs, color: '#ef4444' },
        { name: 'Lucro Líquido', value: report.netProfit, color: '#10b981' },
        { name: 'Despesas', value: report.expenses, color: '#f59e0b' },
      ].filter((d) => d.value > 0)
    : [];

  const stats = (
    <>
      <Card className="border-none shadow-none bg-sky-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sky-600 uppercase">
            Receita Bruta
          </CardTitle>
          <DollarSign className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sky-600">
            {formatCurrency(report?.revenue ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total de entradas</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-rose-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-rose-600 uppercase">Custo (CMV)</CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(report?.cogs ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Custo das mercadorias</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-600 uppercase">
            Lucro Líquido
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(report?.netProfit ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Resultado final</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-violet-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-violet-600 uppercase">Margem</CardTitle>
          <Percent className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-600">
            {report?.margin?.toFixed(1) ?? 0}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">Rentabilidade</p>
        </CardContent>
      </Card>
    </>
  );

  const filters = (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Período Fiscal:
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
      title="Relatório Financeiro"
      subtitle="Demonstrativo de resultados e rentabilidade"
      stats={stats}
      filters={filters}
      onExportCSV={handleExportCSV}
      isLoading={isLoading}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição de Receita */}
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-sky-500" />
            <div>
              <CardTitle className="text-xl font-bold">Distribuição de Receita</CardTitle>
              <CardDescription>Onde seu dinheiro está indo</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <PieChartIcon className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Sem dados para o período</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparativo de Margem */}
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-xl font-bold">Resumo Financeiro</CardTitle>
              <CardDescription>Valores totais do período</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Receita', value: report?.revenue ?? 0, color: '#3b82f6' },
                  { name: 'Custo (CMV)', value: report?.cogs ?? 0, color: '#ef4444' },
                  { name: 'Lucro', value: report?.netProfit ?? 0, color: '#10b981' },
                ]}
                margin={{ left: 20, right: 40, top: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
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
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                  {[{ color: '#3b82f6' }, { color: '#ef4444' }, { color: '#10b981' }].map(
                    (entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* DRE Simplificada */}
      <Card className="border-none shadow-sm bg-card/50 overflow-hidden mt-6">
        <CardHeader>
          <CardTitle>Demonstrativo de Resultados (DRE Simplificada)</CardTitle>
          <CardDescription>Visão tabular do desempenho financeiro</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex justify-between p-6">
              <span className="font-medium">(=) Receita Bruta de Vendas</span>
              <span className="font-bold text-sky-600">{formatCurrency(report?.revenue ?? 0)}</span>
            </div>
            <div className="flex justify-between p-6 bg-muted/20">
              <span className="font-medium">(-) Custo das Mercadorias Vendidas (CMV)</span>
              <span className="font-bold text-rose-600">({formatCurrency(report?.cogs ?? 0)})</span>
            </div>
            <div className="flex justify-between p-6">
              <span className="text-lg font-black">(=) Lucro Bruto</span>
              <span className="text-lg font-black text-emerald-600">
                {formatCurrency(report?.grossProfit ?? 0)}
              </span>
            </div>
            <div className="flex justify-between p-6 bg-muted/20">
              <span className="font-medium">(-) Despesas Operacionais (Sangrias)</span>
              <span className="font-bold text-amber-600">
                ({formatCurrency(report?.expenses ?? 0)})
              </span>
            </div>
            <div className="flex justify-between p-6 bg-primary/5">
              <span className="text-xl font-black">(=) Lucro Líquido do Período</span>
              <div className="text-right">
                <div className="text-xl font-black text-emerald-600">
                  {formatCurrency(report?.netProfit ?? 0)}
                </div>
                <div className="text-sm font-bold text-muted-foreground">
                  Margem: {report?.margin?.toFixed(1) ?? 0}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </BaseReportLayout>
  );
};
