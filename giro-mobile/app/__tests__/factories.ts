/**
 * Test Factories
 * Factory functions to create test data
 */

import type { DiscoveredDesktop, Operator } from '@/types/connection';
import type { InventoryItem, InventorySession, InventorySummary } from '@/types/inventory';
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
    maxStock: 500,
    category: 'Geral',
    categoryId: 'cat-1',
    unit: 'UN',
    active: true,
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
    lotNumber: 'LOT-001',
    quantity: 50,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    manufacturingDate: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// INVENTORY FACTORIES
// =============================================================================

export function createInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: '1',
    productId: '1',
    productName: 'Produto Teste',
    barcode: '7890000000001',
    expectedQuantity: 100,
    countedQuantity: undefined,
    unit: 'UN',
    category: 'Geral',
    location: 'A1',
    ...overrides,
  };
}

export function createInventoryItems(count: number): InventoryItem[] {
  return Array.from({ length: count }, (_, i) =>
    createInventoryItem({
      id: String(i + 1),
      productId: String(i + 1),
      productName: `Produto ${i + 1}`,
      barcode: `789${String(i + 1).padStart(10, '0')}`,
    })
  );
}

export function createInventorySummary(
  overrides: Partial<InventorySummary> = {}
): InventorySummary {
  return {
    total: 100,
    counted: 50,
    pending: 50,
    divergent: 5,
    progress: 50,
    positiveAdjustments: 3,
    negativeAdjustments: 2,
    ...overrides,
  };
}

export function createInventorySession(
  overrides: Partial<InventorySession> = {}
): InventorySession {
  return {
    id: '1',
    name: 'Inventário Geral',
    scope: 'full',
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    operatorId: '1',
    operatorName: 'Operador Teste',
    items: createInventoryItems(10),
    summary: createInventorySummary(),
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
    pin: '1234',
    ...overrides,
  };
}

export function createDiscoveredDesktop(
  overrides: Partial<DiscoveredDesktop> = {}
): DiscoveredDesktop {
  return {
    name: 'GIRO-DESKTOP-001',
    ip: '192.168.1.100',
    port: 3847,
    storeName: 'Mercado Central',
    version: '1.0.0',
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
