/**
 * @file ExpirationPage - Controle de Validades
 * @description Página de monitoramento de produtos próximos ao vencimento
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useExpiringLots } from '@/hooks/useStock';
import { daysUntil, formatCurrency, formatDate, formatExpirationRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ProductLot } from '@/types';
import { AlertTriangle, ArrowLeft, Calendar, Clock, Loader2, Package } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'expired' | 'critical' | 'warning';

const getExpirationStatus = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = daysUntil(date);
  if (days < 0)
    return { label: 'Vencido', variant: 'destructive' as const, color: 'text-destructive' };
  if (days <= 3)
    return { label: 'Crítico', variant: 'destructive' as const, color: 'text-destructive' };
  if (days <= 7) return { label: 'Urgente', variant: 'warning' as const, color: 'text-warning' };
  if (days <= 30)
    return { label: 'Atenção', variant: 'secondary' as const, color: 'text-muted-foreground' };
  return { label: 'OK', variant: 'default' as const, color: 'text-success' };
};

export const ExpirationPage: FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');

  // Busca lotes que vencem nos próximos 90 dias (inclui já vencidos)
  const { data: expiringLots = [], isLoading } = useExpiringLots(90);

  // Calcula estatísticas
  const stats = useMemo(() => {
    return {
      expired: expiringLots.filter((lot) => daysUntil(new Date(lot.expirationDate)) < 0).length,
      critical: expiringLots.filter((lot) => {
        const days = daysUntil(new Date(lot.expirationDate));
        return days >= 0 && days <= 3;
      }).length,
      warning: expiringLots.filter((lot) => {
        const days = daysUntil(new Date(lot.expirationDate));
        return days > 3 && days <= 7;
      }).length,
    };
  }, [expiringLots]);

  // Filtra e ordena os lotes
  const filteredLots = useMemo(() => {
    return expiringLots
      .filter((lot) => {
        const days = daysUntil(new Date(lot.expirationDate));
        if (filter === 'expired') return days < 0;
        if (filter === 'critical') return days >= 0 && days <= 3;
        if (filter === 'warning') return days > 3 && days <= 7;
        return true;
      })
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }, [expiringLots, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/stock')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Validades</h1>
          <p className="text-muted-foreground">Monitore produtos próximos ao vencimento</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-expired">
              {stats.expired}
            </div>
            <p className="text-xs text-muted-foreground">Retirar do estoque</p>
          </CardContent>
        </Card>
        <Card className="border-warning/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Críticos (3 dias)</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning" data-testid="stat-critical">
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground">Vender com urgência</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atenção (7 dias)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-warning">
              {stats.warning}
            </div>
            <p className="text-xs text-muted-foreground">Considerar promoção</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex justify-end">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="critical">Críticos</SelectItem>
            <SelectItem value="warning">Atenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredLots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="mt-2 text-muted-foreground">
            {filter === 'all'
              ? 'Não há produtos próximos ao vencimento'
              : 'Nenhum produto corresponde ao filtro selecionado'}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && filteredLots.length > 0 && (
        <Card>
          <CardContent className="p-0" data-tutorial="expiration-list">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead>Fabricação</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot: ProductLot) => {
                  const status = getExpirationStatus(lot.expirationDate);
                  return (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">
                        {lot.product?.name ?? 'Produto não encontrado'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lot.lotNumber ?? '-'}
                      </TableCell>
                      <TableCell className="text-center">{lot.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lot.costPrice)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lot.manufacturingDate ? formatDate(new Date(lot.manufacturingDate)) : '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className={cn('font-medium', status.color)}>
                            {formatExpirationRelative(new Date(lot.expirationDate))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(new Date(lot.expirationDate))}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
