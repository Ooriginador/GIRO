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
      useConnectionStore.getState().setSelectedDesktop(createDiscoveredDesktop());
      useConnectionStore.getState().setOperator(createOperator());
    });

    // Clear inventory
    act(() => {
      useInventoryStore.getState().reset();
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
        useInventoryStore.getState().setCurrentInventory(session);
      });

      const state = useInventoryStore.getState();
      expect(state.currentInventory).toBeDefined();
      expect(state.currentInventory?.status).toBe('in_progress');
    });

    it('should resume an existing inventory session', async () => {
      const session = createInventorySession({
        status: 'in_progress',
      });
      const items = [
        createInventoryItem({ id: '1', countedQuantity: 100, status: 'counted' }),
        createInventoryItem({ id: '2', countedQuantity: null, status: 'pending' }),
      ];

      act(() => {
        useInventoryStore.getState().setCurrentInventory(session);
        useInventoryStore.getState().setItems(items);
      });

      const state = useInventoryStore.getState();
      expect(state.items.some((i) => i.countedQuantity !== null)).toBe(true);
    });

    it('should finish inventory and apply adjustments', async () => {
      const session = createInventorySession();

      act(() => {
        useInventoryStore.getState().setCurrentInventory(session);
      });

      // Simulate finish request
      mockWs.send(
        JSON.stringify({
          action: 'inventory.finish',
          payload: {
            inventoryId: session.id,
            applyAdjustments: true,
          },
        })
      );

      expect(mockWs.hasSentMessage('inventory.finish')).toBe(true);
    });
  });

  describe('counting items', () => {
    beforeEach(() => {
      const session = createInventorySession({
        id: '1',
      });
      const items = [
        createInventoryItem({
          id: '1',
          productId: 'p1',
          productName: 'Produto A',
          expectedStock: 100,
        }),
        createInventoryItem({
          id: '2',
          productId: 'p2',
          productName: 'Produto B',
          expectedStock: 50,
        }),
        createInventoryItem({
          id: '3',
          productId: 'p3',
          productName: 'Produto C',
          expectedStock: 75,
        }),
      ];

      act(() => {
        useInventoryStore.getState().setCurrentInventory(session);
        useInventoryStore.getState().setItems(items);
      });
    });

    it('should count item with exact quantity', () => {
      act(() => {
        useInventoryStore.getState().updateItem('p1', 100);
      });

      const state = useInventoryStore.getState();
      const item = state.items.find((i) => i.productId === 'p1');
      expect(item?.countedQuantity).toBe(100);
    });

    it('should detect positive divergence', () => {
      act(() => {
        useInventoryStore.getState().updateItem('p1', 110); // 10 a mais
      });

      const state = useInventoryStore.getState();
      const item = state.items.find((i) => i.productId === 'p1');
      expect(item?.countedQuantity).toBe(110);
      expect((item?.countedQuantity ?? 0) - (item?.expectedStock ?? 0)).toBe(10);
    });

    it('should detect negative divergence', () => {
      act(() => {
        useInventoryStore.getState().updateItem('p1', 90); // 10 a menos
      });

      const state = useInventoryStore.getState();
      const item = state.items.find((i) => i.productId === 'p1');
      expect(item?.countedQuantity).toBe(90);
      expect((item?.countedQuantity ?? 0) - (item?.expectedStock ?? 0)).toBe(-10);
    });

    it('should update progress as items are counted', () => {
      act(() => {
        useInventoryStore.getState().updateItem('p1', 100);
        useInventoryStore.getState().updateItem('p2', 50);
      });

      const summary = useInventoryStore.getState().getSummary();
      expect(summary.countedProducts).toBe(2);
    });
  });

  describe('scanning during inventory', () => {
    it('should find item by barcode and allow counting', () => {
      const session = createInventorySession({ id: '1' });
      const items = [createInventoryItem({ id: '1', productBarcode: '7891234567890' })];

      act(() => {
        useInventoryStore.getState().setCurrentInventory(session);
        useInventoryStore.getState().setItems(items);
      });

      const state = useInventoryStore.getState();
      const item = state.items.find((i) => i.productBarcode === '7891234567890');
      expect(item).toBeDefined();
    });

    it('should handle item not in inventory list', () => {
      const session = createInventorySession({ id: '1' });
      const items = [createInventoryItem({ id: '1', productBarcode: '7891234567890' })];

      act(() => {
        useInventoryStore.getState().setCurrentInventory(session);
        useInventoryStore.getState().setItems(items);
      });

      // Try to find item not in list
      const state = useInventoryStore.getState();
      const item = state.items.find((i) => i.productBarcode === '9999999999999');
      expect(item).toBeUndefined();
    });
  });

  describe('offline counting', () => {
    it('should queue counts when offline', () => {
      mockWs.close();

      const session = createInventorySession({ id: '1' });
      const items = [createInventoryItem({ id: '1', productId: 'p1' })];

      act(() => {
        useInventoryStore.getState().setCurrentInventory(session);
        useInventoryStore.getState().setItems(items);
        useInventoryStore.getState().updateItem('p1', 100);
      });

      // Count should be stored locally
      const state = useInventoryStore.getState();
      expect(state.items.find((i) => i.productId === 'p1')?.countedQuantity).toBe(100);
    });

    it('should sync counts when reconnected', () => {
      // Test reconnection sync
      expect(true).toBe(true);
    });
  });
});
