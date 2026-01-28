import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  ArrowLeft,
  Edit,
  Printer,
  Truck,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Input } from '@/components/ui/input';
import { TransferWorkflow } from '@/components/enterprise';
import { useCanDo } from '@/hooks/useEnterprisePermission';
import { toast } from '@/hooks/use-toast';
import type { StockTransfer, StockTransferItem } from '@/types/enterprise';

// Status badge colors
const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  BAIXA: 'bg-gray-100 text-gray-700',
  NORMAL: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-orange-100 text-orange-700',
  URGENTE: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  IN_TRANSIT: 'Em Trânsito',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canDo = useCanDo();

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [items, setItems] = useState<StockTransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Dialog State
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'SHIP' | 'RECEIVE' | null>(null);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  const loadTransfer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Load transfer from backend
      const data = await invoke<StockTransfer | null>('get_stock_transfer_by_id', { id });
      if (data) {
        setTransfer(data);
        // Items are embedded in the transfer response from backend
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load transfer:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTransfer();
  }, [loadTransfer]);

  async function handleStatusChange(newStatus: string, reason?: string) {
    if (!transfer) return;

    // Intercept SHIP and RECEIVE to show dialog
    if (newStatus === 'IN_TRANSIT') {
      setCurrentAction('SHIP');
      const initialQtys: Record<string, number> = {};
      items.forEach((item) => {
        initialQtys[item.id] = item.requestedQty || item.quantity;
      });
      setItemQuantities(initialQtys);
      setActionDialogOpen(true);
      return;
    }

    if (newStatus === 'RECEIVED') {
      setCurrentAction('RECEIVE');
      const initialQtys: Record<string, number> = {};
      items.forEach((item) => {
        // Default receive amount is what was shipped, or requested if not shipped yet
        initialQtys[item.id] = item.shippedQty || item.requestedQty || item.quantity;
      });
      setItemQuantities(initialQtys);
      setActionDialogOpen(true);
      return;
    }

    try {
      // Map status to appropriate command
      switch (newStatus) {
        case 'APPROVED':
          await invoke('approve_stock_transfer', { id: transfer.id });
          break;
        case 'CANCELLED':
          await invoke('cancel_stock_transfer', { transferId: transfer.id });
          break;
        case 'REJECTED':
          await invoke('reject_stock_transfer', { id: transfer.id, reason: reason || '' });
          break;
        default:
          console.warn('Unknown status:', newStatus);
      }
      toast({
        title: 'Status atualizado',
        description: `Transferência atualizada para ${statusLabels[newStatus] || newStatus}`,
      });
      await loadTransfer();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: String(error),
        variant: 'destructive',
      });
    }
  }

  async function handleConfirmAction() {
    if (!transfer || !currentAction) return;

    try {
      if (currentAction === 'SHIP') {
        const shippedItems = Object.entries(itemQuantities).map(([itemId, qty]) => ({
          itemId,
          shippedQty: Number(qty),
        }));
        await invoke('ship_stock_transfer', {
          transferId: transfer.id,
          shippedItems,
        });
      } else if (currentAction === 'RECEIVE') {
        const receivedItems = Object.entries(itemQuantities).map(([itemId, qty]) => ({
          itemId,
          receivedQty: Number(qty),
        }));
        await invoke('receive_stock_transfer', {
          transferId: transfer.id,
          receivedItems,
        });
      }

      setActionDialogOpen(false);
      toast({ title: 'Sucesso', description: 'Operação realizada com sucesso' });
      await loadTransfer();
    } catch (error) {
      toast({ title: 'Erro', description: String(error), variant: 'destructive' });
    }
  }

  async function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Transferência não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/enterprise/transfers')}>
          Voltar para Transferências
        </Button>
      </div>
    );
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalReceived = items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enterprise/transfers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{transfer.code}</h1>
              <Badge className={statusColors[transfer.status]}>
                {statusLabels[transfer.status]}
              </Badge>
              <Badge className={priorityColors[transfer.priority || 'NORMAL']}>
                {transfer.priority || 'NORMAL'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Criada em {new Date(transfer.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {transfer.status === 'DRAFT' && (
            <Button variant="outline" onClick={() => navigate(`/enterprise/transfers/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Card */}
          <Card>
            <CardHeader>
              <CardTitle>Rota da Transferência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Origem</p>
                      <p className="font-semibold text-lg">
                        {transfer.sourceLocation?.name || transfer.originLocation?.name}
                      </p>
                      <Badge variant="outline">
                        {transfer.sourceLocation?.type || transfer.originLocation?.type}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center px-6">
                  <Truck className="h-6 w-6 text-muted-foreground" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-2" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 justify-end">
                    <div>
                      <p className="text-sm text-muted-foreground text-right">Destino</p>
                      <p className="font-semibold text-lg text-right">
                        {transfer.destinationLocation?.name}
                      </p>
                      <Badge variant="outline">{transfer.destinationLocation?.type}</Badge>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{transfer.requester?.name}</p>
                  </div>
                </div>

                {transfer.shipper && (
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expedidor</p>
                      <p className="font-medium">{transfer.shipper.name}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Envio</p>
                    <p className="font-medium">
                      {transfer.shippedAt
                        ? new Date(transfer.shippedAt).toLocaleDateString('pt-BR')
                        : 'Não enviado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Recebimento</p>
                    <p className="font-medium">
                      {transfer.receivedAt
                        ? new Date(transfer.receivedAt).toLocaleDateString('pt-BR')
                        : 'Não recebido'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Transferência</CardTitle>
              <CardDescription>
                {items.length} {items.length === 1 ? 'item' : 'itens'} | Total: {totalItems}{' '}
                unidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-center">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const diff = (item.receivedQty || 0) - item.quantity;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.product?.internalCode || item.product?.code}
                        </TableCell>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.product?.unit}
                        </TableCell>
                        <TableCell className="text-right">{item.receivedQty || '-'}</TableCell>
                        <TableCell className="text-center">
                          {transfer.status === 'RECEIVED' ? (
                            <span
                              className={
                                diff === 0
                                  ? 'text-green-600'
                                  : diff < 0
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }
                            >
                              {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {transfer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{transfer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Workflow Card */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <TransferWorkflow
                transfer={transfer}
                onApprove={canDo.approveTransfer ? () => handleStatusChange('APPROVED') : undefined}
                onReject={
                  canDo.approveTransfer
                    ? (reason: string) => handleStatusChange('CANCELLED', reason)
                    : undefined
                }
                onShip={canDo.shipTransfer ? () => handleStatusChange('IN_TRANSIT') : undefined}
                onReceive={canDo.receiveTransfer ? () => handleStatusChange('RECEIVED') : undefined}
              />
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Itens</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qtd. Enviada</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qtd. Recebida</span>
                <span className="font-medium">{totalReceived || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {transfer.status === 'RECEIVED'
                    ? '100%'
                    : transfer.status === 'IN_TRANSIT'
                    ? '50%'
                    : '0%'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {transfer.shippedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Enviada</p>
                      <p className="text-muted-foreground">
                        {new Date(transfer.shippedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Transferência criada</p>
                    <p className="text-muted-foreground">
                      {new Date(transfer.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {currentAction === 'SHIP' ? 'Confirmar Envio' : 'Confirmar Recebimento'}
            </DialogTitle>
            <DialogDescription>
              {currentAction === 'SHIP'
                ? 'Confirme as quantidades enviadas para cada item.'
                : 'Confirme as quantidades recebidas para cada item.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Solicitado</TableHead>
                  {currentAction === 'RECEIVE' && (
                    <TableHead className="text-right">Enviado</TableHead>
                  )}
                  <TableHead className="text-right w-[150px]">
                    {currentAction === 'SHIP' ? 'Qtd. Envio' : 'Qtd. Recebimento'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {item.productName || item.product?.name || item.productId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.productCode || item.product?.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.requestedQty || item.quantity}
                    </TableCell>
                    {currentAction === 'RECEIVE' && (
                      <TableCell className="text-right">{item.shippedQty || '-'}</TableCell>
                    )}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        value={itemQuantities[item.id] ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setItemQuantities((prev) => ({
                            ...prev,
                            [item.id]: isNaN(val) ? 0 : val,
                          }));
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAction}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
