/**
 * Hook para gerenciar inventário
 */

import { useInventoryStore } from '@stores/inventoryStore';
import type { Inventory, InventoryItem, InventoryScope, InventorySummary } from '@/types/inventory';
import type {
  InventoryCountPayload,
  InventoryCountResponse,
  InventoryFinishPayload,
  InventoryFinishResponse,
  InventoryStartPayload,
  InventoryStartResponse,
} from '@/types/message';
import { useCallback, useState } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseInventoryResult {
  // State
  currentInventory: Inventory | null;
  items: InventoryItem[];
  summary: InventorySummary;
  isLoading: boolean;
  error: string | null;

  // Compatibilidade
  countedItems: InventoryItem[];

  // Actions
  startInventory: (scope: InventoryScope, categoryId?: string, name?: string) => Promise<void>;
  countProduct: (productId: string, quantity: number, notes?: string) => Promise<void>;
  countItem: (productId: string, quantity: number, notes?: string) => Promise<void>;
  skipProduct: (productId: string) => void;
  skipItem: (productId: string) => void;
  finishInventory: (applyAdjustments: boolean) => Promise<InventoryFinishResponse>;
  cancelInventory: () => Promise<void>;

  // Getters
  getNextPendingItem: () => InventoryItem | undefined;
  getItemByBarcode: (barcode: string) => InventoryItem | undefined;
}

export function useInventory(): UseInventoryResult {
  const [error, setError] = useState<string | null>(null);

  const {
    currentInventory,
    items,
    isLoading,
    setCurrentInventory,
    setItems,
    updateItem,
    setItemStatus,
    setIsLoading,
    getSummary,
    getItemByProductId,
    getPendingItems,
    reset,
  } = useInventoryStore();

  const { send, isConnected } = useWebSocket();

  const startInventory = useCallback(
    async (scope: InventoryScope, categoryId?: string, name?: string) => {
      if (!isConnected) {
        setError('Não conectado ao servidor');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: InventoryStartPayload = {
          scope,
          categoryId,
          name,
        };

        const response = await send<InventoryStartPayload, InventoryStartResponse>(
          'inventory.start',
          payload
        );

        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Falha ao iniciar inventário');
        }

        const data = response.data;

        const inventory: Inventory = {
          id: data.inventoryId,
          name: data.name,
          scope: data.scope as InventoryScope,
          status: 'in_progress',
          startedAt: data.startedAt,
          employeeId: '', // Será preenchido pelo servidor
          employeeName: '',
          expectedProducts: data.expectedProducts,
          countedProducts: 0,
          productsWithDifference: 0,
        };

        const inventoryItems: InventoryItem[] = data.products.map((p) => ({
          id: `${data.inventoryId}-${p.id}`,
          inventoryId: data.inventoryId,
          productId: p.id,
          productBarcode: p.barcode,
          productName: p.name,
          expectedStock: p.expectedStock,
          countedQuantity: null,
          difference: 0,
          status: 'pending',
        }));

        setCurrentInventory(inventory);
        setItems(inventoryItems);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, setIsLoading, setCurrentInventory, setItems]
  );

  const countProduct = useCallback(
    async (productId: string, quantity: number, notes?: string) => {
      if (!currentInventory) {
        setError('Nenhum inventário em andamento');
        return;
      }

      if (!isConnected) {
        // Conta localmente mesmo sem conexão
        updateItem(productId, quantity, notes);
        return;
      }

      try {
        const payload: InventoryCountPayload = {
          inventoryId: currentInventory.id,
          productId,
          countedQuantity: quantity,
        };

        const response = await send<InventoryCountPayload, InventoryCountResponse>(
          'inventory.count',
          payload
        );

        if (response.success && response.data) {
          updateItem(productId, response.data.countedQuantity, notes);
        } else {
          // Falhou no servidor, mas conta localmente
          updateItem(productId, quantity, notes);
        }
      } catch {
        // Erro de conexão, conta localmente
        updateItem(productId, quantity, notes);
      }
    },
    [currentInventory, isConnected, send, updateItem]
  );

  const skipProduct = useCallback(
    (productId: string) => {
      setItemStatus(productId, 'skipped');
    },
    [setItemStatus]
  );

  const finishInventory = useCallback(
    async (applyAdjustments: boolean): Promise<InventoryFinishResponse> => {
      if (!currentInventory) {
        throw new Error('Nenhum inventário em andamento');
      }

      if (!isConnected) {
        throw new Error('Não conectado ao servidor');
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: InventoryFinishPayload = {
          inventoryId: currentInventory.id,
          applyAdjustments,
        };

        const response = await send<InventoryFinishPayload, InventoryFinishResponse>(
          'inventory.finish',
          payload
        );

        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Falha ao finalizar inventário');
        }

        reset();
        return response.data;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentInventory, isConnected, send, setIsLoading, reset]
  );

  const cancelInventory = useCallback(async () => {
    if (!currentInventory) {
      return;
    }

    if (isConnected) {
      try {
        await send('inventory.cancel', { inventoryId: currentInventory.id });
      } catch {
        // Ignora erro, cancela localmente de qualquer forma
      }
    }

    reset();
  }, [currentInventory, isConnected, send, reset]);

  const getNextPendingItem = useCallback((): InventoryItem | undefined => {
    const pending = getPendingItems();
    return pending[0];
  }, [getPendingItems]);

  const getItemByBarcode = useCallback(
    (barcode: string): InventoryItem | undefined => {
      return items.find((item) => item.productBarcode === barcode);
    },
    [items]
  );

  return {
    currentInventory,
    items,
    summary: getSummary(),
    isLoading,
    error,
    startInventory,
    countProduct,
    countItem: countProduct,
    skipProduct,
    skipItem: skipProduct,
    finishInventory,
    cancelInventory,
    getNextPendingItem,
    getItemByBarcode,
    countedItems: items,
  };
}
