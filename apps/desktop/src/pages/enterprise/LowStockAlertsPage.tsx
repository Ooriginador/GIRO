/**
 * @file LowStockAlertsPage - Alertas de Reposição
 * @description Exibe produtos com estoque abaixo do mínimo por local
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Filter,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLowStockAlerts, useLowStockAlertsCount } from '@/hooks/enterprise/useContracts';
import { useStockLocations } from '@/hooks/enterprise';
import { useCategories } from '@/hooks/useProducts';
import { cn, formatNumber } from '@/lib/utils';
import type { LowStockAlert } from '@/lib/tauri';

const criticalityLabels: Record<string, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Alerta',
  LOW: 'Baixo',
};

const criticalityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  WARNING: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const criticalityIconColors: Record<string, string> = {
  CRITICAL: 'text-red-500',
  WARNING: 'text-amber-500',
  LOW: 'text-yellow-500',
};

export function LowStockAlertsPage() {
  const navigate = useNavigate();
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all');

  const { data: locations } = useStockLocations();
  const { data: categories } = useCategories();
  const { data: alertsCount, isLoading: isLoadingCount } = useLowStockAlertsCount();

  const queryParams = useMemo(
    () => ({
      locationId: locationFilter !== 'all' ? locationFilter : undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      criticality:
        criticalityFilter !== 'all'
          ? (criticalityFilter as 'CRITICAL' | 'WARNING' | 'LOW')
          : undefined,
    }),
    [locationFilter, categoryFilter, criticalityFilter]
  );

  const { data: alerts, isLoading, refetch, isFetching } = useLowStockAlerts(queryParams);

  const handleCreateTransfer = (alert: LowStockAlert) => {
    // Navigate to transfer creation with pre-filled data
    navigate('/enterprise/transfers/new', {
      state: {
        suggestedProduct: {
          id: alert.productId,
          name: alert.productName,
          deficit: alert.deficit,
        },
        destinationLocationId: alert.locationId,
      },
    });
  };

  const handleExportCSV = () => {
    if (!alerts?.length) return;

    const headers = [
      'Código',
      'Produto',
      'Categoria',
      'Local',
      'Qtd Atual',
      'Reservado',
      'Disponível',
      'Estoque Mín.',
      'Déficit',
      'Criticidade',
      'Ação Sugerida',
    ];

    const rows = alerts.map((a) => [
      a.internalCode,
      a.productName,
      a.categoryName || '-',
      a.locationName,
      formatNumber(a.currentQty),
      formatNumber(a.reservedQty),
      formatNumber(a.availableQty),
      formatNumber(a.minStock),
      formatNumber(a.deficit),
      criticalityLabels[a.criticality],
      a.suggestedAction,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alertas-estoque-baixo-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas de Reposição</h1>
          <p className="text-muted-foreground">Produtos com estoque abaixo do mínimo configurado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!alerts?.length}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCount ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{alertsCount?.total ?? 0}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCount ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-700">
                  {alertsCount?.critical ?? 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCount ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold text-amber-700">
                  {alertsCount?.warning ?? 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Baixo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCount ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-700">{alertsCount?.low ?? 0}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Local</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os locais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Criticidade</label>
              <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="CRITICAL">Crítico</SelectItem>
                  <SelectItem value="WARNING">Alerta</SelectItem>
                  <SelectItem value="LOW">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos com Estoque Baixo
          </CardTitle>
          <CardDescription>
            {alerts?.length ?? 0} produto(s) abaixo do estoque mínimo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !alerts?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum alerta encontrado</p>
              <p className="text-sm">Todos os produtos estão com estoque adequado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Criticidade</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Déficit</TableHead>
                    <TableHead className="w-[180px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={`${alert.productId}-${alert.locationId}`}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(criticalityColors[alert.criticality])}
                        >
                          <AlertTriangle
                            className={cn('mr-1 h-3 w-3', criticalityIconColors[alert.criticality])}
                          />
                          {criticalityLabels[alert.criticality]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {alert.internalCode || '-'}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {alert.productName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {alert.categoryName || '-'}
                      </TableCell>
                      <TableCell>{alert.locationName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={cn('font-medium', alert.availableQty <= 0 && 'text-red-600')}
                        >
                          {formatNumber(alert.availableQty)}
                        </span>
                        {alert.reservedQty > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({formatNumber(alert.reservedQty)} res.)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(alert.minStock)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-red-600">
                        -{formatNumber(alert.deficit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateTransfer(alert)}
                            title="Criar Transferência"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/products/${alert.productId}`)}
                            title="Ver Produto"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LowStockAlertsPage;
