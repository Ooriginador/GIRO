/**
 * @file StockPage - Página principal de estoque
 * @description Visão geral do estoque com alertas e movimentações
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useLowStockProducts, useStockReport } from '@/hooks/useStock';
import { cn, formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Filter,
  Package,
  PackageMinus,
  PackagePlus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { type FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExportButtons } from '@/components/shared';
import { type ExportColumn, exportFormatters } from '@/lib/export';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const StockPage: FC = () => {
  const [categoryId, setCategoryId] = useState<string>('all');
  const { hasPermission } = useAuth();
  const { data: categories = [] } = useCategories();

  const filterId = categoryId === 'all' ? undefined : categoryId;
  const { data: report, isLoading } = useStockReport(filterId);
  const { data: lowStockProducts = [] } = useLowStockProducts(filterId);

  const canViewValue = hasPermission('stock.view_value');

  if (isLoading || !report) {
    return (
      <div className="flex items-center justify-center py-20" aria-live="polite">
        Carregando dashboard de estoque...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">Gerencie as entradas, saídas e inventário</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-2 mr-2">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]" aria-label="Filtrar por categoria">
                <SelectValue placeholder="Todas Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ExportButtons
            data={lowStockProducts}
            columns={
              [
                { key: 'code', header: 'Código' },
                { key: 'name', header: 'Produto' },
                { key: 'stock', header: 'Estoque Atual', align: 'right' },
                { key: 'minStock', header: 'Estoque Mín.', align: 'right' },
                {
                  key: 'salePrice',
                  header: 'Preço',
                  formatter: exportFormatters.currency,
                  align: 'right',
                },
              ] as ExportColumn<(typeof lowStockProducts)[0]>[]
            }
            filename="estoque-baixo"
            title="Produtos com Estoque Baixo"
            variant="dropdown"
          />
          <Button variant="outline" asChild aria-label="Ver histórico de movimentações">
            <Link to="/stock/movements">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Movimentações
            </Link>
          </Button>
          <Button
            asChild
            data-tutorial="stock-entry-button"
            aria-label="Registrar nova entrada de estoque"
          >
            <Link to="/stock/entry">
              <PackagePlus className="mr-2 h-4 w-4" />
              Nova Entrada
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tutorial="stock-indicators">
        <Card
          className="border-none bg-card/50 backdrop-blur-sm shadow-md"
          aria-labelledby="total-products-label"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle id="total-products-label" className="text-sm font-medium">
              Total de Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" aria-live="polite">
              {report.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">produtos filtrados</p>
          </CardContent>
        </Card>

        {canViewValue && (
          <Card aria-labelledby="stock-value-label">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle id="stock-value-label" className="text-sm font-medium">
                Valor em Estoque
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" aria-live="polite">
                {formatCurrency(report.totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">a preço de custo</p>
            </CardContent>
          </Card>
        )}

        <Card
          className={cn(report.lowStockCount > 0 && 'border-warning')}
          aria-labelledby="low-stock-label"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle id="low-stock-label" className="text-sm font-medium">
              Estoque Baixo
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning" aria-live="polite">
              {report.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card
          className={cn(report.outOfStockCount > 0 && 'border-destructive')}
          aria-labelledby="out-of-stock-label"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle id="out-of-stock-label" className="text-sm font-medium">
              Sem Estoque
            </CardTitle>
            <PackageMinus className="h-4 w-4 text-destructive" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" aria-live="polite">
              {report.outOfStockCount}
            </div>
            <p className="text-xs text-muted-foreground">zerados</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border-none bg-blue-50/50 dark:bg-blue-900/10 shadow-sm',
            report.excessStockCount > 0 && 'border-solid border-blue-200 dark:border-blue-800'
          )}
          aria-labelledby="excess-stock-label"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle
              id="excess-stock-label"
              className="text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              Excesso de Estoque
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" aria-live="polite">
              {report.excessStockCount}
            </div>
            <p className="text-xs text-muted-foreground">acima do máximo permitido</p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos com Estoque Baixo */}
      <Card
        className="border-none bg-card/50 backdrop-blur-sm shadow-md"
        data-tutorial="stock-table"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" id="low-stock-table-title">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            Produtos com Estoque Baixo
          </CardTitle>
          <CardDescription>
            {categoryId === 'all'
              ? 'Produtos que atingiram ou estão abaixo do estoque mínimo em todas as categorias'
              : `Produtos que atingiram ou estão abaixo do estoque mínimo nesta categoria`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-8 text-center"
              role="status"
            >
              <Package className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-2 text-muted-foreground">
                Todos os produtos estão com estoque adequado
              </p>
            </div>
          ) : (
            <Table aria-labelledby="low-stock-table-title">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Atual</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-[100px]">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.slice(0, 10).map((product) => {
                  const percent =
                    product.minStock > 0 ? (product.currentStock / product.minStock) * 100 : 0;
                  const isZero = product.currentStock === 0;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.internalCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={isZero ? 'destructive' : 'warning'}
                          aria-label={`Estoque atual: ${product.currentStock} ${
                            isZero ? ', zerado' : ', baixo'
                          }`}
                        >
                          {product.currentStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.minStock}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(percent, 100)}
                            className={cn(
                              'h-2 w-20',
                              isZero && '[&>div]:bg-destructive',
                              !isZero && percent < 50 && '[&>div]:bg-warning'
                            )}
                            aria-label={`Nível de estoque: ${percent.toFixed(0)}% do mínimo`}
                          />
                          <span className="text-sm text-muted-foreground" aria-hidden="true">
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          aria-label={`Registrar entrada para ${product.name}`}
                        >
                          <Link to={`/stock/entry?product=${product.id}`}>
                            <PackagePlus className="mr-1 h-4 w-4" aria-hidden="true" />
                            Entrada
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vencimentos Próximos */}
      {report.expiringCount > 0 && (
        <Card className="border-warning" role="alert">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" aria-hidden="true" />
              Produtos Próximos do Vencimento
              <Badge
                variant="warning"
                data-testid="expiring-count"
                aria-label={`${report.expiringCount} produtos próximos do vencimento`}
              >
                {report.expiringCount}
              </Badge>
            </CardTitle>
            <CardDescription>Produtos que vencem nos próximos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/alerts">Ver Alertas de Vencimento</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
