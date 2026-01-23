/**
 * Store de inventário - gerencia estado do inventário em andamento
 */

import type { Inventory, InventoryItem, InventorySummary } from '@/types/inventory';
import { create } from 'zustand';

interface InventoryStore {
  // State
  currentInventory: Inventory | null;
  items: InventoryItem[];
  countedItems: Map<string, number>;
  isLoading: boolean;

  // Actions
  setCurrentInventory: (inventory: Inventory | null) => void;
  setItems: (items: InventoryItem[]) => void;
  updateItem: (productId: string, countedQuantity: number, notes?: string) => void;
  setItemStatus: (productId: string, status: InventoryItem['status']) => void;
  setIsLoading: (isLoading: boolean) => void;

  // Computed
  getSummary: () => InventorySummary;
  getItemByProductId: (productId: string) => InventoryItem | undefined;
  getPendingItems: () => InventoryItem[];
  getCountedItems: () => InventoryItem[];
  getItemsWithDifference: () => InventoryItem[];

  // Reset
  reset: () => void;
}

const initialState = {
  currentInventory: null,
  items: [],
  countedItems: new Map<string, number>(),
  isLoading: false,
};

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  ...initialState,

  // Actions
  setCurrentInventory: (inventory) => set({ currentInventory: inventory }),

  setItems: (items) => set({ items }),

  updateItem: (productId, countedQuantity, notes) =>
    set((state) => {
      const newItems = state.items.map((item) => {
        if (item.productId === productId) {
          const difference = countedQuantity - item.expectedStock;
          return {
            ...item,
            countedQuantity,
            difference,
            status: 'counted' as const,
            countedAt: new Date().toISOString(),
            notes: notes || item.notes,
          };
        }
        return item;
      });

      const newCountedItems = new Map(state.countedItems);
      newCountedItems.set(productId, countedQuantity);

      return { items: newItems, countedItems: newCountedItems };
    }),

  setItemStatus: (productId, status) =>
    set((state) => ({
      items: state.items.map((item) => (item.productId === productId ? { ...item, status } : item)),
    })),

  setIsLoading: (isLoading) => set({ isLoading }),

  // Computed
  getSummary: () => {
    const items = get().items;

    const totalProducts = items.length;
    const countedProducts = items.filter((i) => i.status === 'counted').length;
    const pendingProducts = items.filter((i) => i.status === 'pending').length;
    const itemsWithDiff = items.filter((i) => i.status === 'counted' && i.difference !== 0);
    const productsWithDifference = itemsWithDiff.length;

    let totalPositiveDiff = 0;
    let totalNegativeDiff = 0;

    itemsWithDiff.forEach((item) => {
      if (item.difference > 0) {
        totalPositiveDiff += item.difference;
      } else {
        totalNegativeDiff += Math.abs(item.difference);
      }
    });

    const netDifference = totalPositiveDiff - totalNegativeDiff;
    const completionPercentage =
      totalProducts > 0 ? Math.round((countedProducts / totalProducts) * 100) : 0;

    return {
      totalProducts,
      countedProducts,
      pendingProducts,
      productsWithDifference,
      totalPositiveDiff,
      totalNegativeDiff,
      netDifference,
      completionPercentage,
    };
  },

  getItemByProductId: (productId) => {
    return get().items.find((i) => i.productId === productId);
  },

  getPendingItems: () => {
    return get().items.filter((i) => i.status === 'pending');
  },

  getCountedItems: () => {
    return get().items.filter((i) => i.status === 'counted');
  },

  getItemsWithDifference: () => {
    return get().items.filter((i) => i.status === 'counted' && i.difference !== 0);
  },

  // Reset
  reset: () =>
    set({
      ...initialState,
      countedItems: new Map<string, number>(),
    }),
}));
