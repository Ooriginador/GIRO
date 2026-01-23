import React from 'react';
import { BaseReportLayout } from '@/components/reports/BaseReportLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useStockReport } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/utils';
import { StockReport } from '@/types';
import {
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444'];

export const StockReportPage: React.FC = () => {
  const { data: reportData, isLoading } = useStockReport();
  const report = reportData as StockReport;

  const pieData = report?.valuationByCategory
    ? Object.entries(report.valuationByCategory).map(([name, value]) => ({
        name,
        value: value as number,
      }))
    : [];

  const sortedPieData = [...pieData].sort((a, b) => (b.value as number) - (a.value as number));

  const stats = (
    <>
      <Card className="border-none shadow-none bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-600 uppercase">
            Valor Total em Estoque
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(report?.totalValue ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {report?.totalProducts ?? 0} produtos ativos
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-amber-600 uppercase">
            Estoque Baixo
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{report?.lowStockCount ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Abaixo do mínimo</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-rose-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-rose-600 uppercase">Esgotados</CardTitle>
          <XCircle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">{report?.outOfStockCount ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Saldo zero</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-sky-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sky-600 uppercase">Vencendo</CardTitle>
          <Clock className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sky-600">{report?.expiringCount ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Próximos 30 dias</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <BaseReportLayout
      title="Relatório de Estoque"
      subtitle="Visão geral e valorização patrimonial"
      stats={stats}
      isLoading={isLoading}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Valorização por Categoria */}
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-xl font-bold">Valorização por Categoria</CardTitle>
              <CardDescription>Distribuição financeira do seu estoque</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sortedPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sortedPieData.map((_: { name: string; value: number }, index: number) => (
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhum produto em estoque</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo de Alertas */}
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-xl font-bold">Resumo de Saúde do Estoque</CardTitle>
              <CardDescription>Principais pontos de atenção</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Baixo Estoque', count: report?.lowStockCount ?? 0, color: '#f59e0b' },
                  { name: 'Esgotados', count: report?.outOfStockCount ?? 0, color: '#ef4444' },
                  { name: 'Excesso', count: report?.excessStockCount ?? 0, color: '#3b82f6' },
                  { name: 'Vencendo', count: report?.expiringCount ?? 0, color: '#8b5cf6' },
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
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30}>
                  {[
                    { color: '#f59e0b' },
                    { color: '#ef4444' },
                    { color: '#3b82f6' },
                    { color: '#8b5cf6' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Valorização */}
      <Card className="border-none shadow-sm bg-card/50 overflow-hidden mt-6">
        <CardHeader>
          <CardTitle>Valorização por Categoria</CardTitle>
          <CardDescription>Detalhamento financeiro agrupado</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {sortedPieData.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-4 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(item.value as number)}</div>
                  <div className="text-xs text-muted-foreground">
                    {(((item.value as number) / (report?.totalValue || 1)) * 100).toFixed(1)}% do
                    estoque
                  </div>
                </div>
              </div>
            ))}
            {sortedPieData.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                Nenhum dado de valorização disponível.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </BaseReportLayout>
  );
};
