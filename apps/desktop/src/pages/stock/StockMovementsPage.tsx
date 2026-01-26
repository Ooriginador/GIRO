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
import { type FC, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportButtons } from '@/components/shared';
import { type ExportColumn, type ExportSummaryItem, exportFormatters } from '@/lib/export';

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

  // Colunas para exportação profissional
  const exportColumns: ExportColumn<(typeof movements)[0]>[] = [
    { key: 'createdAt', header: 'Data/Hora', formatter: exportFormatters.datetime, width: 140 },
    { key: 'product.name', header: 'Produto', width: 180 },
    { key: 'product.internalCode', header: 'Código', width: 80 },
    {
      key: 'type',
      header: 'Tipo',
      formatter: (v) => MOVEMENT_LABELS[v as StockMovementType]?.label || String(v),
      width: 80,
    },
    { key: 'quantity', header: 'Quantidade', align: 'right', type: 'number', totalizable: true },
    { key: 'previousStock', header: 'Estoque Anterior', align: 'right', type: 'number' },
    { key: 'newStock', header: 'Novo Estoque', align: 'right', type: 'number' },
    { key: 'reason', header: 'Motivo', width: 150 },
  ];

  // Cálculos para summary profissional
  const entriesCount = filteredMovements.filter((m) => ['ENTRY', 'RETURN'].includes(m.type)).length;
  const exitsCount = filteredMovements.filter((m) =>
    ['EXIT', 'SALE', 'LOSS', 'CONSUMPTION'].includes(m.type)
  ).length;
  const adjustmentsCount = filteredMovements.filter((m) => m.type === 'ADJUSTMENT').length;

  const exportSummary: ExportSummaryItem[] = useMemo(
    () => [
      {
        label: 'Total Movimentações',
        value: String(filteredMovements.length),
        icon: '📋',
        color: '#3b82f6',
      },
      {
        label: 'Entradas',
        value: String(entriesCount),
        icon: '📥',
        color: '#10b981',
      },
      {
        label: 'Saídas',
        value: String(exitsCount),
        icon: '📤',
        color: '#ef4444',
      },
      {
        label: 'Ajustes',
        value: String(adjustmentsCount),
        icon: '⚙️',
        color: '#f59e0b',
      },
    ],
    [filteredMovements.length, entriesCount, exitsCount, adjustmentsCount]
  );

  // Filtros aplicados para exportação
  const exportFilters = useMemo(
    () => ({
      ...(typeFilter !== 'all' && {
        Tipo: MOVEMENT_LABELS[typeFilter as StockMovementType]?.label,
      }),
      ...(searchQuery && { Busca: searchQuery }),
    }),
    [typeFilter, searchQuery]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          data-testid="back-button"
          aria-label="Voltar para página anterior"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">Histórico de todas as entradas e saídas</p>
        </div>
        <ExportButtons
          data={filteredMovements}
          columns={exportColumns}
          filename="movimentacoes-estoque"
          title="Movimentações de Estoque"
          subtitle="Histórico completo de entradas e saídas"
          variant="dropdown"
          disabled={isLoading || !filteredMovements.length}
          orientation="landscape"
          filters={exportFilters}
          showTotals={true}
          summary={exportSummary}
          primaryColor="#3b82f6"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4" role="search" aria-label="Filtrar movimentações">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Buscar por produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Buscar movimentação por nome do produto"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48" aria-label="Filtrar por tipo de movimentação">
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
            <ArrowUpDown className="h-5 w-5" aria-hidden="true" />
            Histórico
            <Badge
              variant="secondary"
              aria-label={`Total: ${filteredMovements.length} movimentações`}
            >
              {filteredMovements.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2" role="status" aria-label="Carregando movimentações">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" aria-hidden="true" />
              ))}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              role="status"
            >
              <ArrowUpDown className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-2 text-muted-foreground">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <Table aria-label="Histórico de movimentações de estoque">
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
                          aria-label={`${isPositive ? 'Entrada' : 'Saída'} de ${
                            movement.quantity
                          } unidades`}
                        >
                          {isPositive ? (
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
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
