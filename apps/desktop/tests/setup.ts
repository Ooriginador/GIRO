/**
 * @file setup.ts - Configuração global para Vitest
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

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

// Global mock for lucide-react icons used across tests.
// A simple Proxy-based mock that provides SVG components for any icon name.
// This avoids the need to maintain a massive list of icons and prevents CI hangs.
vi.mock('lucide-react', () => {
  const IconMock = (name: string) => {
    const Component = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', { 'data-testid': `icon-${name}`, ...props });
    Component.displayName = name;
    return Component;
  };

  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        if (typeof prop === 'symbol') return undefined;
        return IconMock(String(prop));
      },
      has: () => true,
    }
  );
});

// Ensure guards exports exist in tests to avoid partial-mock issues
// Simple deterministic guards mock to avoid partial-mock pitfalls
vi.mock('@/components/guards', () => ({
  SessionGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'session-guard' }, children),
  LicenseGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'license-guard' }, children),
}));

// Provide a robust default mock for '@/lib/tauri' so tests that
// use it will have all expected exports stubbed.
// NOTE: Removed `importOriginal()` which was causing deadlock/hang in CI.
vi.mock('@/lib/tauri', () => {
  // List of common functions used across the app tests. We stub
  // them with `vi.fn()` or simple async defaults to keep tests stable.
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
  };
});

// Clean state between tests to avoid leaking the web mock DB and mocks.
beforeEach(() => {
  try {
    window.localStorage.removeItem('__giro_web_mock_db__');
  } catch {
    /* ignore */
  }
  vi.resetAllMocks();
  vi.restoreAllMocks();

  // Silenciar logs de erro esperados durante os testes
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

// During tests, some mocks intentionally reject to exercise error paths.
// Add a global handler for unhandled rejections so the test runner does
// not terminate the process; we still log the error for visibility.
process.on('unhandledRejection', (reason) => {
  console.warn('[Test] UnhandledRejection:', reason);
});
