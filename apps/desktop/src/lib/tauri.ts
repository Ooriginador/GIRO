/**
 * Wrapper para comandos Tauri IPC
 * Centraliza todas as chamadas ao backend Rust
 */

import { useAuthStore } from '@/stores/auth-store';
import type {
  Alert,
  CashMovement,
  CashMovementInput,
  CashMovementType,
  CashSession,
  CashSessionSummary,
  Category,
  CloseCashSessionInput,
  CreateProductInput,
  CreateSaleInput,
  EmissionResponse,
  EmitNfceRequest,
  Employee,
  LicenseInfo,
  OfflineNote,
  OpenCashSessionInput,
  PaginatedResult,
  Product,
  ProductFilter,
  ProductLot,
  Sale,
  SaleFilter,
  Setting,
  StatusResponse,
  StockMovement,
  Supplier,
  TauriResponse,
  UpdateProductInput,
  UpdateLicenseAdminRequest,
  EmployeeRole,
} from '@/types';
import { invoke as tauriCoreInvoke } from '@tauri-apps/api/core';

export type { EmitNfceRequest, NfceItem } from '@/types/nfce';

type WebMockDb = {
  employees: Employee[];
  currentCashSession: CashSession | null;
  cashSessionHistory: CashSession[];
};

const WEB_MOCK_DB_KEY = '__giro_web_mock_db__';

const isTauriRuntime = (): boolean => {
  // More robust check for Tauri environment
  return (
    (typeof window !== 'undefined' && 'isTauri' in window) ||
    (typeof window !== 'undefined' &&
      typeof (window as unknown as { __TAURI__?: unknown }).__TAURI__ !== 'undefined')
  );
};

const nowIso = (): string => new Date().toISOString();

const loadWebMockDb = (): WebMockDb => {
  if (typeof window === 'undefined') {
    return { employees: [], currentCashSession: null, cashSessionHistory: [] };
  }

  const raw = window.localStorage.getItem(WEB_MOCK_DB_KEY);
  if (!raw) {
    // [FIX] DO NOT AUTO-SEED. Return empty state to ensure clean install flow.
    const emptyDb: WebMockDb = {
      employees: [],
      currentCashSession: null,
      cashSessionHistory: [],
    };
    return emptyDb;
  }

  try {
    return JSON.parse(raw) as WebMockDb;
  } catch {
    const reset: WebMockDb = { employees: [], currentCashSession: null, cashSessionHistory: [] };
    window.localStorage.setItem(WEB_MOCK_DB_KEY, JSON.stringify(reset));
    return reset;
  }
};

const saveWebMockDb = (db: WebMockDb): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WEB_MOCK_DB_KEY, JSON.stringify(db));
};

const randomId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const webMockInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  const db = loadWebMockDb();

  switch (command) {
    case 'authenticate_employee': {
      const pin = (args?.pin as string | undefined) ?? '';
      const employee = db.employees.find((e) => e.pin === pin && e.isActive);
      return (employee ?? null) as T;
    }
    case 'has_admin': {
      const exists = db.employees.some((e) => e.role === 'ADMIN' && e.isActive);
      return exists as unknown as T;
    }
    case 'has_any_employee': {
      const any = db.employees.length > 0;
      return any as unknown as T;
    }
    case 'get_employees': {
      return db.employees as T;
    }
    case 'get_current_cash_session': {
      return db.currentCashSession as T;
    }
    case 'open_cash_session': {
      const input =
        (args?.input as OpenCashSessionInput | undefined) ?? ({} as OpenCashSessionInput);

      if (db.currentCashSession && db.currentCashSession.status === 'OPEN') {
        throw new Error('Já existe uma sessão de caixa aberta');
      }

      const employee = db.employees.find((e) => e.id === input.employeeId) ?? null;
      if (!employee) {
        throw new Error('Employee não encontrado');
      }

      const session: CashSession = {
        id: randomId('cash-session'),
        employeeId: employee.id,
        employee,
        employeeName: employee.name,
        openedAt: nowIso(),
        openingBalance: input.openingBalance ?? 0,
        status: 'OPEN',
        notes: input.notes,
        movements: [],
        sales: [],
      };

      db.currentCashSession = session;
      db.cashSessionHistory = [session, ...db.cashSessionHistory];
      saveWebMockDb(db);

      return session as T;
    }
    case 'close_cash_session': {
      const id = (args?.id as string | undefined) ?? '';
      const actualBalance = (args?.actualBalance as number | undefined) ?? 0;
      const notes = args?.notes as string | undefined;

      const session = db.currentCashSession;
      if (!session || session.id !== id || session.status !== 'OPEN') {
        throw new Error('Nenhuma sessão aberta para fechar');
      }

      const closed: CashSession = {
        ...session,
        status: 'CLOSED',
        closedAt: nowIso(),
        actualBalance,
        notes: notes ?? session.notes,
      };

      db.currentCashSession = null;
      db.cashSessionHistory = db.cashSessionHistory.map((s) => (s.id === id ? closed : s));
      saveWebMockDb(db);

      return closed as T;
    }
    case 'get_cash_session_history': {
      return db.cashSessionHistory as T;
    }
    case 'add_cash_movement': {
      const input = (args?.input as CashMovementInput | undefined) ?? ({} as CashMovementInput);
      const session = db.currentCashSession;
      if (!session || session.status !== 'OPEN') {
        throw new Error('Nenhuma sessão aberta para movimentar');
      }

      // Map movementType (SUPPLY/BLEED) to CashMovement type for UI compatibility
      const typeMap: Record<string, CashMovementType> = {
        SUPPLY: 'DEPOSIT',
        BLEED: 'WITHDRAWAL',
        OPENING: 'OPENING',
        CLOSING: 'CLOSING',
      };

      const movement: CashMovement = {
        id: randomId('cash-movement'),
        sessionId: session.id,
        type: typeMap[input.movementType] || 'ADJUSTMENT',
        amount: input.amount,
        description: input.description,
        employeeId: session.employeeId,
        createdAt: nowIso(),
      };

      const updatedSession: CashSession = {
        ...session,
        movements: [...(session.movements ?? []), movement],
      };

      db.currentCashSession = updatedSession;
      db.cashSessionHistory = db.cashSessionHistory.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      saveWebMockDb(db);

      return undefined as T;
    }
    case 'get_cash_session_summary': {
      const sessionId = (args?.sessionId as string | undefined) ?? '';
      const session =
        (db.currentCashSession?.id === sessionId ? db.currentCashSession : null) ??
        db.cashSessionHistory.find((s) => s.id === sessionId) ??
        null;

      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const withdrawals = (session.movements ?? [])
        .filter((m) => m.type === 'WITHDRAWAL')
        .reduce((acc, m) => acc + m.amount, 0);
      const supplies = (session.movements ?? [])
        .filter((m) => m.type === 'DEPOSIT')
        .reduce((acc, m) => acc + m.amount, 0);

      const cashInDrawer = session.openingBalance + supplies - withdrawals;

      const summary: CashSessionSummary = {
        session,
        totalSales: 0,
        totalCanceled: 0,
        totalWithdrawals: withdrawals,
        totalSupplies: supplies,
        movementCount: (session.movements ?? []).length,
        salesByMethod: [],
        cashInDrawer,
      };

      return summary as T;
    }
    case 'create_employee': {
      const input = (args?.input as Record<string, unknown>) ?? {};
      const newEmp: Employee = {
        id: randomId('emp'),
        name: (input.name as string) ?? 'Employee',
        role: (input.role as EmployeeRole) ?? 'OPERATOR',
        pin: (input.pin as string) ?? '0000',
        isActive: true,
      } as unknown as Employee;
      db.employees = [newEmp, ...db.employees];
      saveWebMockDb(db);
      return newEmp as T;
    }
    case 'create_supplier': {
      // Suppliers are not persisted in the simple WebMock DB yet; return a minimal stub
      const input = (args?.input as Record<string, unknown>) ?? {};
      const supplier: Supplier = {
        id: randomId('supplier'),
        name: (input.name as string) ?? 'Supplier',
        contact: (input.contact as string) ?? '',
      } as unknown as Supplier;
      // We intentionally do not persist suppliers in this mock DB to keep it simple.
      return supplier as T;
    }
    case 'get_products': {
      // Return empty list by default in web mock to keep tests deterministic
      return [] as unknown as T;
    }
    case 'get_product_by_id': {
      // const id = (args?.id as string | undefined) ?? '';
      return null as unknown as T;
    }
    case 'get_product_by_barcode': {
      return null as unknown as T;
    }
    case 'search_products': {
      return [] as unknown as T;
    }
    case 'get_categories': {
      return [] as unknown as T;
    }
    default:
      throw new Error(`WebMock invoke: comando não suportado: ${command}`);
  }
};

const tauriInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  const DEFAULT_INVOKE_TIMEOUT = 15000; // ms

  const withTimeout = async <R>(p: Promise<R>, ms: number, errMsg: string): Promise<R> => {
    return new Promise<R>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error(errMsg)), ms);
      p.then(
        (v) => {
          clearTimeout(id);
          resolve(v);
        },
        (e) => {
          clearTimeout(id);
          reject(e);
        }
      );
    });
  };

  try {
    if (isTauriRuntime()) {
      console.log('[Tauri.invoke] %s %o', command, args);
      const raw = await withTimeout(
        tauriCoreInvoke<unknown>(command, args),
        DEFAULT_INVOKE_TIMEOUT,
        `Timeout invoking ${command}`
      );
      console.log('[Tauri.result] %s %o', command, raw);

      // If backend returns TauriResponse wrapper, unwrap it
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        const wrapped = raw as TauriResponse<unknown>;
        if (!wrapped.success) {
          const errMsg = wrapped.error ?? `Erro no comando ${command}`;
          console.error(`[Tauri Error] ${command}:`, errMsg);
          throw new Error(errMsg);
        }
        return wrapped.data as T;
      }

      return raw as T;
    }

    console.warn('[WebMock.invoke] %s %o (MOCK MODE)', command, args);
    const mock = await withTimeout(
      webMockInvoke<T>(command, args),
      DEFAULT_INVOKE_TIMEOUT,
      `Timeout (mock) invoking ${command}`
    );
    console.log('[WebMock.result] %s %o', command, mock);
    return mock;
  } catch (err) {
    console.error(
      '[Invoke Failure] %s %o',
      command,
      err instanceof Error ? err.message : String(err)
    );
    // Normalize error message
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
};

// Re-export invoke for backwards compatibility
export const invoke = tauriInvoke;

/**
 * invokeSafe: retorna um `TauriResponse<T>` sempre, não lança exceções.
 * Útil para chamadas UI que desejam exibir erros sem try/catch repetido.
 */
export async function invokeSafe<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<TauriResponse<T>> {
  try {
    const data = await tauriInvoke<T>(command, args);
    return { success: true, data } as TauriResponse<T>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────────────────────

export async function getProducts(filter?: ProductFilter): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_products', { filter });
}

export async function getProductStockHistory(_id: string): Promise<Product | null> {
  return tauriInvoke<Product | null>('get_product_by_id', { id: _id });
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
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Product>('create_product', { input, employee_id: employeeId });
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Product>('update_product', {
    id: input.id,
    input,
    employee_id: employeeId,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('delete_product', { id, employee_id: employeeId });
}

export async function deactivateProduct(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('deactivate_product', { id, employee_id: employeeId });
}

export async function reactivateProduct(id: string): Promise<Product> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Product>('reactivate_product', { id, employee_id: employeeId });
}

export async function getAllProducts(includeInactive = false): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_all_products', { includeInactive });
}

export async function getInactiveProducts(): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_inactive_products');
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
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Category>('create_category', { input, employee_id: employeeId });
}

export async function updateCategory(id: string, input: Partial<Category>): Promise<Category> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Category>('update_category', { id, input, employee_id: employeeId });
}

export async function deleteCategory(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('delete_category', { id, employee_id: employeeId });
}

export async function deactivateCategory(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('deactivate_category', { id, employee_id: employeeId });
}

export async function reactivateCategory(id: string): Promise<Category> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Category>('reactivate_category', { id, employee_id: employeeId });
}

export async function getAllCategories(): Promise<Category[]> {
  return tauriInvoke<Category[]>('get_all_categories');
}

export async function getInactiveCategories(): Promise<Category[]> {
  return tauriInvoke<Category[]>('get_inactive_categories');
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
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Sale>('cancel_sale', { id, canceled_by: employeeId, reason });
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
    actualBalance: input.actualBalance,
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

export async function getCashSessionMovements(sessionId: string): Promise<CashMovement[]> {
  return tauriInvoke<CashMovement[]>('get_session_movements', { sessionId });
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

export async function hasAdmin(): Promise<boolean> {
  return tauriInvoke<boolean>('has_admin');
}

export async function hasAnyEmployee(): Promise<boolean> {
  return tauriInvoke<boolean>('has_any_employee');
}

export async function createEmployee(
  input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Employee> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');

  // Backend CreateEmployee struct doesn't have isActive/permissions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isActive, permissions, ...backendInput } = input;

  return tauriInvoke<Employee>('create_employee', {
    input: backendInput,
    employee_id: employeeId,
  });
}

export async function updateEmployee(id: string, input: Partial<Employee>): Promise<Employee> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Employee>('update_employee', { id, input, employee_id: employeeId });
}

export async function deactivateEmployee(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('deactivate_employee', { id, employee_id: employeeId });
}

export async function reactivateEmployee(id: string): Promise<Employee> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Employee>('reactivate_employee', { id, employee_id: employeeId });
}

export async function getInactiveEmployees(): Promise<Employee[]> {
  return tauriInvoke<Employee[]>('get_inactive_employees');
}

// ────────────────────────────────────────────────────────────────────────────
// STOCK
// ────────────────────────────────────────────────────────────────────────────

export async function getStockMovements(productId?: string): Promise<StockMovement[]> {
  if (productId) {
    return tauriInvoke<StockMovement[]>('get_product_stock_movements', {
      product_id: productId,
      limit: 100,
    });
  }
  return tauriInvoke<StockMovement[]>('get_recent_stock_movements', { limit: 100 });
}

export async function addStockEntry(
  productId: string,
  quantity: number,
  costPrice: number,
  lotNumber?: string,
  expirationDate?: string,
  manufacturingDate?: string
): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');

  return tauriInvoke<void>('create_stock_movement', {
    input: {
      productId,
      quantity,
      type: 'INPUT',
      reason: 'Entrada de Estoque',
      costPrice,
      lotNumber,
      expirationDate,
      manufacturingDate,
    },
    employee_id: employeeId,
  });
}

export async function adjustStock(
  productId: string,
  newQuantity: number,
  reason: string
): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');

  return tauriInvoke<void>('create_stock_movement', {
    input: {
      productId,
      quantity: newQuantity, // Dependendo de como a repo trata 'Adjust', se for delta ou absoluto
      type: 'ADJUSTMENT',
      reason,
    },
    employee_id: employeeId,
  });
}

export async function getLowStockProducts(): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_low_stock_products');
}

export async function getExpiringLots(days: number): Promise<ProductLot[]> {
  return tauriInvoke<ProductLot[]>('get_expiring_lots', { days });
}

// ────────────────────────────────────────────────────────────────────────────
// ALERTS
// ────────────────────────────────────────────────────────────────────────────

export async function getAlerts(limit = 100): Promise<Alert[]> {
  return tauriInvoke<Alert[]>('get_alerts', { limit });
}

export async function getUnreadAlertsCount(): Promise<number> {
  return tauriInvoke<number>('get_unread_alerts_count');
}

export async function markAlertAsRead(id: string): Promise<void> {
  return tauriInvoke<void>('mark_alert_read', { id });
}

export async function dismissAlert(id: string): Promise<void> {
  // dismiss_alert não existe no backend, usamos delete_alert
  return tauriInvoke<void>('delete_alert', { id });
}

export async function refreshAlerts(): Promise<void> {
  // refresh_alerts não existe - os alertas são gerados automaticamente
  // Apenas invalidamos o cache forçando uma nova query
  // O backend já gera alertas de forma automática
  return Promise.resolve();
}

// ────────────────────────────────────────────────────────────────────────────
// SUPPLIERS
// ────────────────────────────────────────────────────────────────────────────

export async function getSuppliers(filter?: {
  search?: string;
  activeOnly?: boolean;
}): Promise<Supplier[]> {
  return tauriInvoke<Supplier[]>('get_suppliers', { filter });
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  return tauriInvoke<Supplier | null>('get_supplier_by_id', { id });
}

export async function createSupplier(
  input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Supplier> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');

  // Backend CreateSupplier struct doesn't have isActive
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isActive, ...backendInput } = input;

  return tauriInvoke<Supplier>('create_supplier', {
    input: backendInput,
    employee_id: employeeId,
  });
}

export async function updateSupplier(id: string, input: Partial<Supplier>): Promise<Supplier> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Supplier>('update_supplier', { id, input, employee_id: employeeId });
}

export async function deleteSupplier(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('delete_supplier', { id, employee_id: employeeId });
}

export async function deactivateSupplier(id: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('deactivate_supplier', { id, employee_id: employeeId });
}

export async function reactivateSupplier(id: string): Promise<Supplier> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<Supplier>('reactivate_supplier', { id, employee_id: employeeId });
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  return tauriInvoke<Supplier[]>('get_all_suppliers');
}

export async function getInactiveSuppliers(): Promise<Supplier[]> {
  return tauriInvoke<Supplier[]>('get_inactive_suppliers');
}

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────────────────────────────────────

export async function getSettings(group?: string): Promise<Setting[]> {
  if (group) {
    return tauriInvoke<Setting[]>('get_settings_by_group', { group });
  }
  return tauriInvoke<Setting[]>('get_all_settings');
}

export async function getSetting(key: string): Promise<string | null> {
  return tauriInvoke<string | null>('get_setting', { key });
}

export async function setSetting(key: string, value: string, type?: string): Promise<void> {
  const employeeId = useAuthStore.getState().employee?.id;
  if (!employeeId) throw new Error('Operação requer um funcionário autenticado');
  return tauriInvoke<void>('set_setting', {
    input: {
      key,
      value,
      valueType: type,
    },
    employee_id: employeeId,
  });
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
  excessStockCount: number;
}> {
  return invoke('get_stock_report');
}

export async function getMotopartsDashboardStats(): Promise<import('@/types').DashboardStats> {
  return invoke('get_motoparts_dashboard_stats');
}

export async function getServiceOrderStats(): Promise<import('@/types').ServiceOrderStats> {
  return invoke('get_service_order_stats');
}

export async function getTopProductsMotoparts(limit: number): Promise<import('@/types').TopItem[]> {
  return invoke('get_top_products_motoparts', { limit });
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

export async function updateLicenseAdmin(
  licenseKey: string,
  data: UpdateLicenseAdminRequest
): Promise<void> {
  return tauriInvoke<void>('update_license_admin', { licenseKey, data });
}

export async function getLastBackupDate(): Promise<string | null> {
  return tauriInvoke<string | null>('get_last_backup_date');
}

// ────────────────────────────────────────────────────────────────────────────
// CLOUD BACKUP (License Server API)
// ────────────────────────────────────────────────────────────────────────────

const LICENSE_SERVER_URL = 'https://giro-license-server-production.up.railway.app/api/v1';

export type CloudBackupMeta = {
  id: string;
  license_id: string;
  file_key: string;
  file_size_bytes: number;
  checksum: string | null;
  description: string | null;
  created_at: string;
};

export type CloudBackupListResponse = {
  backups: CloudBackupMeta[];
  total: number;
};

export type CloudBackupUploadResponse = {
  id: string;
  file_key: string;
  message: string;
};

/**
 * Get the JWT token from auth store for API calls
 */
function getAuthToken(): string | null {
  // Token might be stored in localStorage or auth store
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('backup_token') || null;
  }
  return null;
}

/**
 * Set the JWT token for cloud backup API calls
 */
export function setCloudBackupToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('backup_token', token);
  }
}

/**
 * Upload local backup to cloud server
 */
export async function uploadBackupToCloud(
  backupData: Blob | ArrayBuffer
): Promise<CloudBackupUploadResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }

  const response = await fetch(`${LICENSE_SERVER_URL}/backups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: backupData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro ao enviar backup: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List all cloud backups for the current user
 */
export async function listCloudBackups(): Promise<CloudBackupListResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }

  const response = await fetch(`${LICENSE_SERVER_URL}/backups`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro ao listar backups: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get metadata for a specific cloud backup
 */
export async function getCloudBackup(backupId: string): Promise<CloudBackupMeta> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }

  const response = await fetch(`${LICENSE_SERVER_URL}/backups/${backupId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro ao obter backup: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a cloud backup
 */
export async function deleteCloudBackup(backupId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }

  const response = await fetch(`${LICENSE_SERVER_URL}/backups/${backupId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro ao excluir backup: ${response.statusText}`);
  }
}

/**
 * Create local backup and upload to cloud
 * Combines createBackup() with uploadBackupToCloud()
 */
export async function syncBackupToCloud(): Promise<CloudBackupUploadResponse | null> {
  try {
    // Create local backup first
    const localResult = await createBackup();

    if (!localResult.success || !localResult.data) {
      console.error('[Backup] Failed to create local backup:', localResult.error);
      return null;
    }

    // Read the backup file and upload to cloud
    // Note: This requires file system access which Tauri handles
    console.log('[Backup] Local backup created:', localResult.data);

    // For now, we just return null - full implementation needs file reading
    // In production, use Tauri's fs API to read the file and upload
    console.log('[Backup] Cloud sync not yet fully implemented - local backup saved');
    return null;
  } catch (error) {
    console.error('[Backup] Sync failed:', (error as Error)?.message ?? String(error));
    throw error;
  }
}

// Seeding
export async function seedDatabase(): Promise<string> {
  return tauriInvoke<string>('seed_database');
}

// ────────────────────────────────────────────────────────────────────────────
// PRICE HISTORY
// ────────────────────────────────────────────────────────────────────────────

export type PriceHistory = {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  reason?: string;
  employeeId?: string;
  createdAt: string;
};

export type PriceHistoryWithProduct = PriceHistory & {
  productName?: string;
  employeeName?: string;
};

export async function getPriceHistoryByProduct(productId: string): Promise<PriceHistory[]> {
  return tauriInvoke<PriceHistory[]>('get_price_history_by_product', { productId });
}

export async function getRecentPriceHistory(limit?: number): Promise<PriceHistoryWithProduct[]> {
  return tauriInvoke<PriceHistoryWithProduct[]>('get_recent_price_history', { limit });
}

export async function getPriceHistoryById(id: string): Promise<PriceHistory | null> {
  return tauriInvoke<PriceHistory | null>('get_price_history_by_id', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// NFC-e
// ────────────────────────────────────────────────────────────────────────────

export async function emitNfce(request: EmitNfceRequest): Promise<EmissionResponse> {
  return tauriInvoke<EmissionResponse>('emit_nfce', { request });
}

export async function checkSefazStatus(uf: string, environment: number): Promise<StatusResponse> {
  return tauriInvoke<StatusResponse>('check_sefaz_status', { uf, environment });
}

export async function listOfflineNotes(): Promise<OfflineNote[]> {
  return tauriInvoke<OfflineNote[]>('list_offline_notes');
}

export async function transmitOfflineNote(
  accessKey: string,
  certPath: string,
  certPassword: string,
  emitterUf: string,
  environment: number
): Promise<EmissionResponse> {
  return tauriInvoke<EmissionResponse>('transmit_offline_note', {
    accessKey,
    certPath,
    certPassword,
    emitterUf,
    environment,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// LICENSE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the hardware ID for this machine
 * Format: CPU:xxx|MB:xxx|MAC:xxx|DISK:xxx
 */
export async function getHardwareId(): Promise<string> {
  return tauriInvoke<string>('get_hardware_id');
}

export async function activateLicense(licenseKey: string): Promise<LicenseInfo> {
  // Map 'licenseKey' (camelCase) to 'license_key' (snake_case) expected by Rust?
  // Rust: activate_license(license_key, state)
  // tauri-apps/api auto-converts camelCase args to snake_case?
  // Usually yes. But let's check one example.
  // emit_nfce request -> request.
  // check_sefaz_status -> uf, environment. Rust: (uf, environment).
  // I will use 'license_key' explicitly if needed.
  // Tauri 2.0 convention: camelCase in JS matches snake_case in Rust command args.
  return tauriInvoke<LicenseInfo>('activate_license', { licenseKey });
}

export async function validateLicense(licenseKey: string): Promise<LicenseInfo> {
  return tauriInvoke<LicenseInfo>('validate_license', { licenseKey });
}

export async function getStoredLicense(): Promise<unknown> {
  return tauriInvoke<unknown>('get_stored_license');
}

export async function restoreLicense(): Promise<string | null> {
  return tauriInvoke<string | null>('restore_license');
}
