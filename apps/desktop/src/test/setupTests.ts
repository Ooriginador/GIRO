import { vi } from 'vitest';
import fixtures from './fixtures';

// Shared mock for Tauri invoke used in many tests
export const mockInvokeResolved = (value: unknown) => {
  const mod = vi.mocked(importMockedInvoke(), true) as any;
  mod.mockResolvedValue(value);
};

export const mockInvokeRejected = (err: unknown) => {
  const mod = vi.mocked(importMockedInvoke(), true) as any;
  mod.mockRejectedValue(err);
};

function importMockedInvoke() {
  // Import the module path used across the codebase: '@/lib/tauri'
  // Tests should call `vi.mocked(invoke)` after calling `vi.mock('@/lib/tauri')`.
  // Here we simply return a dummy function reference for tools that expect it.
  return () => {};
}

// Initialize a simple in-memory web mock DB for tests that run in "web" mode
export function initWebMockDB(overrides: Record<string, unknown> = {}) {
  const db = {
    employees: [fixtures.MOCK_EMPLOYEE_ADMIN],
    currentCashSession: null,
    cashSessionHistory: [],
    ...overrides,
  };

  try {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => JSON.stringify(db),
        setItem: () => undefined,
        removeItem: () => undefined,
        clear: () => undefined,
      },
      writable: true,
    });
  } catch {
    // ignore in environments where window isn't writable
  }
}

export default fixtures;
