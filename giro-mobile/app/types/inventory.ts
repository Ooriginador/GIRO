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
  unit?: string;
  expectedStock: number;
  expectedQuantity?: number;
  countedQuantity: number | null;
  difference: number;
  status: InventoryItemStatus;
  countedAt?: string;
  notes?: string;
}

export type InventoryItemStatus = 'pending' | 'counted' | 'skipped';

export interface InventorySummary {
  totalProducts: number;
  total?: number;
  countedProducts: number;
  counted?: number;
  pendingProducts: number;
  pending?: number;
  productsWithDifference: number;
  divergent?: number;
  totalPositiveDiff: number;
  positiveAdjustments?: number;
  totalNegativeDiff: number;
  negativeAdjustments?: number;
  netDifference: number;
  completionPercentage: number;
  progress?: number;
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
