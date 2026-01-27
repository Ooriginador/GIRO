/**
 * 🔍 ServiceOrderDetails - Detalhes Completos de Ordem de Serviço
 *
 * Visualização detalhada com:
 * - Informações do cliente e veículo
 * - Lista de itens (peças e serviços)
 * - Totais e pagamento
 * - Ações de workflow
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  ServiceOrderUtils,
  useServiceOrderDetails,
  useServiceOrderItems,
  useServiceOrders,
  type ServiceOrderStatus,
  type ServiceOrderItem,
} from '@/hooks/useServiceOrders';
import { invoke } from '@/lib/tauri';
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from '@/lib/utils';
import { useCompany } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  FileText,
  Package,
  Phone,
  Play,
  Plus,
  Printer,
  Send,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { ServiceOrderStatusBadge } from './ServiceOrderList';
import { ServiceOrderItemDialog } from './ServiceOrderItemDialog';
import { PaymentModal, type SplitPayment } from '../pdv/PaymentModal';
import { VehicleHistoryPopover } from './VehicleHistoryPopover';
import { PaymentMethod } from '@/stores/pdv-store';
import type { CreateSalePayment } from '@/types';

interface ServiceOrderDetailsProps {
  orderId: string;
  onEdit?: () => void;
  onClose?: () => void;
}

export function ServiceOrderDetails({ orderId, onEdit, onClose }: ServiceOrderDetailsProps) {
  const { toast } = useToast();
  const { company } = useCompany();
  const { employee, currentSession } = useAuthStore();
  const { orderDetails, isLoading, refetch } = useServiceOrderDetails(orderId);
  const { items, removeItem } = useServiceOrderItems(orderId);
  const { startOrder, completeOrder, deliverOrder, cancelOrder, updateOrder } = useServiceOrders();

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'start' | 'complete' | 'deliver' | 'cancel' | 'approve' | null;
  }>({ open: false, type: null });
  const [itemDialogState, setItemDialogState] = useState<{
    open: boolean;
    item?: ServiceOrderItem | null;
  }>({ open: false, item: null });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Ordem não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  const {
    order,
    customer_name,
    customer_phone,
    vehicle_display_name,
    vehicle_plate,
    employee_name,
  } = orderDetails;

  const handleStartOrder = async () => {
    try {
      await startOrder.mutateAsync(orderId);
      toast({
        title: 'Ordem iniciada',
        description: 'Status alterado para "Em Andamento"',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erro ao iniciar ordem',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleCompleteOrder = async () => {
    try {
      await completeOrder.mutateAsync({ id: orderId, diagnosis: order.diagnosis });
      toast({
        title: 'Ordem concluída',
        description: 'Status alterado para "Concluída"',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erro ao concluir ordem',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDeliverOrder = async (data: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    splitPayments?: SplitPayment[];
  }) => {
    if (!employee || !currentSession) {
      toast({
        title: 'Erro de sessão',
        description: 'Usuário não autenticado ou caixa fechado',
        variant: 'destructive',
      });
      return;
    }

    // Preparar array de pagamentos
    const payments: CreateSalePayment[] =
      data.splitPayments && data.splitPayments.length > 0
        ? data.splitPayments.map((p) => ({ method: p.method, amount: p.amount }))
        : [{ method: data.paymentMethod, amount: data.amountPaid }];

    try {
      await deliverOrder.mutateAsync({
        id: orderId,
        payments,
        amountPaid: data.amountPaid,
        sessionId: currentSession.id,
      });
      toast({
        title: 'Ordem entregue',
        description: 'Status alterado para "Entregue" e pagamento registrado',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erro ao entregar ordem',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleCancelOrder = async () => {
    try {
      await cancelOrder.mutateAsync({ id: orderId });
      toast({
        title: 'Ordem cancelada',
        description: 'A ordem foi cancelada',
        variant: 'destructive',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erro ao cancelar ordem',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleApproveOrder = async () => {
    try {
      await updateOrder.mutateAsync({ id: orderId, input: { status: 'OPEN' } });
      toast({
        title: 'Orçamento aprovado',
        description: 'Status alterado para "Aberta" e estoque consumido',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erro ao aprovar',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast({
        title: 'Item removido',
        description: 'Item removido da ordem',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erro ao remover item',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handlePrintOrder = async () => {
    if (!orderDetails) return;

    try {
      const receiptData = {
        companyName: company.name,
        companyAddress: company.address || '',
        companyCnpj: company.cnpj,
        companyPhone: company.phone,
        orderNumber: order.order_number,
        dateTime: formatDateTime(order.created_at),
        status: ServiceOrderUtils.getStatusLabel(order.status as ServiceOrderStatus),
        mechanicName: employee_name,
        customerName: customer_name,
        customerPhone: customer_phone,
        vehicleDisplayName: vehicle_display_name,
        vehiclePlate: vehicle_plate,
        vehicleKm: order.vehicle_km,
        symptoms: order.symptoms,
        items: items.map((item) => ({
          code: '',
          name: item.description,
          quantity: item.quantity,
          unit: item.item_type === 'PART' ? 'UN' : 'SV',
          unitPrice: item.unit_price,
          total: item.total,
        })),
        laborCost: order.labor_cost,
        partsCost: order.parts_cost,
        discount: order.discount,
        total: order.total,
        warrantyDays: order.warranty_days,
        notes: order.notes,
      };

      await invoke('print_service_order', { os: receiptData });
      toast({
        title: 'Impressão enviada',
        description: 'A ordem de serviço está sendo impressa',
      });
    } catch (error) {
      toast({
        title: 'Erro na impressão',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const canEdit = ServiceOrderUtils.canEdit(order.status as ServiceOrderStatus);
  const canStart = ServiceOrderUtils.canStart(order.status as ServiceOrderStatus);
  const canComplete = ServiceOrderUtils.canComplete(order.status as ServiceOrderStatus);
  const canDeliver = ServiceOrderUtils.canDeliver(order.status as ServiceOrderStatus);
  const canCancel = ServiceOrderUtils.canCancel(order.status as ServiceOrderStatus);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl font-mono">
                  {ServiceOrderUtils.formatOrderNumber(order.order_number)}
                </CardTitle>
                <ServiceOrderStatusBadge status={order.status as ServiceOrderStatus} />
                {order.is_paid && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Pago
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Criada em {formatDateTime(order.created_at)} • {employee_name}
              </p>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrintOrder}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-medium">{customer_name}</p>
              {customer_phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer_phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Veículo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4" />
                Veículo
              </CardTitle>
              <VehicleHistoryPopover vehicleId={order.customer_vehicle_id} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-medium">{vehicle_display_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {vehicle_plate && <span className="font-mono">{vehicle_plate}</span>}
                {orderDetails.vehicle_color && (
                  <>
                    <span>•</span>
                    <span>{orderDetails.vehicle_color}</span>
                  </>
                )}
              </div>
              {order.vehicle_km && (
                <p className="text-sm text-muted-foreground mt-1">
                  KM: {order.vehicle_km.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prazos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.scheduled_date && (
              <div>
                <p className="text-muted-foreground">Agendado para</p>
                <p className="font-medium">{formatDate(order.scheduled_date)}</p>
              </div>
            )}
            {order.started_at && (
              <div>
                <p className="text-muted-foreground">Iniciado em</p>
                <p className="font-medium">{formatDateTime(order.started_at)}</p>
              </div>
            )}
            {order.completed_at && (
              <div>
                <p className="text-muted-foreground">Concluído em</p>
                <p className="font-medium">{formatDateTime(order.completed_at)}</p>
              </div>
            )}
            {order.warranty_until && (
              <div>
                <p className="text-muted-foreground">Garantia até</p>
                <p className="font-medium">{formatDate(order.warranty_until)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sintomas e Diagnóstico */}
      {(order.symptoms || order.diagnosis) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.symptoms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Sintomas Relatados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.symptoms}</p>
              </CardContent>
            </Card>
          )}
          {order.diagnosis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.diagnosis}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Itens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens
            </CardTitle>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItemDialogState({ open: true, item: null })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!items || items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item adicionado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.item_type === 'PART' ? 'default' : 'secondary'}>
                        {ServiceOrderUtils.getItemTypeLabel(item.item_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.description}</p>
                          {item.item_type === 'PART' && typeof item.current_stock === 'number' && (
                            <>
                              {item.current_stock < item.quantity ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Estoque insuficiente: {item.current_stock} disponível
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                typeof item.min_stock === 'number' &&
                                item.current_stock <= item.min_stock && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Estoque baixo: {item.current_stock} (Mín: {item.min_stock})
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )
                              )}
                            </>
                          )}
                        </div>
                        {item.warranty_days && (
                          <p className="text-xs text-muted-foreground">
                            Garantia: {item.warranty_days} dias
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setItemDialogState({ open: true, item })}
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mão de Obra</span>
            <span className="font-medium">{formatCurrency(order.labor_cost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Peças</span>
            <span className="font-medium">{formatCurrency(order.parts_cost)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Desconto</span>
              <span className="font-medium text-destructive">
                -{formatCurrency(order.discount)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
          {order.payment_method && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Forma de Pagamento</span>
              <span className="font-medium">{order.payment_method}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      {(order.notes || order.internal_notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
          {order.internal_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notas Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {order.internal_notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Ações */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {order.status === 'QUOTE' && (
              <Button onClick={() => setActionDialog({ open: true, type: 'approve' })}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar Orçamento
              </Button>
            )}
            {canStart && (
              <Button onClick={() => setActionDialog({ open: true, type: 'start' })}>
                <Play className="h-4 w-4 mr-2" />
                Iniciar Serviço
              </Button>
            )}
            {canComplete && (
              <Button onClick={() => setActionDialog({ open: true, type: 'complete' })}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Concluída
              </Button>
            )}
            {canDeliver && (
              <Button onClick={() => setActionDialog({ open: true, type: 'deliver' })}>
                <Send className="h-4 w-4 mr-2" />
                Entregar ao Cliente
              </Button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                onClick={() => setActionDialog({ open: true, type: 'cancel' })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Ordem
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ open, type: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'start' && 'Iniciar Serviço?'}
              {actionDialog.type === 'complete' && 'Marcar como Concluída?'}
              {actionDialog.type === 'deliver' && 'Entregar ao Cliente?'}
              {actionDialog.type === 'cancel' && 'Cancelar Ordem?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'start' && 'O serviço será marcado como "Em Andamento".'}
              {actionDialog.type === 'complete' &&
                'O serviço será marcado como "Concluído" e a garantia será ativada.'}
              {actionDialog.type === 'deliver' &&
                'A ordem será entregue ao cliente e marcada como paga.'}
              {actionDialog.type === 'cancel' &&
                'Esta ação não pode ser desfeita. A ordem será cancelada.'}
              {actionDialog.type === 'approve' &&
                'O orçamento será aprovado e os produtos serão debitados do estoque.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog.type === 'start') handleStartOrder();
                if (actionDialog.type === 'complete') handleCompleteOrder();
                if (actionDialog.type === 'deliver') setPaymentModalOpen(true);
                if (actionDialog.type === 'cancel') handleCancelOrder();
                if (actionDialog.type === 'approve') handleApproveOrder();
                setActionDialog({ open: false, type: null });
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ServiceOrderItemDialog
        open={itemDialogState.open}
        onOpenChange={(open) => setItemDialogState({ open, item: itemDialogState.item })}
        orderId={orderId}
        orderStatus={order.status}
        itemToEdit={itemDialogState.item}
      />

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={order.total}
        onFinalize={handleDeliverOrder}
      />
    </div>
  );
}
