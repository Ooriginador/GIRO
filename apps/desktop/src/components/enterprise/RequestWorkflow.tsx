/**
 * @file RequestWorkflow - Visualização do fluxo de requisições
 * @description Componente que mostra o progresso e permite ações no workflow
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
import type { MaterialRequest, MaterialRequestStatus } from '@/types/enterprise';
import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
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

const getWorkflowSteps = (request: MaterialRequest): WorkflowStep[] => {
  const status = request.status;

  const getStepStatus = (
    stepIndex: number,
    statuses: MaterialRequestStatus[]
  ): WorkflowStep['status'] => {
    const statusOrder: MaterialRequestStatus[] = [
      'DRAFT',
      'PENDING',
      'APPROVED',
      'SEPARATING',
      'READY',
      'DELIVERED',
    ];
    const currentIndex = statusOrder.indexOf(status);

    if (status === 'REJECTED' || status === 'CANCELLED') {
      if (statuses.includes('PENDING') && stepIndex <= 1) return 'completed';
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
      description: 'Requisição criada',
      icon: <Circle className="h-5 w-5" />,
      status: getStepStatus(0, ['DRAFT']),
    },
    {
      id: 'pending',
      label: 'Aguardando',
      description: 'Enviada para aprovação',
      icon: <Clock className="h-5 w-5" />,
      status: getStepStatus(1, ['PENDING']),
    },
    {
      id: 'approved',
      label: 'Aprovada',
      description: 'Aprovada pelo gestor',
      icon: <Check className="h-5 w-5" />,
      status: getStepStatus(2, ['APPROVED', 'PARTIALLY_APPROVED']),
    },
    {
      id: 'separating',
      label: 'Separando',
      description: 'Em separação no almoxarifado',
      icon: <Package className="h-5 w-5" />,
      status: getStepStatus(3, ['SEPARATING']),
    },
    {
      id: 'delivered',
      label: 'Entregue',
      description: 'Material entregue',
      icon: <Truck className="h-5 w-5" />,
      status: getStepStatus(4, ['DELIVERED']),
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
  const ariaLabel = `${step.label}: ${step.description}${
    step.status === 'current' ? ' (etapa atual)' : ''
  }${step.status === 'completed' ? ' (concluído)' : ''}`;

  return (
    <div
      className="flex items-start"
      role="listitem"
      aria-label={ariaLabel}
      aria-current={step.status === 'current' ? 'step' : undefined}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-all',
            styles.circle
          )}
          aria-hidden="true"
        >
          {step.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : step.status === 'rejected' ? (
            <XCircle className="h-5 w-5" />
          ) : (
            step.icon
          )}
        </div>
        {!isLast && <div className={cn('mt-2 h-12 w-0.5', styles.line)} aria-hidden="true" />}
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

interface RequestWorkflowProps {
  request: MaterialRequest;
  onSubmit?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onStartSeparation?: () => Promise<void>;
  onCompleteSeparation?: () => Promise<void>;
  onDeliver?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  isLoading?: boolean;
  /** Permissões do usuário atual */
  permissions?: {
    canSubmit?: boolean;
    canApprove?: boolean;
    canReject?: boolean;
    canSeparate?: boolean;
    canDeliver?: boolean;
    canCancel?: boolean;
  };
}

export const RequestWorkflow: FC<RequestWorkflowProps> = ({
  request,
  onSubmit,
  onApprove,
  onReject,
  onStartSeparation,
  onCompleteSeparation,
  onDeliver,
  onCancel,
  isLoading = false,
  permissions = {},
}) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = getWorkflowSteps(request);
  const status = request.status;

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

    // Iniciar Separação (APPROVED -> SEPARATING)
    if (
      (status === 'APPROVED' || status === 'PARTIALLY_APPROVED') &&
      onStartSeparation &&
      permissions.canSeparate
    ) {
      actions.push(
        <Button
          key="separate"
          onClick={() => handleAction(onStartSeparation)}
          disabled={isSubmitting}
        >
          <Package className="mr-2 h-4 w-4" />
          Iniciar Separação
        </Button>
      );
    }

    // Finalizar Separação (SEPARATING -> ready for delivery)
    if (status === 'SEPARATING' && onCompleteSeparation && permissions.canSeparate) {
      actions.push(
        <Button
          key="complete-separation"
          onClick={() => handleAction(onCompleteSeparation)}
          disabled={isSubmitting}
        >
          <Check className="mr-2 h-4 w-4" />
          Separação Concluída
        </Button>
      );
    }

    // Entregar (SEPARATING -> DELIVERED or READY -> DELIVERED)
    if ((status === 'SEPARATING' || status === 'READY') && onDeliver && permissions.canDeliver) {
      actions.push(
        <Button key="deliver" onClick={() => handleAction(onDeliver)} disabled={isSubmitting}>
          <Truck className="mr-2 h-4 w-4" />
          Registrar Entrega
        </Button>
      );
    }

    // Cancelar (qualquer status exceto DELIVERED/CANCELLED)
    if (
      !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(status) &&
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
          Cancelar Requisição
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
            <CardTitle className="text-lg">Fluxo da Requisição</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent>
          {/* Workflow Steps */}
          <nav aria-label="Etapas do fluxo de requisição" className="mb-6">
            <ol role="list" className="list-none p-0 m-0">
              {steps.map((step, index) => (
                <WorkflowStepItem key={step.id} step={step} isLast={index === steps.length - 1} />
              ))}
            </ol>
          </nav>

          {/* Rejection Reason */}
          {status === 'REJECTED' && request.rejectionReason && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Motivo da Rejeição:</p>
              <p className="mt-1 text-sm text-red-700">{request.rejectionReason}</p>
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
            <DialogTitle>Rejeitar Requisição</DialogTitle>
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

const statusConfig: Record<MaterialRequestStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  PARTIALLY_APPROVED: { label: 'Parcial', color: 'bg-blue-100 text-blue-800' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
  SEPARATING: { label: 'Separando', color: 'bg-purple-100 text-purple-800' },
  READY: { label: 'Pronta', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-200 text-gray-600' },
};

const StatusBadge: FC<{ status: MaterialRequestStatus }> = ({ status }) => {
  const config = statusConfig[status];
  return <Badge className={cn('font-normal', config.color)}>{config.label}</Badge>;
};
