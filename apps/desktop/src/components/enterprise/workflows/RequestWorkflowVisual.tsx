/**
 * 🔄 Request Workflow Visual - Componente de Visualização
 *
 * Exibe o fluxo visual de uma requisição de materiais com steps e status.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  FileEdit,
  Send,
  UserCheck,
  Package,
  Truck,
  CircleDot,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SEPARATING'
  | 'DELIVERED'
  | 'CANCELLED';

interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending' | 'error';
  timestamp?: string;
  actor?: string;
}

interface RequestWorkflowVisualProps {
  currentStatus: RequestStatus;
  createdAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  separatingAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  approver?: string;
  rejectionReason?: string;
  separator?: string;
  receiver?: string;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const statusOrder: RequestStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'SEPARATING', 'DELIVERED'];

function getStepStatus(
  step: RequestStatus,
  current: RequestStatus
): 'completed' | 'current' | 'pending' | 'error' {
  if (current === 'REJECTED' && step === 'PENDING') return 'error';
  if (current === 'CANCELLED') return step === 'DRAFT' ? 'error' : 'pending';

  const currentIndex = statusOrder.indexOf(current);
  const stepIndex = statusOrder.indexOf(step);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

// =============================================================================
// COMPONENTES
// =============================================================================

/**
 * Step individual do workflow
 */
const WorkflowStepItem: React.FC<{
  step: WorkflowStep;
  isLast: boolean;
}> = ({ step, isLast }) => {
  const statusStyles = {
    completed: {
      circle: 'bg-green-500 text-white',
      line: 'bg-green-500',
      label: 'text-foreground',
    },
    current: {
      circle: 'bg-primary text-white ring-4 ring-primary/20',
      line: 'bg-border',
      label: 'text-primary font-semibold',
    },
    pending: {
      circle: 'bg-muted text-muted-foreground',
      line: 'bg-border',
      label: 'text-muted-foreground',
    },
    error: {
      circle: 'bg-red-500 text-white',
      line: 'bg-red-500',
      label: 'text-red-500',
    },
  };

  const styles = statusStyles[step.status];

  return (
    <div className="flex items-start gap-3">
      {/* Linha e Círculo */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            styles.circle
          )}
        >
          {step.status === 'completed' && <Check className="w-5 h-5" />}
          {step.status === 'current' && step.icon}
          {step.status === 'pending' && step.icon}
          {step.status === 'error' && <X className="w-5 h-5" />}
        </div>
        {!isLast && <div className={cn('w-0.5 h-12 -mt-1', styles.line)} />}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 pt-2">
        <p className={cn('text-sm', styles.label)}>{step.label}</p>
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}
        {step.timestamp && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {step.timestamp}
            {step.actor && ` • ${step.actor}`}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Componente principal do workflow visual
 */
export const RequestWorkflowVisual: React.FC<RequestWorkflowVisualProps> = ({
  currentStatus,
  createdAt,
  submittedAt,
  approvedAt,
  rejectedAt,
  separatingAt,
  deliveredAt,
  cancelledAt,
  approver,
  rejectionReason,
  separator,
  receiver,
  className,
}) => {
  const steps: WorkflowStep[] = [
    {
      id: 'draft',
      label: 'Rascunho',
      description: 'Requisição criada',
      icon: <FileEdit className="w-5 h-5" />,
      status: getStepStatus('DRAFT', currentStatus),
      timestamp: createdAt,
    },
    {
      id: 'pending',
      label: currentStatus === 'REJECTED' ? 'Rejeitada' : 'Pendente',
      description:
        currentStatus === 'REJECTED'
          ? rejectionReason || 'Requisição rejeitada'
          : 'Aguardando aprovação',
      icon: <Send className="w-5 h-5" />,
      status: getStepStatus('PENDING', currentStatus),
      timestamp: currentStatus === 'REJECTED' ? rejectedAt : submittedAt,
      actor: currentStatus === 'REJECTED' ? approver : undefined,
    },
    {
      id: 'approved',
      label: 'Aprovada',
      description: 'Liberada para separação',
      icon: <UserCheck className="w-5 h-5" />,
      status: getStepStatus('APPROVED', currentStatus),
      timestamp: approvedAt,
      actor: approver,
    },
    {
      id: 'separating',
      label: 'Em Separação',
      description: 'Materiais sendo separados',
      icon: <Package className="w-5 h-5" />,
      status: getStepStatus('SEPARATING', currentStatus),
      timestamp: separatingAt,
      actor: separator,
    },
    {
      id: 'delivered',
      label: 'Entregue',
      description: 'Requisição finalizada',
      icon: <Truck className="w-5 h-5" />,
      status: getStepStatus('DELIVERED', currentStatus),
      timestamp: deliveredAt,
      actor: receiver,
    },
  ];

  // Filtrar steps para status de erro
  const visibleSteps: WorkflowStep[] =
    currentStatus === 'REJECTED'
      ? steps.slice(0, 2) // Só mostrar até "Rejeitada"
      : currentStatus === 'CANCELLED'
      ? [
          {
            id: 'cancelled',
            icon: steps[0]?.icon || <FileEdit className="w-4 h-4" />,
            actor: steps[0]?.actor,
            status: 'error' as const,
            label: 'Cancelada',
            description: 'Requisição foi cancelada',
            timestamp: cancelledAt,
          },
        ]
      : steps;

  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <CircleDot className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Fluxo da Requisição</h3>
      </div>

      <div className="space-y-0">
        {visibleSteps.map((step, index) => (
          <WorkflowStepItem key={step.id} step={step} isLast={index === visibleSteps.length - 1} />
        ))}
      </div>
    </div>
  );
};

export default RequestWorkflowVisual;
