/**
 * @file RequestApprovalModal - Modal de Aprovação/Rejeição de Requisição
 * @description Modal para aprovar ou rejeitar requisições de material
 */

import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useApproveRequest,
  useApproveRequestWithItems,
  useRejectRequest,
} from '@/hooks/enterprise/useMaterialRequests';
import { useToast } from '@/hooks/use-toast';
import type { MaterialRequestWithDetails, MaterialRequestItem } from '@/lib/tauri';
import { Check, Loader2, X, AlertTriangle } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface ApprovedItem {
  itemId: string;
  requestedQty: number;
  approvedQty: number;
}

interface RequestApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequestWithDetails | null;
  items: MaterialRequestItem[];
  onSuccess?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const RequestApprovalModal: FC<RequestApprovalModalProps> = ({
  open,
  onOpenChange,
  request,
  items,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([]);

  // Mutations
  const approveRequest = useApproveRequest();
  const approveRequestWithItems = useApproveRequestWithItems();
  const rejectRequest = useRejectRequest();

  const isLoading =
    approveRequest.isPending || approveRequestWithItems.isPending || rejectRequest.isPending;

  // Initialize approved items when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && items.length > 0) {
      setApprovedItems(
        items.map((item) => ({
          itemId: item.id,
          requestedQty: item.requestedQty,
          approvedQty: item.requestedQty, // Default to full approval
        }))
      );
      setRejectionReason('');
      setActiveTab('approve');
    }
    onOpenChange(newOpen);
  };

  const handleApprovedQtyChange = (itemId: string, qty: number) => {
    setApprovedItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? { ...item, approvedQty: Math.max(0, Math.min(qty, item.requestedQty)) }
          : item
      )
    );
  };

  const handleApproveAll = () => {
    setApprovedItems((prev) => prev.map((item) => ({ ...item, approvedQty: item.requestedQty })));
  };

  const handleRejectAll = () => {
    setApprovedItems((prev) => prev.map((item) => ({ ...item, approvedQty: 0 })));
  };

  const handleApprove = async () => {
    if (!request) return;

    try {
      // Verifica se é aprovação parcial (algum item com qty diferente do solicitado)
      const hasPartialApproval = approvedItems.some(
        (item) => item.approvedQty !== item.requestedQty
      );

      if (hasPartialApproval) {
        // Usa novo endpoint com quantidades por item
        await approveRequestWithItems.mutateAsync({
          id: request.id,
          items: approvedItems.map((item) => ({
            itemId: item.itemId,
            approvedQty: item.approvedQty,
          })),
        });
      } else {
        // Aprovação total - usa endpoint simples
        await approveRequest.mutateAsync(request.id);
      }

      toast({
        title: 'Requisição aprovada!',
        description: `A requisição ${request.code} foi aprovada${
          hasPartialApproval ? ' parcialmente' : ''
        }.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erro ao aprovar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!request) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da rejeição.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await rejectRequest.mutateAsync({
        id: request.id,
        reason: rejectionReason,
      });

      toast({
        title: 'Requisição rejeitada',
        description: `A requisição ${request.code} foi rejeitada.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erro ao rejeitar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const totalRequested = approvedItems.reduce((sum, i) => sum + i.requestedQty, 0);
  const totalApproved = approvedItems.reduce((sum, i) => sum + i.approvedQty, 0);
  const isPartialApproval = totalApproved > 0 && totalApproved < totalRequested;

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Analisar Requisição</DialogTitle>
          <DialogDescription>
            Requisição <strong>{request.code}</strong> de <strong>{request.requesterName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'approve' | 'reject')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="approve" className="gap-2">
              <Check className="h-4 w-4" />
              Aprovar
            </TabsTrigger>
            <TabsTrigger value="reject" className="gap-2">
              <X className="h-4 w-4" />
              Rejeitar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approve" className="space-y-4 mt-4">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Ajuste as quantidades aprovadas para cada item:
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleApproveAll}>
                  Aprovar Tudo
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleRejectAll}>
                  Zerar Tudo
                </Button>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="w-[100px] text-right">Solicitado</TableHead>
                    <TableHead className="w-[140px] text-right">Aprovado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const approved = approvedItems.find((a) => a.itemId === item.id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">{item.productUnit}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.requestedQty}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            max={item.requestedQty}
                            value={approved?.approvedQty ?? item.requestedQty}
                            onChange={(e) =>
                              handleApprovedQtyChange(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 text-right ml-auto"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                {isPartialApproval && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                <span className="text-sm">
                  {isPartialApproval ? 'Aprovação parcial' : 'Aprovação total'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Total: {totalApproved} / {totalRequested}
                </span>
                {isPartialApproval && (
                  <Badge variant="outline" className="bg-yellow-50">
                    {Math.round((totalApproved / totalRequested) * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reject" className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Atenção</p>
                <p className="text-sm text-muted-foreground">
                  Ao rejeitar a requisição, todos os itens serão negados e o solicitante será
                  notificado.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Informe o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-sm text-muted-foreground">
                Este motivo será enviado ao solicitante.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          {activeTab === 'approve' ? (
            <Button onClick={handleApprove} disabled={isLoading || totalApproved === 0}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isPartialApproval ? 'Aprovar Parcialmente' : 'Aprovar Requisição'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Rejeitar Requisição
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestApprovalModal;
