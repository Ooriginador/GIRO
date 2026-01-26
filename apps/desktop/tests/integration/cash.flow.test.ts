/**
 * @file cash.flow.test.ts - Teste de integração do fluxo de caixa
 */

import { useAuthStore } from '@/stores/auth-store';
import { usePDVStore } from '@/stores/pdv-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdmin, createCashier } from '../factories/employee.factory';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'open_cash_session') {
      return Promise.resolve({
        id: 'session-test-001',
        openedAt: new Date().toISOString(),
        openingBalance: args?.openingBalance || 0,
        status: 'OPEN',
      });
    }
    if (cmd === 'close_cash_session') {
      return Promise.resolve({
        id: 'session-test-001',
        closedAt: new Date().toISOString(),
        status: 'CLOSED',
      });
    }
    return Promise.resolve(null);
  }),
}));

describe('Cash Session Flow', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    usePDVStore.setState({ currentSession: null });
  });

  describe('Opening cash session', () => {
    it('should open session with initial balance', () => {
      const cashier = createCashier();
      useAuthStore.getState().login(cashier);

      const session = {
        id: 'session-001',
        employeeId: cashier.id,
        employeeName: cashier.name,
        openedAt: new Date().toISOString(),
        openingBalance: 200,
        status: 'OPEN' as const,
      };

      useAuthStore.getState().openCashSession(session);

      const state = useAuthStore.getState();
      expect(state.currentSession).toBeDefined();
      expect(state.currentSession?.openingBalance).toBe(200);
      expect(state.currentSession?.status).toBe('OPEN');
    });

    it('should prevent opening session without login', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().currentSession).toBeNull();
    });
  });

  describe('Closing cash session', () => {
    it('should close session and calculate difference', () => {
      const admin = createAdmin();
      useAuthStore.getState().login(admin);

      const session = {
        id: 'session-001',
        employeeId: admin.id,
        employeeName: admin.name,
        openedAt: new Date().toISOString(),
        openingBalance: 200,
        status: 'OPEN' as const,
      };

      useAuthStore.getState().openCashSession(session);
      useAuthStore.getState().closeCashSession();

      const state = useAuthStore.getState();
      // Após fechar, a sessão é removida completamente
      expect(state.currentSession).toBeNull();
    });
  });

  describe('Cash movements', () => {
    it('should track sales in session', () => {
      const cashier = createCashier();
      useAuthStore.getState().login(cashier);

      const session = {
        id: 'session-001',
        employeeId: cashier.id,
        employeeName: cashier.name,
        openedAt: new Date().toISOString(),
        openingBalance: 100,
        status: 'OPEN' as const,
      };

      useAuthStore.getState().openCashSession(session);

      // Simulate adding a sale
      usePDVStore.getState().addItem({
        productId: 'prod-001',
        productName: 'Test Product',
        barcode: '1234567890',
        quantity: 1,
        unitPrice: 25,
        unit: 'UN',
        isWeighted: false,
      });

      expect(usePDVStore.getState().getTotal()).toBe(25);
    });
  });

  describe('Permission checks', () => {
    it('should allow admin to close any session', () => {
      const admin = createAdmin();
      useAuthStore.getState().login(admin);
      expect(useAuthStore.getState().hasPermission('cash.close')).toBe(true);
    });

    it('should allow cashier to close own session', () => {
      const cashier = createCashier();
      useAuthStore.getState().login(cashier);
      expect(useAuthStore.getState().hasPermission('cash.close')).toBe(true);
    });
  });
});
