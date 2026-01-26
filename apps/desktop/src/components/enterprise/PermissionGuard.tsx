// ═══════════════════════════════════════════════════════════════════════════
// GIRO ENTERPRISE - PERMISSION GUARD COMPONENT
// Componente para proteção de UI baseada em permissões
// ═══════════════════════════════════════════════════════════════════════════

import { type ReactNode } from 'react';
import { useAuthStore } from '@/stores';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import type { EmployeeRole } from '@/types';
import {
  ENTERPRISE_PERMISSIONS,
  type EnterprisePermission,
  canApproveAmount,
  type ApprovalConfig,
  DEFAULT_APPROVAL_CONFIG,
} from '@/lib/permissions/enterprise';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface PermissionGuardProps {
  /** Permissão necessária para renderizar o children */
  permission: EnterprisePermission;
  /** Conteúdo a ser renderizado se autorizado */
  children: ReactNode;
  /** Conteúdo alternativo se não autorizado (default: null) */
  fallback?: ReactNode;
  /** Se true, mostra um placeholder de acesso negado ao invés de ocultar */
  showDenied?: boolean;
  /** Mensagem customizada para acesso negado */
  deniedMessage?: string;
}

interface MultiPermissionGuardProps {
  /** Lista de permissões - comportamento definido por `mode` */
  permissions: EnterprisePermission[];
  /** 'all' = todas necessárias, 'any' = qualquer uma suficiente */
  mode?: 'all' | 'any';
  /** Conteúdo a ser renderizado se autorizado */
  children: ReactNode;
  /** Conteúdo alternativo se não autorizado */
  fallback?: ReactNode;
}

interface ApprovalGuardProps {
  /** Valor a ser aprovado */
  amount: number;
  /** Configuração de limites de aprovação */
  config?: ApprovalConfig;
  /** Conteúdo a ser renderizado se pode aprovar */
  children: ReactNode;
  /** Conteúdo alternativo se não pode aprovar */
  fallback?: ReactNode;
}

interface RoleGuardProps {
  /** Roles permitidos */
  roles: EmployeeRole[];
  /** Conteúdo a ser renderizado se autorizado */
  children: ReactNode;
  /** Conteúdo alternativo se não autorizado */
  fallback?: ReactNode;
}

interface EnterpriseOnlyProps {
  /** Conteúdo a ser renderizado apenas no perfil Enterprise */
  children: ReactNode;
  /** Conteúdo alternativo para outros perfis */
  fallback?: ReactNode;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER HOOKS (interno)
// ────────────────────────────────────────────────────────────────────────────

function useCheckPermission(permission: EnterprisePermission): boolean {
  const { employee } = useAuthStore();
  const { businessType } = useBusinessProfile();

  if (!employee || businessType !== 'ENTERPRISE') return false;

  const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return (allowedRoles as readonly string[]).includes(employee.role);
}

// ────────────────────────────────────────────────────────────────────────────
// PERMISSION GUARD
// ────────────────────────────────────────────────────────────────────────────

/**
 * Componente que renderiza children apenas se o usuário tem a permissão
 *
 * @example
 * <PermissionGuard permission="requests.approve">
 *   <Button onClick={handleApprove}>Aprovar</Button>
 * </PermissionGuard>
 *
 * @example
 * <PermissionGuard permission="contracts.delete" showDenied>
 *   <Button variant="destructive">Excluir Contrato</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  showDenied = false,
  deniedMessage = 'Você não tem permissão para esta ação',
}: PermissionGuardProps): ReactNode {
  const hasPermission = useCheckPermission(permission);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showDenied) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-dashed',
          'border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500'
        )}
        title={deniedMessage}
      >
        <Lock className="h-4 w-4" />
        <span>Acesso restrito</span>
      </div>
    );
  }

  return <>{fallback}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// MULTI PERMISSION GUARD
// ────────────────────────────────────────────────────────────────────────────

/**
 * Componente que verifica múltiplas permissões
 *
 * @example
 * // Precisa de TODAS as permissões
 * <MultiPermissionGuard permissions={['contracts.view', 'contracts.edit']} mode="all">
 *   <ContractEditor />
 * </MultiPermissionGuard>
 *
 * @example
 * // Precisa de QUALQUER UMA das permissões
 * <MultiPermissionGuard permissions={['requests.approve', 'requests.reject']} mode="any">
 *   <RequestActions />
 * </MultiPermissionGuard>
 */
export function MultiPermissionGuard({
  permissions,
  mode = 'all',
  children,
  fallback = null,
}: MultiPermissionGuardProps): ReactNode {
  const { employee } = useAuthStore();
  const { businessType } = useBusinessProfile();

  if (!employee || businessType !== 'ENTERPRISE') {
    return <>{fallback}</>;
  }

  const results = permissions.map((permission) => {
    const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return (allowedRoles as readonly string[]).includes(employee.role);
  });

  const hasAccess = mode === 'all' ? results.every(Boolean) : results.some(Boolean);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// APPROVAL GUARD
// ────────────────────────────────────────────────────────────────────────────

/**
 * Componente que verifica se o usuário pode aprovar um valor específico
 *
 * @example
 * <ApprovalGuard amount={25000}>
 *   <Button onClick={handleApprove}>Aprovar Requisição</Button>
 * </ApprovalGuard>
 */
export function ApprovalGuard({
  amount,
  config = DEFAULT_APPROVAL_CONFIG,
  children,
  fallback = null,
}: ApprovalGuardProps): ReactNode {
  const { employee } = useAuthStore();
  const { businessType } = useBusinessProfile();

  if (!employee || businessType !== 'ENTERPRISE') {
    return <>{fallback}</>;
  }

  const canApprove = canApproveAmount(employee.role, amount, config);

  return canApprove ? <>{children}</> : <>{fallback}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// ROLE GUARD
// ────────────────────────────────────────────────────────────────────────────

/**
 * Componente que verifica se o usuário tem um dos roles especificados
 *
 * @example
 * <RoleGuard roles={['ADMIN', 'CONTRACT_MANAGER']}>
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps): ReactNode {
  const { employee } = useAuthStore();

  if (!employee) {
    return <>{fallback}</>;
  }

  const hasRole = roles.includes(employee.role);

  return hasRole ? <>{children}</> : <>{fallback}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE ONLY
// ────────────────────────────────────────────────────────────────────────────

/**
 * Componente que renderiza apenas no perfil Enterprise
 *
 * @example
 * <EnterpriseOnly>
 *   <ContractsMenu />
 * </EnterpriseOnly>
 */
export function EnterpriseOnly({ children, fallback = null }: EnterpriseOnlyProps): ReactNode {
  const { businessType } = useBusinessProfile();

  return businessType === 'ENTERPRISE' ? <>{children}</> : <>{fallback}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// ACCESS DENIED CARD
// ────────────────────────────────────────────────────────────────────────────

interface AccessDeniedCardProps {
  title?: string;
  message?: string;
  className?: string;
}

/**
 * Componente de exibição de acesso negado para páginas inteiras
 *
 * @example
 * if (!canViewContracts) {
 *   return <AccessDeniedCard title="Contratos" />;
 * }
 */
export function AccessDeniedCard({
  title = 'Acesso Negado',
  message = 'Você não tem permissão para acessar este recurso. Entre em contato com o administrador se precisar de acesso.',
  className,
}: AccessDeniedCardProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border',
        'border-amber-200 bg-amber-50 p-8 text-center',
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-8 w-8 text-amber-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-amber-800">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-amber-700">{message}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export type {
  PermissionGuardProps,
  MultiPermissionGuardProps,
  ApprovalGuardProps,
  RoleGuardProps,
  EnterpriseOnlyProps,
  AccessDeniedCardProps,
};
