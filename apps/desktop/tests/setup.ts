/**
 * @file setup.ts - Configuração global para Vitest
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock do Tauri Plugin FS - Must be before @/lib/tauri
vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(() => Promise.resolve(false)),
  createDir: vi.fn(),
  removeDir: vi.fn(),
  readDir: vi.fn(() => Promise.resolve([])),
}));

// Mock do Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    setTitle: vi.fn(),
    setResizable: vi.fn(),
    setFullscreen: vi.fn(),
  })),
}));

// Mock do Tauri Dialog Plugin (usado em seletores de arquivos)
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock do matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Console warnings cleanup
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('React Router')) return;
  originalWarn.apply(console, args);
};

// Polyfill para scrollIntoView (usado pelo Radix UI / cmdk)
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Polyfill para PointerEvent (usado pelo Radix UI)
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
}

// Mock Pointer Capture methods (Radix UI)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Global mock for lucide-react icons (stable for tests)
// Replaced Proxy with explicit object construction using importOriginal to ensure all named exports exist.
vi.mock('lucide-react', async (importOriginal) => {
  console.log('[setup.ts] Initializing lucide-react mock');
  const actual = await importOriginal<typeof import('lucide-react')>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mocked: Record<string, any> = {};

  // Copy all properties
  for (const key of Object.keys(actual)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (actual as any)[key];
    // Check if it looks like an icon component (function starting with Uppercase)
    // Note: Some exports might not be icons (e.g. createLucideIcon), so we keep them as is unless we want to mock everything.
    // For safety, let's mock anything that is a function and starts with uppercase, or just allow all originals if not an icon.
    // But the goal is to stop rendering real SVGs.

    if (/^[A-Z]/.test(key)) {
      const Component = (props: React.SVGProps<SVGSVGElement>) =>
        React.createElement('svg', {
          'data-testid': `icon-${key}`,
          ...props,
        });
      Component.displayName = key;
      mocked[key] = Component;
    } else {
      mocked[key] = value;
    }
  }

  // Ensure default export is also handled if necessary (usually lucide-react has named exports)
  return mocked;
});

// Ensure guards exports exist in tests to avoid partial-mock issues
vi.mock('@/components/guards', () => ({
  SessionGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'session-guard' }, children),
  LicenseGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'license-guard' }, children),
}));

// Provide a robust default mock for '@/lib/tauri'
vi.mock('@/lib/tauri', () => {
  return {
    invoke: vi.fn(),
    invokeSafe: vi.fn(),
    getProducts: vi.fn(async () => []),
    getProductById: vi.fn(async () => null),
    searchProducts: vi.fn(async () => []),
    getCategories: vi.fn(async () => []),
    getCurrentCashSession: vi.fn(async () => null),
    openCashSession: vi.fn(async () => null),
    closeCashSession: vi.fn(async () => null),
    addCashMovement: vi.fn(async () => undefined),
    getCashSessionSummary: vi.fn(async () => null),
    getCashSessionHistory: vi.fn(async () => []),
    getEmployees: vi.fn(async () => []),
    authenticateEmployee: vi.fn(async () => null),
    hasAdmin: vi.fn(async () => false),
    hasAnyEmployee: vi.fn(async () => false),
    getMonthlySummary: vi.fn(async () => ({ yearMonth: '', totalSales: 0, totalAmount: 0 })),
    getHardwareId: vi.fn(async () => 'MOCK-HWID-123'),
    activateLicense: vi.fn(async () => ({})),
    validateLicense: vi.fn(async () => ({})),
    getStoredLicense: vi.fn(async () => null),
    restoreLicense: vi.fn(async () => null),
    emitNfce: vi.fn(async () => ({})),
    listOfflineNotes: vi.fn(async () => []),
    transmitOfflineNote: vi.fn(async () => ({})),
    getSetting: vi.fn(async () => null),
    setSetting: vi.fn(async () => undefined),
    seedDatabase: vi.fn(async () => ''),
    createEmployee: vi.fn(async () => ({})),
    updateEmployee: vi.fn(async () => ({})),
    deactivateEmployee: vi.fn(async () => undefined),
    createProduct: vi.fn(async () => ({})),
    updateProduct: vi.fn(async () => ({})),
    deleteProduct: vi.fn(async () => undefined),
    getSales: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 10 })),
    createSale: vi.fn(async () => ({})),
    cancelSale: vi.fn(async () => ({})),
    getTodaySales: vi.fn(async () => []),
    getDailySalesTotal: vi.fn(async () => 0),
    getSuppliers: vi.fn(async () => []),
    createSupplier: vi.fn(async () => ({})),
    getAlerts: vi.fn(async () => []),
    getUnreadAlertsCount: vi.fn(async () => 0),
    getLowStockProducts: vi.fn(async () => []),
    getExpiringLots: vi.fn(async () => []),
    getHeldSales: vi.fn(async () => []),
    saveHeldSale: vi.fn(async () => ({})),
    deleteHeldSale: vi.fn(async () => undefined),
  };
});

beforeEach(() => {
  try {
    window.localStorage.removeItem('__giro_web_mock_db__');
  } catch {
    /* ignore */
  }
  vi.clearAllMocks();

  // Silenciar logs de erro esperados
  const originalError = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (
      message.includes('Erro ao buscar clientes') ||
      message.includes('Erro ao buscar cliente') ||
      message.includes('Error: Open Fail') ||
      message.includes('Error: API Fail') ||
      message.includes('License initialization timed out') ||
      message.includes('License validation failed') ||
      message.includes('Falha ao inicializar verificação de licença')
    ) {
      return;
    }
    originalError.apply(console, args);
  });
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Test] UnhandledRejection:', reason);
});
