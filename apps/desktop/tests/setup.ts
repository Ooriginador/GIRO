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
  window.PointerEvent = PointerEvent as any;
}

// Mock Pointer Capture methods (Radix UI)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Global mock for lucide-react icons used across tests.
const _iconNames = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowDown',
  'ArrowUp',
  'ArrowUpDown',
  'ArrowDownRight',
  'ArrowUpRight',
  'ArrowUpCircle',
  'ArrowDownCircle',
  'ChevronDown',
  'ChevronUp',
  'ChevronLeft',
  'ChevronRight',
  'ChevronsUpDown',
  'Check',
  'CheckCircle',
  'CheckCircle2',
  'X',
  'XCircle',
  'Loader2',
  'Plus',
  'Minus',
  'Trash2',
  'Delete',
  'Edit',
  'Save',
  'Search',
  'Package',
  'PackagePlus',
  'BarChart3',
  'DollarSign',
  'CalendarIcon',
  'Calendar',
  'Clock',
  'Calculator',
  'TrendingUp',
  'TrendingDown',
  'ShoppingCart',
  'Bike',
  'Phone',
  'User',
  'UserPlus',
  'Bell',
  'AlertCircle',
  'AlertTriangle',
  'Info',
  'RefreshCw',
  'Send',
  'Printer',
  'HardDrive',
  'Scale',
  'Wifi',
  'WifiOff',
  'QrCode',
  'ShieldCheck',
  'ShieldAlert',
  'Key',
  'Lock',
  'Monitor',
  'Moon',
  'Sun',
  'FileText',
  'FileCode',
  'FolderTree',
  'CornerDownLeft',
  'Delete',
  'Loader2',
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'ChevronsUpDown',
  'CheckCircle2',
];

const _makeIcon = (name: string) => (props: any) =>
  React.createElement('svg', { 'data-testid': `icon-${name}`, ...props });

// Create a Proxy that provides icon components for any requested name.
// Implement `has`, `getOwnPropertyDescriptor` and `ownKeys` so module
// shape checks (used by Vitest) succeed even for dynamic names.
const _exportsTarget: Record<string, any> = {};
_iconNames.forEach((n) => (_exportsTarget[n] = _makeIcon(n)));
_exportsTarget.default = {};

const lucideHandler: ProxyHandler<typeof _exportsTarget> = {
  get(target, prop) {
    if (prop === 'default') return target.default;
    if (typeof prop === 'symbol') return (target as any)[prop];
    const name = String(prop);
    if (!(name in target)) target[name] = _makeIcon(name);
    return target[name];
  },
  has() {
    return true;
  },
  getOwnPropertyDescriptor(target, prop) {
    if (typeof prop === 'symbol') return Object.getOwnPropertyDescriptor(target, prop as any);
    const name = String(prop);
    if (!(name in target)) target[name] = _makeIcon(name);
    return {
      configurable: true,
      enumerable: true,
      value: target[name],
      writable: true,
    } as PropertyDescriptor;
  },
  ownKeys(target) {
    return Array.from(new Set([...Object.keys(target), ..._iconNames]));
  },
};

const exportsObj = new Proxy(_exportsTarget, lucideHandler) as any;

vi.mock('lucide-react', () => exportsObj as any);

// Ensure guards exports exist in tests to avoid partial-mock issues
// Simple deterministic guards mock to avoid partial-mock pitfalls
vi.mock('@/components/guards', () => ({
  SessionGuard: ({ children }: { children?: any }) =>
    React.createElement('div', { 'data-testid': 'session-guard' }, children),
  LicenseGuard: ({ children }: { children?: any }) =>
    React.createElement('div', { 'data-testid': 'license-guard' }, children),
}));

// Provide a robust default mock for '@/lib/tauri' so tests that
// partially mock it via `importOriginal` will have the expected exports.
vi.mock('@/lib/tauri', async (importOriginal) => {
  const original = await importOriginal();

  // List of common functions used across the app tests. We stub
  // them with `vi.fn()` or simple async defaults to keep tests stable.
  const stub = {
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
    getEmployees: vi.fn(async () => []),
    authenticateEmployee: vi.fn(async () => null),
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
    // keep original exports as fallback
    ...original,
  };

  return stub;
});

// Clean state between tests to avoid leaking the web mock DB and mocks.
beforeEach(() => {
  try {
    window.localStorage.removeItem('__giro_web_mock_db__');
  } catch (e) {
    /* ignore */
  }
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

// During tests, some mocks intentionally reject to exercise error paths.
// Add a global handler for unhandled rejections so the test runner does
// not terminate the process; we still log the error for visibility.
process.on('unhandledRejection', (reason) => {
  console.warn('[Test] UnhandledRejection:', reason);
});
