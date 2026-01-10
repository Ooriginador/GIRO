/**
 * Tipos relacionados a mensagens WebSocket
 */

// ============================================
// Estruturas Base
// ============================================

export interface WSRequest<T = unknown> {
  id: number;
  action: WSActionType;
  payload: T;
  token?: string;
  timestamp: number;
}

export interface WSResponse<T = unknown> {
  id: number;
  success: boolean;
  data?: T;
  error?: WSError;
  timestamp: number;
}

export interface WSEvent<T = unknown> {
  id: string;
  event: WSEventType;
  data: T;
  timestamp: number;
}

export interface WSError {
  code: WSErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Actions (Mobile → Desktop)
// ============================================

export type WSActionType =
  // Auth
  | 'auth.login'
  | 'auth.logout'
  | 'auth.validate'
  // Products
  | 'product.get'
  | 'product.search'
  | 'product.create'
  | 'product.update'
  // Stock
  | 'stock.adjust'
  | 'stock.list'
  | 'stock.history'
  // Inventory
  | 'inventory.start'
  | 'inventory.count'
  | 'inventory.finish'
  | 'inventory.cancel'
  | 'inventory.status'
  // Expiration
  | 'expiration.list'
  | 'expiration.action'
  // Categories
  | 'category.list'
  // System
  | 'system.ping'
  | 'system.info';

// ============================================
// Events (Desktop → Mobile - Push)
// ============================================

export type WSEventType =
  // Stock updates
  | 'stock.updated'
  | 'stock.low'
  | 'stock.out'
  // Product updates
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  // Expiration alerts
  | 'expiration.alert'
  // Inventory
  | 'inventory.progress'
  // System
  | 'system.shutdown'
  | 'system.maintenance';

// ============================================
// Error Codes
// ============================================

export type WSErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'AUTH_EXPIRED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_ENTRY'
  | 'INSUFFICIENT_STOCK'
  | 'INVENTORY_IN_PROGRESS'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR'
  | 'TIMEOUT'
  | 'CONNECTION_LOST';

// ============================================
// Auth Payloads
// ============================================

export interface AuthLoginPayload {
  pin: string;
  deviceId: string;
  deviceName: string;
}

export interface AuthLoginResponse {
  token: string;
  expiresAt: string;
  employee: {
    id: string;
    name: string;
    role: EmployeeRole;
  };
}

export type EmployeeRole = 'caixa' | 'repositor' | 'gerente' | 'admin';

// ============================================
// Product Payloads
// ============================================

export interface ProductGetPayload {
  barcode: string;
}

export interface ProductSearchPayload {
  query: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
  filter?: 'all' | 'low' | 'zero' | 'expiring';
}

// ============================================
// Stock Payloads
// ============================================

export interface StockAdjustPayload {
  productId: string;
  type: 'IN' | 'OUT' | 'CORRECTION';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface StockAdjustResponse {
  previousStock: number;
  newStock: number;
  movementId: string;
}

export interface StockListPayload {
  filter?: 'all' | 'low' | 'zero' | 'expiring';
  categoryId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Inventory Payloads
// ============================================

export interface InventoryStartPayload {
  scope: 'full' | 'category' | 'section';
  categoryId?: string;
  name?: string;
}

export interface InventoryStartResponse {
  inventoryId: string;
  name: string;
  scope: string;
  startedAt: string;
  expectedProducts: number;
  products: Array<{
    id: string;
    barcode: string;
    name: string;
    expectedStock: number;
  }>;
}

export interface InventoryCountPayload {
  inventoryId: string;
  productId: string;
  countedQuantity: number;
}

export interface InventoryCountResponse {
  productId: string;
  expectedStock: number;
  countedQuantity: number;
  difference: number;
}

export interface InventoryFinishPayload {
  inventoryId: string;
  applyAdjustments: boolean;
}

export interface InventoryFinishResponse {
  inventoryId: string;
  totalProducts: number;
  productsWithDifference: number;
  totalDifference: number;
  adjustmentsApplied: boolean;
}

// ============================================
// Expiration Payloads
// ============================================

export interface ExpirationListPayload {
  daysAhead: number;
}

export interface ExpirationActionPayload {
  lotId: string;
  action: 'write_off' | 'promotion' | 'verified' | 'dismiss';
  notes?: string;
}

// ============================================
// Event Data Types
// ============================================

export interface StockUpdatedEventData {
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  type: 'IN' | 'OUT' | 'CORRECTION';
}

export interface ExpirationAlertEventData {
  productId: string;
  productName: string;
  lotId: string;
  expirationDate: string;
  daysUntilExpiration: number;
  urgency: 'critical' | 'warning' | 'notice';
}

// ============================================
// Message Union Types
// ============================================

export type WSMessage = WSRequest<unknown> | WSResponse<unknown> | WSEvent<unknown>;
