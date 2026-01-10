/**
 * InventoryStore Tests
 */

import { useInventoryStore } from '@/stores/inventoryStore';
import { act } from '@testing-library/react-native';

describe('inventoryStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useInventoryStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('should have no active inventory', () => {
      const state = useInventoryStore.getState();
      expect(state.currentInventory).toBeNull();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setCurrentInventory', () => {
    it('should set current inventory', () => {
      const mockInventory = {
        id: '1',
        name: 'Inventory Test',
        status: 'in_progress' as const,
        createdAt: new Date().toISOString(),
      };

      act(() => {
        useInventoryStore.getState().setCurrentInventory(mockInventory);
      });

      const state = useInventoryStore.getState();
      expect(state.currentInventory).toEqual(mockInventory);
    });

    it('should clear inventory when set to null', () => {
      const mockInventory = {
        id: '1',
        name: 'Inventory Test',
        status: 'in_progress' as const,
        createdAt: new Date().toISOString(),
      };

      act(() => {
        useInventoryStore.getState().setCurrentInventory(mockInventory);
        useInventoryStore.getState().setCurrentInventory(null);
      });

      const state = useInventoryStore.getState();
      expect(state.currentInventory).toBeNull();
    });
  });

  describe('setItems', () => {
    it('should set inventory items', () => {
      const mockItems = [
        {
          id: '1',
          productId: 'p1',
          productName: 'Product 1',
          expectedStock: 100,
          countedQuantity: 0,
          difference: 0,
          status: 'pending' as const,
        },
        {
          id: '2',
          productId: 'p2',
          productName: 'Product 2',
          expectedStock: 50,
          countedQuantity: 0,
          difference: 0,
          status: 'pending' as const,
        },
      ];

      act(() => {
        useInventoryStore.getState().setItems(mockItems);
      });

      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.items[0].productName).toBe('Product 1');
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      const mockItems = [
        {
          id: '1',
          productId: 'p1',
          productName: 'Product 1',
          expectedStock: 100,
          countedQuantity: 0,
          difference: 0,
          status: 'pending' as const,
        },
      ];

      act(() => {
        useInventoryStore.getState().setItems(mockItems);
      });
    });

    it('should update item counted quantity', () => {
      act(() => {
        useInventoryStore.getState().updateItem('p1', 95);
      });

      const state = useInventoryStore.getState();
      const item = state.items.find(i => i.productId === 'p1');
      expect(item?.countedQuantity).toBe(95);
      expect(item?.difference).toBe(-5); // 95 - 100 = -5
      expect(item?.status).toBe('counted');
    });

    it('should update item with notes', () => {
      act(() => {
        useInventoryStore.getState().updateItem('p1', 95, 'Test note');
      });

      const state = useInventoryStore.getState();
      const item = state.items.find(i => i.productId === 'p1');
      expect(item?.notes).toBe('Test note');
    });
  });

  describe('setItemStatus', () => {
    beforeEach(() => {
      const mockItems = [
        {
          id: '1',
          productId: 'p1',
          productName: 'Product 1',
          expectedStock: 100,
          countedQuantity: 0,
          difference: 0,
          status: 'pending' as const,
        },
      ];

      act(() => {
        useInventoryStore.getState().setItems(mockItems);
      });
    });

    it('should update item status', () => {
      act(() => {
        useInventoryStore.getState().setItemStatus('p1', 'skipped');
      });

      const state = useInventoryStore.getState();
      const item = state.items.find(i => i.productId === 'p1');
      expect(item?.status).toBe('skipped');
    });
  });

  describe('getSummary', () => {
    it('should calculate summary correctly', () => {
      const mockItems = [
        {
          id: '1',
          productId: 'p1',
          productName: 'Product 1',
          expectedStock: 100,
          countedQuantity: 95,
          difference: -5,
          status: 'counted' as const,
        },
        {
          id: '2',
          productId: 'p2',
          productName: 'Product 2',
          expectedStock: 50,
          countedQuantity: 55,
          difference: 5,
          status: 'counted' as const,
        },
        {
          id: '3',
          productId: 'p3',
          productName: 'Product 3',
          expectedStock: 30,
          countedQuantity: 0,
          difference: 0,
          status: 'pending' as const,
        },
      ];

      act(() => {
        useInventoryStore.getState().setItems(mockItems);
      });

      const summary = useInventoryStore.getState().getSummary();
      expect(summary.totalProducts).toBe(3);
      expect(summary.countedProducts).toBe(2);
      expect(summary.pendingProducts).toBe(1);
      expect(summary.productsWithDifference).toBe(2);
    });
  });

  describe('getItemByProductId', () => {
    beforeEach(() => {
      const mockItems = [
        {
          id: '1',
          productId: 'p1',
          productName: 'Product 1',
          expectedStock: 100,
          countedQuantity: 0,
          difference: 0,
          status: 'pending' as const,
        },
      ];

      act(() => {
        useInventoryStore.getState().setItems(mockItems);
      });
    });

    it('should find item by product id', () => {
      const item = useInventoryStore.getState().getItemByProductId('p1');
      expect(item).toBeDefined();
      expect(item?.productName).toBe('Product 1');
    });

    it('should return undefined for non-existent product', () => {
      const item = useInventoryStore.getState().getItemByProductId('non-existent');
      expect(item).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const mockInventory = {
        id: '1',
        name: 'Inventory Test',
        status: 'in_progress' as const,
        createdAt: new Date().toISOString(),
      };

      act(() => {
        useInventoryStore.getState().setCurrentInventory(mockInventory);
        useInventoryStore.getState().setIsLoading(true);
        useInventoryStore.getState().reset();
      });

      const state = useInventoryStore.getState();
      expect(state.currentInventory).toBeNull();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });
});
