// ═══════════════════════════════════════════════════════════════════════════
// GIRO - PERMISSIONS INDEX
// Exporta todas as constantes e funções de permissão
// ═══════════════════════════════════════════════════════════════════════════

export {
  ENTERPRISE_PERMISSIONS,
  type EnterprisePermission,
  ApprovalLevel,
  type ApprovalConfig,
  DEFAULT_APPROVAL_CONFIG,
  getRequiredApprovalLevel,
  getApprovalRoles,
  canApproveAmount,
  ENTERPRISE_ROLES,
  type RoleInfo,
  isEnterpriseRole,
  getRoleInfo,
} from './enterprise';
