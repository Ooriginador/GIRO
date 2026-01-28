/**
 * @file EnterpriseReportsPage - Relatórios Enterprise
 * @description Central de relatórios para o módulo Enterprise
 */

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Package,
  DollarSign,
  Warehouse,
  Loader2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';
import type { StockReport, PendingRequestsReport } from '@/lib/bindings';

// Cores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function EnterpriseReportsPage() {
  // ── Queries ──

  // 1. Relatório Geral de Estoque
  const { data: stockReport, isLoading: isLoadingStock } = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: () => invoke<StockReport>('get_stock_report', { categoryId: null }),
  });

  // 2. Relatório de Requisições Pendentes
  const { data: requestsReport, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['reports', 'requests'],
    queryFn: () => invoke<PendingRequestsReport>('report_pending_requests', { contractId: null }),
  });

  // ── Preparação de Dados para Gráficos ──

  const categoryData = stockReport?.valuationByCategory
    ? Object.entries(stockReport.valuationByCategory).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const priorityData = requestsReport?.byPriority
    ? requestsReport.byPriority.map((item) => ({
        name:
          item.priority === 'HIGH'
            ? 'Alta'
            : item.priority === 'URGENT'
            ? 'Urgente'
            : item.priority === 'NORMAL'
            ? 'Normal'
            : 'Baixa',
        value: item.count,
      }))
    : [];

  // Loading State
  if (isLoadingStock || isLoadingRequests) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando relatórios...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Enterprise</h1>
          <p className="text-muted-foreground">Análises e métricas do almoxarifado e obras.</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total em Estoque</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stockReport?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {stockReport?.totalProducts || 0} produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Abaixo do Mínimo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockReport?.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Necessitam reposição urgente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições Pendentes</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsReport?.totalPending || 0}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Sem Estoque</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockReport?.outOfStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Ruptura de estoque</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Links to Specific Reports ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relatórios de Compliance</CardTitle>
          <CardDescription>Relatórios detalhados para auditoria e rastreabilidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/enterprise/reports/kardex"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Kardex - Movimentação</p>
                  <p className="text-sm text-muted-foreground">Histórico completo por produto</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/enterprise/reports/consumption"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Consumo por Contrato</p>
                  <p className="text-sm text-muted-foreground">Apropriação de materiais por obra</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Charts ── */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Composição de Estoque</TabsTrigger>
          <TabsTrigger value="requests">Análise de Requisições</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valor por Categoria</CardTitle>
              <CardDescription>
                Distribuição do valor financeiro por categoria de material.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(val) => `R$${val / 1000}k`} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requisições por Prioridade</CardTitle>
                <CardDescription>Distribuição do volume de pedidos pendentes.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {priorityData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Sem requisições pendentes
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valor Pendente</CardTitle>
                <CardDescription>Total financeiro aguardando liberação.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[300px]">
                <div className="text-4xl font-bold text-primary">
                  {formatCurrency(requestsReport?.totalValue || 0)}
                </div>
                <p className="text-muted-foreground mt-2">Total em requisições abertas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
