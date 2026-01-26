/**
 * @file useEnterprisePermission.test.ts - Testes para hooks de permissão Enterprise
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useEnterprisePermission,
  useEnterprisePermissions,
  useCanDo,
  useIsEnterprise,
  useCurrentRole,
} from '../useEnterprisePermission';
import { useAuthStore } from '@/stores';
import { useBusinessProfile } from '@/stores/useBusinessProfile';

// Mock stores
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

describe('useEnterprisePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEnterprisePermission - single permission', () => {
    it('deve retornar false se não autenticado', () => {
      vi.mocked(useAuthStore).mockReturnValue({ employee: null } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useEnterprisePermission('contracts.view'));

      expect(result.current).toBe(false);
    });

    it('deve retornar false se não for perfil ENTERPRISE', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'MERCEARIA' } as any);

      const { result } = renderHook(() => useEnterprisePermission('contracts.view'));

      expect(result.current).toBe(false);
    });

    it('deve retornar true se ADMIN com perfil ENTERPRISE', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'ADMIN' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useEnterprisePermission('contracts.view'));

      expect(result.current).toBe(true);
    });

    it('deve retornar true se MANAGER com perfil ENTERPRISE', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useEnterprisePermission('contracts.view'));

      expect(result.current).toBe(true);
    });

    it('deve retornar false se VENDEDOR tentando ver contratos', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'VENDEDOR' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useEnterprisePermission('contracts.view'));

      expect(result.current).toBe(false);
    });

    it('deve retornar false para OPERATOR com requests.approve', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'OPERATOR' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useEnterprisePermission('requests.approve'));

      expect(result.current).toBe(false);
    });
  });

  describe('useEnterprisePermissions - multiple permissions', () => {
    it('deve retornar todas as permissões como false se não autenticado', () => {
      vi.mocked(useAuthStore).mockReturnValue({ employee: null } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() =>
        useEnterprisePermissions(['contracts.view', 'contracts.create', 'requests.approve'])
      );

      expect(result.current).toEqual({
        'contracts.view': false,
        'contracts.create': false,
        'requests.approve': false,
      });
    });

    it('deve retornar todas as permissões como false se não for ENTERPRISE', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'MERCEARIA' } as any);

      const { result } = renderHook(() =>
        useEnterprisePermissions(['contracts.view', 'contracts.create'])
      );

      expect(result.current).toEqual({
        'contracts.view': false,
        'contracts.create': false,
      });
    });

    it('deve retornar permissões corretas para MANAGER', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() =>
        useEnterprisePermissions(['contracts.view'])
      );

      expect(result.current['contracts.view']).toBe(true);
    });

    it('deve retornar permissão false para role sem acesso', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'VENDEDOR' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() =>
        useEnterprisePermissions(['contracts.view'])
      );

      expect(result.current['contracts.view']).toBe(false);
    });

    it('deve retornar permissão true para ADMIN', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'ADMIN' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() =>
        useEnterprisePermissions(['contracts.view'])
      );

      expect(result.current['contracts.view']).toBe(true);
    });
  });

  describe('useCanDo - convenience hook', () => {
    it('deve retornar objeto com actions convenientes para MANAGER', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useCanDo());

      expect(result.current.viewContracts).toBe(true);
      expect(typeof result.current.canApprove).toBe('function');
    });

    it('deve retornar false para createContract para VENDEDOR', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'VENDEDOR' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useCanDo());

      expect(result.current.createContract).toBe(false);
    });

    it('deve retornar actions permitidas para ADMIN', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'ADMIN' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useCanDo());

      expect(result.current.viewContracts).toBe(true);
      expect(result.current.isEnterpriseUser).toBe(false); // ADMIN não é role enterprise específico
    });

    it('deve retornar false para actions se não for ENTERPRISE', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'MERCEARIA' } as any);

      const { result } = renderHook(() => useCanDo());

      expect(result.current.viewContracts).toBe(false);
      expect(result.current.createContract).toBe(false);
    });

    it('deve retornar canApprove function', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'MANAGER' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useCanDo());

      expect(typeof result.current.canApprove).toBe('function');
    });

    it('deve marcar isEnterpriseUser como false se não for role enterprise', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'VENDEDOR' },
      } as any);
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useCanDo());

      expect(result.current.isEnterpriseUser).toBe(false);
    });
  });

  describe('useIsEnterprise', () => {
    it('deve retornar true se businessType for ENTERPRISE', () => {
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'ENTERPRISE' } as any);

      const { result } = renderHook(() => useIsEnterprise());

      expect(result.current).toBe(true);
    });

    it('deve retornar false se businessType não for ENTERPRISE', () => {
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'MERCEARIA' } as any);

      const { result } = renderHook(() => useIsEnterprise());

      expect(result.current).toBe(false);
    });

    it('deve retornar false se businessType for MOTOPARTS', () => {
      vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'MOTOPARTS' } as any);

      const { result } = renderHook(() => useIsEnterprise());

      expect(result.current).toBe(false);
    });
  });

  describe('useCurrentRole', () => {
    it('deve retornar role null se não autenticado', () => {
      vi.mocked(useAuthStore).mockReturnValue({ employee: null } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.role).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isEnterpriseRole).toBe(false);
    });

    it('deve retornar isAdmin true para ADMIN', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'ADMIN' },
      } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.role).toBe('ADMIN');
      expect(result.current.isAdmin).toBe(true);
    });

    it('deve retornar isContractManager true para CONTRACT_MANAGER', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'CONTRACT_MANAGER' },
      } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.role).toBe('CONTRACT_MANAGER');
      expect(result.current.isContractManager).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });

    it('deve retornar isSupervisor true para SUPERVISOR', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'SUPERVISOR' },
      } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.isSupervisor).toBe(true);
      expect(result.current.isWarehouse).toBe(false);
    });

    it('deve retornar isWarehouse true para WAREHOUSE', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'WAREHOUSE' },
      } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.isWarehouse).toBe(true);
      expect(result.current.isRequester).toBe(false);
    });

    it('deve retornar isRequester true para REQUESTER', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'REQUESTER' },
      } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.isRequester).toBe(true);
      expect(result.current.isSupervisor).toBe(false);
    });



    it('deve retornar isEnterpriseRole false para VENDEDOR', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        employee: { id: '1', role: 'VENDEDOR' },
      } as any);

      const { result } = renderHook(() => useCurrentRole());

      expect(result.current.isEnterpriseRole).toBe(false);
    });
  });
});
