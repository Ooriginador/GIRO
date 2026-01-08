/**
 * Wrapper para comandos Tauri IPC
 * Centraliza todas as chamadas ao backend Rust
 */

import type {
  Alert,
  CashMovementInput,
  CashSession,
  CashSessionSummary,
  Category,
  CloseCashSessionInput,
  CreateProductInput,
  CreateSaleInput,
  Employee,
  OpenCashSessionInput,
  PaginatedResult,
  Product,
  ProductFilter,
  Sale,
  SaleFilter,
  Setting,
  StockMovement,
  Supplier,
  TauriResponse,
  UpdateProductInput,
} from '@/types';
import { invoke as tauriInvoke } from '@tauri-apps/api/core';

// Re-export invoke for backwards compatibility
export const invoke = tauriInvoke;

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────────────────────

export async function getProducts(filter?: ProductFilter): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_products', { filter });
}

export async function getProductById(id: string): Promise<Product | null> {
  return tauriInvoke<Product | null>('get_product_by_id', { id });
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  return tauriInvoke<Product | null>('get_product_by_barcode', { barcode });
}

export async function searchProducts(query: string): Promise<Product[]> {
  return tauriInvoke<Product[]>('search_products', { query });
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return tauriInvoke<Product>('create_product', { input });
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  return tauriInvoke<Product>('update_product', { input });
}

export async function deleteProduct(id: string): Promise<void> {
  return tauriInvoke<void>('delete_product', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return tauriInvoke<Category[]>('get_categories');
}

export async function createCategory(input: {
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
}): Promise<Category> {
  return tauriInvoke<Category>('create_category', { input });
}

export async function updateCategory(id: string, input: Partial<Category>): Promise<Category> {
  return tauriInvoke<Category>('update_category', { id, input });
}

export async function deleteCategory(id: string): Promise<void> {
  return tauriInvoke<void>('delete_category', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// SALES
// ────────────────────────────────────────────────────────────────────────────

export async function getSales(filter?: SaleFilter): Promise<PaginatedResult<Sale>> {
  return tauriInvoke<PaginatedResult<Sale>>('get_sales', { filter });
}

export async function getSaleById(id: string): Promise<Sale | null> {
  return tauriInvoke<Sale | null>('get_sale_by_id', { id });
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  return tauriInvoke<Sale>('create_sale', { input });
}

export async function cancelSale(id: string, reason: string): Promise<Sale> {
  return tauriInvoke<Sale>('cancel_sale', { id, reason });
}

export async function getTodaySales(): Promise<Sale[]> {
  return tauriInvoke<Sale[]>('get_today_sales');
}

export async function getDailySalesTotal(): Promise<number> {
  return tauriInvoke<number>('get_daily_sales_total');
}

export type MonthlySalesSummary = {
  yearMonth: string;
  totalSales: number;
  totalAmount: number;
};

export async function getMonthlySummary(yearMonth: string): Promise<MonthlySalesSummary> {
  return tauriInvoke<MonthlySalesSummary>('get_monthly_summary', { yearMonth });
}

// ────────────────────────────────────────────────────────────────────────────
// CASH SESSION
// ────────────────────────────────────────────────────────────────────────────

export async function getCurrentCashSession(): Promise<CashSession | null> {
  return tauriInvoke<CashSession | null>('get_current_cash_session');
}

export async function openCashSession(input: OpenCashSessionInput): Promise<CashSession> {
  return tauriInvoke<CashSession>('open_cash_session', { input });
}

export async function closeCashSession(input: CloseCashSessionInput): Promise<CashSession> {
  return tauriInvoke<CashSession>('close_cash_session', {
    id: input.id,
    actual_balance: input.actualBalance,
    notes: input.notes,
  });
}

export async function addCashMovement(input: CashMovementInput): Promise<void> {
  return tauriInvoke<void>('add_cash_movement', { input });
}

export async function getCashSessionHistory(): Promise<CashSession[]> {
  return tauriInvoke<CashSession[]>('get_cash_session_history');
}

export async function getCashSessionSummary(sessionId: string): Promise<CashSessionSummary> {
  return tauriInvoke<CashSessionSummary>('get_cash_session_summary', { sessionId });
}

// ────────────────────────────────────────────────────────────────────────────
// EMPLOYEES
// ────────────────────────────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  return tauriInvoke<Employee[]>('get_employees');
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return tauriInvoke<Employee | null>('get_employee_by_id', { id });
}

export async function authenticateEmployee(pin: string): Promise<Employee | null> {
  return tauriInvoke<Employee | null>('authenticate_employee', { pin });
}

export async function createEmployee(
  input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Employee> {
  return tauriInvoke<Employee>('create_employee', { input });
}

export async function updateEmployee(id: string, input: Partial<Employee>): Promise<Employee> {
  return tauriInvoke<Employee>('update_employee', { id, input });
}

// ────────────────────────────────────────────────────────────────────────────
// STOCK
// ────────────────────────────────────────────────────────────────────────────

export async function getStockMovements(productId?: string): Promise<StockMovement[]> {
  return tauriInvoke<StockMovement[]>('get_stock_movements', { productId });
}

export async function addStockEntry(
  productId: string,
  quantity: number,
  costPrice: number,
  lotNumber?: string,
  expirationDate?: string
): Promise<void> {
  return tauriInvoke<void>('add_stock_entry', {
    productId,
    quantity,
    costPrice,
    lotNumber,
    expirationDate,
  });
}

export async function adjustStock(
  productId: string,
  newQuantity: number,
  reason: string
): Promise<void> {
  return tauriInvoke<void>('adjust_stock', { productId, newQuantity, reason });
}

export async function getLowStockProducts(): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_low_stock_products');
}

// ────────────────────────────────────────────────────────────────────────────
// ALERTS
// ────────────────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<Alert[]> {
  return tauriInvoke<Alert[]>('get_alerts');
}

export async function getUnreadAlertsCount(): Promise<number> {
  return tauriInvoke<number>('get_unread_alerts_count');
}

export async function markAlertAsRead(id: string): Promise<void> {
  return tauriInvoke<void>('mark_alert_as_read', { id });
}

export async function dismissAlert(id: string): Promise<void> {
  return tauriInvoke<void>('dismiss_alert', { id });
}

export async function refreshAlerts(): Promise<void> {
  return tauriInvoke<void>('refresh_alerts');
}

// ────────────────────────────────────────────────────────────────────────────
// SUPPLIERS
// ────────────────────────────────────────────────────────────────────────────

export async function getSuppliers(): Promise<Supplier[]> {
  return tauriInvoke<Supplier[]>('get_suppliers');
}

export async function createSupplier(
  input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Supplier> {
  return tauriInvoke<Supplier>('create_supplier', { input });
}

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────────────────────────────────────

export async function getSettings(group?: string): Promise<Setting[]> {
  return tauriInvoke<Setting[]>('get_settings', { group });
}

export async function getSetting(key: string): Promise<Setting | null> {
  return tauriInvoke<Setting | null>('get_setting', { key });
}

export async function setSetting(key: string, value: string, type?: string): Promise<void> {
  return tauriInvoke<void>('set_setting', { key, value, type });
}

// ────────────────────────────────────────────────────────────────────────────
// HARDWARE
// ────────────────────────────────────────────────────────────────────────────

export async function printReceipt(saleId: string): Promise<TauriResponse<void>> {
  return tauriInvoke<TauriResponse<void>>('print_receipt', { saleId });
}

export async function openCashDrawer(): Promise<TauriResponse<void>> {
  return tauriInvoke<TauriResponse<void>>('open_cash_drawer');
}

export async function readScaleWeight(): Promise<TauriResponse<number>> {
  return tauriInvoke<TauriResponse<number>>('read_scale_weight');
}

export async function testPrinterConnection(): Promise<TauriResponse<boolean>> {
  return tauriInvoke<TauriResponse<boolean>>('test_printer_connection');
}

export async function testScaleConnection(): Promise<TauriResponse<boolean>> {
  return tauriInvoke<TauriResponse<boolean>>('test_scale_connection');
}

// ────────────────────────────────────────────────────────────────────────────
// REPORTS
// ────────────────────────────────────────────────────────────────────────────

export async function getSalesReport(
  startDate: string,
  endDate: string
): Promise<{
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByPaymentMethod: Record<string, number>;
  salesByHour: Record<string, number>;
}> {
  return invoke('get_sales_report', { startDate, endDate });
}

export async function getTopProducts(
  limit?: number
): Promise<{ product: Product; quantity: number; revenue: number }[]> {
  return invoke('get_top_products', { limit: limit ?? 20 });
}

export async function getStockReport(): Promise<{
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
}> {
  return invoke('get_stock_report');
}

// ────────────────────────────────────────────────────────────────────────────
// BACKUP
// ────────────────────────────────────────────────────────────────────────────

export async function createBackup(): Promise<TauriResponse<string>> {
  return tauriInvoke<TauriResponse<string>>('create_backup');
}

export async function restoreBackup(path: string): Promise<TauriResponse<void>> {
  return tauriInvoke<TauriResponse<void>>('restore_backup', { path });
}

export async function getLastBackupDate(): Promise<string | null> {
  return tauriInvoke<string | null>('get_last_backup_date');
}

// Seeding
export async function seedDatabase(): Promise<string> {
  return tauriInvoke<string>('seed_database');
}
