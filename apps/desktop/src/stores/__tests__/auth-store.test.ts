/**
 * @file auth-store.test.ts - Testes para auth store
 */

import { useAuthStore } from '@/stores/auth-store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store antes de cada teste
    useAuthStore.setState({
      employee: null,
      currentUser: null,
      currentSession: null,
      isAuthenticated: false,
    });
  });

  describe('login', () => {
    it('should login user successfully', () => {
      const mockEmployee = {
        id: '1',
        name: 'João Silva',
        role: 'ADMIN' as const,
        pin: '8899',
      };

      useAuthStore.getState().login(mockEmployee);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.employee).toEqual(mockEmployee);
      expect(state.currentUser).toEqual(mockEmployee);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', () => {
      const mockEmployee = {
        id: '1',
        name: 'João Silva',
        role: 'ADMIN' as const,
      };

      useAuthStore.getState().login(mockEmployee);
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.employee).toBeNull();
      expect(state.currentUser).toBeNull();
    });
  });

  describe('permissions', () => {
    it('should check permission correctly for ADMIN', () => {
      const admin = {
        id: '1',
        name: 'Admin',
        role: 'ADMIN' as const,
      };

      useAuthStore.getState().login(admin);
      const hasPermission = useAuthStore.getState().hasPermission('settings.edit');
      expect(hasPermission).toBe(true);
    });

    it('should deny permission for CASHIER', () => {
      const cashier = {
        id: '2',
        name: 'Caixa',
        role: 'CASHIER' as const,
      };

      useAuthStore.getState().login(cashier);
      const hasPermission = useAuthStore.getState().hasPermission('settings.edit');
      expect(hasPermission).toBe(false);
    });

    it('should allow discount for MANAGER', () => {
      const manager = {
        id: '3',
        name: 'Gerente',
        role: 'MANAGER' as const,
      };

      useAuthStore.getState().login(manager);

      expect(useAuthStore.getState().canDiscount(10)).toBe(true);
      expect(useAuthStore.getState().canDiscount(20)).toBe(true);
      expect(useAuthStore.getState().canDiscount(30)).toBe(false);
    });
  });

  describe('cash session', () => {
    it('should open cash session', () => {
      const session = {
        id: 'session-1',
        employeeId: '1',
        employeeName: 'João',
        openedAt: new Date().toISOString(),
        openingBalance: 200,
        status: 'OPEN' as const,
      };

      useAuthStore.getState().openCashSession(session);

      const state = useAuthStore.getState();
      expect(state.currentSession).toEqual(session);
    });

    it('should close cash session', () => {
      const session = {
        id: 'session-1',
        employeeId: '1',
        employeeName: 'João',
        openedAt: new Date().toISOString(),
        openingBalance: 200,
        status: 'OPEN' as const,
      };

      useAuthStore.getState().openCashSession(session);
      useAuthStore.getState().closeCashSession();

      const state = useAuthStore.getState();
      expect(state.currentSession?.status).toBe('CLOSED');
      expect(state.currentSession?.closedAt).toBeDefined();
    });
  });
});
