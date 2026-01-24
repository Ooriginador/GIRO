/**
 * @file StockPage - Página principal de estoque
 * @description Visão geral do estoque com alertas e movimentações
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLowStockProducts, useStockReport } from '@/hooks/useStock';
import { cn, formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Package,
  PackageMinus,
  PackagePlus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const StockPage: FC = () => {
  const { data: report, isLoading } = useStockReport();
  const { data: lowStockProducts = [] } = useLowStockProducts();

  if (isLoading || !report) {
    return <div>Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">Gerencie as entradas, saídas e inventário</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/stock/movements">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Movimentações
            </Link>
          </Button>
          <Button asChild data-tutorial="stock-entry-button">
            <Link to="/stock/entry">
              <PackagePlus className="mr-2 h-4 w-4" />
              Nova Entrada
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tutorial="stock-indicators">
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalProducts}</div>
            <p className="text-xs text-muted-foreground">produtos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.totalValue)}</div>
            <p className="text-xs text-muted-foreground">a preço de custo</p>
          </CardContent>
        </Card>

        <Card className={cn(report.lowStockCount > 0 && 'border-warning')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{report.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card className={cn(report.outOfStockCount > 0 && 'border-destructive')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <PackageMinus className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{report.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">zerados</p>
          </CardContent>
        </Card>

        <Card className={cn(report.excessStockCount > 0 && 'border-blue-500')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excesso de Estoque</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{report.excessStockCount}</div>
            <p className="text-xs text-muted-foreground">acima do máximo</p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos com Estoque Baixo */}
      <Card
        className="border-none bg-card/50 backdrop-blur-sm shadow-md"
        data-tutorial="stock-table"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Produtos com Estoque Baixo
          </CardTitle>
          <CardDescription>
            Produtos que atingiram ou estão abaixo do estoque mínimo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                Todos os produtos estão com estoque adequado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Atual</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
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
                        <Badge variant={isZero ? 'destructive' : 'warning'}>
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
                          />
                          <span className="text-sm text-muted-foreground">
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/stock/entry?product=${product.id}`}>
                            <PackagePlus className="mr-1 h-4 w-4" />
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
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Produtos Próximos do Vencimento
              <Badge variant="warning" data-testid="expiring-count">
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
