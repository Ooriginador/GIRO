/**
 * 🔄 Transfer Workflow Visual - Componente de Visualização
 *
 * Exibe o fluxo visual de uma transferência de materiais entre localizações.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  FileEdit,
  ArrowRightLeft,
  PackageSearch,
  PackageCheck,
  MapPin,
  CircleDot,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

type TransferStatus = 'DRAFT' | 'PENDING' | 'SEPARATING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending' | 'error';
  timestamp?: string;
  actor?: string;
}

interface TransferWorkflowVisualProps {
  currentStatus: TransferStatus;
  sourceLocation?: string;
  targetLocation?: string;
  createdAt?: string;
  confirmedAt?: string;
  separatingAt?: string;
  inTransitAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdBy?: string;
  separator?: string;
  receiver?: string;
  cancelReason?: string;
  className?: string;
  variant?: 'vertical' | 'horizontal';
}

// =============================================================================
// HELPERS
// =============================================================================

const statusOrder: TransferStatus[] = ['DRAFT', 'PENDING', 'SEPARATING', 'IN_TRANSIT', 'COMPLETED'];

function getStepStatus(
  step: TransferStatus,
  current: TransferStatus
): 'completed' | 'current' | 'pending' | 'error' {
  if (current === 'CANCELLED') {
    const currentIndex = statusOrder.indexOf(current);
    const stepIndex = statusOrder.indexOf(step);
    return stepIndex <= currentIndex ? 'error' : 'pending';
  }

  const currentIndex = statusOrder.indexOf(current);
  const stepIndex = statusOrder.indexOf(step);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

// =============================================================================
// COMPONENTES - VERTICAL
// =============================================================================

const VerticalStep: React.FC<{
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
      circle: 'bg-primary text-white ring-4 ring-primary/20 animate-pulse',
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

// =============================================================================
// COMPONENTES - HORIZONTAL
// =============================================================================

const HorizontalStep: React.FC<{
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
      circle: 'bg-primary text-white ring-4 ring-primary/20 animate-pulse',
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
    <div className="flex flex-col items-center flex-1">
      <div className="flex items-center w-full">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0',
            styles.circle
          )}
        >
          {step.status === 'completed' && <Check className="w-4 h-4" />}
          {step.status === 'current' &&
            React.cloneElement(step.icon as React.ReactElement, { className: 'w-4 h-4' })}
          {step.status === 'pending' &&
            React.cloneElement(step.icon as React.ReactElement, { className: 'w-4 h-4' })}
          {step.status === 'error' && <X className="w-4 h-4" />}
        </div>
        {!isLast && <div className={cn('h-0.5 flex-1 ml-1', styles.line)} />}
      </div>

      <div className="text-center mt-2 px-1">
        <p className={cn('text-xs', styles.label)}>{step.label}</p>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const TransferWorkflowVisual: React.FC<TransferWorkflowVisualProps> = ({
  currentStatus,
  sourceLocation,
  targetLocation,
  createdAt,
  confirmedAt,
  separatingAt,
  inTransitAt,
  completedAt,
  cancelledAt,
  createdBy,
  separator,
  receiver,
  cancelReason,
  className,
  variant = 'vertical',
}) => {
  const steps: WorkflowStep[] = [
    {
      id: 'draft',
      label: 'Rascunho',
      description: 'Transferência criada',
      icon: <FileEdit className="w-5 h-5" />,
      status: getStepStatus('DRAFT', currentStatus),
      timestamp: createdAt,
      actor: createdBy,
    },
    {
      id: 'pending',
      label: 'Confirmada',
      description: 'Aguardando separação',
      icon: <ArrowRightLeft className="w-5 h-5" />,
      status: getStepStatus('PENDING', currentStatus),
      timestamp: confirmedAt,
    },
    {
      id: 'separating',
      label: 'Em Separação',
      description: 'Materiais sendo separados',
      icon: <PackageSearch className="w-5 h-5" />,
      status: getStepStatus('SEPARATING', currentStatus),
      timestamp: separatingAt,
      actor: separator,
    },
    {
      id: 'in_transit',
      label: 'Em Trânsito',
      description: `${sourceLocation || 'Origem'} → ${targetLocation || 'Destino'}`,
      icon: <MapPin className="w-5 h-5" />,
      status: getStepStatus('IN_TRANSIT', currentStatus),
      timestamp: inTransitAt,
    },
    {
      id: 'completed',
      label: 'Concluída',
      description: 'Transferência finalizada',
      icon: <PackageCheck className="w-5 h-5" />,
      status: getStepStatus('COMPLETED', currentStatus),
      timestamp: completedAt,
      actor: receiver,
    },
  ];

  // Se cancelada, mostrar versão resumida
  const visibleSteps: WorkflowStep[] =
    currentStatus === 'CANCELLED'
      ? [
          steps[0],
          {
            id: 'cancelled',
            label: 'Cancelada',
            description: cancelReason || 'Transferência foi cancelada',
            icon: <X className="w-5 h-5" />,
            status: 'error',
            timestamp: cancelledAt,
          },
        ].filter((s): s is WorkflowStep => s !== undefined)
      : steps;

  if (variant === 'horizontal') {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <CircleDot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Fluxo da Transferência</h3>
        </div>

        <div className="flex items-start">
          {visibleSteps.map((step, index) => (
            <HorizontalStep key={step.id} step={step} isLast={index === visibleSteps.length - 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <CircleDot className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Fluxo da Transferência</h3>
      </div>

      {sourceLocation && targetLocation && (
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{sourceLocation}</span>
          <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{targetLocation}</span>
        </div>
      )}

      <div className="space-y-0">
        {visibleSteps.map((step, index) => (
          <VerticalStep key={step.id} step={step} isLast={index === visibleSteps.length - 1} />
        ))}
      </div>
    </div>
  );
};

export default TransferWorkflowVisual;
