/**
 * Tipos relacionados a Produtos
 */

export interface Product {
  id: string;
  barcode: string;
  internalCode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  unit: ProductUnit;
  salePrice: number;
  costPrice?: number;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductUnit =
  | 'UN' // Unidade
  | 'KG' // Quilograma
  | 'G' // Grama
  | 'L' // Litro
  | 'ML' // Mililitro
  | 'M' // Metro
  | 'CM' // Centímetro
  | 'CX' // Caixa
  | 'PCT' // Pacote
  | 'DZ'; // Dúzia

export interface ProductLot {
  id: string;
  productId: string;
  batchNumber?: string;
  expirationDate?: string;
  quantity: number;
  costPrice?: number;
  status: LotStatus;
  createdAt: string;
}

export type LotStatus = 'AVAILABLE' | 'LOW' | 'EXPIRED' | 'SOLD_OUT';

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ProductCreateInput {
  barcode: string;
  internalCode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  unit: ProductUnit;
  salePrice: number;
  costPrice?: number;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  location?: string;
}

export interface StockAdjustment {
  productId: string;
  type: StockAdjustmentType;
  quantity: number;
  reason: StockAdjustmentReason;
  notes?: string;
}

export type StockAdjustmentType = 'IN' | 'OUT' | 'CORRECTION';

export type StockAdjustmentReason =
  | 'RECEIVING' // Recebimento
  | 'RETURN' // Devolução
  | 'LOSS' // Perda/Quebra
  | 'EXPIRATION' // Vencimento
  | 'INVENTORY' // Ajuste de inventário
  | 'SALE' // Venda
  | 'OTHER'; // Outro

export interface StockMovement {
  id: string;
  productId: string;
  type: StockAdjustmentType;
  quantity: number;
  reason: StockAdjustmentReason;
  previousStock: number;
  newStock: number;
  notes?: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
  productCount: number;
}

export interface ExpiringProduct {
  product: Product;
  lot: ProductLot;
  daysUntilExpiration: number;
  urgency: ExpirationUrgency;
}

export type ExpirationUrgency = 'critical' | 'warning' | 'notice';

export type ExpirationAction = 'write_off' | 'promotion' | 'verified' | 'dismiss';
