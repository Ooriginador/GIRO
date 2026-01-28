/**
 * @file StatusBadge - Badge de status para Enterprise
 * @description Componente reutilizável para exibir status de contratos, requisições, etc.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FC } from 'react';
import type {
  ContractStatus,
  MaterialRequestStatus,
  TransferStatus,
  WorkFrontStatus,
  ActivityStatus,
  RequestPriority,
} from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// CONTRACT STATUS
// ────────────────────────────────────────────────────────────────────────────

const contractStatusConfig: Record<ContractStatus, { label: string; color: string }> = {
  PLANNING: {
    label: 'Planejamento',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  ACTIVE: {
    label: 'Ativo',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  SUSPENDED: {
    label: 'Suspenso',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
};

interface ContractStatusBadgeProps {
  status: ContractStatus | string;
  className?: string;
  /** Descrição adicional para leitores de tela */
  'aria-description'?: string;
}

export const ContractStatusBadge: FC<ContractStatusBadgeProps> = ({
  status,
  className,
  'aria-description': ariaDescription,
}) => {
  const config = contractStatusConfig[status as ContractStatus] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <Badge
      className={cn('font-normal', config.color, className)}
      role="status"
      aria-label={`Status do contrato: ${config.label}`}
      aria-description={ariaDescription}
    >
      {config.label}
    </Badge>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// REQUEST STATUS
// ────────────────────────────────────────────────────────────────────────────

const requestStatusConfig: Record<MaterialRequestStatus, { label: string; color: string }> = {
  DRAFT: {
    label: 'Rascunho',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  PENDING: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  APPROVED: {
    label: 'Aprovada',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  PARTIALLY_APPROVED: {
    label: 'Parcial',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  REJECTED: {
    label: 'Rejeitada',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  SEPARATING: {
    label: 'Separando',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  READY: {
    label: 'Pronta',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  },
  DELIVERED: {
    label: 'Entregue',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  },
};

interface RequestStatusBadgeProps {
  status: MaterialRequestStatus | string;
  className?: string;
  /** Número da requisição para contexto */
  requestNumber?: string;
}

export const RequestStatusBadge: FC<RequestStatusBadgeProps> = ({
  status,
  className,
  requestNumber,
}) => {
  const config = requestStatusConfig[status as MaterialRequestStatus] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  const ariaLabel = requestNumber
    ? `Requisição ${requestNumber}: ${config.label}`
    : `Status da requisição: ${config.label}`;
  return (
    <Badge
      className={cn('font-normal', config.color, className)}
      role="status"
      aria-label={ariaLabel}
    >
      {config.label}
    </Badge>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER STATUS
// ────────────────────────────────────────────────────────────────────────────

const transferStatusConfig: Record<TransferStatus, { label: string; color: string }> = {
  DRAFT: {
    label: 'Rascunho',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  },
  PENDING: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  APPROVED: {
    label: 'Aprovada',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  REJECTED: {
    label: 'Rejeitada',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  IN_TRANSIT: {
    label: 'Em Trânsito',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  },
  RECEIVED: {
    label: 'Recebida',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  },
};

interface TransferStatusBadgeProps {
  status: TransferStatus | string;
  className?: string;
  /** Número da transferência para contexto */
  transferNumber?: string;
}

export const TransferStatusBadge: FC<TransferStatusBadgeProps> = ({
  status,
  className,
  transferNumber,
}) => {
  const config = transferStatusConfig[status as TransferStatus] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  const ariaLabel = transferNumber
    ? `Transferência ${transferNumber}: ${config.label}`
    : `Status da transferência: ${config.label}`;
  return (
    <Badge
      className={cn('font-normal', config.color, className)}
      role="status"
      aria-label={ariaLabel}
    >
      {config.label}
    </Badge>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// WORK FRONT STATUS
// ────────────────────────────────────────────────────────────────────────────

const workFrontStatusConfig: Record<WorkFrontStatus, { label: string; color: string }> = {
  ACTIVE: {
    label: 'Ativa',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  SUSPENDED: {
    label: 'Paralisada',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

interface WorkFrontStatusBadgeProps {
  status: WorkFrontStatus | string;
  className?: string;
}

export const WorkFrontStatusBadge: FC<WorkFrontStatusBadgeProps> = ({ status, className }) => {
  const config = workFrontStatusConfig[status as WorkFrontStatus] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return <Badge className={cn('font-normal', config.color, className)}>{config.label}</Badge>;
};

// ────────────────────────────────────────────────────────────────────────────
// ACTIVITY STATUS
// ────────────────────────────────────────────────────────────────────────────

const activityStatusConfig: Record<ActivityStatus, { label: string; color: string }> = {
  PENDING: {
    label: 'Não Iniciada',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
};

interface ActivityStatusBadgeProps {
  status: ActivityStatus | string;
  className?: string;
}

export const ActivityStatusBadge: FC<ActivityStatusBadgeProps> = ({ status, className }) => {
  const config = activityStatusConfig[status as ActivityStatus] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return <Badge className={cn('font-normal', config.color, className)}>{config.label}</Badge>;
};

// ────────────────────────────────────────────────────────────────────────────
// PRIORITY BADGE
// ────────────────────────────────────────────────────────────────────────────

const priorityConfig: Record<RequestPriority, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  NORMAL: {
    label: 'Normal',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  HIGH: {
    label: 'Alta',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  URGENT: { label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

interface PriorityBadgeProps {
  priority: RequestPriority | string;
  className?: string;
}

export const PriorityBadge: FC<PriorityBadgeProps> = ({ priority, className }) => {
  const config = priorityConfig[priority as RequestPriority] || {
    label: priority,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return <Badge className={cn('font-normal', config.color, className)}>{config.label}</Badge>;
};
