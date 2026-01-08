/**
 * @file usePDV.test.tsx - Testes para hooks do PDV/Caixa
 */

import {
  useCashSessionSummary,
  useCloseCashSession,
  useCurrentCashSession,
  useOpenCashSession,
} from '@/hooks/usePDV';
import * as tauriLib from '@/lib/tauri';
import type { CashSession, CashSessionSummary } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getCurrentCashSession: vi.fn(),
  getCashSessionSummary: vi.fn(),
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
}));

// Mock do auth store
const mockOpenCashSession = vi.fn();
const mockCloseCashSession = vi.fn();
const mockEmployee = { id: 'emp-1', name: 'Admin' };

vi.mock('@/stores', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: Record<string, unknown>) => unknown) => {
      const state = {
        isAuthenticated: true,
        employee: mockEmployee,
        currentSession: { id: 'session-1' },
        openCashSession: mockOpenCashSession,
        closeCashSession: mockCloseCashSession,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        employee: mockEmployee,
      }),
    }
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockSession: CashSession = {
  id: 'session-1',
  employeeId: 'emp-1',
  openedAt: new Date().toISOString(),
  closedAt: null,
  openingBalance: 200,
  actualBalance: 200,
  expectedBalance: 200,
  difference: 0,
  status: 'OPEN',
  movements: [],
  sales: [],
  employee: { id: 'emp-1', name: 'Admin', role: 'ADMIN' },
};

const mockSummary: CashSessionSummary = {
  id: 'session-1',
  openingBalance: 200,
  salesTotal: 1500,
  withdrawals: 100,
  deposits: 50,
  expectedBalance: 1650,
  salesCount: 25,
};

describe('useCashSessionSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch session summary when id provided', async () => {
    vi.mocked(tauriLib.getCashSessionSummary).mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useCashSessionSummary('session-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSummary);
    expect(tauriLib.getCashSessionSummary).toHaveBeenCalledWith('session-1');
  });

  it('should not fetch when session id is empty', async () => {
    const { result } = renderHook(() => useCashSessionSummary(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(tauriLib.getCashSessionSummary).not.toHaveBeenCalled();
  });

  it('should not fetch when session id is undefined', async () => {
    const { result } = renderHook(() => useCashSessionSummary(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(tauriLib.getCashSessionSummary).not.toHaveBeenCalled();
  });
});

describe('useCurrentCashSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch current session when authenticated', async () => {
    vi.mocked(tauriLib.getCurrentCashSession).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useCurrentCashSession(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSession);
  });

  it('should return null when no active session', async () => {
    vi.mocked(tauriLib.getCurrentCashSession).mockResolvedValue(null);

    const { result } = renderHook(() => useCurrentCashSession(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useOpenCashSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open cash session successfully', async () => {
    vi.mocked(tauriLib.openCashSession).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useOpenCashSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      openingBalance: 200,
      notes: 'Abertura matinal',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.openCashSession).toHaveBeenCalledWith({
      openingBalance: 200,
      notes: 'Abertura matinal',
      employeeId: 'emp-1',
    });
    expect(mockOpenCashSession).toHaveBeenCalled();
  });

  it('should handle open session error', async () => {
    vi.mocked(tauriLib.openCashSession).mockRejectedValue(new Error('Já existe uma sessão aberta'));

    const { result } = renderHook(() => useOpenCashSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ openingBalance: 100 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCloseCashSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should close cash session successfully', async () => {
    const closedSession = { ...mockSession, status: 'CLOSED' as const };
    vi.mocked(tauriLib.closeCashSession).mockResolvedValue(closedSession);

    const { result } = renderHook(() => useCloseCashSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      actualBalance: 1650,
      notes: 'Fechamento noturno',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.closeCashSession).toHaveBeenCalledWith({
      actualBalance: 1650,
      notes: 'Fechamento noturno',
      id: 'session-1',
    });
    expect(mockCloseCashSession).toHaveBeenCalled();
  });

  it('should handle close session with difference', async () => {
    const closedSession = {
      ...mockSession,
      status: 'CLOSED' as const,
      difference: -50,
    };
    vi.mocked(tauriLib.closeCashSession).mockResolvedValue(closedSession);

    const { result } = renderHook(() => useCloseCashSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      actualBalance: 1600,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle close error when no session', async () => {
    vi.mocked(tauriLib.closeCashSession).mockRejectedValue(new Error('Nenhuma sessão aberta'));

    const { result } = renderHook(() => useCloseCashSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ actualBalance: 100 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
