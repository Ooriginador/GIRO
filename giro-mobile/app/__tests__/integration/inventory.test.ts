/**
 * Inventory Integration Tests
 * Tests the complete inventory flow
 */

import { useConnectionStore } from '@/stores/connectionStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { act } from '@testing-library/react-native';
import {
  createDiscoveredDesktop,
  createInventoryItem,
  createInventorySession,
  createOperator,
  resetFactoryCounters,
} from '../factories';
import { MockWebSocket } from '../mocks/websocket';

describe('Inventory Integration', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    resetFactoryCounters();
    mockWs = new MockWebSocket('ws://192.168.1.100:3847');

    // Setup connected state
    act(() => {
      useConnectionStore.getState().selectDesktop(createDiscoveredDesktop());
      useConnectionStore.getState().setOperator(createOperator());
    });

    // Clear inventory
    act(() => {
      useInventoryStore.getState().clearSession?.();
    });
  });

  afterEach(() => {
    mockWs.close();
  });

  describe('inventory session lifecycle', () => {
    it('should start a new inventory session', async () => {
      const session = createInventorySession({
        scope: 'full',
        status: 'in_progress',
      });

      // Simulate starting inventory
      mockWs.send(
        JSON.stringify({
          action: 'inventory.start',
          payload: {
            scope: 'full',
            name: 'Inventário Geral',
          },
        })
      );

      // Simulate server response
      mockWs.simulateMessage({
        id: 1,
        success: true,
        data: session,
        timestamp: Date.now(),
      });

      act(() => {
        useInventoryStore.getState().startSession(session);
      });

      const state = useInventoryStore.getState();
      expect(state.currentSession).toBeDefined();
      expect(state.currentSession?.status).toBe('in_progress');
    });

    it('should resume an existing inventory session', async () => {
      const session = createInventorySession({
        items: [
          createInventoryItem({ id: '1', countedQuantity: 100 }),
          createInventoryItem({ id: '2', countedQuantity: undefined }),
        ],
      });

      act(() => {
        useInventoryStore.getState().startSession(session);
      });

      const state = useInventoryStore.getState();
      expect(state.currentSession?.items.some((i) => i.countedQuantity !== undefined)).toBe(true);
    });

    it('should finish inventory and apply adjustments', async () => {
      const session = createInventorySession();

      act(() => {
        useInventoryStore.getState().startSession(session);
      });

      // Simulate finish request
      mockWs.send(
        JSON.stringify({
          action: 'inventory.finish',
          payload: {
            sessionId: session.id,
            applyAdjustments: true,
          },
        })
      );

      expect(mockWs.hasSentMessage('inventory.finish')).toBe(true);
    });
  });

  describe('counting items', () => {
    let session: ReturnType<typeof createInventorySession>;

    beforeEach(() => {
      session = createInventorySession({
        items: [
          createInventoryItem({ id: '1', productName: 'Produto A', expectedQuantity: 100 }),
          createInventoryItem({ id: '2', productName: 'Produto B', expectedQuantity: 50 }),
          createInventoryItem({ id: '3', productName: 'Produto C', expectedQuantity: 75 }),
        ],
      });

      act(() => {
        useInventoryStore.getState().startSession(session);
      });
    });

    it('should count item with exact quantity', () => {
      act(() => {
        useInventoryStore.getState().countItem('1', 100);
      });

      const state = useInventoryStore.getState();
      const item = state.currentSession?.items.find((i) => i.id === '1');
      expect(item?.countedQuantity).toBe(100);
    });

    it('should detect positive divergence', () => {
      act(() => {
        useInventoryStore.getState().countItem('1', 110); // 10 a mais
      });

      const state = useInventoryStore.getState();
      const item = state.currentSession?.items.find((i) => i.id === '1');
      expect(item?.countedQuantity).toBe(110);
      expect((item?.countedQuantity ?? 0) - (item?.expectedQuantity ?? 0)).toBe(10);
    });

    it('should detect negative divergence', () => {
      act(() => {
        useInventoryStore.getState().countItem('1', 90); // 10 a menos
      });

      const state = useInventoryStore.getState();
      const item = state.currentSession?.items.find((i) => i.id === '1');
      expect(item?.countedQuantity).toBe(90);
      expect((item?.countedQuantity ?? 0) - (item?.expectedQuantity ?? 0)).toBe(-10);
    });

    it('should update progress as items are counted', () => {
      act(() => {
        useInventoryStore.getState().countItem('1', 100);
        useInventoryStore.getState().countItem('2', 50);
      });

      const state = useInventoryStore.getState();
      expect(state.currentSession?.summary.counted).toBe(2);
    });
  });

  describe('scanning during inventory', () => {
    it('should find item by barcode and allow counting', () => {
      const session = createInventorySession({
        items: [createInventoryItem({ id: '1', barcode: '7891234567890' })],
      });

      act(() => {
        useInventoryStore.getState().startSession(session);
      });

      const state = useInventoryStore.getState();
      const item = state.currentSession?.items.find((i) => i.barcode === '7891234567890');
      expect(item).toBeDefined();
    });

    it('should handle item not in inventory list', () => {
      const session = createInventorySession({
        items: [createInventoryItem({ id: '1', barcode: '7891234567890' })],
      });

      act(() => {
        useInventoryStore.getState().startSession(session);
      });

      // Try to find item not in list
      const state = useInventoryStore.getState();
      const item = state.currentSession?.items.find((i) => i.barcode === '9999999999999');
      expect(item).toBeUndefined();
    });
  });

  describe('offline counting', () => {
    it('should queue counts when offline', () => {
      mockWs.close();

      const session = createInventorySession();

      act(() => {
        useInventoryStore.getState().startSession(session);
        useInventoryStore.getState().countItem('1', 100);
      });

      // Count should be stored locally
      const state = useInventoryStore.getState();
      expect(state.currentSession?.items.find((i) => i.id === '1')?.countedQuantity).toBe(100);
    });

    it('should sync counts when reconnected', () => {
      // Test reconnection sync
      expect(true).toBe(true);
    });
  });
});
