/**
 * @file InventoryPage - Inventário de Estoque
 * @description Página para visualização e contagem de inventário físico
 */

import { useState, useMemo, useEffect, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useStockLocations, useStockBalances } from '@/hooks/enterprise/useStockLocations';
import { adjustStockBalance, type StockBalance } from '@/lib/tauri';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ClipboardList,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Search,
  Warehouse,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface InventoryCountItem extends StockBalance {
  countedQty: number | null;
  difference: number | null;
  status: 'pending' | 'counted' | 'adjusted';
}

interface AdjustmentModalData {
  item: InventoryCountItem;
  index: number;
}

// ────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ────────────────────────────────────────────────────────────────────────────

const LoadingSkeleton: FC = () => (
  <div className="space-y-6 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-[400px] rounded-lg" />
  </div>
);

const EmptyState: FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
    <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
    <h3 className="text-lg font-medium">Nenhum Item</h3>
    <p className="text-muted-foreground max-w-sm">{message}</p>
  </div>
);

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: FC<{ className?: string }>;
  variant?: 'default' | 'warning' | 'success' | 'error';
}

const StatsCard: FC<StatsCardProps> = ({ title, value, icon: Icon, variant = 'default' }) => {
  const variantClasses = {
    default: 'text-primary',
    warning: 'text-amber-600',
    success: 'text-green-600',
    error: 'text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-sm text-muted-foreground"
              id={`stat-${title.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {title}
            </p>
            <p
              className={cn('text-2xl font-bold', variantClasses[variant])}
              aria-describedby={`stat-${title.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {value}
            </p>
          </div>
          <Icon className={cn('h-8 w-8', variantClasses[variant])} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const InventoryPage: FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filters
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryCountItem[]>([]);
  const [isCountingMode, setIsCountingMode] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState<AdjustmentModalData | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Data
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const {
    data: balances = [],
    isLoading: loadingBalances,
    refetch,
  } = useStockBalances(selectedLocationId);

  // Initialize inventory items when balances load or location changes
  useEffect(() => {
    if (balances.length > 0 && !isCountingMode) {
      const items: InventoryCountItem[] = balances.map((b) => ({
        ...b,
        countedQty: null,
        difference: null,
        status: 'pending' as const,
      }));
      setInventoryItems(items);
    }
  }, [balances, selectedLocationId, isCountingMode]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.productName.toLowerCase().includes(searchLower) ||
          i.productSku.toLowerCase().includes(searchLower)
      );
    }

    if (showOnlyLow) {
      items = items.filter((i) => i.quantity < i.minQuantity);
    }

    return items;
  }, [inventoryItems, search, showOnlyLow]);

  // Stats
  const stats = useMemo(() => {
    const total = inventoryItems.length;
    const counted = inventoryItems.filter((i) => i.status !== 'pending').length;
    const lowStock = inventoryItems.filter((i) => i.quantity < i.minQuantity).length;
    const differences = inventoryItems.filter(
      (i) => i.difference !== null && i.difference !== 0
    ).length;
    const progress = total > 0 ? Math.round((counted / total) * 100) : 0;

    return { total, counted, lowStock, differences, progress };
  }, [inventoryItems]);

  // Handlers
  const handleStartCounting = () => {
    setIsCountingMode(true);
    toast({
      title: 'Modo de Contagem Ativado',
      description: 'Insira as quantidades contadas para cada item.',
    });
  };

  const handleUpdateCount = (index: number, countedQty: number | null) => {
    setInventoryItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      item.countedQty = countedQty;
      item.difference = countedQty !== null ? countedQty - item.quantity : null;
      item.status = countedQty !== null ? 'counted' : 'pending';
      return updated;
    });
  };

  const handleOpenAdjustment = (item: InventoryCountItem, index: number) => {
    setAdjustmentModal({ item, index });
    setAdjustmentReason('');
  };

  const handleConfirmAdjustment = async () => {
    if (!adjustmentModal || !adjustmentReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo do ajuste de estoque.',
        variant: 'destructive',
      });
      return;
    }

    const { item, index } = adjustmentModal;
    if (item.countedQty === null) return;

    setIsAdjusting(true);
    try {
      await adjustStockBalance(
        item.locationId,
        item.productId,
        item.countedQty,
        `Inventário: ${adjustmentReason}`
      );

      setInventoryItems((prev) => {
        const updated = [...prev];
        const existing = updated[index];
        if (!existing) return prev;
        updated[index] = {
          ...existing,
          quantity: item.countedQty!,
          availableQty: item.countedQty! - existing.reservedQty,
          difference: 0,
          status: 'adjusted' as const,
        };
        return updated;
      });

      toast({
        title: 'Estoque ajustado!',
        description: `${item.productName} ajustado para ${item.countedQty} ${item.productUnit}.`,
      });

      setAdjustmentModal(null);
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
    } catch (error) {
      toast({
        title: 'Erro ao ajustar estoque',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleFinishCounting = () => {
    const pendingItems = inventoryItems.filter((i) => i.status === 'pending');
    if (pendingItems.length > 0) {
      toast({
        title: 'Contagem incompleta',
        description: `Ainda há ${pendingItems.length} item(ns) sem contagem.`,
        variant: 'destructive',
      });
      return;
    }

    setIsCountingMode(false);
    toast({
      title: 'Contagem finalizada!',
      description: 'O inventário foi concluído com sucesso.',
    });
  };

  const handleCancelCounting = () => {
    setIsCountingMode(false);
    // Reset items
    const items: InventoryCountItem[] = balances.map((b) => ({
      ...b,
      countedQty: null,
      difference: null,
      status: 'pending' as const,
    }));
    setInventoryItems(items);
  };

  if (loadingLocations) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventário de Estoque</h1>
          <p className="text-muted-foreground">
            Controle e contagem de materiais por local de estoque
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={loadingBalances}
          aria-label="Atualizar inventário"
        >
          <RefreshCw
            className={cn('mr-2 h-4 w-4', loadingBalances && 'animate-spin')}
            aria-hidden="true"
          />
          Atualizar
        </Button>
      </div>

      {/* Location Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" aria-hidden="true" />
            Local de Estoque
          </CardTitle>
          <CardDescription>Selecione um local para visualizar o inventário</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedLocationId}
            onValueChange={(value) => {
              setSelectedLocationId(value);
              setIsCountingMode(false);
            }}
          >
            <SelectTrigger className="max-w-md" aria-label="Selecionar local de estoque">
              <SelectValue placeholder="Selecione um local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  <div className="flex items-center gap-2">
                    <span>{loc.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {loc.locationType === 'CENTRAL' ? 'Central' : 'Obra'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Content - Only show if location is selected */}
      {selectedLocationId && (
        <>
          {/* Stats */}
          <div
            className="grid gap-4 md:grid-cols-4"
            role="region"
            aria-label="Estatísticas do inventário"
          >
            <StatsCard title="Total de Itens" value={stats.total} icon={Package} />
            <StatsCard
              title="Estoque Baixo"
              value={stats.lowStock}
              icon={AlertTriangle}
              variant={stats.lowStock > 0 ? 'warning' : 'default'}
            />
            {isCountingMode && (
              <>
                <StatsCard
                  title="Itens Contados"
                  value={`${stats.counted}/${stats.total}`}
                  icon={Check}
                  variant="success"
                />
                <StatsCard
                  title="Divergências"
                  value={stats.differences}
                  icon={BarChart3}
                  variant={stats.differences > 0 ? 'error' : 'default'}
                />
              </>
            )}
          </div>

          {/* Progress (Counting Mode) */}
          {isCountingMode && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso da Contagem</span>
                  <span className="text-sm text-muted-foreground" aria-live="polite">
                    {stats.progress}%
                  </span>
                </div>
                <Progress
                  value={stats.progress}
                  className="h-2"
                  aria-label={`Progresso da contagem: ${stats.progress}%`}
                />
              </CardContent>
            </Card>
          )}

          {/* Filters & Actions */}
          <div
            className="flex items-center gap-4 flex-wrap"
            role="search"
            aria-label="Filtros e ações de inventário"
          >
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Buscar material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Buscar materiais no inventário"
              />
            </div>
            <Button
              variant={showOnlyLow ? 'default' : 'outline'}
              onClick={() => setShowOnlyLow(!showOnlyLow)}
              className="shrink-0"
              aria-pressed={showOnlyLow}
            >
              <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
              Estoque Baixo
              {stats.lowStock > 0 && (
                <Badge variant="secondary" className="ml-2" aria-label={`${stats.lowStock} itens`}>
                  {stats.lowStock}
                </Badge>
              )}
            </Button>

            <div className="flex-1" />

            {!isCountingMode ? (
              <Button onClick={handleStartCounting} disabled={inventoryItems.length === 0}>
                <ClipboardList className="mr-2 h-4 w-4" aria-hidden="true" />
                Iniciar Contagem
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelCounting}>
                  Cancelar
                </Button>
                <Button onClick={handleFinishCounting}>
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  Finalizar Contagem
                </Button>
              </div>
            )}
          </div>

          {/* Inventory Table */}
          <Card>
            <CardContent className="p-0">
              {loadingBalances ? (
                <div
                  className="flex items-center justify-center py-16"
                  role="status"
                  aria-label="Carregando inventário"
                >
                  <Loader2
                    className="h-8 w-8 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  message={
                    search
                      ? 'Nenhum material encontrado com esse termo.'
                      : showOnlyLow
                      ? 'Nenhum item com estoque baixo neste local.'
                      : 'Este local não possui itens em estoque.'
                  }
                />
              ) : (
                <Table aria-label="Lista de itens do inventário">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Material</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right">Disponível</TableHead>
                      <TableHead className="text-center">Mín/Máx</TableHead>
                      {isCountingMode && (
                        <>
                          <TableHead className="text-center">Contagem</TableHead>
                          <TableHead className="text-center">Diferença</TableHead>
                          <TableHead className="w-[100px]">
                            <span className="sr-only">Ações</span>
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const realIndex = inventoryItems.findIndex((i) => i.id === item.id);
                      const isLowStock = item.quantity < item.minQuantity;
                      const hasMax = item.maxQuantity != null;

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            isLowStock && 'bg-amber-50 dark:bg-amber-950/20',
                            item.status === 'adjusted' && 'bg-green-50 dark:bg-green-950/20'
                          )}
                          aria-label={`${item.productName}, estoque ${item.quantity} ${
                            item.productUnit
                          }${isLowStock ? ', estoque baixo' : ''}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">{item.productSku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(isLowStock && 'text-amber-600 font-medium')}>
                              {item.quantity} {item.productUnit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.reservedQty} {item.productUnit}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.availableQty} {item.productUnit}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {item.minQuantity}
                            {hasMax ? ` / ${item.maxQuantity}` : ' / -'}
                          </TableCell>
                          {isCountingMode && (
                            <>
                              <TableCell>
                                <div className="flex justify-center">
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    placeholder="Qtd"
                                    className="w-24 text-center"
                                    value={item.countedQty ?? ''}
                                    onChange={(e) =>
                                      handleUpdateCount(
                                        realIndex,
                                        e.target.value ? parseFloat(e.target.value) : null
                                      )
                                    }
                                    aria-label={`Quantidade contada de ${item.productName}`}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {item.difference !== null && (
                                  <Badge
                                    variant={item.difference === 0 ? 'outline' : 'destructive'}
                                    className={cn(
                                      item.difference > 0 &&
                                        'bg-green-100 text-green-800 border-green-200',
                                      item.difference < 0 &&
                                        'bg-red-100 text-red-800 border-red-200'
                                    )}
                                    role="status"
                                    aria-label={`Diferença: ${item.difference > 0 ? '+' : ''}${
                                      item.difference
                                    }`}
                                  >
                                    {item.difference > 0 && (
                                      <ArrowUp className="mr-1 h-3 w-3" aria-hidden="true" />
                                    )}
                                    {item.difference < 0 && (
                                      <ArrowDown className="mr-1 h-3 w-3" aria-hidden="true" />
                                    )}
                                    {item.difference > 0 ? '+' : ''}
                                    {item.difference}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.status === 'counted' && item.difference !== 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenAdjustment(item, realIndex)}
                                  >
                                    Ajustar
                                  </Button>
                                )}
                                {item.status === 'adjusted' && (
                                  <Badge variant="outline" className="bg-green-50" role="status">
                                    <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Adjustment Modal */}
      <Dialog open={adjustmentModal !== null} onOpenChange={() => setAdjustmentModal(null)}>
        <DialogContent aria-describedby="adjustment-description">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription id="adjustment-description">
              Confirme o ajuste de estoque para <strong>{adjustmentModal?.item.productName}</strong>
            </DialogDescription>
          </DialogHeader>
          {adjustmentModal && (
            <div className="space-y-4" role="region" aria-label="Detalhes do ajuste">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground" id="current-stock-label">
                    Estoque Atual
                  </p>
                  <p className="text-lg font-bold" aria-labelledby="current-stock-label">
                    {adjustmentModal.item.quantity} {adjustmentModal.item.productUnit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground" id="counted-qty-label">
                    Quantidade Contada
                  </p>
                  <p className="text-lg font-bold text-primary" aria-labelledby="counted-qty-label">
                    {adjustmentModal.item.countedQty} {adjustmentModal.item.productUnit}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg border flex items-center justify-between">
                <span className="text-sm" id="difference-label">
                  Diferença
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-base',
                    (adjustmentModal.item.difference ?? 0) > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  )}
                  role="status"
                  aria-labelledby="difference-label"
                >
                  {(adjustmentModal.item.difference ?? 0) > 0 ? '+' : ''}
                  {adjustmentModal.item.difference} {adjustmentModal.item.productUnit}
                </Badge>
              </div>
              <div>
                <label htmlFor="adjustment-reason" className="text-sm font-medium">
                  Motivo do Ajuste *
                </label>
                <Textarea
                  id="adjustment-reason"
                  placeholder="Informe o motivo do ajuste de estoque..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="mt-1.5"
                  aria-required="true"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAdjustment} disabled={isAdjusting}>
              {isAdjusting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {isAdjusting ? 'Ajustando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
