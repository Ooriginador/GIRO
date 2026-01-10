/**
 * Tipos relacionados a inventário
 */

export type InventoryStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export type InventoryScope = 'full' | 'category' | 'section';

export interface Inventory {
  id: string;
  name: string;
  scope: InventoryScope;
  categoryId?: string;
  categoryName?: string;
  status: InventoryStatus;
  startedAt: string;
  completedAt?: string;
  employeeId: string;
  employeeName: string;
  expectedProducts: number;
  countedProducts: number;
  productsWithDifference: number;
}

export interface InventoryItem {
  id: string;
  inventoryId: string;
  productId: string;
  productBarcode: string;
  productName: string;
  expectedStock: number;
  countedQuantity: number | null;
  difference: number;
  status: InventoryItemStatus;
  countedAt?: string;
  notes?: string;
}

export type InventoryItemStatus = 'pending' | 'counted' | 'skipped';

export interface InventorySummary {
  totalProducts: number;
  countedProducts: number;
  pendingProducts: number;
  productsWithDifference: number;
  totalPositiveDiff: number;
  totalNegativeDiff: number;
  netDifference: number;
  completionPercentage: number;
}

export interface InventoryCount {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface InventoryCreateInput {
  name?: string;
  scope: InventoryScope;
  categoryId?: string;
}

export interface InventoryFinishInput {
  inventoryId: string;
  applyAdjustments: boolean;
  notes?: string;
}
