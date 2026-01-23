// ═══════════════════════════════════════════════════════════════════════════
// GIRO - TIPOS TYPESCRIPT
// Sistema PDV para Varejo
// ═══════════════════════════════════════════════════════════════════════════

// Re-export dos módulos específicos
export * from './business-profile';
export * from './motoparts';
export * from './nfce';

import type { Customer } from './motoparts';

// ────────────────────────────────────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────────────────────────────────────

export type ProductUnit =
  | 'UNIT'
  | 'KILOGRAM'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'METER'
  | 'PACK'
  | 'BOX'
  | 'DOZEN';

export type EmployeeRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'STOCKER';

export type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT' | 'DEBIT' | 'VOUCHER' | 'OTHER';

export type SaleStatus = 'COMPLETED' | 'CANCELED';

export type CashSessionStatus = 'OPEN' | 'CLOSED' | 'FORCED';

export type CashMovementType =
  | 'OPENING'
  | 'SALE'
  | 'WITHDRAWAL'
  | 'DEPOSIT'
  | 'ADJUSTMENT'
  | 'CLOSING';

export type StockMovementType =
  | 'ENTRY'
  | 'EXIT'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'LOSS'
  | 'CONSUMPTION';

export type LotStatus = 'AVAILABLE' | 'EXPIRED' | 'SOLD' | 'BLOCKED';

export type AlertType =
  | 'EXPIRATION_CRITICAL'
  | 'EXPIRATION_WARNING'
  | 'EXPIRATION_NOTICE'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'NEGATIVE_MARGIN'
  | 'SLOW_MOVING';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

// ────────────────────────────────────────────────────────────────────────────
// ENTIDADES PRINCIPAIS
// ────────────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  productCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  barcode?: string;
  internalCode: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
  unit: ProductUnit;
  salePrice: number;
  costPrice: number;
  minStock: number;
  currentStock: number;
  maxStock?: number;
  isWeighted: boolean;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLot {
  id: string;
  productId: string;
  product?: Product;
  lotNumber?: string;
  expirationDate: string;
  manufacturingDate?: string;
  quantity: number;
  costPrice: number;
  purchaseDate: string;
  supplierId?: string;
  supplier?: Supplier;
  status: LotStatus;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  pin: string;
  password?: string;
  role: EmployeeRole;
  isActive: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// VENDAS
// ────────────────────────────────────────────────────────────────────────────

export interface Sale {
  id: string;
  dailyNumber: number;
  employeeId: string;
  employee?: Employee;
  customerId?: string;
  customer?: Customer;
  cashSessionId: string;
  cashSession?: CashSession;
  items: SaleItem[];
  subtotal: number;
  discountType?: string;
  discountValue: number;
  discountReason?: string;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status: SaleStatus;
  canceledAt?: string;
  canceledById?: string;
  canceledBy?: Employee;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  lotId?: string;
  lot?: ProductLot;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// SESSÕES DE CAIXA
// ────────────────────────────────────────────────────────────────────────────

export interface CashSession {
  id: string;
  employeeId: string;
  employeeName?: string; // Added for compatibility with auth-store
  employee?: Employee;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  closingBalance?: number; // Added for compatibility with auth-store
  status: CashSessionStatus;
  notes?: string;
  sales?: Sale[];
  movements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  sessionId: string;
  session?: CashSession;
  type: CashMovementType;
  amount: number;
  description?: string;
  employeeId: string;
  employee?: Employee;
  createdAt: string;
}

export interface PaymentMethodSummary {
  method: string;
  amount: number;
  count: number;
}

export interface CashSessionSummary {
  session: CashSession;
  totalSales: number;
  totalCanceled: number;
  totalWithdrawals: number;
  totalSupplies: number;
  movementCount: number;
  salesByMethod: PaymentMethodSummary[];
  cashInDrawer: number;
}

// ────────────────────────────────────────────────────────────────────────────
// ESTOQUE
// ────────────────────────────────────────────────────────────────────────────

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  lotId?: string;
  lot?: ProductLot;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  employeeId?: string;
  employee?: Employee;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// ALERTAS
// ────────────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId?: string;
  product?: Product;
  lotId?: string;
  lot?: ProductLot;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES
// ────────────────────────────────────────────────────────────────────────────

export interface Setting {
  id: string;
  key: string;
  value: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  group: string;
  updatedAt: string;
  updatedById?: string;
}

export interface CompanySettings {
  name: string;
  tradeName?: string;
  cnpj?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
}

export interface PrinterSettings {
  enabled: boolean;
  type: 'USB' | 'SERIAL' | 'NETWORK';
  port?: string;
  ip?: string;
  model: string;
  autoPrint: boolean;
  autoCut: boolean;
  openDrawer: boolean;
}

export interface ScaleSettings {
  enabled: boolean;
  port: string;
  baudRate: number;
  model: string;
}

// ────────────────────────────────────────────────────────────────────────────
// HISTÓRICO DE PREÇOS
// ────────────────────────────────────────────────────────────────────────────

export interface PriceHistory {
  id: string;
  productId: string;
  product?: Product;
  oldPrice: number;
  newPrice: number;
  reason?: string;
  employeeId: string;
  employee?: Employee;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ────────────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  employeeId: string;
  employee?: Employee;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// TIPOS AUXILIARES (UI)
// ────────────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  lotId?: string;
}

export interface ProductFilter {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  hasStock?: boolean;
  lowStock?: boolean;
}

export interface SaleFilter {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ────────────────────────────────────────────────────────────────────────────
// TAURI IPC TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface TauriResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateProductInput {
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: ProductUnit;
  salePrice: number;
  costPrice: number;
  minStock: number;
  maxStock?: number;
  currentStock?: number;
  isWeighted?: boolean;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
  isActive?: boolean;
}

export interface CreateSaleInput {
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    lotId?: string;
  }[];
  discount?: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  employeeId: string;
  cashSessionId: string;
  customerId?: string;
}

export interface OpenCashSessionInput {
  employeeId: string;
  openingBalance: number;
  notes?: string;
}

export interface CloseCashSessionInput {
  id: string;
  actualBalance: number;
  notes?: string;
}

export interface CashMovementInput {
  sessionId: string;
  employeeId: string;
  movementType: 'SUPPLY' | 'BLEED' | 'OPENING' | 'CLOSING';
  amount: number;
  description?: string;
}

// License Types
export type LicenseStatus = 'pending' | 'active' | 'suspended' | 'expired' | 'revoked';

export interface LicenseInfo {
  key?: string;
  status: LicenseStatus;
  message?: string;
  valid?: boolean;
  expires_at?: string;
  days_remaining?: number;
  company_name: string;
  company_cnpj?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  max_users: number;
  features: string[];
  plan_type?: string;
  support_expires_at?: string;
  is_lifetime?: boolean;
  can_offline?: boolean;
  has_admin?: boolean;
  admin?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface UpdateLicenseAdminRequest {
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  company_cnpj?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  pin: string;
}

export interface CloudBackupUploadResponse {
  id: string;
  file_key: string;
  message: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DASHBOARD & REPORTS (MOTOPEÇAS)
// ────────────────────────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface DashboardStats {
  total_sales_today: number;
  count_sales_today: number;
  open_service_orders: number;
  active_warranties: number;
  low_stock_products: number;
  revenue_weekly: DailyRevenue[];
}

export interface ServiceOrderStats {
  total_orders: number;
  by_status: { status: string; count: number }[];
  revenue_labor: number;
  revenue_parts: number;
  average_ticket: number;
}

export interface TopItem {
  id: string;
  name: string;
  quantity: number;
  total_value: number;
}
