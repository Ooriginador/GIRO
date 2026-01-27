/**
 * @file PendingOrdersPage - Página de Pedidos Pendentes
 * @description Tela para o caixa visualizar e finalizar pedidos criados pelos atendentes
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getWaitingOrders, updateHeldSaleStatus, deleteHeldSale } from '@/lib/tauri';
import { usePDVStore } from '@/stores/pdv-store';
import type { HeldSale } from '@/types';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const PendingOrdersPage: FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<HeldSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { resumeSale } = usePDVStore();

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const waitingOrders = await getWaitingOrders();
      setOrders(waitingOrders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos pendentes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleProcessOrder = async (order: HeldSale) => {
    setProcessingId(order.id);
    try {
      // Marcar como em processamento
      await updateHeldSaleStatus(order.id, 'PROCESSING');
      // Restaurar no PDV
      await resumeSale(order.id);
      toast.success(`Pedido de ${order.employeeName || 'Atendente'} carregado no PDV`);
      navigate('/pdv');
    } catch (error) {
      console.error('Erro ao processar pedido:', error);
      toast.error('Erro ao processar pedido');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;

    try {
      await updateHeldSaleStatus(orderId, 'CANCELLED');
      await deleteHeldSale(orderId);
      toast.success('Pedido cancelado');
      loadOrders();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <Clock className="mr-1 h-3 w-3" />
            Aguardando
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="border-green-500 text-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Concluído
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="border-red-500 text-red-600">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos Pendentes</h1>
          <p className="text-muted-foreground">Pedidos aguardando finalização de pagamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOrders} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => navigate('/pdv')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ir para PDV
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {orders.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="flex h-full flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum pedido pendente</h3>
            <p className="text-muted-foreground">
              Os pedidos criados pelos atendentes aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="flex-1">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card key={order.id} className="relative overflow-hidden">
                {/* Badge de status */}
                <div className="absolute right-2 top-2">{getStatusBadge(order.status)}</div>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-600" />
                    <CardTitle className="text-base">{order.employeeName || 'Atendente'}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Resumo de itens */}
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-sm font-medium">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    </p>
                    <div className="mt-1 max-h-20 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate">{item.productName}</span>
                          <span>x{item.quantity}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-center">+{order.items.length - 3} mais...</p>
                      )}
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.discountValue > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(order.discountValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-lg text-primary">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Notas */}
                  {order.notes && (
                    <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                      <AlertCircle className="mr-1 inline h-3 w-3" />
                      {order.notes}
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={processingId === order.id}
                      onClick={() => handleProcessOrder(order)}
                    >
                      {processingId === order.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Processar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer com contador */}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground">
        <Package className="h-4 w-4" />
        <span>
          {orders.length} {orders.length === 1 ? 'pedido pendente' : 'pedidos pendentes'}
        </span>
        {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
      </div>
    </div>
  );
};

export default PendingOrdersPage;
