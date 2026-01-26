/**
 * @file Testes - Enterprise Permissions
 * @description Testes unitários para o sistema de permissões Enterprise
 */

import { describe, it, expect } from 'vitest';
import {
  ENTERPRISE_PERMISSIONS,
  canApproveAmount,
  isEnterpriseRole,
  getRoleInfo,
  getRequiredApprovalLevel,
  getApprovalRoles,
  ApprovalLevel,
  DEFAULT_APPROVAL_CONFIG,
  ENTERPRISE_ROLES,
  type EnterprisePermission,
} from '@/lib/permissions/enterprise';
import type { EmployeeRole } from '@/types';

// Helper para checar permissão
function checkEnterprisePermission(permission: string, role: EmployeeRole): boolean {
  const roles = ENTERPRISE_PERMISSIONS[permission];
  if (!roles || !role) return false;
  return roles.includes(role);
}

describe('Enterprise Permissions', () => {
  describe('ENTERPRISE_PERMISSIONS matrix', () => {
    it('should have all core contract permissions defined', () => {
      const requiredPermissions = [
        'contracts.view',
        'contracts.create',
        'contracts.edit',
        'contracts.delete',
        'requests.view',
        'requests.create',
        'requests.approve',
        'transfers.view',
        'transfers.create',
        'transfers.receive',
      ];

      requiredPermissions.forEach((permission) => {
        expect(ENTERPRISE_PERMISSIONS).toHaveProperty(permission);
      });
    });

    it('should define roles as arrays', () => {
      Object.entries(ENTERPRISE_PERMISSIONS).forEach(([_key, roles]) => {
        expect(Array.isArray(roles)).toBe(true);
        expect(roles.length).toBeGreaterThan(0);
      });
    });

    it('should have inventory permissions', () => {
      expect(ENTERPRISE_PERMISSIONS).toHaveProperty('inventory.view');
      expect(ENTERPRISE_PERMISSIONS).toHaveProperty('inventory.count');
      expect(ENTERPRISE_PERMISSIONS).toHaveProperty('inventory.adjust');
    });

    it('should have report permissions', () => {
      expect(ENTERPRISE_PERMISSIONS).toHaveProperty('reports.consumption');
      expect(ENTERPRISE_PERMISSIONS).toHaveProperty('reports.stock');
      expect(ENTERPRISE_PERMISSIONS).toHaveProperty('reports.requests');
    });
  });

  describe('checkEnterprisePermission (helper)', () => {
    it('should allow ADMIN for contract permissions', () => {
      expect(checkEnterprisePermission('contracts.view', 'ADMIN')).toBe(true);
      expect(checkEnterprisePermission('contracts.create', 'ADMIN')).toBe(true);
      expect(checkEnterprisePermission('contracts.edit', 'ADMIN')).toBe(true);
    });

    it('should allow CONTRACT_MANAGER for contract permissions', () => {
      expect(checkEnterprisePermission('contracts.view', 'CONTRACT_MANAGER')).toBe(true);
      expect(checkEnterprisePermission('contracts.create', 'CONTRACT_MANAGER')).toBe(true);
      expect(checkEnterprisePermission('contracts.edit', 'CONTRACT_MANAGER')).toBe(true);
    });

    it('should allow SUPERVISOR for approval permissions', () => {
      expect(checkEnterprisePermission('requests.approve', 'SUPERVISOR')).toBe(true);
    });

    it('should allow WAREHOUSE for separation permissions', () => {
      expect(checkEnterprisePermission('requests.separate', 'WAREHOUSE')).toBe(true);
      expect(checkEnterprisePermission('requests.deliver', 'WAREHOUSE')).toBe(true);
    });

    it('should allow REQUESTER for basic request permissions', () => {
      expect(checkEnterprisePermission('requests.view', 'REQUESTER')).toBe(true);
      expect(checkEnterprisePermission('requests.create', 'REQUESTER')).toBe(true);
    });

    it('should deny REQUESTER for approval permissions', () => {
      expect(checkEnterprisePermission('requests.approve', 'REQUESTER')).toBe(false);
      expect(checkEnterprisePermission('contracts.create', 'REQUESTER')).toBe(false);
    });

    it('should return false for unknown permissions', () => {
      expect(checkEnterprisePermission('unknown.permission', 'ADMIN')).toBe(false);
    });

    it('should return false for undefined role', () => {
      expect(checkEnterprisePermission('contracts.view', undefined as any)).toBe(false);
    });
  });

  describe('canApproveAmount', () => {
    it('should allow ADMIN to approve any value', () => {
      expect(canApproveAmount('ADMIN', 1_000_000)).toBe(true);
      expect(canApproveAmount('ADMIN', 10_000_000)).toBe(true);
    });

    it('should allow CONTRACT_MANAGER up to level2Limit (50000)', () => {
      expect(canApproveAmount('CONTRACT_MANAGER', 10_000)).toBe(true);
      expect(canApproveAmount('CONTRACT_MANAGER', 50_000)).toBe(true);
      expect(canApproveAmount('CONTRACT_MANAGER', 50_001)).toBe(false);
    });

    it('should allow SUPERVISOR up to level1Limit (10000)', () => {
      expect(canApproveAmount('SUPERVISOR', 5_000)).toBe(true);
      expect(canApproveAmount('SUPERVISOR', 10_000)).toBe(true);
      expect(canApproveAmount('SUPERVISOR', 10_001)).toBe(false);
    });

    it('should not allow WAREHOUSE or REQUESTER to approve any value', () => {
      expect(canApproveAmount('WAREHOUSE', 100)).toBe(false);
      expect(canApproveAmount('REQUESTER', 100)).toBe(false);
    });
  });

  describe('getRequiredApprovalLevel', () => {
    it('should return Level1 for amounts <= 10000', () => {
      expect(getRequiredApprovalLevel(5_000)).toBe(ApprovalLevel.Level1);
      expect(getRequiredApprovalLevel(10_000)).toBe(ApprovalLevel.Level1);
    });

    it('should return Level2 for amounts > 10000 and <= 50000', () => {
      expect(getRequiredApprovalLevel(10_001)).toBe(ApprovalLevel.Level2);
      expect(getRequiredApprovalLevel(50_000)).toBe(ApprovalLevel.Level2);
    });

    it('should return Level3 for amounts > 50000', () => {
      expect(getRequiredApprovalLevel(50_001)).toBe(ApprovalLevel.Level3);
      expect(getRequiredApprovalLevel(1_000_000)).toBe(ApprovalLevel.Level3);
    });
  });

  describe('getApprovalRoles', () => {
    it('should return SUPERVISOR, CONTRACT_MANAGER, ADMIN for Level1', () => {
      const roles = getApprovalRoles(ApprovalLevel.Level1);
      expect(roles).toContain('SUPERVISOR');
      expect(roles).toContain('CONTRACT_MANAGER');
      expect(roles).toContain('ADMIN');
    });

    it('should return CONTRACT_MANAGER, ADMIN for Level2', () => {
      const roles = getApprovalRoles(ApprovalLevel.Level2);
      expect(roles).not.toContain('SUPERVISOR');
      expect(roles).toContain('CONTRACT_MANAGER');
      expect(roles).toContain('ADMIN');
    });

    it('should return only ADMIN for Level3', () => {
      const roles = getApprovalRoles(ApprovalLevel.Level3);
      expect(roles).toEqual(['ADMIN']);
    });
  });

  describe('isEnterpriseRole', () => {
    it('should return true for enterprise-specific roles', () => {
      expect(isEnterpriseRole('CONTRACT_MANAGER')).toBe(true);
      expect(isEnterpriseRole('SUPERVISOR')).toBe(true);
      expect(isEnterpriseRole('WAREHOUSE')).toBe(true);
      expect(isEnterpriseRole('REQUESTER')).toBe(true);
    });

    it('should return false for non-enterprise roles', () => {
      expect(isEnterpriseRole('ADMIN')).toBe(false);
      expect(isEnterpriseRole('MANAGER')).toBe(false);
      expect(isEnterpriseRole('CASHIER' as EmployeeRole)).toBe(false);
    });
  });

  describe('getRoleInfo', () => {
    it('should return role info for CONTRACT_MANAGER', () => {
      const info = getRoleInfo('CONTRACT_MANAGER');
      expect(info).toBeDefined();
      expect(info?.label).toBe('Gerente de Contrato');
      expect(info?.isEnterprise).toBe(true);
    });

    it('should return role info for WAREHOUSE', () => {
      const info = getRoleInfo('WAREHOUSE');
      expect(info).toBeDefined();
      expect(info?.label).toBe('Almoxarife');
      expect(info?.isEnterprise).toBe(true);
    });

    it('should return undefined for non-enterprise roles', () => {
      const info = getRoleInfo('ADMIN');
      expect(info).toBeUndefined();
    });
  });

  describe('ENTERPRISE_ROLES metadata', () => {
    it('should have all four enterprise roles defined', () => {
      expect(ENTERPRISE_ROLES).toHaveProperty('CONTRACT_MANAGER');
      expect(ENTERPRISE_ROLES).toHaveProperty('SUPERVISOR');
      expect(ENTERPRISE_ROLES).toHaveProperty('WAREHOUSE');
      expect(ENTERPRISE_ROLES).toHaveProperty('REQUESTER');
    });

    it('should have required metadata for each role', () => {
      Object.values(ENTERPRISE_ROLES).forEach((role) => {
        expect(role).toHaveProperty('key');
        expect(role).toHaveProperty('label');
        expect(role).toHaveProperty('description');
        expect(role).toHaveProperty('color');
        expect(role).toHaveProperty('icon');
        expect(role.isEnterprise).toBe(true);
      });
    });
  });

  describe('DEFAULT_APPROVAL_CONFIG', () => {
    it('should have correct default limits', () => {
      expect(DEFAULT_APPROVAL_CONFIG.level1Limit).toBe(10_000);
      expect(DEFAULT_APPROVAL_CONFIG.level2Limit).toBe(50_000);
    });
  });
});
