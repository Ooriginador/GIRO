import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { invoke } from '@tauri-apps/api/core'; // TODO: Uncomment when backend is ready
import {
  ArrowLeft,
  Edit,
  Printer,
  Package,
  Calendar,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
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
import { RequestWorkflow } from '@/components/enterprise';
import { useCanDo } from '@/hooks/useEnterprisePermission';
import type { MaterialRequest, MaterialRequestItem } from '@/types/enterprise';

// Status badge colors
const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SEPARATING: 'bg-purple-100 text-purple-800',
  READY: 'bg-teal-100 text-teal-800',
  DELIVERED: 'bg-green-100 text-green-800',
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
  SEPARATING: 'Em Separação',
  READY: 'Pronta',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canDo = useCanDo();

  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [items, setItems] = useState<MaterialRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // TODO: Replace with actual Tauri invoke
      // const data = await invoke<MaterialRequest>('get_material_request', { id });
      // const itemsData = await invoke<MaterialRequestItem[]>('get_material_request_items', { requestId: id });

      // Mock data for development
      const mockRequest: MaterialRequest = {
        id,
        code: 'REQ-2026-0001',
        contractId: 'contract-1',
        workFrontId: 'wf-1',
        activityId: 'act-1',
        sourceLocationId: 'loc-1',
        requesterId: 'user-1',
        status: 'PENDING',
        priority: 'HIGH',
        requestedAt: new Date().toISOString(),
        neededByDate: new Date().toISOString(),
        notes: 'Materiais necessários para a próxima fase da obra',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Extended info
        contract: {
          id: 'contract-1',
          code: 'OBR-2026-001',
          name: 'Obra Nova Industrial',
          clientName: 'Cliente Industrial',
          startDate: new Date().toISOString(),
          costCenter: 'CC-001',
          status: 'ACTIVE',
          managerId: 'manager-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workFront: {
          id: 'wf-1',
          code: 'FR-001',
          name: 'Frente A - Fundação',
          contractId: 'contract-1',
          supervisorId: 'user-2',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activity: {
          id: 'act-1',
          code: 'AT-003',
          name: 'Concretagem',
          workFrontId: 'wf-1',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requester: { id: 'user-1', name: 'João Silva', role: 'REQUESTER' },
      };

      const mockItems: MaterialRequestItem[] = [
        {
          id: 'item-1',
          requestId: id,
          productId: 'prod-1',
          requestedQuantity: 100,
          approvedQuantity: 100,
          deliveredQuantity: 0,
        },
        {
          id: 'item-2',
          requestId: id,
          productId: 'prod-2',
          requestedQuantity: 50,
          approvedQuantity: 50,
          deliveredQuantity: 0,
        },
        {
          id: 'item-3',
          requestId: id,
          productId: 'prod-3',
          requestedQuantity: 200,
          approvedQuantity: 200,
          deliveredQuantity: 0,
        },
      ];

      setRequest(mockRequest);
      setItems(mockItems);
    } catch (error) {
      console.error('Failed to load request:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  async function handleStatusChange(newStatus: string, reason?: string) {
    if (!request) return;
    try {
      // TODO: Replace with actual Tauri invoke
      // await invoke('update_material_request_status', { id: request.id, status: newStatus, reason });
      console.log('Status changed to:', newStatus, reason ? `Reason: ${reason}` : '');
      await loadRequest();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function handlePrint() {
    // TODO: Implement print functionality
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Requisição não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/enterprise/requests')}>
          Voltar para Requisições
        </Button>
      </div>
    );
  }

  const totalItems = items.reduce((sum, item) => sum + item.requestedQuantity, 0);
  const totalApproved = items.reduce((sum, item) => sum + (item.approvedQuantity ?? 0), 0);
  const totalDelivered = items.reduce((sum, item) => sum + (item.deliveredQuantity ?? 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/enterprise/requests')}
            aria-label="Voltar para requisições"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{request.code}</h1>
              <Badge
                className={statusColors[request.status]}
                role="status"
                aria-label={`Status: ${statusLabels[request.status]}`}
              >
                {statusLabels[request.status]}
              </Badge>
              <Badge
                className={priorityColors[request.priority]}
                role="status"
                aria-label={`Prioridade: ${request.priority}`}
              >
                {request.priority}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Criada em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {request.status === 'DRAFT' && (
            <Button variant="outline" onClick={() => navigate(`/enterprise/requests/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
              Editar
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Requisição</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contrato</p>
                    <p className="font-medium">{request.contract?.name}</p>
                    <p className="text-sm text-muted-foreground">{request.contract?.code}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Frente de Trabalho</p>
                    <p className="font-medium">{request.workFront?.name}</p>
                    <p className="text-sm text-muted-foreground">{request.workFront?.code}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{request.requester?.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Necessidade</p>
                    <p className="font-medium">
                      {request.neededByDate
                        ? new Date(request.neededByDate).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Atividade</p>
                    <p className="font-medium">{request.activity?.name || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Requisição</CardTitle>
              <CardDescription>
                {items.length} {items.length === 1 ? 'item' : 'itens'} | Total: {totalItems}{' '}
                unidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table aria-label="Itens da requisição de material">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd. Solicitada</TableHead>
                    <TableHead className="text-right">Separada</TableHead>
                    <TableHead className="text-right">Entregue</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const deliveredQty = item.deliveredQuantity ?? 0;
                    const approvedQty = item.approvedQuantity ?? 0;
                    const isComplete = deliveredQty >= item.requestedQuantity;
                    const isPartial = approvedQty > 0 || deliveredQty > 0;
                    const statusText = isComplete
                      ? 'Entregue completamente'
                      : isPartial
                      ? 'Parcialmente entregue'
                      : 'Pendente';

                    return (
                      <TableRow
                        key={item.id}
                        aria-label={`${item.product?.name ?? 'Produto'}, ${
                          item.requestedQuantity
                        } solicitado, ${statusText}`}
                      >
                        <TableCell className="font-mono text-sm">{item.productId}</TableCell>
                        <TableCell>{item.product?.name ?? 'Produto'}</TableCell>
                        <TableCell className="text-right">{item.requestedQuantity}</TableCell>
                        <TableCell className="text-right">{approvedQty}</TableCell>
                        <TableCell className="text-right">{deliveredQty}</TableCell>
                        <TableCell className="text-center">
                          {isComplete ? (
                            <CheckCircle
                              className="h-5 w-5 text-green-500 inline"
                              aria-label="Completo"
                            />
                          ) : isPartial ? (
                            <Badge
                              variant="outline"
                              className="text-yellow-600"
                              role="status"
                              aria-label="Parcialmente entregue"
                            >
                              Parcial
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-gray-500"
                              role="status"
                              aria-label="Pendente"
                            >
                              Pendente
                            </Badge>
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
          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
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
              <RequestWorkflow
                request={request}
                onApprove={canDo.approveRequest ? () => handleStatusChange('APPROVED') : undefined}
                onReject={
                  canDo.approveRequest
                    ? (reason: string) => handleStatusChange('CANCELLED', reason)
                    : undefined
                }
                onStartSeparation={
                  canDo.separateRequest ? () => handleStatusChange('SEPARATING') : undefined
                }
                onCompleteSeparation={
                  canDo.separateRequest ? () => handleStatusChange('READY') : undefined
                }
                onDeliver={canDo.deliverRequest ? () => handleStatusChange('DELIVERED') : undefined}
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
                <span className="text-muted-foreground">Qtd. Solicitada</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qtd. Aprovada</span>
                <span className="font-medium">{totalApproved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qtd. Entregue</span>
                <span className="font-medium">{totalDelivered}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {totalItems > 0 ? Math.round((totalDelivered / totalItems) * 100) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* History Card (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Requisição criada</p>
                    <p className="text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
