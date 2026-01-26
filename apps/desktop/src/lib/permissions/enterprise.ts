// ═══════════════════════════════════════════════════════════════════════════
// GIRO ENTERPRISE - MATRIZ DE PERMISSÕES
// Sistema de autorização para módulo Almoxarifado Industrial
// ═══════════════════════════════════════════════════════════════════════════

import type { EmployeeRole } from '@/types';

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PERMISSIONS
// ────────────────────────────────────────────────────────────────────────────

export const ENTERPRISE_PERMISSIONS: Record<string, readonly EmployeeRole[]> = {
  // ══════════════════════════════════════════════════════════════════════════
  // CONTRATOS
  // ══════════════════════════════════════════════════════════════════════════
  'contracts.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN', 'MANAGER'],
  'contracts.create': ['CONTRACT_MANAGER', 'ADMIN'],
  'contracts.edit': ['CONTRACT_MANAGER', 'ADMIN'],
  'contracts.delete': ['ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // FRENTES DE TRABALHO
  // ══════════════════════════════════════════════════════════════════════════
  'workFronts.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'ADMIN', 'MANAGER'],
  'workFronts.create': ['CONTRACT_MANAGER', 'ADMIN'],
  'workFronts.edit': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
  'workFronts.delete': ['ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // ATIVIDADES
  // ══════════════════════════════════════════════════════════════════════════
  'activities.view': [
    'CONTRACT_MANAGER',
    'SUPERVISOR',
    'WAREHOUSE',
    'REQUESTER',
    'ADMIN',
    'MANAGER',
  ],
  'activities.create': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
  'activities.edit': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
  'activities.updateProgress': ['SUPERVISOR', 'ADMIN'],
  'activities.delete': ['ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // LOCAIS DE ESTOQUE
  // ══════════════════════════════════════════════════════════════════════════
  'locations.view': [
    'CONTRACT_MANAGER',
    'SUPERVISOR',
    'WAREHOUSE',
    'REQUESTER',
    'ADMIN',
    'MANAGER',
  ],
  'locations.create': ['WAREHOUSE', 'ADMIN'],
  'locations.edit': ['WAREHOUSE', 'ADMIN'],
  'locations.adjustBalance': ['WAREHOUSE', 'ADMIN'],
  'locations.delete': ['ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // REQUISIÇÕES DE MATERIAL
  // ══════════════════════════════════════════════════════════════════════════
  'requests.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'REQUESTER', 'ADMIN', 'MANAGER'],
  'requests.create': ['SUPERVISOR', 'REQUESTER', 'ADMIN'],
  'requests.edit': ['SUPERVISOR', 'REQUESTER', 'ADMIN'], // Apenas DRAFT
  'requests.submit': ['SUPERVISOR', 'REQUESTER', 'ADMIN'],
  'requests.approve': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'], // Supervisor aprova apenas REQUESTER
  'requests.reject': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
  'requests.separate': ['WAREHOUSE', 'ADMIN'],
  'requests.deliver': ['WAREHOUSE', 'ADMIN'],
  'requests.cancel': ['CONTRACT_MANAGER', 'ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSFERÊNCIAS DE ESTOQUE
  // ══════════════════════════════════════════════════════════════════════════
  'transfers.view': ['CONTRACT_MANAGER', 'WAREHOUSE', 'ADMIN', 'MANAGER'],
  'transfers.create': ['WAREHOUSE', 'ADMIN'],
  'transfers.edit': ['WAREHOUSE', 'ADMIN'], // Apenas PENDING
  'transfers.approve': ['CONTRACT_MANAGER', 'ADMIN'],
  'transfers.reject': ['CONTRACT_MANAGER', 'ADMIN'],
  'transfers.ship': ['WAREHOUSE', 'ADMIN'],
  'transfers.receive': ['WAREHOUSE', 'ADMIN'],
  'transfers.cancel': ['CONTRACT_MANAGER', 'ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTÁRIO
  // ══════════════════════════════════════════════════════════════════════════
  'inventory.view': ['WAREHOUSE', 'CONTRACT_MANAGER', 'ADMIN', 'MANAGER'],
  'inventory.count': ['WAREHOUSE', 'ADMIN'],
  'inventory.adjust': ['WAREHOUSE', 'ADMIN'],
  'inventory.approve': ['CONTRACT_MANAGER', 'ADMIN'],

  // ══════════════════════════════════════════════════════════════════════════
  // RELATÓRIOS ENTERPRISE
  // ══════════════════════════════════════════════════════════════════════════
  'reports.consumption': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN', 'MANAGER'],
  'reports.stock': ['WAREHOUSE', 'CONTRACT_MANAGER', 'ADMIN', 'MANAGER'],
  'reports.requests': ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'ADMIN', 'MANAGER'],
  'reports.transfers': ['CONTRACT_MANAGER', 'WAREHOUSE', 'ADMIN', 'MANAGER'],
  'reports.cost': ['CONTRACT_MANAGER', 'ADMIN', 'MANAGER'],
  'reports.abc': ['CONTRACT_MANAGER', 'WAREHOUSE', 'ADMIN', 'MANAGER'],
};

export type EnterprisePermission = keyof typeof ENTERPRISE_PERMISSIONS;

// ────────────────────────────────────────────────────────────────────────────
// HIERARQUIA DE APROVAÇÃO
// ────────────────────────────────────────────────────────────────────────────

/**
 * Níveis de aprovação baseados em valor
 */
export enum ApprovalLevel {
  Level1 = 'LEVEL_1', // Supervisor
  Level2 = 'LEVEL_2', // Contract Manager
  Level3 = 'LEVEL_3', // Admin
}

/**
 * Configuração de limites de aprovação
 */
export interface ApprovalConfig {
  level1Limit: number; // Até X: Supervisor pode aprovar
  level2Limit: number; // Até Y: Contract Manager pode aprovar
  // Acima de Y: Apenas Admin
}

/**
 * Configuração padrão de limites de aprovação
 */
export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  level1Limit: 10_000, // Até R$ 10.000
  level2Limit: 50_000, // Até R$ 50.000
};

/**
 * Determina o nível de aprovação necessário baseado no valor
 */
export function getRequiredApprovalLevel(
  amount: number,
  config: ApprovalConfig = DEFAULT_APPROVAL_CONFIG
): ApprovalLevel {
  if (amount <= config.level1Limit) {
    return ApprovalLevel.Level1;
  }
  if (amount <= config.level2Limit) {
    return ApprovalLevel.Level2;
  }
  return ApprovalLevel.Level3;
}

/**
 * Retorna os roles que podem aprovar um determinado nível
 */
export function getApprovalRoles(level: ApprovalLevel): EmployeeRole[] {
  switch (level) {
    case ApprovalLevel.Level1:
      return ['SUPERVISOR', 'CONTRACT_MANAGER', 'ADMIN'];
    case ApprovalLevel.Level2:
      return ['CONTRACT_MANAGER', 'ADMIN'];
    case ApprovalLevel.Level3:
      return ['ADMIN'];
    default:
      return ['ADMIN'];
  }
}

/**
 * Verifica se um role pode aprovar um valor específico
 */
export function canApproveAmount(
  role: EmployeeRole,
  amount: number,
  config: ApprovalConfig = DEFAULT_APPROVAL_CONFIG
): boolean {
  const requiredLevel = getRequiredApprovalLevel(amount, config);
  const allowedRoles = getApprovalRoles(requiredLevel);
  return allowedRoles.includes(role);
}

// ────────────────────────────────────────────────────────────────────────────
// ROLE METADATA
// ────────────────────────────────────────────────────────────────────────────

export interface RoleInfo {
  key: EmployeeRole;
  label: string;
  description: string;
  color: string;
  icon: string;
  isEnterprise: boolean;
}

/**
 * Metadados dos roles Enterprise
 */
export const ENTERPRISE_ROLES: Record<string, RoleInfo> = {
  CONTRACT_MANAGER: {
    key: 'CONTRACT_MANAGER',
    label: 'Gerente de Contrato',
    description: 'Gerencia contratos/obras, aprova requisições e transferências',
    color: 'bg-purple-100 text-purple-800',
    icon: 'building-2',
    isEnterprise: true,
  },
  SUPERVISOR: {
    key: 'SUPERVISOR',
    label: 'Supervisor',
    description: 'Supervisiona frentes de trabalho, cria e aprova requisições',
    color: 'bg-blue-100 text-blue-800',
    icon: 'hard-hat',
    isEnterprise: true,
  },
  WAREHOUSE: {
    key: 'WAREHOUSE',
    label: 'Almoxarife',
    description: 'Gerencia estoque, separa requisições, executa transferências',
    color: 'bg-amber-100 text-amber-800',
    icon: 'warehouse',
    isEnterprise: true,
  },
  REQUESTER: {
    key: 'REQUESTER',
    label: 'Requisitante',
    description: 'Cria requisições de material e acompanha status',
    color: 'bg-gray-100 text-gray-800',
    icon: 'clipboard-list',
    isEnterprise: true,
  },
};

/**
 * Verifica se um role é específico do Enterprise
 */
export function isEnterpriseRole(role: EmployeeRole): boolean {
  return ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'REQUESTER'].includes(role);
}

/**
 * Retorna informações de um role
 */
export function getRoleInfo(role: EmployeeRole): RoleInfo | undefined {
  return ENTERPRISE_ROLES[role];
}
