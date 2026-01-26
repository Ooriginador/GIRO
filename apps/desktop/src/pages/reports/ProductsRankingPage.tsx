import React, { useMemo } from 'react';
import { BaseReportLayout } from '@/components/reports/BaseReportLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTopProductsRank } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/utils';
import { TopProduct } from '@/types';
import { ExportButtons } from '@/components/shared';
import { type ExportColumn, type ExportSummaryItem, exportFormatters } from '@/lib/export';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444'];

export const ProductsRankingPage: React.FC = () => {
  const { data: topProducts, isLoading } = useTopProductsRank(50);

  // Dados transformados para exportação
  const exportData = useMemo(
    () =>
      topProducts?.map((item: TopProduct) => ({
        codigo: item.product.internalCode || '',
        produto: item.product.name,
        quantidade: item.quantity,
        faturamento: item.revenue,
      })) || [],
    [topProducts]
  );

  // Colunas para exportação profissional
  const exportColumns: ExportColumn<(typeof exportData)[0]>[] = [
    { key: 'codigo', header: 'Código', width: 80 },
    { key: 'produto', header: 'Produto', width: 200 },
    { key: 'quantidade', header: 'Qtd Vendida', align: 'right', type: 'number', totalizable: true },
    {
      key: 'faturamento',
      header: 'Faturamento',
      formatter: exportFormatters.currency,
      align: 'right',
      type: 'currency',
      totalizable: true,
    },
  ];

  // Cálculos para summary
  const totalRevenue =
    topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.revenue, 0) ?? 0;
  const totalQuantity =
    topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.quantity, 0) ?? 0;
  const avgTicket = totalRevenue / (topProducts?.length || 1);

  // Summary para exportação profissional
  const exportSummary: ExportSummaryItem[] = useMemo(
    () => [
      {
        label: 'Top 1 Produto',
        value: topProducts?.[0]?.product.name || '---',
        icon: '🏆',
        color: '#10b981',
      },
      {
        label: 'Faturamento Total',
        value: formatCurrency(totalRevenue),
        icon: '💰',
        color: '#3b82f6',
      },
      {
        label: 'Itens Vendidos',
        value: String(totalQuantity),
        icon: '📦',
        color: '#8b5cf6',
      },
      {
        label: 'Ticket Médio',
        value: formatCurrency(avgTicket),
        icon: '📊',
        color: '#f59e0b',
      },
    ],
    [topProducts, totalRevenue, totalQuantity, avgTicket]
  );

  const chartData =
    topProducts?.slice(0, 10).map((item: TopProduct) => ({
      name: item.product.name.substring(0, 15) + (item.product.name.length > 15 ? '...' : ''),
      revenue: item.revenue,
      quantity: item.quantity,
    })) || [];

  const stats = (
    <>
      <Card
        className="border-none shadow-none bg-emerald-500/5"
        role="article"
        aria-label={`Top 1 Produto: ${
          topProducts?.[0]?.product.name || 'Nenhum'
        }. Líder em faturamento`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-600 uppercase">
            Top 1 Produto
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-emerald-600 truncate">
            {topProducts?.[0]?.product.name || '---'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Líder em faturamento</p>
        </CardContent>
      </Card>

      <Card
        className="border-none shadow-none bg-sky-500/5"
        role="article"
        aria-label={`Total Valor Top 50: ${formatCurrency(
          topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.revenue, 0) ?? 0
        )}. Faturamento acumulado`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sky-600 uppercase">
            Total Valor (Top 50)
          </CardTitle>
          <DollarSign className="h-4 w-4 text-sky-500" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sky-600">
            {formatCurrency(
              topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.revenue, 0) ?? 0
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Faturamento acumulado</p>
        </CardContent>
      </Card>

      <Card
        className="border-none shadow-none bg-violet-500/5"
        role="article"
        aria-label={`Itens Vendidos: ${
          topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.quantity, 0) ?? 0
        }. Volume total do ranking`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-violet-600 uppercase">
            Itens Vendidos
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-violet-500" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-600">
            {topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.quantity, 0) ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Volume total do ranking</p>
        </CardContent>
      </Card>

      <Card
        className="border-none shadow-none bg-amber-500/5"
        role="article"
        aria-label={`Ticket Médio no Ranking: ${formatCurrency(
          (topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.revenue, 0) ?? 0) /
            (topProducts?.length || 1)
        )}. Média por SKU`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-amber-600 uppercase">
            Ticket Médio (Ranking)
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-amber-500" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(
              (topProducts?.reduce((acc: number, curr: TopProduct) => acc + curr.revenue, 0) ?? 0) /
                (topProducts?.length || 1)
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Média por SKU no ranking</p>
        </CardContent>
      </Card>
    </>
  );

  // Filtros com botão de exportação
  const filters = (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">
        Mostrando os {topProducts?.length || 0} produtos mais vendidos
      </span>
      <div className="ml-auto">
        <ExportButtons
          data={exportData}
          columns={exportColumns}
          filename="ranking-produtos"
          title="Ranking de Produtos"
          subtitle="Produtos que mais geram receita para o negócio"
          variant="dropdown"
          disabled={isLoading || !exportData.length}
          orientation="portrait"
          showTotals={true}
          summary={exportSummary}
          primaryColor="#10b981"
        />
      </div>
    </div>
  );

  return (
    <BaseReportLayout
      title="Ranking de Produtos"
      subtitle="Produtos que mais geram receita para o negócio"
      stats={stats}
      filters={filters}
      isLoading={isLoading}
    >
      <div className="grid gap-6">
        {/* Gráfico de Receita */}
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Faturamento por Produto (Top 10)</CardTitle>
              <CardDescription>Comparativo de contribuição financeira</CardDescription>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
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
                  tick={{ fill: '#888', fontSize: 11 }}
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
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((_: { name: string; revenue: number }, index: number) => (
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

        {/* Tabela Completa */}
        <Card className="border-none shadow-sm bg-card/50 overflow-hidden">
          <CardHeader>
            <CardTitle>Ranking Detalhado</CardTitle>
            <CardDescription>Lista completa dos 50 produtos mais vendidos</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table
                className="w-full text-left"
                aria-label="Ranking detalhado dos 50 produtos mais vendidos"
              >
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="p-4 uppercase text-xs font-bold tracking-widest pl-8">#</th>
                    <th className="p-4 uppercase text-xs font-bold tracking-widest">Produto</th>
                    <th className="p-4 uppercase text-xs font-bold tracking-widest text-center">
                      Qtd. Vendida
                    </th>
                    <th className="p-4 uppercase text-xs font-bold tracking-widest text-right">
                      Faturamento
                    </th>
                    <th className="p-4 uppercase text-xs font-bold tracking-widest text-right pr-8">
                      Ticket Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y overflow-hidden">
                  {topProducts?.map((item: TopProduct, index: number) => (
                    <tr key={item.product.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="p-4 pl-8 font-black text-muted-foreground group-hover:text-primary transition-colors">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-bold uppercase text-sm truncate max-w-[300px]">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.product.internalCode || 'Sem Código'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-muted/50 font-bold text-xs uppercase">
                          {item.quantity} un
                        </span>
                      </td>
                      <td className="p-4 text-right font-black">{formatCurrency(item.revenue)}</td>
                      <td className="p-4 text-right pr-8 font-bold text-muted-foreground tabular-nums">
                        {formatCurrency(item.revenue / item.quantity)}
                      </td>
                    </tr>
                  ))}
                  {(!topProducts || topProducts.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-12 text-center text-muted-foreground"
                        role="status"
                      >
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-10" aria-hidden="true" />
                        Nenhum produto vendido no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseReportLayout>
  );
};
