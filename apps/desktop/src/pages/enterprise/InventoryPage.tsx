/**
 * @file InventoryPage - Gestão de Estoque e Inventários
 * @description Página unificada para visualização de saldos e gestão de inventários
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { useStockLocations, useStockBalances } from '@/hooks/enterprise/useStockLocations';
import { adjustStockBalance, type StockBalance } from '@/lib/tauri';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import type { InventoryCount, CreateInventoryCountPayload } from '@/types/enterprise';

import {
  ClipboardList,
  Loader2,
  Package,
  Plus,
  Search,
  Warehouse,
  Eye,
  History,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState('balances');

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque & Inventário</h1>
          <p className="text-muted-foreground">Gerencie saldos, ajustes e contagens físicas.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="balances" className="gap-2">
            <Package className="h-4 w-4" />
            Saldos Atuais
          </TabsTrigger>
          <TabsTrigger value="counts" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inventários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-4">
          <StockBalancesTab />
        </TabsContent>

        <TabsContent value="counts" className="space-y-4">
          <InventoryCountsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: SALDOS ATUAIS (Lógica Original Refatorada)
// ────────────────────────────────────────────────────────────────────────────

interface LocalStockItem extends StockBalance {
  status: 'ok' | 'low';
}

function StockBalancesTab() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  // Modal de Ajuste
  const [adjustmentItem, setAdjustmentItem] = useState<LocalStockItem | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'set' | 'add' | 'sub'>('set');

  const { toast } = useToast();

  const { data: locations = [] } = useStockLocations();

  const {
    data: balances = [],
    isLoading: loadingBalances,
    refetch,
  } = useStockBalances(selectedLocationId);

  // Computados
  const filteredItems = useMemo(() => {
    let items = balances.map((b) => ({
      ...b,
      status: (b.quantity < b.minQuantity ? 'low' : 'ok') as 'low' | 'ok',
    }));

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (i) => i.productName.toLowerCase().includes(s) || i.productSku.toLowerCase().includes(s)
      );
    }

    if (showOnlyLow) {
      items = items.filter((i) => i.status === 'low');
    }

    return items;
  }, [balances, search, showOnlyLow]);

  // Handler de Ajuste Rápido
  const handleConfirmAdjustment = async () => {
    if (!adjustmentItem || !adjustmentReason.trim() || !adjustmentQty) return;

    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty)) return;

    setIsAdjusting(true);
    try {
      // Calcular novo saldo baseado no tipo
      let newBalance = qty;
      if (adjustmentType === 'add') newBalance = adjustmentItem.quantity + qty;
      if (adjustmentType === 'sub') newBalance = adjustmentItem.quantity - qty;

      await adjustStockBalance(
        adjustmentItem.locationId,
        adjustmentItem.productId,
        newBalance,
        adjustmentReason
      );

      toast({ title: 'Estoque ajustado com sucesso' });
      setAdjustmentItem(null);
      setAdjustmentReason('');
      setAdjustmentQty('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erro no ajuste',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-64">
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger>
                <Warehouse className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Local de Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Locais</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            variant={showOnlyLow ? 'destructive' : 'outline'}
            onClick={() => setShowOnlyLow(!showOnlyLow)}
          >
            {showOnlyLow ? 'Mostrar Todos' : 'Apenas Baixo Estoque'}
          </Button>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        {loadingBalances ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Local</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={`${item.locationId}-${item.productId}`}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{item.productSku}</TableCell>
                  <TableCell>
                    {locations.find((l) => l.id === item.locationId)?.name || item.locationId}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    <span className={item.status === 'low' ? 'text-red-500' : ''}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.minQuantity}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setAdjustmentItem(item)}>
                      Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog de Ajuste */}
      <Dialog open={!!adjustmentItem} onOpenChange={(o) => !o && setAdjustmentItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de Estoque</DialogTitle>
            <DialogDescription>
              {adjustmentItem?.productName} - Atual: {adjustmentItem?.quantity}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Definir Saldo</SelectItem>
                  <SelectItem value="add">Adicionar (+)</SelectItem>
                  <SelectItem value="sub">Remover (-)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Quantidade"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Motivo do ajuste (Obrigatório)"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAdjustment} disabled={isAdjusting}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: INVENTÁRIOS (Novas funcionalidades)
// ────────────────────────────────────────────────────────────────────────────

function InventoryCountsTab() {
  const navigate = useNavigate();
  const { data: locations = [] } = useStockLocations();
  const [page, setPage] = useState(1);

  // Queries
  const {
    data: result,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['inventory-counts', page],
    queryFn: () =>
      invoke<{ data: InventoryCount[]; total: number; page: number; perPage: number }>(
        'get_inventory_counts_paginated',
        {
          page,
          perPage: 20,
        }
      ),
  });

  const counts = result?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" /> Histórico de Contagens
        </h2>
        <CreateInventoryDialog locations={locations} onSuccess={refetch} />
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Criação</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progresso</TableHead>
                <TableHead className="text-right">Divergências</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    {format(new Date(inv.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {locations.find((l) => l.id === inv.locationId)?.name || inv.locationId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.countType}</Badge>
                  </TableCell>
                  <TableCell>
                    <InventoryStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.itemsCounted} / {inv.totalItems}
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.discrepancies > 0 ? (
                      <span className="text-red-500 font-bold">{inv.discrepancies}</span>
                    ) : (
                      <span className="text-green-500">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/enterprise/inventory/${inv.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {counts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum inventário realizado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {result && result.total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={page * 20 >= result.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo
          </Button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ────────────────────────────────────────────────────────────────────────────

function InventoryStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'IN_PROGRESS':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Em Andamento</Badge>;
    case 'COMPLETED':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Concluído</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function CreateInventoryDialog({
  locations,
  onSuccess,
}: {
  locations: any[];
  onSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    locationId: '',
    countType: 'FULL',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.locationId) {
      toast({ title: 'Selecione um local', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: CreateInventoryCountPayload = {
        locationId: formData.locationId,
        countType: formData.countType,
        notes: formData.notes,
      };

      const res = await invoke<InventoryCount>('create_inventory_count', { data: payload });
      toast({ title: 'Inventário iniciado!' });
      setIsOpen(false);
      onSuccess();
      navigate(`/enterprise/inventory/${res.id}`);
    } catch (err) {
      toast({ title: 'Erro ao criar', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Inventário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Inventário</DialogTitle>
          <DialogDescription>Inicie uma nova contagem física de estoque.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Local de Estoque</Label>
            <Select
              value={formData.locationId}
              onValueChange={(v) => setFormData((p) => ({ ...p, locationId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contagem</Label>
            <Select
              value={formData.countType}
              onValueChange={(v) => setFormData((p) => ({ ...p, countType: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Completa (Todo o local)</SelectItem>
                <SelectItem value="SPOT">Parcial (Apenas itens selecionados)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              * Contagem Completa gera lista de todos os itens do local selecionado.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ex: Contagem de fim de mês"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Contagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
