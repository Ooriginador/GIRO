import { createLogger } from '@/lib/logger';
const log = createLogger('Tauri');
/**
 * Wrapper para comandos Tauri IPC
 * Centraliza todas as chamadas ao backend Rust
 */

// import { useAuthStore } from '@/stores/auth-store'; // Removed to break circular dependency
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
  EnterpriseKPIs,
  SaleFilter,
  Setting,
  StatusResponse,
  StockMovement,
  Supplier,
  HeldSale,
  CreateHeldSaleInput,
  TauriResponse,
  UpdateProductInput,
  UpdateLicenseAdminRequest,
  EmployeeRole,
  FinancialReport,
  EmployeeRanking,
  StockReport,
  TopProduct,
  MonthlySalesSummary,
  DashboardStats,
  ServiceOrderStats,
  TopItem,
  SalesReport,
  DailyRevenue,
} from '@/types';
import type {
  Contract,
  StockTransfer,
  StockLocation,
  ContractDashboardStats,
  WorkFront,
  TransferStatus,
} from '@/types/enterprise';
import type { MaterialRequest as EnterpriseMaterialRequest } from '@/types/enterprise';
import { invoke as tauriCoreInvoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';

export type { EmitNfceRequest, NfceItem } from '@/types/nfce';
export type {
  MonthlySalesSummary,
  TopProduct,
  FinancialReport,
  EmployeeRanking,
  StockReport,
  DashboardStats,
  ServiceOrderStats,
  TopItem,
  SalesReport,
  DailyRevenue,
};

// Re-export Enterprise types
export type { MaterialRequest } from '@/types/enterprise';

type WebMockDb = {
  employees: Employee[];
  currentCashSession: CashSession | null;
  cashSessionHistory: CashSession[];
  contracts: Contract[];
  workFronts: WorkFront[];
  materialRequests: EnterpriseMaterialRequest[];
  stockTransfers: StockTransfer[];
  stockLocations: StockLocation[];
  heldSales: HeldSale[];
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
    return {
      employees: [],
      currentCashSession: null,
      cashSessionHistory: [],
      contracts: [],
      workFronts: [],
      materialRequests: [],
      stockTransfers: [],
      stockLocations: [],
      heldSales: [],
    };
  }

  const raw = window.localStorage.getItem(WEB_MOCK_DB_KEY);
  if (!raw) {
    // [FIX] DO NOT AUTO-SEED. Return empty state to ensure clean install flow.
    const emptyDb: WebMockDb = {
      employees: [],
      currentCashSession: null,
      cashSessionHistory: [],
      contracts: [],
      workFronts: [],
      materialRequests: [],
      stockTransfers: [],
      stockLocations: [],
      heldSales: [],
    };
    return emptyDb;
  }

  try {
    const parsed = JSON.parse(raw);
    // Ensure all fields exist (migration for existing mocks)
    return {
      employees: parsed.employees || [],
      currentCashSession: parsed.currentCashSession || null,
      cashSessionHistory: parsed.cashSessionHistory || [],
      contracts: parsed.contracts || [],
      workFronts: parsed.workFronts || [],
      materialRequests: parsed.materialRequests || [],
      stockTransfers: parsed.stockTransfers || [],
      stockLocations: parsed.stockLocations || [],
      heldSales: parsed.heldSales || [],
    };
  } catch {
    const reset: WebMockDb = {
      employees: [],
      currentCashSession: null,
      cashSessionHistory: [],
      contracts: [],
      workFronts: [],
      materialRequests: [],
      stockTransfers: [],
      stockLocations: [],
      heldSales: [],
    };
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

  // Normalize command to a predictable format so tests and different callers
  // (camelCase, kebab-case, snake_case) are all accepted by the web mock.
  const normalize = (s: string) =>
    s
      .replace(/-/g, '_')
      .replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
      .replace(/^_+/, '');
  const cmd = normalize(command);

  switch (cmd) {
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
        createdAt: nowIso(),
        updatedAt: nowIso(),
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
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
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
      const query = ((args?.query as string) || '').toLowerCase();

      const staticProducts = [
        { id: 'prod-001', name: 'Cimento', price: 25.0, stock: 1000, category: 'Materiais' },
        {
          id: 'prod-001-cp',
          name: 'Cimento CP-II',
          price: 28.0,
          stock: 500,
          category: 'Materiais',
        },
        { id: 'prod-002', name: 'Areia', price: 120.0, stock: 50, category: 'Materiais' },
        { id: 'prod-002-med', name: 'Areia Média', price: 130.0, stock: 60, category: 'Materiais' },
        { id: 'prod-003', name: 'Tijolo', price: 1.5, stock: 5000, category: 'Materiais' },
        {
          id: 'prod-003-bai',
          name: 'Tijolo Baiano',
          price: 1.8,
          stock: 4000,
          category: 'Materiais',
        },
      ];

      return staticProducts.filter((p) => p.name.toLowerCase().includes(query)) as unknown as T;
    }
    case 'get_stock_locations': {
      return db.stockLocations as unknown as T;
    }
    case 'create_stock_transfer': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = (args?.input as any) || {};
      const newTransfer: StockTransfer = {
        id: randomId('trf'),
        code: `TRF-${Date.now()}`,
        status: 'DRAFT' as TransferStatus,
        sourceLocationId: input.originLocationId || input.sourceLocationId,
        destinationLocationId: input.destinationLocationId,
        requesterId: input.requesterId || 'admin-1',
        requestedAt: nowIso(),
        items: input.items || [],
        notes: input.notes,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      } as StockTransfer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.stockTransfers = [newTransfer as any, ...db.stockTransfers];
      saveWebMockDb(db);
      return newTransfer as unknown as T;
    }
    case 'create_material_request': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = (args?.input as any) || {};
      const newRequest = {
        id: randomId('req'),
        code: `REQ-${Date.now()}`,
        requestNumber: `REQ-${Date.now()}`,
        status: 'DRAFT',
        priority: input.priority || 'NORMAL',
        contractId: input.contractId,
        workFrontId: input.workFrontId,
        destinationId: input.workFrontId,
        requesterId: input.requesterId || 'admin-1',
        items: input.items || [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        history: [],
      } as EnterpriseMaterialRequest;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.materialRequests = [newRequest as any, ...db.materialRequests];
      saveWebMockDb(db);
      return newRequest as unknown as T;
    }
    case 'update_material_request': {
      const id = args?.id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = (args?.input as any) || {};
      const idx = db.materialRequests.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Request not found');

      const current = db.materialRequests[idx];
      const updated = { ...current, ...input, updatedAt: nowIso() };
      db.materialRequests[idx] = updated;
      saveWebMockDb(db);
      return updated as unknown as T;
    }
    case 'get_categories': {
      return [] as unknown as T;
    }
    case 'get_stored_license': {
      if (typeof window === 'undefined') return null as unknown as T;
      try {
        const raw = window.localStorage.getItem('giro-license');
        if (!raw) return null as unknown as T;
        return JSON.parse(raw) as unknown as T;
      } catch {
        return null as unknown as T;
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    // ENTERPRISE MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_contract_dashboard_stats': {
      const activeContracts = db.contracts.filter((c) => c.status === 'ACTIVE').length;
      const totalContracts = db.contracts.length;
      const totalValue = db.contracts.reduce((acc, c) => acc + (c.budget || 0), 0);
      const pendingRequests = db.materialRequests.filter((r) => r.status === 'PENDING').length;

      const stats: ContractDashboardStats = {
        activeContracts,
        totalContracts,
        totalValue,
        expiringContracts: 0, // Mock fixed
        pendingRequests,
        inTransitTransfers: db.stockTransfers.filter((t) => t.status === 'IN_TRANSIT').length,
        lowStockAlerts: 0,
        recentActivity: [],
        monthlyConsumption: [],
        expensesByCategory: [],
      };
      return stats as unknown as T;
    }
    case 'get_contracts': {
      // Simple list, ignoring filters for basic E2E
      return db.contracts as unknown as T;
    }
    case 'create_contract': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = (args?.input as any) || {};
      const newContract: Contract = {
        id: randomId('cnt'),
        code: input.code || `CNT-${Date.now()}`,
        name: input.name || 'Novo Contrato',
        description: input.description,
        status: input.status || 'PLANNING',
        address: input.address,
        startDate: input.startDate || nowIso(),
        endDate: input.endDate,
        budget: input.budget || 0,
        clientName: input.clientName || 'Cliente Exemplo',
        costCenter: input.costCenter || 'CC-001',
        managerId: input.managerId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      } as Contract;

      db.contracts = [newContract, ...db.contracts];
      saveWebMockDb(db);
      return newContract as unknown as T;
    }
    case 'update_contract': {
      const id = args?.id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = (args?.input as any) || {};
      const idx = db.contracts.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Contract not found');

      const current = db.contracts[idx];
      const updated = {
        ...current,
        ...input,
        updatedAt: nowIso(),
      };

      db.contracts[idx] = updated;
      saveWebMockDb(db);
      return updated as unknown as T;
    }
    case 'create_work_front': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = (args?.input as any) || {};
      const newWorkFront: WorkFront = {
        id: randomId('ft'),
        code: input.code || `FT-${Date.now()}`,
        name: input.name || 'Nova Frente',
        description: input.description,
        contractId: input.contractId,
        supervisorId: input.supervisorId,
        status: 'ACTIVE',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      } as WorkFront;

      db.workFronts = [newWorkFront, ...db.workFronts];
      saveWebMockDb(db);
      return newWorkFront as unknown as T;
    }
    case 'get_work_fronts': {
      const contractId = args?.contractId as string | undefined;
      const status = args?.status as string | undefined;

      let results = db.workFronts;
      if (contractId) results = results.filter((w) => w.contractId === contractId);
      if (status) results = results.filter((w) => w.status === status);

      return results as unknown as T;
    }
    case 'get_material_requests': {
      return db.materialRequests as unknown as T;
    }
    case 'get_pending_requests': {
      return db.materialRequests.filter((r) => r.status === 'PENDING') as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // STOCK MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_stock_report': {
      // Return mock stock report for web development
      const mockReport: StockReport = {
        totalProducts: 24,
        totalValue: 15420.5,
        lowStockCount: 3,
        outOfStockCount: 1,
        expiringCount: 2,
        excessStockCount: 0,
        valuationByCategory: {
          Materiais: 8500.0,
          Ferramentas: 4200.0,
          Peças: 2720.5,
        },
      };
      return mockReport as unknown as T;
    }
    case 'get_low_stock_products': {
      // Return mock low stock products for web development
      const mockLowStock = [
        {
          id: 'prod-low-001',
          name: 'Cimento CP-II',
          internalCode: 'MRC-00001',
          barcode: '7891234567890',
          currentStock: 5,
          minStock: 20,
          maxStock: 100,
          salePrice: 28.0,
          costPrice: 22.0,
          unit: 'UN',
          isActive: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
        {
          id: 'prod-low-002',
          name: 'Areia Fina',
          internalCode: 'MRC-00002',
          currentStock: 3,
          minStock: 10,
          maxStock: 50,
          salePrice: 120.0,
          costPrice: 90.0,
          unit: 'M3',
          isActive: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
        {
          id: 'prod-low-003',
          name: 'Tijolo 6 furos',
          internalCode: 'MRC-00003',
          currentStock: 0,
          minStock: 500,
          maxStock: 2000,
          salePrice: 1.5,
          costPrice: 0.8,
          unit: 'UN',
          isActive: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ];
      return mockLowStock as unknown as T;
    }
    case 'get_recent_stock_movements':
    case 'get_product_stock_movements': {
      // Return mock stock movements
      const mockMovements = [
        {
          id: 'mov-001',
          productId: 'prod-001',
          type: 'ENTRY',
          quantity: 50,
          previousStock: 100,
          newStock: 150,
          reason: 'Compra fornecedor',
          employeeId: 'admin-1',
          createdAt: nowIso(),
          product: { id: 'prod-001', name: 'Cimento CP-II', internalCode: 'MRC-00001' },
        },
        {
          id: 'mov-002',
          productId: 'prod-002',
          type: 'SALE',
          quantity: 10,
          previousStock: 60,
          newStock: 50,
          reason: 'Venda PDV',
          employeeId: 'admin-1',
          createdAt: nowIso(),
          product: { id: 'prod-002', name: 'Areia Fina', internalCode: 'MRC-00002' },
        },
      ];
      return mockMovements as unknown as T;
    }
    case 'get_expiring_lots': {
      // Return mock expiring lots
      const mockExpiringLots = [
        {
          id: 'lot-001',
          productId: 'prod-001',
          lotNumber: 'LOT-2026-001',
          expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          currentQuantity: 20,
          initialQuantity: 50,
          status: 'AVAILABLE',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ];
      return mockExpiringLots as unknown as T;
    }
    case 'create_stock_movement': {
      // Mock stock movement creation
      const input = (args?.input as Record<string, unknown>) || {};
      const movement = {
        id: randomId('mov'),
        productId: input.productId || 'unknown',
        type: input.movementType || 'ENTRY',
        quantity: input.quantity || 0,
        previousStock: 100,
        newStock: 100 + (Number(input.quantity) || 0),
        reason: input.reason || 'Movimentação',
        employeeId: input.employeeId || 'admin-1',
        createdAt: nowIso(),
      };
      return movement as unknown as T;
    }
    case 'get_expired_lots': {
      return [] as unknown as T;
    }
    case 'get_product_lots': {
      return [] as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // DASHBOARD & SALES MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_today_sales':
    case 'get_sales_by_period': {
      return [] as unknown as T;
    }
    case 'get_daily_sales_total': {
      return 0 as unknown as T;
    }
    case 'get_top_products': {
      const limit = (args?.limit as number) || 5;
      const mockTopProducts = [
        {
          product: {
            id: 'prod-001',
            name: 'Cimento CP-II',
            internalCode: 'MRC-00001',
            salePrice: 28.0,
          },
          quantity: 150,
          revenue: 4200.0,
        },
        {
          product: {
            id: 'prod-002',
            name: 'Areia Fina',
            internalCode: 'MRC-00002',
            salePrice: 120.0,
          },
          quantity: 45,
          revenue: 5400.0,
        },
        {
          product: {
            id: 'prod-003',
            name: 'Tijolo 6 furos',
            internalCode: 'MRC-00003',
            salePrice: 1.5,
          },
          quantity: 2000,
          revenue: 3000.0,
        },
      ];
      return mockTopProducts.slice(0, limit) as unknown as T;
    }
    case 'get_motoparts_dashboard_stats': {
      return {
        totalSalesToday: 1250.0,
        totalSalesYesterday: 980.0,
        activeAlerts: 5,
        openServiceOrders: 3,
        activeWarranties: 2,
        revenueWeekly: [
          { date: '2026-01-20', value: 850 },
          { date: '2026-01-21', value: 1200 },
          { date: '2026-01-22', value: 780 },
          { date: '2026-01-23', value: 1100 },
          { date: '2026-01-24', value: 950 },
          { date: '2026-01-25', value: 1350 },
          { date: '2026-01-26', value: 1250 },
        ],
      } as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // ALERTS MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_alerts': {
      const mockAlerts = [
        {
          id: 'alert-001',
          type: 'LOW_STOCK',
          severity: 'WARNING',
          title: 'Estoque Baixo: Cimento CP-II',
          message: 'O produto Cimento CP-II está com estoque abaixo do mínimo (5 unidades)',
          isRead: false,
          isDismissed: false,
          createdAt: nowIso(),
        },
        {
          id: 'alert-002',
          type: 'EXPIRATION_WARNING',
          severity: 'CRITICAL',
          title: 'Produto próximo ao vencimento',
          message: 'O lote LOT-2026-001 vence em 7 dias',
          isRead: false,
          isDismissed: false,
          createdAt: nowIso(),
        },
      ];
      return mockAlerts as unknown as T;
    }
    case 'get_unread_alerts_count': {
      return 2 as unknown as T;
    }
    case 'mark_alert_read': {
      return undefined as unknown as T;
    }
    case 'delete_alert':
    case 'dismiss_alert': {
      return undefined as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SUPPLIERS MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_suppliers': {
      return [] as unknown as T;
    }
    case 'get_supplier_by_id': {
      return null as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // CUSTOMERS MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_customers': {
      return [] as unknown as T;
    }
    case 'get_customers_paginated': {
      return { data: [], total: 0, page: 1, perPage: 20, totalPages: 0 } as unknown as T;
    }
    case 'search_customers': {
      return [] as unknown as T;
    }
    case 'get_customer_by_id': {
      return null as unknown as T;
    }
    case 'create_customer':
    case 'update_customer':
    case 'deactivate_customer':
    case 'reactivate_customer': {
      const input = (args?.input as Record<string, unknown>) || {};
      return {
        id: randomId('cust'),
        name: input.name || 'Cliente Mock',
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input,
      } as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SALES MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_sale_by_id': {
      return null as unknown as T;
    }
    case 'get_sales': {
      return { data: [], total: 0, page: 1, perPage: 20, totalPages: 0 } as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // REPORTS MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_sales_report': {
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageTicket: 0,
        salesByPaymentMethod: {},
        salesByHour: {},
      } as unknown as T;
    }
    case 'get_financial_report': {
      return {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        margin: 0,
      } as unknown as T;
    }
    case 'get_employee_performance': {
      return [] as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // PDV / HELD SALES MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_held_sales': {
      return (db.heldSales ?? []) as T;
    }
    case 'save_held_sale': {
      const input = args?.input as CreateHeldSaleInput | undefined;
      if (!input) throw new Error('Input obrigatório para save_held_sale');

      const heldSale: HeldSale = {
        id: input.id,
        items: input.items,
        discountValue: input.discountValue,
        discountReason: input.discountReason,
        customerId: input.customerId,
        subtotal: input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        total:
          input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) - input.discountValue,
        employeeId: 'emp-1',
        employeeName: 'Operador Demo',
        employeeRole: 'Caixa',
        status: 'WAITING',
        createdAt: nowIso(),
      };

      db.heldSales = [...(db.heldSales ?? []), heldSale];
      saveWebMockDb(db);
      return heldSale as T;
    }
    case 'delete_held_sale': {
      const id = args?.id as string | undefined;
      if (!id) throw new Error('ID obrigatório para delete_held_sale');

      db.heldSales = (db.heldSales ?? []).filter((s) => s.id !== id);
      saveWebMockDb(db);
      return undefined as T;
    }
    case 'create_sale': {
      // Mock de venda - só retorna sucesso
      const saleId = randomId('sale');
      return { id: saleId, status: 'COMPLETED' } as unknown as T;
    }
    case 'get_waiting_orders': {
      // Retorna vendas com status WAITING (cozinha/balcão)
      return (db.heldSales ?? []).filter((s) => s.status === 'WAITING') as T;
    }
    case 'update_held_sale_status': {
      const id = args?.id as string | undefined;
      const status = args?.status as HeldSale['status'] | undefined;
      if (!id || !status) throw new Error('ID e status obrigatórios');

      db.heldSales = (db.heldSales ?? []).map((s) => (s.id === id ? { ...s, status } : s));
      saveWebMockDb(db);
      return undefined as T;
    }
    case 'get_monthly_summary': {
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageTicket: 0,
        topProducts: [],
        salesByPaymentMethod: {},
      } as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SERVICE ORDERS MOCKS (Motopeças)
    // ────────────────────────────────────────────────────────────────────────
    case 'get_open_service_orders': {
      return [] as unknown as T;
    }
    case 'get_service_orders_paginated': {
      return { data: [], total: 0, page: 1, perPage: 20, totalPages: 0 } as unknown as T;
    }
    case 'get_service_order_by_id':
    case 'get_service_order_by_number':
    case 'get_service_order_details': {
      return null as unknown as T;
    }
    case 'create_service_order': {
      return {
        id: randomId('so'),
        order_number: Date.now(),
        status: 'OPEN',
        labor_cost: 0,
        parts_cost: 0,
        discount: 0,
        total: 0,
        warranty_days: 90,
        is_paid: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      } as unknown as T;
    }
    case 'update_service_order':
    case 'start_service_order':
    case 'complete_service_order':
    case 'cancel_service_order': {
      return { id: args?.id, status: 'OPEN' } as unknown as T;
    }
    case 'finish_service_order': {
      return randomId('sale') as unknown as T;
    }
    case 'get_service_order_items': {
      return [] as unknown as T;
    }
    case 'add_service_order_item': {
      return {
        id: randomId('soi'),
        item_type: 'SERVICE',
        description: 'Mock Item',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        total: 0,
        created_at: nowIso(),
      } as unknown as T;
    }
    case 'remove_service_order_item':
    case 'update_service_order_item': {
      return undefined as T;
    }
    case 'get_services': {
      return [] as unknown as T;
    }
    case 'get_service_by_id':
    case 'get_service_by_code': {
      return null as unknown as T;
    }
    case 'create_service':
    case 'update_service': {
      return {
        id: randomId('svc'),
        code: 'SVC001',
        description: 'Mock Service',
        price: 0,
      } as unknown as T;
    }
    case 'get_vehicle_services_history': {
      return [] as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // WARRANTIES MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_warranties':
    case 'get_active_warranties':
    case 'get_expiring_warranties': {
      return [] as unknown as T;
    }
    case 'get_warranty_by_id': {
      return null as unknown as T;
    }
    case 'create_warranty_claim':
    case 'update_warranty_claim': {
      return { id: randomId('wc'), status: 'PENDING' } as unknown as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SETTINGS / HARDWARE MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'list_hardware_ports': {
      return ['COM1', 'COM2', '/dev/ttyUSB0'] as unknown as T;
    }
    case 'configure_printer':
    case 'configure_scale':
    case 'test_printer':
    case 'print_test_documents':
    case 'start_serial_scanner':
    case 'stop_serial_scanner': {
      return undefined as T;
    }
    case 'read_weight': {
      return { weight: 0, stable: true } as unknown as T;
    }
    case 'generate_qr_svg': {
      return '<svg></svg>' as unknown as T;
    }
    case 'get_setting': {
      return null as unknown as T;
    }
    case 'set_setting': {
      return undefined as T;
    }
    case 'validate_license': {
      return { valid: true, message: 'Mock license valid' } as unknown as T;
    }
    case 'create_backup': {
      return { success: true, data: '/tmp/backup.db' } as unknown as T;
    }
    case 'restore_backup': {
      return { success: true } as unknown as T;
    }
    case 'update_license_admin': {
      return undefined as T;
    }
    // ────────────────────────────────────────────────────────────────────────
    // NFCE / FISCAL MOCKS
    // ────────────────────────────────────────────────────────────────────────
    case 'emit_nfce': {
      return {
        success: true,
        chave: '12345678901234567890123456789012345678901234',
        protocolo: 'MOCK123456',
        xml: '<nfeProc></nfeProc>',
        danfe_url: null,
      } as unknown as T;
    }
    case 'print_receipt': {
      return { success: true, data: null } as unknown as T;
    }
    case 'test_printer_connection': {
      return { success: true, data: true } as unknown as T;
    }
    case 'check_sefaz_status': {
      return { online: true, message: 'SEFAZ Online (Mock)' } as unknown as T;
    }
    case 'get_offline_notes':
    case 'get_pending_nfce': {
      return [] as unknown as T;
    }
    case 'sync_offline_notes': {
      return { synced: 0, errors: [] } as unknown as T;
    }
    default:
      throw new Error(`WebMock invoke: comando não suportado: ${command}`);
  }
};

const tauriInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  const DEFAULT_INVOKE_TIMEOUT = 15000; // ms

  // List of commands that REQUIRE employee_id as a top-level argument
  const commandsRequiringEmployeeId = [
    // Customers
    'create_customer',
    'update_customer',
    'deactivate_customer',
    'reactivate_customer',
    'create_customer_vehicle',
    'update_customer_vehicle',
    'deactivate_customer_vehicle',
    'update_vehicle_km',
    // Employees
    'create_employee',
    'update_employee',
    'deactivate_employee',
    'reactivate_employee',
    // Products & Categories
    'create_product',
    'update_product',
    'delete_product',
    'deactivate_product',
    'reactivate_product',
    'create_category',
    'update_category',
    'delete_category',
    'deactivate_category',
    'reactivate_category',
    // Stock & Suppliers
    'create_stock_movement',
    'create_supplier',
    'update_supplier',
    'delete_supplier',
    'deactivate_supplier',
    'reactivate_supplier',
    // Settings
    'set_setting',
    'delete_setting',
    // Service Orders & Services
    'create_service_order',
    'update_service_order',
    'start_service_order',
    'complete_service_order',
    'deliver_service_order',
    'cancel_service_order',
    'finish_service_order',
    'add_service_order_item',
    'remove_service_order_item',
    'update_service_order_item',
    'create_service',
    'update_service',
    // Misc
    'cancel_sale',
    'seed_database',
    'close_cash_session',
    'cloud_backup',
    'get_stock_report',
    'get_top_products',
    'get_sales_report',
    'get_financial_report',
    'get_employee_performance',
  ];

  // List of commands that require employee_id INSIDE an 'input' object
  const commandsWithEmployeeIdInInput = ['create_sale', 'open_cash_session', 'add_cash_movement'];

  const finalArgs = args ? { ...args } : {};

  // Automatic injection of employee_id
  let employeeId: string | undefined;
  try {
    const { useAuthStore } = await import('@/stores/auth-store');
    employeeId = useAuthStore.getState().employee?.id;
  } catch (e) {
    // In some environments (like early initialization during tests), the store might not be ready
    // We log but continue as employee_id is optional but helpful
    console.debug('[Tauri] useAuthStore not available for injection:', e);
  }

  if (employeeId) {
    if (
      commandsRequiringEmployeeId.includes(command) &&
      !finalArgs.employee_id &&
      !finalArgs.employeeId
    ) {
      // Backend might expect snake_case (dispatcher) or camelCase (direct)
      finalArgs.employee_id = employeeId;
      finalArgs.employeeId = employeeId;
    }

    if (commandsWithEmployeeIdInInput.includes(command)) {
      if (finalArgs.input && typeof finalArgs.input === 'object') {
        const input = finalArgs.input as Record<string, unknown>;
        if (!input.employee_id && !input.employeeId) {
          // Backend might expect snake_case or camelCase depending on the struct
          input.employee_id = employeeId;
          input.employeeId = employeeId;
        }
      }
    }
  }

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
      // Prefer dispatcher `giro_invoke` to provide a unified envelope and better error handling.
      // If dispatcher returns `not_found`, fallback to direct command invocation.
      const dispRaw = await withTimeout(
        tauriCoreInvoke<unknown>('giro_invoke', { cmd: command, payload: finalArgs }),
        DEFAULT_INVOKE_TIMEOUT,
        `Timeout invoking dispatcher for ${command}`
      );

      if (dispRaw && typeof dispRaw === 'object' && 'ok' in (dispRaw as Record<string, unknown>)) {
        const wrapped = dispRaw as { ok: boolean; code?: string; error?: string; data?: unknown };
        if (wrapped.ok) {
          return wrapped.data as T;
        }

        // If dispatcher explicitly says command not found, fallback to direct invoke
        if (wrapped.code === 'not_found') {
          console.warn(
            '[Tauri.dispatcher] command not found, falling back to direct invoke:',
            command
          );
          const raw = await withTimeout(
            tauriCoreInvoke<unknown>(command, finalArgs),
            DEFAULT_INVOKE_TIMEOUT,
            `Timeout invoking ${command}`
          );

          if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
            const wrapped2 = raw as TauriResponse<unknown>;
            if (!wrapped2.success) {
              const errMsg = wrapped2.error ?? `Erro no comando ${command}`;
              console.error(`[Tauri Error] ${command}:`, errMsg);
              throw new Error(errMsg);
            }
            return wrapped2.data as T;
          }

          return raw as T;
        }

        const errMsg = wrapped.error ?? `Erro no comando ${command}`;
        console.error(`[Tauri.dispatcher.error] ${command}:`, errMsg);
        throw new Error(errMsg);
      }

      // If dispatcher did not return the expected envelope, try direct invoke as a fallback
      const raw = await withTimeout(
        tauriCoreInvoke<unknown>(command, finalArgs),
        DEFAULT_INVOKE_TIMEOUT,
        `Timeout invoking ${command}`
      );

      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        const wrapped2 = raw as TauriResponse<unknown>;
        if (!wrapped2.success) {
          const errMsg = wrapped2.error ?? `Erro no comando ${command}`;
          console.error(`[Tauri Error] ${command}:`, errMsg);
          throw new Error(errMsg);
        }
        return wrapped2.data as T;
      }

      return raw as T;
    }

    const mock = await withTimeout(
      webMockInvoke<T>(command, finalArgs),
      DEFAULT_INVOKE_TIMEOUT,
      `Timeout (mock) invoking ${command}`
    );
    return mock;
  } catch (err) {
    // Log the error and normalize to an Error instance before throwing.
    console.error(
      '[Invoke Failure] %s %o',
      command,
      err instanceof Error ? err.message : String(err)
    );
    // Always throw a new Error to avoid rethrowing the original caught object
    // which would trigger `no-useless-catch` in some ESLint configs.
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
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
  return tauriInvoke<Product>('create_product', { input });
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  return tauriInvoke<Product>('update_product', {
    id: input.id,
    input,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return tauriInvoke<void>('delete_product', { id });
}

export async function deactivateProduct(id: string): Promise<void> {
  return tauriInvoke<void>('deactivate_product', { id });
}

export async function reactivateProduct(id: string): Promise<Product> {
  return tauriInvoke<Product>('reactivate_product', { id });
}

export async function getAllProducts(includeInactive = false): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_all_products', { includeInactive });
}

export async function getInactiveProducts(): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_inactive_products');
}

export async function getProductsPaginated(
  page: number,
  perPage: number,
  search?: string,
  categoryId?: string,
  isActive?: boolean
): Promise<PaginatedResult<Product>> {
  return tauriInvoke<PaginatedResult<Product>>('get_products_paginated', {
    page,
    per_page: perPage,
    search,
    category_id: categoryId,
    is_active: isActive,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return tauriInvoke<Category[]>('get_categories');
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return tauriInvoke<Category | null>('get_category_by_id', { id });
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

export async function deactivateCategory(id: string): Promise<void> {
  return tauriInvoke<void>('deactivate_category', { id });
}

export async function reactivateCategory(id: string): Promise<Category> {
  return tauriInvoke<Category>('reactivate_category', { id });
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
  return tauriInvoke<Sale>('cancel_sale', { id, reason });
}

export async function getTodaySales(): Promise<Sale[]> {
  return tauriInvoke<Sale[]>('get_today_sales');
}

export async function getDailySalesTotal(): Promise<number> {
  return tauriInvoke<number>('get_daily_sales_total');
}

export async function getHeldSales(): Promise<HeldSale[]> {
  return tauriInvoke<HeldSale[]>('get_held_sales');
}

export async function saveHeldSale(input: CreateHeldSaleInput): Promise<HeldSale> {
  return tauriInvoke<HeldSale>('save_held_sale', { input });
}

export async function deleteHeldSale(id: string): Promise<void> {
  return tauriInvoke<void>('delete_held_sale', { id });
}

/**
 * Busca pedidos aguardando finalização no caixa (criados por atendentes)
 */
export async function getWaitingOrders(): Promise<HeldSale[]> {
  return tauriInvoke<HeldSale[]>('get_waiting_orders');
}

/**
 * Atualiza o status de um pedido (WAITING -> PROCESSING -> COMPLETED)
 */
export async function updateHeldSaleStatus(id: string, status: string): Promise<void> {
  return tauriInvoke<void>('update_held_sale_status', { id, status });
}

// MonthlySalesSummary moved to types/index.ts and re-exported

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
  return tauriInvoke<void>('add_cash_movement', {
    input,
  });
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

export async function getCurrentUser(): Promise<Employee | null> {
  return tauriInvoke<Employee | null>('get_current_user');
}

export async function createEmployee(
  input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Employee> {
  // Backend CreateEmployee struct doesn't have isActive/permissions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isActive, permissions, ...backendInput } = input;

  return tauriInvoke<Employee>('create_employee', {
    input: backendInput,
  });
}

export async function updateEmployee(id: string, input: Partial<Employee>): Promise<Employee> {
  return tauriInvoke<Employee>('update_employee', { id, input });
}

export async function deactivateEmployee(id: string): Promise<void> {
  return tauriInvoke<void>('deactivate_employee', { id });
}

export async function reactivateEmployee(id: string): Promise<Employee> {
  return tauriInvoke<Employee>('reactivate_employee', { id });
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
  manufacturingDate?: string,
  supplierId?: string
): Promise<void> {
  return tauriInvoke<void>('create_stock_movement', {
    input: {
      productId,
      quantity,
      movementType: 'INPUT',
      reason: 'Entrada de Estoque',
      costPrice,
      lotNumber,
      expirationDate,
      manufacturingDate,
      supplierId,
    },
  });
}

export async function adjustStock(
  productId: string,
  newQuantity: number,
  reason: string
): Promise<{ adjusted: boolean; delta: number }> {
  // Buscar estoque atual para calcular delta
  const product = await getProductById(productId);
  if (!product) {
    throw new Error(`Produto não encontrado: ${productId}`);
  }

  const currentStock = product.currentStock ?? 0;
  const delta = newQuantity - currentStock;

  // Se não há diferença, retornar sem criar movimento
  if (Math.abs(delta) < 0.001) {
    return { adjusted: false, delta: 0 };
  }

  await tauriInvoke<void>('create_stock_movement', {
    input: {
      productId,
      quantity: delta, // Envia o DELTA, não o valor absoluto
      movementType: 'ADJUSTMENT',
      reason,
    },
  });

  return { adjusted: true, delta };
}

export async function getLowStockProducts(categoryId?: string): Promise<Product[]> {
  return tauriInvoke<Product[]>('get_low_stock_products', { category_id: categoryId });
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
  // Backend CreateSupplier struct doesn't have isActive
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isActive, ...backendInput } = input;

  return tauriInvoke<Supplier>('create_supplier', {
    input: backendInput,
  });
}

export async function updateSupplier(id: string, input: Partial<Supplier>): Promise<Supplier> {
  return tauriInvoke<Supplier>('update_supplier', { id, input });
}

export async function deleteSupplier(id: string): Promise<void> {
  return tauriInvoke<void>('delete_supplier', { id });
}

export async function deactivateSupplier(id: string): Promise<void> {
  return tauriInvoke<void>('deactivate_supplier', { id });
}

export async function reactivateSupplier(id: string): Promise<Supplier> {
  return tauriInvoke<Supplier>('reactivate_supplier', { id });
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
  return tauriInvoke<void>('set_setting', {
    input: {
      key,
      value,
      valueType: type,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HARDWARE
// ────────────────────────────────────────────────────────────────────────────

export async function printReceipt(saleId: string): Promise<TauriResponse<void>> {
  return tauriInvoke<TauriResponse<void>>('print_sale_by_id', { saleId });
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

// Note: getSalesReport, getTopProducts, getStockReport are defined below with centralized types
export async function getMotopartsDashboardStats(): Promise<DashboardStats> {
  return invoke('get_motoparts_dashboard_stats');
}

export async function getServiceOrderStats(): Promise<ServiceOrderStats> {
  return invoke('get_service_order_stats');
}

export async function getTopProductsMotoparts(limit: number): Promise<TopItem[]> {
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

// Use env var when available. Accept either a base URL with or without `/api/v1`.

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
  // Convert data to base64 and send to backend Tauri command which will forward to license server
  const buffer = backupData instanceof ArrayBuffer ? backupData : await backupData.arrayBuffer();
  const base64 = bytesToBase64(new Uint8Array(buffer));

  return tauriInvoke<CloudBackupUploadResponse>('upload_cloud_backup_cmd', {
    bearerToken: token,
    dataBase64: base64,
  });
}

/**
 * List all cloud backups for the current user
 */
export async function listCloudBackups(): Promise<CloudBackupListResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }
  return tauriInvoke<CloudBackupListResponse>('list_cloud_backups_cmd', { bearerToken: token });
}

/**
 * Get metadata for a specific cloud backup
 */
export async function getCloudBackup(backupId: string): Promise<CloudBackupMeta> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }
  return tauriInvoke<CloudBackupMeta>('get_cloud_backup_cmd', { bearerToken: token, backupId });
}

/**
 * Delete a cloud backup
 */
export async function deleteCloudBackup(backupId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado. Faça login no servidor de licenças primeiro.');
  }
  return tauriInvoke<void>('delete_cloud_backup_cmd', { bearerToken: token, backupId });
}

/**
 * Login to GIRO License Server and get a bearer token
 */
export async function loginToCloud(email: string, password: string): Promise<string> {
  return tauriInvoke<string>('license_server_login', {
    payload: { email, password },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/**
 * Create local backup and upload to cloud
 * Combines createBackup() with uploadBackupToCloud()
 */
export async function syncBackupToCloud(
  bearerToken?: string
): Promise<CloudBackupUploadResponse | null> {
  try {
    // 1. Create local backup first
    const localResult = await createBackup();

    if (!localResult.success || !localResult.data) {
      console.error('[Backup] Failed to create local backup:', localResult.error);
      return null;
    }

    const backupPath = localResult.data;
    log.info(' Local backup created at:', backupPath);

    // 2. Read the backup file
    const fileData = await readFile(backupPath);
    log.info(' Read %d bytes', fileData.length);

    // 3. Convert to Base64
    const dataBase64 = bytesToBase64(fileData);

    // 4. Upload to cloud
    // If bearerToken is not provided, we should ideally fetch it from a store
    // For now, we expect it to be passed or we'll need to implement a login flow
    if (!bearerToken) {
      console.warn('[Backup] No bearer token provided for cloud sync');
      return null;
    }

    const result = await tauriInvoke<CloudBackupUploadResponse>('upload_cloud_backup_cmd', {
      bearerToken,
      dataBase64,
    });

    log.info(' Cloud sync successful:', result);
    return result;
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

export async function recoverLicenseFromLogin(payload: {
  email: string;
  password: string;
}): Promise<LicenseInfo> {
  return tauriInvoke<LicenseInfo>('recover_license_from_login', { ...payload });
}
export async function getFinancialReport(
  startDate: string,
  endDate: string
): Promise<FinancialReport> {
  return tauriInvoke<FinancialReport>('get_financial_report', { startDate, endDate });
}

export async function getEmployeePerformance(
  startDate: string,
  endDate: string
): Promise<EmployeeRanking[]> {
  return tauriInvoke<EmployeeRanking[]>('get_employee_performance', { startDate, endDate });
}

export async function getStockReport(categoryId?: string): Promise<StockReport> {
  return tauriInvoke<StockReport>('get_stock_report', { category_id: categoryId });
}

export async function getTopProducts(limit: number = 20): Promise<TopProduct[]> {
  return tauriInvoke<TopProduct[]>('get_top_products', { limit });
}

export async function getSalesReport(startDate: string, endDate: string): Promise<SalesReport> {
  return tauriInvoke<SalesReport>('get_sales_report', { startDate, endDate });
}

export type ConnectionDiagnostic = {
  success: boolean;
  status_code: number;
  message: string;
  dns_resolved: boolean;
  can_reach_server: boolean;
};

/**
 * Test connectivity and SSL/TLS health to the GIRO License Server
 */
export async function testLicenseConnection(): Promise<ConnectionDiagnostic> {
  return tauriInvoke<ConnectionDiagnostic>('test_license_connection');
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE MODULE - CONTRACTS
// ────────────────────────────────────────────────────────────────────────────

export interface EnterpriseContract {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  clientName: string;
  clientCnpj?: string | null;
  startDate: string;
  endDate?: string | null;
  budget?: number | null;
  costCenter: string;
  status: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  managerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ContractWithManager extends EnterpriseContract {
  managerName: string;
}

export interface ContractDashboard {
  activeContracts: number;
  totalContracts: number;
  pendingRequests: number;
  inTransitTransfers: number;
  lowStockAlerts: number;
}

export interface CreateContractInput {
  code: string;
  name: string;
  description?: string;
  clientName: string;
  clientCnpj?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  costCenter: string;
  status: string;
  address?: string;
  city?: string;
  state?: string;
  managerId: string;
}

export async function createContract(input: CreateContractInput): Promise<EnterpriseContract> {
  return tauriInvoke<EnterpriseContract>('create_contract', { input });
}

export async function getContractById(id: string): Promise<ContractWithManager | null> {
  return tauriInvoke<ContractWithManager | null>('get_contract_by_id', { id });
}

export async function getContracts(
  status?: string,
  managerId?: string
): Promise<ContractWithManager[]> {
  return tauriInvoke<ContractWithManager[]>('get_contracts', { status, managerId });
}

export async function getContractDashboard(id: string): Promise<ContractDashboard> {
  return tauriInvoke<ContractDashboard>('get_contract_dashboard', { id });
}

export async function getEnterpriseDashboard(): Promise<EnterpriseKPIs> {
  return tauriInvoke<EnterpriseKPIs>('get_enterprise_dashboard');
}

export async function updateContract(
  id: string,
  input: Partial<CreateContractInput>
): Promise<EnterpriseContract> {
  return tauriInvoke<EnterpriseContract>('update_contract', { id, input });
}

export async function deleteContract(id: string): Promise<void> {
  return tauriInvoke<void>('delete_contract', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE MODULE - WORK FRONTS
// ────────────────────────────────────────────────────────────────────────────

export interface EnterpriseWorkFront {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  contractId: string;
  supervisorId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WorkFrontWithDetails extends EnterpriseWorkFront {
  contractCode: string;
  contractName: string;
  supervisorName: string;
  // UI extras
  activityCount?: number;
  progress?: number;
  location?: string | null;
}

export interface CreateWorkFrontInput {
  code: string;
  name: string;
  description?: string;
  contractId: string;
  supervisorId: string;
  status?: string;
}

export async function createWorkFront(input: CreateWorkFrontInput): Promise<EnterpriseWorkFront> {
  return tauriInvoke<EnterpriseWorkFront>('create_work_front', { input });
}

export async function getWorkFrontById(id: string): Promise<WorkFrontWithDetails | null> {
  return tauriInvoke<WorkFrontWithDetails | null>('get_work_front_by_id', { id });
}

export async function getWorkFronts(
  contractId?: string,
  status?: string
): Promise<WorkFrontWithDetails[]> {
  return tauriInvoke<WorkFrontWithDetails[]>('get_work_fronts', { contractId, status });
}

export async function getWorkFrontsByContract(contractId: string): Promise<WorkFrontWithDetails[]> {
  return tauriInvoke<WorkFrontWithDetails[]>('get_work_fronts_by_contract', { contractId });
}

export async function getWorkFrontsBySupervisor(
  supervisorId: string
): Promise<WorkFrontWithDetails[]> {
  return tauriInvoke<WorkFrontWithDetails[]>('get_work_fronts_by_supervisor', { supervisorId });
}

export async function updateWorkFront(
  id: string,
  input: Partial<CreateWorkFrontInput>
): Promise<EnterpriseWorkFront> {
  return tauriInvoke<EnterpriseWorkFront>('update_work_front', { id, input });
}

export async function deleteWorkFront(id: string): Promise<void> {
  return tauriInvoke<void>('delete_work_front', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE MODULE - ACTIVITIES
// ────────────────────────────────────────────────────────────────────────────

export interface EnterpriseActivity {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  workFrontId: string;
  costCenter?: string | null;
  plannedQty: number;
  executedQty: number;
  unit: string;
  status: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ActivityWithDetails extends EnterpriseActivity {
  workFrontCode: string;
  workFrontName: string;
}

export interface CreateActivityInput {
  code: string;
  name: string;
  description?: string;
  workFrontId: string;
  costCenter?: string;
  plannedQty?: number;
  unit?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export async function createActivity(input: CreateActivityInput): Promise<EnterpriseActivity> {
  return tauriInvoke<EnterpriseActivity>('create_activity', { input });
}

export async function getActivityById(id: string): Promise<ActivityWithDetails | null> {
  return tauriInvoke<ActivityWithDetails | null>('get_activity_by_id', { id });
}

export async function getActivities(
  workFrontId?: string,
  status?: string
): Promise<ActivityWithDetails[]> {
  return tauriInvoke<ActivityWithDetails[]>('get_activities', { workFrontId, status });
}

export async function getActivitiesByWorkFront(
  workFrontId: string
): Promise<ActivityWithDetails[]> {
  return tauriInvoke<ActivityWithDetails[]>('get_activities_by_work_front', { workFrontId });
}

export async function getActivitiesByCostCenter(
  costCenter: string
): Promise<ActivityWithDetails[]> {
  return tauriInvoke<ActivityWithDetails[]>('get_activities_by_cost_center', { costCenter });
}

export async function updateActivity(
  id: string,
  input: Partial<CreateActivityInput>
): Promise<EnterpriseActivity> {
  return tauriInvoke<EnterpriseActivity>('update_activity', { id, input });
}

export async function updateActivityProgress(
  id: string,
  executedQty: number
): Promise<EnterpriseActivity> {
  return tauriInvoke<EnterpriseActivity>('update_activity_progress', { id, executedQty });
}

export async function deleteActivity(id: string): Promise<void> {
  return tauriInvoke<void>('delete_activity', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE MODULE - STOCK LOCATIONS
// ────────────────────────────────────────────────────────────────────────────

export interface EnterpriseStockLocation {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  locationType: string;
  contractId?: string | null;
  managerId?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StockLocationWithDetails extends EnterpriseStockLocation {
  contractCode?: string | null;
  contractName?: string | null;
  managerName?: string | null;
  // UI extras
  itemCount?: number;
  totalValue?: number;
}

export interface StockBalance {
  id: string;
  locationId: string;
  productId: string;
  productName: string;
  productSku: string;
  productUnit: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  minQuantity: number;
  maxQuantity?: number | null;
  lastMovementAt?: string | null;
}

export interface CreateStockLocationInput {
  code: string;
  name: string;
  description?: string;
  locationType: string;
  contractId?: string;
  managerId?: string;
  address?: string;
}

export async function createStockLocation(
  input: CreateStockLocationInput
): Promise<EnterpriseStockLocation> {
  return tauriInvoke<EnterpriseStockLocation>('create_stock_location', { input });
}

export async function getStockLocationById(id: string): Promise<StockLocationWithDetails | null> {
  return tauriInvoke<StockLocationWithDetails | null>('get_stock_location_by_id', { id });
}

export async function getStockLocations(
  contractId?: string,
  locationType?: string
): Promise<StockLocationWithDetails[]> {
  return tauriInvoke<StockLocationWithDetails[]>('get_stock_locations', {
    contractId,
    locationType,
  });
}

export async function getStockLocationsByType(
  locationType: string
): Promise<StockLocationWithDetails[]> {
  return tauriInvoke<StockLocationWithDetails[]>('get_stock_locations_by_type', { locationType });
}

export async function getStockLocationsByContract(
  contractId: string
): Promise<StockLocationWithDetails[]> {
  return tauriInvoke<StockLocationWithDetails[]>('get_stock_locations_by_contract', { contractId });
}

export async function getStockBalances(locationId: string): Promise<StockBalance[]> {
  return tauriInvoke<StockBalance[]>('get_stock_balances', { locationId });
}

export async function adjustStockBalance(
  locationId: string,
  productId: string,
  quantity: number,
  reason: string
): Promise<void> {
  return tauriInvoke<void>('adjust_stock_balance', { locationId, productId, quantity, reason });
}

export async function deleteStockLocation(id: string): Promise<void> {
  return tauriInvoke<void>('delete_stock_location', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE MODULE - MATERIAL REQUESTS
// ────────────────────────────────────────────────────────────────────────────

export interface MaterialRequestWithDetails extends EnterpriseMaterialRequest {
  /** Alias for requestNumber for convenience */
  code: string;
  contractCode: string;
  contractName: string;
  workFrontCode?: string | null;
  workFrontName?: string | null;
  requesterName: string;
  destinationName: string;
  approvedByName?: string | null;
  itemCount: number;
}

export interface MaterialRequestItem {
  id: string;
  requestId: string;
  productId: string;
  productName: string;
  productSku: string;
  productUnit: string;
  requestedQty: number;
  approvedQty?: number | null;
  deliveredQty: number;
  notes?: string | null;
  // UI extras
  quantity?: number;
  separatedQuantity?: number;
}

export interface CreateMaterialRequestInput {
  contractId: string;
  workFrontId?: string;
  activityId?: string;
  destinationId: string;
  priority?: string;
  neededByDate?: string;
  notes?: string;
}

export interface AddRequestItemInput {
  productId: string;
  requestedQty: number;
  notes?: string;
}

export async function createMaterialRequest(
  input: CreateMaterialRequestInput
): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('create_material_request', { input });
}

export async function getMaterialRequestById(
  id: string
): Promise<MaterialRequestWithDetails | null> {
  return tauriInvoke<MaterialRequestWithDetails | null>('get_material_request_by_id', { id });
}

export async function getMaterialRequests(
  contractId?: string,
  status?: string,
  requesterId?: string
): Promise<MaterialRequestWithDetails[]> {
  return tauriInvoke<MaterialRequestWithDetails[]>('get_material_requests', {
    contractId,
    status,
    requesterId,
  });
}

export interface RequestFilters {
  search?: string | null;
  contractId?: string | null;
  workFrontId?: string | null;
  status?: string | null;
  priority?: string | null;
  requesterId?: string | null;
  approverId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export async function getMaterialRequestsPaginated(
  page: number,
  perPage: number,
  filters: RequestFilters
): Promise<{
  data: MaterialRequestWithDetails[];
  total: number;
  page: number;
  perPage: number;
}> {
  return tauriInvoke<{
    data: MaterialRequestWithDetails[];
    total: number;
    page: number;
    perPage: number;
  }>('get_material_requests_paginated', { page, perPage, filters });
}

export async function getPendingRequests(
  approverId?: string
): Promise<MaterialRequestWithDetails[]> {
  return tauriInvoke<MaterialRequestWithDetails[]>('get_pending_requests', {
    approverId: approverId ?? null,
  });
}

export async function getRequestItems(requestId: string): Promise<MaterialRequestItem[]> {
  return tauriInvoke<MaterialRequestItem[]>('get_request_items', { requestId });
}

export async function addRequestItem(
  requestId: string,
  input: AddRequestItemInput
): Promise<MaterialRequestItem> {
  return tauriInvoke<MaterialRequestItem>('add_request_item', { requestId, input });
}

export async function submitRequest(requestId: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('submit_request', { requestId });
}

export async function approveRequest(
  requestId: string,
  approvedItems: Array<{ itemId: string; approvedQty: number }>
): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('approve_request', { requestId, approvedItems });
}

export async function rejectRequest(
  requestId: string,
  reason: string
): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('reject_request', { requestId, reason });
}

export async function startSeparation(requestId: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('start_separation', { requestId });
}

export async function completeSeparation(requestId: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('complete_separation', { requestId });
}

export async function deliverRequest(requestId: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('deliver_request', { requestId });
}

// Aliases para bindings
export async function submitMaterialRequest(id: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('submit_material_request', { id });
}

export async function approveMaterialRequest(id: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('approve_material_request', { id });
}

/** DTO para item aprovado parcialmente */
export interface ApproveItemInput {
  itemId: string;
  approvedQty: number;
}

/** Aprova requisição com quantidades parciais por item */
export async function approveMaterialRequestWithItems(
  id: string,
  items: ApproveItemInput[]
): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('approve_material_request_with_items', {
    id,
    items,
  });
}

export async function rejectMaterialRequest(
  id: string,
  reason: string
): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('reject_material_request', { id, reason });
}

export async function startRequestSeparation(id: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('start_request_separation', { id });
}

export async function completeRequestSeparation(id: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('complete_request_separation', { id });
}

export async function deliverMaterialRequest(id: string): Promise<EnterpriseMaterialRequest> {
  return tauriInvoke<EnterpriseMaterialRequest>('deliver_material_request', { id });
}

// ────────────────────────────────────────────────────────────────────────────
// ENTERPRISE MODULE - STOCK TRANSFERS
// ────────────────────────────────────────────────────────────────────────────

export interface EnterpriseStockTransfer {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  requesterId: string;
  status: string;
  notes?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  rejectedAt?: string | null;
  rejectedById?: string | null;
  rejectionReason?: string | null;
  shippedAt?: string | null;
  shippedById?: string | null;
  receivedAt?: string | null;
  receivedById?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StockTransferWithDetails extends EnterpriseStockTransfer {
  sourceLocationName: string;
  destinationLocationName: string;
  requesterName: string;
  approvedByName?: string | null;
  itemCount: number;
  // UI extras
  priority?: string;
  origin?: string;
  destination?: string;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  productSku: string;
  productUnit: string;
  requestedQty: number;
  shippedQty?: number | null;
  receivedQty?: number | null;
}

export interface CreateStockTransferInput {
  sourceLocationId: string;
  destinationLocationId: string;
  notes?: string;
}

export interface AddTransferItemInput {
  productId: string;
  requestedQty: number;
}

export async function createStockTransfer(
  input: CreateStockTransferInput
): Promise<EnterpriseStockTransfer> {
  return tauriInvoke<EnterpriseStockTransfer>('create_stock_transfer', { input });
}

export async function getStockTransferById(id: string): Promise<StockTransferWithDetails | null> {
  return tauriInvoke<StockTransferWithDetails | null>('get_stock_transfer_by_id', { id });
}

export async function getStockTransfers(
  sourceLocationId?: string,
  destinationLocationId?: string,
  status?: string
): Promise<StockTransferWithDetails[]> {
  return tauriInvoke<StockTransferWithDetails[]>('get_stock_transfers', {
    sourceLocationId,
    destinationLocationId,
    status,
  });
}

export async function getTransferItems(transferId: string): Promise<StockTransferItem[]> {
  return tauriInvoke<StockTransferItem[]>('get_transfer_items', { transferId });
}

export async function addTransferItem(
  transferId: string,
  input: AddTransferItemInput
): Promise<StockTransferItem> {
  return tauriInvoke<StockTransferItem>('add_transfer_item', { transferId, input });
}

export async function approveTransfer(transferId: string): Promise<EnterpriseStockTransfer> {
  return tauriInvoke<EnterpriseStockTransfer>('approve_transfer', { transferId });
}

export async function rejectTransfer(
  transferId: string,
  reason: string
): Promise<EnterpriseStockTransfer> {
  return tauriInvoke<EnterpriseStockTransfer>('reject_transfer', { transferId, reason });
}

export async function shipTransfer(
  transferId: string,
  shippedItems: Array<{ itemId: string; shippedQty: number }>
): Promise<EnterpriseStockTransfer> {
  return tauriInvoke<EnterpriseStockTransfer>('ship_stock_transfer', { transferId, shippedItems });
}

export async function receiveTransfer(
  transferId: string,
  receivedItems: Array<{ itemId: string; receivedQty: number }>
): Promise<EnterpriseStockTransfer> {
  return tauriInvoke<EnterpriseStockTransfer>('receive_stock_transfer', {
    transferId,
    receivedItems,
  });
}

export async function cancelTransfer(transferId: string): Promise<EnterpriseStockTransfer> {
  return tauriInvoke<EnterpriseStockTransfer>('cancel_stock_transfer', { transferId });
}
