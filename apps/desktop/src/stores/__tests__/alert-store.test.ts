/**
 * @file alert-store.test.ts - Testes para Alert store
 */

import {
  useAlertStore,
  type Alert,
  type AlertSeverity,
  type AlertType,
} from '@/stores/alert-store';
import { beforeEach, describe, expect, it } from 'vitest';

const createMockAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: `alert-${Date.now()}`,
  type: 'LOW_STOCK' as AlertType,
  severity: 'WARNING' as AlertSeverity,
  title: 'Estoque Baixo',
  message: 'Produto X está com estoque baixo',
  productId: 'prod-1',
  productName: 'Produto Teste',
  isRead: false,
  isDismissed: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Alert Store', () => {
  beforeEach(() => {
    useAlertStore.setState({
      alerts: [],
      unreadCount: 0,
      isLoading: false,
    });
  });

  describe('setAlerts', () => {
    it('should set alerts and calculate unread count', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', isRead: false }),
        createMockAlert({ id: 'alert-2', isRead: true }),
        createMockAlert({ id: 'alert-3', isRead: false }),
      ];

      useAlertStore.getState().setAlerts(alerts);

      const state = useAlertStore.getState();
      expect(state.alerts).toHaveLength(3);
      expect(state.unreadCount).toBe(2);
    });

    it('should exclude dismissed alerts from unread count', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', isRead: false, isDismissed: false }),
        createMockAlert({ id: 'alert-2', isRead: false, isDismissed: true }),
      ];

      useAlertStore.getState().setAlerts(alerts);

      const state = useAlertStore.getState();
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAlertStore.getState().setLoading(true);
      expect(useAlertStore.getState().isLoading).toBe(true);

      useAlertStore.getState().setLoading(false);
      expect(useAlertStore.getState().isLoading).toBe(false);
    });
  });

  describe('addAlert', () => {
    it('should add alert to the beginning of the list', () => {
      const existingAlert = createMockAlert({ id: 'existing' });
      useAlertStore.setState({ alerts: [existingAlert], unreadCount: 1 });

      const newAlert = createMockAlert({ id: 'new', title: 'Novo Alerta' });
      useAlertStore.getState().addAlert(newAlert);

      const state = useAlertStore.getState();
      expect(state.alerts).toHaveLength(2);
      expect(state.alerts[0]?.id).toBe('new');
    });

    it('should update unread count when adding unread alert', () => {
      useAlertStore.getState().addAlert(createMockAlert({ isRead: false }));

      expect(useAlertStore.getState().unreadCount).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark specific alert as read', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', isRead: false }),
        createMockAlert({ id: 'alert-2', isRead: false }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 2 });

      useAlertStore.getState().markAsRead('alert-1');

      const state = useAlertStore.getState();
      expect(state.alerts.find((a) => a.id === 'alert-1')?.isRead).toBe(true);
      expect(state.alerts.find((a) => a.id === 'alert-2')?.isRead).toBe(false);
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all alerts as read', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', isRead: false }),
        createMockAlert({ id: 'alert-2', isRead: false }),
        createMockAlert({ id: 'alert-3', isRead: false }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 3 });

      useAlertStore.getState().markAllAsRead();

      const state = useAlertStore.getState();
      expect(state.alerts.every((a) => a.isRead)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('dismissAlert', () => {
    it('should dismiss specific alert', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', isDismissed: false }),
        createMockAlert({ id: 'alert-2', isDismissed: false }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 2 });

      useAlertStore.getState().dismissAlert('alert-1');

      const state = useAlertStore.getState();
      expect(state.alerts.find((a) => a.id === 'alert-1')?.isDismissed).toBe(true);
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('clearDismissed', () => {
    it('should remove all dismissed alerts', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', isDismissed: true }),
        createMockAlert({ id: 'alert-2', isDismissed: false }),
        createMockAlert({ id: 'alert-3', isDismissed: true }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 1 });

      useAlertStore.getState().clearDismissed();

      const state = useAlertStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0]?.id).toBe('alert-2');
    });
  });

  describe('getByType', () => {
    it('should filter alerts by type', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', type: 'LOW_STOCK' }),
        createMockAlert({ id: 'alert-2', type: 'EXPIRATION_WARNING' }),
        createMockAlert({ id: 'alert-3', type: 'LOW_STOCK' }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 3 });

      const lowStockAlerts = useAlertStore.getState().getByType('LOW_STOCK');

      expect(lowStockAlerts).toHaveLength(2);
      expect(lowStockAlerts.every((a) => a.type === 'LOW_STOCK')).toBe(true);
    });

    it('should exclude dismissed alerts from filter', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', type: 'LOW_STOCK', isDismissed: false }),
        createMockAlert({ id: 'alert-2', type: 'LOW_STOCK', isDismissed: true }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 1 });

      const lowStockAlerts = useAlertStore.getState().getByType('LOW_STOCK');

      expect(lowStockAlerts).toHaveLength(1);
    });
  });

  describe('getBySeverity', () => {
    it('should filter alerts by severity', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', severity: 'CRITICAL' }),
        createMockAlert({ id: 'alert-2', severity: 'WARNING' }),
        createMockAlert({ id: 'alert-3', severity: 'CRITICAL' }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 3 });

      const criticalAlerts = useAlertStore.getState().getBySeverity('CRITICAL');

      expect(criticalAlerts).toHaveLength(2);
      expect(criticalAlerts.every((a) => a.severity === 'CRITICAL')).toBe(true);
    });
  });

  describe('getCritical', () => {
    it('should return only critical alerts', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', severity: 'CRITICAL' }),
        createMockAlert({ id: 'alert-2', severity: 'WARNING' }),
        createMockAlert({ id: 'alert-3', severity: 'INFO' }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 3 });

      const criticalAlerts = useAlertStore.getState().getCritical();

      expect(criticalAlerts).toHaveLength(1);
      expect(criticalAlerts[0]?.severity).toBe('CRITICAL');
    });

    it('should exclude dismissed critical alerts', () => {
      const alerts = [
        createMockAlert({ id: 'alert-1', severity: 'CRITICAL', isDismissed: false }),
        createMockAlert({ id: 'alert-2', severity: 'CRITICAL', isDismissed: true }),
      ];
      useAlertStore.setState({ alerts, unreadCount: 1 });

      const criticalAlerts = useAlertStore.getState().getCritical();

      expect(criticalAlerts).toHaveLength(1);
    });
  });
});
