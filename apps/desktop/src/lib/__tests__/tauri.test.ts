import { invoke as tauriCoreInvoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const tauriLib = await vi.importActual('../tauri');
import fixtures from '@/test/fixtures';

// Functional localStorage mock for state persistence
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => {
    storage[key] = value.toString();
  }),
  removeItem: vi.fn((key) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    for (const key in storage) delete storage[key];
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Helper to set Tauri environment
const setTauriEnv = (isTauri: boolean) => {
  if (isTauri) {
    (globalThis as unknown as Record<string, unknown>).__TAURI__ = {};
  } else {
    delete (globalThis as unknown as Record<string, unknown>).__TAURI__;
  }
};

type TauriInvokeMock = {
  mockResolvedValue: (v: unknown) => void;
  mockRejectedValue?: (e: unknown) => void;
  mockResolvedValueOnce?: (v: unknown) => void;
  mockImplementation?: (...args: unknown[]) => unknown;
};

describe('tauri.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reinitialize in-test localStorage implementation (global setup resets mocks)
    Object.keys(storage).forEach((k) => delete storage[k]);
    (localStorage as any).getItem = (key: string) => storage[key] ?? null;
    (localStorage as any).setItem = (key: string, value: string) => {
      storage[key] = value.toString();
    };
    (localStorage as any).removeItem = (key: string) => {
      delete storage[key];
    };
    (localStorage as any).clear = () => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    };

    // Seed mock DB for tests that expect an employee/admin
    localStorage.setItem(
      '__giro_web_mock_db__',
      JSON.stringify({
        employees: [fixtures.MOCK_EMPLOYEE_ADMIN],
        currentCashSession: null,
        cashSessionHistory: [],
      })
    );
    setTauriEnv(false);
  });

  describe('isTauriRuntime', () => {
    it('should return true when window.__TAURI__ is defined', async () => {
      setTauriEnv(true);
      (tauriCoreInvoke as unknown as TauriInvokeMock).mockResolvedValue([]);
      await tauriLib.getProducts();
      expect(tauriCoreInvoke).toHaveBeenCalled();
    });

    it('should return false when window.__TAURI__ is undefined', async () => {
      setTauriEnv(false);
      try {
        await tauriLib.getProducts();
      } catch {
        // Expected to fail because get_products is not in webMockInvoke
      }
      expect(tauriCoreInvoke).not.toHaveBeenCalled();
    });
  });

  describe('tauriInvoke (Tauri path)', () => {
    it('should call tauriCoreInvoke when in Tauri runtime', async () => {
      setTauriEnv(true);
      (tauriCoreInvoke as unknown as TauriInvokeMock).mockResolvedValue([
        { id: '1', name: 'Product 1' },
      ]);

      const result = await tauriLib.getProducts();
      expect(tauriCoreInvoke).toHaveBeenCalledWith('get_products', { filter: undefined });
      expect(result).toEqual([{ id: '1', name: 'Product 1' }]);
    });
  });

  describe('webMockInvoke (Web path)', () => {
    beforeEach(() => {
      setTauriEnv(false);
    });

    it('should authenticate employee correctly', async () => {
      // Debug: ensure web mock DB is seeded
      console.log('WEB_DB_RAW:', window.localStorage.getItem('__giro_web_mock_db__'));
      try {
        console.log(
          'PARSED:',
          JSON.parse(window.localStorage.getItem('__giro_web_mock_db__') || '{}')
        );
      } catch {
        /* ignore */
      }

      const employee = await tauriLib.authenticateEmployee(fixtures.TEST_PIN);
      expect(employee).not.toBeNull();
      expect(employee?.name).toBe('Admin');
    });

    it('should return null for invalid pin', async () => {
      const employee = await tauriLib.authenticateEmployee('wrong');
      expect(employee).toBeNull();
    });

    it('should check if admin exists', async () => {
      const exists = await tauriLib.hasAdmin();
      expect(exists).toBe(true);
    });

    it('should get current cash session (null initially)', async () => {
      const session = await tauriLib.getCurrentCashSession();
      expect(session).toBeNull();
    });

    it('should open and close a cash session', async () => {
      const employees = await tauriLib.getEmployees();
      const adminId = employees[0].id;

      const session = await tauriLib.openCashSession({
        employeeId: adminId,
        openingBalance: 100,
      });

      expect(session.status).toBe('OPEN');
      expect(session.openingBalance).toBe(100);

      const current = await tauriLib.getCurrentCashSession();
      expect(current?.id).toBe(session.id);

      const closed = await tauriLib.closeCashSession({
        id: session.id,
        actualBalance: 150,
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.actualBalance).toBe(150);

      const after = await tauriLib.getCurrentCashSession();
      expect(after).toBeNull();
    });

    it('should add cash movements and get summary', async () => {
      const employees = await tauriLib.getEmployees();
      const adminId = employees[0].id;

      const session = await tauriLib.openCashSession({
        employeeId: adminId,
        openingBalance: 100,
      });

      await tauriLib.addCashMovement({
        sessionId: session.id,
        movementType: 'SUPPLY',
        amount: 50,
        description: 'Suprimento',
      });

      await tauriLib.addCashMovement({
        sessionId: session.id,
        movementType: 'BLEED',
        amount: 30,
        description: 'Sangria',
      });

      const summary = await tauriLib.getCashSessionSummary(session.id);
      expect(summary.totalSupplies).toBe(50);
      expect(summary.totalWithdrawals).toBe(30);
      expect(summary.cashInDrawer).toBe(120); // 100 + 50 - 30
    });

    it('should return empty list for getProducts in web mock', async () => {
      const res = await tauriLib.getProducts();
      expect(res).toEqual([]);
    });

    it('should throw error if opening session when one is already open', async () => {
      const employees = await tauriLib.getEmployees();
      const adminId = employees[0].id;

      await tauriLib.openCashSession({ employeeId: adminId, openingBalance: 100 });
      await expect(
        tauriLib.openCashSession({ employeeId: adminId, openingBalance: 100 })
      ).rejects.toThrow('Já existe uma sessão de caixa aberta');
    });
  });

  describe('All other wrappers', () => {
    it('should call tauriInvoke for various commands', async () => {
      setTauriEnv(true);
      (tauriCoreInvoke as unknown as TauriInvokeMock).mockResolvedValue({});

      const commands = [
        { fn: () => tauriLib.getProducts({}), cmd: 'get_products' },
        { fn: () => tauriLib.getProductById('1'), cmd: 'get_product_by_id' },
        { fn: () => tauriLib.searchProducts('test'), cmd: 'search_products' },
        { fn: () => tauriLib.getCategories(), cmd: 'get_categories' },
        { fn: () => tauriLib.getSales(), cmd: 'get_sales' },
        { fn: () => tauriLib.getAlerts(), cmd: 'get_alerts' },
        { fn: () => tauriLib.getSettings(), cmd: 'get_all_settings' },
        { fn: () => tauriLib.printReceipt('sale-1'), cmd: 'print_receipt' },
      ];

      for (const { fn, cmd } of commands) {
        await fn();
        if (cmd === 'get_categories' || cmd === 'get_all_settings') {
          expect(tauriCoreInvoke).toHaveBeenCalledWith(cmd, undefined);
        } else {
          expect(tauriCoreInvoke).toHaveBeenCalledWith(cmd, expect.anything());
        }
      }
    });
  });
});
