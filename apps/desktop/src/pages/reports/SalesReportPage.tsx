/**
 * @file SalesReportPage - Relatório de vendas
 * @description Relatório detalhado de vendas com filtros e gráficos
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency } from '@/lib/utils';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  BarChart3,
  CalendarIcon,
  DollarSign,
  Download,
  Printer,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { useState, type FC } from 'react';
import type { DateRange } from 'react-day-picker';
import { useNavigate } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const SalesReportPage: FC = () => {
  const navigate = useNavigate();
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

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!report?.periods || report.periods.length === 0) return;

    const headers = ['Período', 'Vendas', 'Valor', 'Ticket Médio', 'Porcentagem'];
    const rows = report.periods.map((p) => [
      p.date,
      p.salesCount,
      p.revenue.toFixed(2),
      (p.revenue / (p.salesCount || 1)).toFixed(2),
      p.percentage.toFixed(1),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatório de Vendas</h1>
            <p className="text-muted-foreground">Análise detalhada das vendas por período</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start min-w-[280px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  <div className="border-r p-2">
                    {presetRanges.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setDateRange({ from: preset.from, to: preset.to })}
                      >
                        {preset.label}
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

            {/* Agrupar Por */}
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Por Dia</SelectItem>
                <SelectItem value="week">Por Semana</SelectItem>
                <SelectItem value="month">Por Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-amount">
              {formatCurrency(report?.totalAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.salesCount ?? 0} vendas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="average-ticket">
              {formatCurrency(report?.averageTicket ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">média por venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Itens Vendidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.totalItems ?? 0}</div>
            <p className="text-xs text-muted-foreground">produtos vendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" data-testid="gross-profit">
              {formatCurrency(report?.grossProfit ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="profit-margin">
              margem de {report?.profitMargin?.toFixed(1) ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vendas por Período */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas por Período</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.periods ?? []).map((period, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{period.date}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{period.salesCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(period.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(period.revenue / (period.salesCount || 1))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${period.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {period.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Produtos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(report?.topProducts ?? []).slice(0, 5).map((product, index) => (
                <div key={product.id || index} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.quantity} unidades</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(product.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(report?.paymentBreakdown ?? []).map((payment) => (
                <div key={payment.method} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{payment.label}</span>
                      <span className="text-muted-foreground">{payment.count} vendas</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${payment.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right font-bold">{formatCurrency(payment.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
