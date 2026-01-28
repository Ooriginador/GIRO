/**
 * @file InventoryDetailPage - Detalhes da Contagem
 * @description Tela para realização da contagem física de inventário
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, CheckCircle2, Save, ClipboardCheck, Filter, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatQuantity } from '@/lib/formatters';
import type { InventoryCount, InventoryCountItemWithProduct } from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'counted' | 'divergent'>(
    'all'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // ── Queries ──

  const { data: count, isLoading: isLoadingCount } = useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const res = await invoke<InventoryCount | null>('get_inventory_count_by_id', { id });
      if (!res) throw new Error('Inventário não encontrado');
      return res;
    },
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventory-items', id],
    queryFn: () =>
      invoke<InventoryCountItemWithProduct[]>('get_inventory_count_items', { countId: id }),
    enabled: !!id,
  });

  // ── Mutations ──

  const registerItemMutation = useMutation({
    mutationFn: async ({ itemId, qty, notes }: { itemId: string; qty: number; notes?: string }) => {
      return invoke('register_inventory_count_item', {
        itemId,
        countedQty: qty,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      toast({ title: 'Item registrado', variant: 'default' });
    },
    onError: (err) => {
      console.error(err);
      toast({ title: 'Erro ao registrar item', description: String(err), variant: 'destructive' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => invoke('complete_inventory_count', { id }),
    onSuccess: () => {
      toast({ title: 'Inventário Finalizado', description: 'Contagem concluída com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['inventory', id] });
      navigate('/enterprise/inventory');
    },
  });

  // ── Computed ──

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de busca
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Filtro de status
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return item.countedQty === null;
      if (filterStatus === 'counted') return item.countedQty !== null;
      if (filterStatus === 'divergent') return item.difference && item.difference !== 0;

      return true;
    });
  }, [items, searchTerm, filterStatus]);

  // Status Utils
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Em Andamento
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="success" className="bg-green-100 text-green-800">
            Concluído
          </Badge>
        );
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingCount || isLoadingItems) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!count) return <div>Inventário não encontrado</div>;

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enterprise/inventory')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Inventário #{count.id.slice(0, 8)}
              {getStatusBadge(count.status)}
            </h1>
            <p className="text-muted-foreground mt-1">
              Local: {count.locationId} | Tipo: {count.countType}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {count.status === 'IN_PROGRESS' && (
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar Contagem
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count.totalItems}</div>
            <p className="text-xs text-muted-foreground">Itens no local</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count.itemsCounted}</div>
            <Progress
              value={(count.itemsCounted / (count.totalItems || 1)) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Divergências</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                count.discrepancies > 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {count.discrepancies}
            </div>
            <p className="text-xs text-muted-foreground">Itens com diferença</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((count.itemsCounted / (count.totalItems || 1)) * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Itens</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="counted">Já Contados</SelectItem>
              <SelectItem value="divergent">Com Divergência</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Sistema</TableHead>
              <TableHead className="text-right w-[150px]">Contado</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <InventoryItemRow
                key={item.id}
                item={item}
                isActive={count.status === 'IN_PROGRESS'}
                onRegister={(qty) => registerItemMutation.mutateAsync({ itemId: item.id, qty })}
              />
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum item encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ────────────────────────────────────────────────────────────────────────────

function InventoryItemRow({
  item,
  isActive,
  onRegister,
}: {
  item: InventoryCountItemWithProduct;
  isActive: boolean;
  onRegister: (qty: number) => Promise<any>;
}) {
  const [inputValue, setInputValue] = useState(item.countedQty?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!inputValue) return;
    const qty = parseFloat(inputValue);
    if (isNaN(qty)) return;

    setIsSaving(true);
    await onRegister(qty);
    setIsSaving(false);
  };

  return (
    <TableRow className={cn(item.countedQty !== null ? 'bg-muted/30' : '')}>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span>{item.productName}</span>
          <span className="text-xs text-muted-foreground">{item.productUnit}</span>
        </div>
      </TableCell>
      <TableCell>{item.productCode}</TableCell>
      <TableCell className="text-right">
        {isActive && item.systemQty !== undefined
          ? formatQuantity(item.systemQty, item.productUnit as any)
          : '***'}
      </TableCell>
      <TableCell>
        <div className="flex gap-2 justify-end">
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!isActive || isSaving}
            className={cn(
              'text-right h-9 w-24',
              item.difference && item.difference !== 0 ? 'border-red-300' : ''
            )}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        {item.difference !== null && item.difference !== undefined && (
          <Badge variant={item.difference === 0 ? 'outline' : 'destructive'}>
            {item.difference > 0 ? '+' : ''}
            {formatQuantity(item.difference, item.productUnit as any)}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          size="icon"
          variant="ghost"
          disabled={!isActive || isSaving || !inputValue}
          onClick={handleSave}
        >
          {isSaving ? (
            <ClipboardCheck className="animate-pulse h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
