/**
 * @file StockMovementsPage - Histórico de movimentações
 * @description Lista todas as movimentações de estoque
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useStockMovements } from '@/hooks/useStock';
import { cn, formatDateTime } from '@/lib/utils';
import type { StockMovementType } from '@/types';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { type FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const MOVEMENT_LABELS: Record<
  StockMovementType,
  { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }
> = {
  ENTRY: { label: 'Entrada', variant: 'success' },
  EXIT: { label: 'Saída', variant: 'destructive' },
  SALE: { label: 'Venda', variant: 'destructive' },
  ADJUSTMENT: { label: 'Ajuste', variant: 'warning' },
  RETURN: { label: 'Devolução', variant: 'success' },
  LOSS: { label: 'Perda', variant: 'destructive' },
  CONSUMPTION: { label: 'Consumo', variant: 'destructive' },
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const StockMovementsPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: movements = [], isLoading } = useStockMovements();

  const filteredMovements = movements.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (searchQuery && !m.product?.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-button">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">Histórico de todas as entradas e saídas</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="ENTRY">Entrada</SelectItem>
                <SelectItem value="EXIT">Saída</SelectItem>
                <SelectItem value="SALE">Venda</SelectItem>
                <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                <SelectItem value="RETURN">Devolução</SelectItem>
                <SelectItem value="LOSS">Perda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Histórico
            <Badge variant="secondary">{filteredMovements.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowUpDown className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Anterior</TableHead>
                  <TableHead className="text-center">Novo</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => {
                  const config = MOVEMENT_LABELS[movement.type];
                  const isPositive = ['ENTRY', 'RETURN'].includes(movement.type);

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(movement.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.product?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {movement.product?.internalCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config?.variant || 'default'}>
                          {config?.label || movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'flex items-center justify-center gap-1 font-medium',
                            isPositive ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {isPositive ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {movement.previousStock}
                      </TableCell>
                      <TableCell className="text-center font-medium">{movement.newStock}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.reason || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
