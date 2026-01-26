/**
 * @file TransferWorkflow - Visualização do fluxo de transferências
 * @description Componente que mostra o progresso e permite ações no workflow de transferência
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { StockTransfer, TransferStatus } from '@/types/enterprise';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  Package,
  Send,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW STEPS
// ────────────────────────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  status: 'pending' | 'current' | 'completed' | 'rejected';
}

const getWorkflowSteps = (transfer: StockTransfer): WorkflowStep[] => {
  const status = transfer.status;

  const statusOrder: TransferStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'];
  const currentIndex = statusOrder.indexOf(status);

  const getStepStatus = (stepIndex: number): WorkflowStep['status'] => {
    if (status === 'REJECTED' || status === 'CANCELLED') {
      if (stepIndex <= 1) return 'completed';
      if (stepIndex === 2) return 'rejected';
      return 'pending';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return [
    {
      id: 'draft',
      label: 'Rascunho',
      description: 'Transferência criada',
      icon: <Circle className="h-5 w-5" />,
      status: getStepStatus(0),
    },
    {
      id: 'pending',
      label: 'Aguardando',
      description: 'Enviada para aprovação',
      icon: <Send className="h-5 w-5" />,
      status: getStepStatus(1),
    },
    {
      id: 'approved',
      label: 'Aprovada',
      description: 'Aprovada para envio',
      icon: <Check className="h-5 w-5" />,
      status: getStepStatus(2),
    },
    {
      id: 'in_transit',
      label: 'Em Trânsito',
      description: 'Material em transporte',
      icon: <Truck className="h-5 w-5" />,
      status: getStepStatus(3),
    },
    {
      id: 'received',
      label: 'Recebida',
      description: 'Material recebido no destino',
      icon: <Package className="h-5 w-5" />,
      status: getStepStatus(4),
    },
  ];
};

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW STEP COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface WorkflowStepItemProps {
  step: WorkflowStep;
  isLast: boolean;
}

const WorkflowStepItem: FC<WorkflowStepItemProps> = ({ step, isLast }) => {
  const getStatusStyles = () => {
    switch (step.status) {
      case 'completed':
        return {
          circle: 'bg-green-600 text-white',
          line: 'bg-green-600',
          text: 'text-green-700',
        };
      case 'current':
        return {
          circle: 'bg-blue-600 text-white ring-4 ring-blue-100',
          line: 'bg-gray-200',
          text: 'text-blue-700 font-medium',
        };
      case 'rejected':
        return {
          circle: 'bg-red-600 text-white',
          line: 'bg-gray-200',
          text: 'text-red-700',
        };
      default:
        return {
          circle: 'bg-gray-200 text-gray-400',
          line: 'bg-gray-200',
          text: 'text-gray-500',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-all',
            styles.circle
          )}
        >
          {step.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : step.status === 'rejected' ? (
            <XCircle className="h-5 w-5" />
          ) : (
            step.icon
          )}
        </div>
        {!isLast && <div className={cn('mt-2 h-12 w-0.5', styles.line)} />}
      </div>
      <div className="ml-4 pb-8">
        <p className={cn('text-sm font-medium', styles.text)}>{step.label}</p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface TransferWorkflowProps {
  transfer: StockTransfer;
  onSubmit?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onShip?: () => Promise<void>;
  onReceive?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  isLoading?: boolean;
  /** Permissões do usuário atual */
  permissions?: {
    canSubmit?: boolean;
    canApprove?: boolean;
    canReject?: boolean;
    canShip?: boolean;
    canReceive?: boolean;
    canCancel?: boolean;
  };
}

export const TransferWorkflow: FC<TransferWorkflowProps> = ({
  transfer,
  onSubmit,
  onApprove,
  onReject,
  onShip,
  onReceive,
  onCancel,
  isLoading = false,
  permissions = {},
}) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = getWorkflowSteps(transfer);
  const status = transfer.status;

  const handleAction = async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    try {
      await action();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !onReject) return;
    setIsSubmitting(true);
    try {
      await onReject(rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableActions = () => {
    const actions: ReactNode[] = [];

    // Submeter (DRAFT -> PENDING)
    if (status === 'DRAFT' && onSubmit && permissions.canSubmit) {
      actions.push(
        <Button key="submit" onClick={() => handleAction(onSubmit)} disabled={isSubmitting}>
          <Send className="mr-2 h-4 w-4" />
          Enviar para Aprovação
        </Button>
      );
    }

    // Aprovar (PENDING -> APPROVED)
    if (status === 'PENDING' && onApprove && permissions.canApprove) {
      actions.push(
        <Button
          key="approve"
          variant="default"
          onClick={() => handleAction(onApprove)}
          disabled={isSubmitting}
        >
          <Check className="mr-2 h-4 w-4" />
          Aprovar
        </Button>
      );
    }

    // Rejeitar (PENDING -> REJECTED)
    if (status === 'PENDING' && onReject && permissions.canReject) {
      actions.push(
        <Button
          key="reject"
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          Rejeitar
        </Button>
      );
    }

    // Iniciar Transporte (APPROVED -> IN_TRANSIT)
    if (status === 'APPROVED' && onShip && permissions.canShip) {
      actions.push(
        <Button key="ship" onClick={() => handleAction(onShip)} disabled={isSubmitting}>
          <Truck className="mr-2 h-4 w-4" />
          Iniciar Transporte
        </Button>
      );
    }

    // Receber (IN_TRANSIT -> RECEIVED)
    if (status === 'IN_TRANSIT' && onReceive && permissions.canReceive) {
      actions.push(
        <Button key="receive" onClick={() => handleAction(onReceive)} disabled={isSubmitting}>
          <Package className="mr-2 h-4 w-4" />
          Confirmar Recebimento
        </Button>
      );
    }

    // Cancelar (qualquer status exceto RECEIVED/CANCELLED)
    if (
      !['RECEIVED', 'CANCELLED', 'REJECTED'].includes(status) &&
      onCancel &&
      permissions.canCancel
    ) {
      actions.push(
        <Button
          key="cancel"
          variant="outline"
          onClick={() => handleAction(onCancel)}
          disabled={isSubmitting}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar Transferência
        </Button>
      );
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Fluxo da Transferência</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent>
          {/* Route Info */}
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{transfer.sourceLocation?.name || 'Origem'}</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {transfer.destinationLocation?.name || 'Destino'}
                </span>
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="mb-6">
            {steps.map((step, index) => (
              <WorkflowStepItem key={step.id} step={step} isLast={index === steps.length - 1} />
            ))}
          </div>

          {/* Rejection Reason */}
          {status === 'REJECTED' && transfer.rejectionReason && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Motivo da Rejeição:</p>
              <p className="mt-1 text-sm text-red-700">{transfer.rejectionReason}</p>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-3 border-t pt-4">
              {isLoading || isSubmitting ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </div>
              ) : (
                actions
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Transferência</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O solicitante será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// STATUS BADGE HELPER
// ────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<TransferStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
  IN_TRANSIT: { label: 'Em Trânsito', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-800' },
  RECEIVED: { label: 'Recebida', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-200 text-gray-600' },
};

const StatusBadge: FC<{ status: TransferStatus }> = ({ status }) => {
  const config = statusConfig[status];
  return <Badge className={cn('font-normal', config.color)}>{config.label}</Badge>;
};
