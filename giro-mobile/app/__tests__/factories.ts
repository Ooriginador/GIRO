/**
 * Test Factories
 * Factory functions to create test data
 */

import type { DiscoveredDesktop, Operator } from '@/types/connection';
import type { InventoryItem, InventorySummary } from '@/types/inventory';
import type { Product, ProductLot } from '@/types/product';

// =============================================================================
// PRODUCT FACTORIES
// =============================================================================

let productIdCounter = 1;

export function createProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id || String(productIdCounter++);

  return {
    id,
    barcode: `789${id.padStart(10, '0')}`,
    name: `Produto Teste ${id}`,
    description: `Descrição do produto ${id}`,
    salePrice: 9.99,
    costPrice: 5.0,
    currentStock: 100,
    minStock: 10,
    unit: 'UN',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createProducts(count: number, overrides: Partial<Product> = {}): Product[] {
  return Array.from({ length: count }, (_, i) =>
    createProduct({
      id: String(i + 1),
      barcode: `789${String(i + 1).padStart(10, '0')}`,
      name: `Produto ${i + 1}`,
      ...overrides,
    })
  );
}

export function createProductLot(overrides: Partial<ProductLot> = {}): ProductLot {
  return {
    id: '1',
    productId: '1',
    batchNumber: 'LOT-001',
    quantity: 50,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    status: 'AVAILABLE',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// INVENTORY FACTORIES
// =============================================================================

export function createInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: '1',
    inventoryId: '1',
    productId: '1',
    productBarcode: '7890000000001',
    productName: 'Produto Teste',
    expectedStock: 100,
    countedQuantity: null,
    difference: 0,
    status: 'pending',
    unit: 'UN',
    ...overrides,
  };
}

export function createInventoryItems(count: number): InventoryItem[] {
  return Array.from({ length: count }, (_, i) =>
    createInventoryItem({
      id: String(i + 1),
      productId: String(i + 1),
      productName: `Produto ${i + 1}`,
      productBarcode: `789${String(i + 1).padStart(10, '0')}`,
    })
  );
}

export function createInventorySummary(
  overrides: Partial<InventorySummary> = {}
): InventorySummary {
  return {
    totalProducts: 100,
    countedProducts: 50,
    pendingProducts: 50,
    productsWithDifference: 5,
    totalPositiveDiff: 3,
    totalNegativeDiff: 2,
    netDifference: 1,
    completionPercentage: 50,
    ...overrides,
  };
}

// Note: InventorySession type might not exist, using Inventory instead
import type { Inventory as InventoryType } from '@/types/inventory';

export function createInventorySession(overrides: Partial<InventoryType> = {}): InventoryType {
  return {
    id: '1',
    name: 'Inventário Geral',
    scope: 'full',
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    employeeId: '1',
    employeeName: 'Operador Teste',
    expectedProducts: 10,
    countedProducts: 0,
    productsWithDifference: 0,
    ...overrides,
  };
}

// =============================================================================
// CONNECTION FACTORIES
// =============================================================================

export function createOperator(overrides: Partial<Operator> = {}): Operator {
  return {
    id: '1',
    name: 'João Silva',
    role: 'caixa',
    ...overrides,
  };
}

export function createDiscoveredDesktop(
  overrides: Partial<DiscoveredDesktop> = {}
): DiscoveredDesktop {
  return {
    id: '1',
    name: 'GIRO-DESKTOP-001',
    host: 'desktop-001',
    ip: '192.168.1.100',
    port: 3847,
    version: '1.0.0',
    lastSeen: Date.now(),
    ...overrides,
  };
}

// =============================================================================
// WEBSOCKET MESSAGE FACTORIES
// =============================================================================

export function createWSResponse<T>(data: T, success = true) {
  return {
    id: 1,
    success,
    data,
    timestamp: Date.now(),
  };
}

export function createWSError(code: string, message: string) {
  return {
    id: 1,
    success: false,
    error: {
      code,
      message,
    },
    timestamp: Date.now(),
  };
}

// =============================================================================
// RESET COUNTERS
// =============================================================================

export function resetFactoryCounters() {
  productIdCounter = 1;
}
