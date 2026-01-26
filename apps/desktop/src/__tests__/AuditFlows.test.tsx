import { fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FC, PropsWithChildren } from 'react';

// Hoisted shared state for mocks
const mockState = vi.hoisted(() => ({
  dbMovements: [] as any[],
  dbSession: null as any,
  mockUser: { id: 'admin-1', name: 'Admin', role: 'ADMIN' },
}));

// Mock @/lib/tauri module
vi.mock('@/lib/tauri', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tauri')>();
  return {
    ...actual,
    getCurrentCashSession: vi.fn(() => Promise.resolve(mockState.dbSession)),
    openCashSession: vi.fn((input: any) => {
      mockState.dbSession = {
        id: 'sess-' + Date.now(),
        status: 'OPEN',
        openingBalance: input.openingBalance,
        openedAt: new Date().toISOString(),
        employeeId: input.employeeId,
        employee: mockState.mockUser,
      };
      return Promise.resolve(mockState.dbSession);
    }),
    closeCashSession: vi.fn(() => {
      if (!mockState.dbSession) throw new Error('No session');
      mockState.dbSession = { ...mockState.dbSession, status: 'CLOSED', closedAt: new Date().toISOString() };
      return Promise.resolve(mockState.dbSession);
    }),
    getCashSessionSummary: vi.fn(() => {
      const supplyTotal = mockState.dbMovements.filter((m) => m.type === 'DEPOSIT').reduce((sum, m) => sum + m.amount, 0);
      const bleedTotal = mockState.dbMovements.filter((m) => m.type === 'WITHDRAWAL').reduce((sum, m) => sum + m.amount, 0);
      return Promise.resolve({
        session: mockState.dbSession,
        totalSales: 0,
        totalSupplies: supplyTotal,
        totalWithdrawals: bleedTotal,
        cashInDrawer: (mockState.dbSession?.openingBalance || 0) + supplyTotal - bleedTotal,
        movements: mockState.dbMovements,
        salesByMethod: [],
      });
    }),
    getCashSessionMovements: vi.fn(() => Promise.resolve(mockState.dbMovements)),
    addCashMovement: vi.fn((input: any) => {
      const typeMap: Record<string, string> = { SUPPLY: 'DEPOSIT', BLEED: 'WITHDRAWAL' };
      mockState.dbMovements.push({
        id: 'mov-' + Date.now(),
        sessionId: input.sessionId,
        type: typeMap[input.movementType],
        amount: input.amount,
        description: input.description,
        createdAt: new Date().toISOString(),
      });
      return Promise.resolve();
    }),
    getCategories: vi.fn(() => Promise.resolve([])),
  };
});

// Mock auth store
vi.mock('@/stores/auth-store', () => {
  const authState = {
    employee: { id: 'admin-1', name: 'Admin', role: 'ADMIN' },
    hasPermission: () => true,
    currentSession: null as any,
    isAuthenticated: true,
    openCashSession: vi.fn((s: any) => { authState.currentSession = s; }),
    closeCashSession: vi.fn(() => { authState.currentSession = null; }),
  };
  const mockStore = vi.fn(() => authState);
  (mockStore as any).getState = vi.fn(() => authState);
  return { useAuthStore: mockStore };
});

import { CashControlPage } from '@/pages/cash/CashControlPage';
import { ProductFormPage } from '@/pages/products/ProductFormPage';
import * as tauriLib from '@/lib/tauri';
import { MemoryRouter } from 'react-router-dom';

describe('Audit: Critical Flows Integration', () => {
  let queryClient: QueryClient;

  const createWrapper = (): FC<PropsWithChildren> => {
    const Wrapper: FC<PropsWithChildren> = ({ children }) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
    return Wrapper;
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity, refetchOnMount: false, refetchInterval: false },
        mutations: { retry: false },
      },
    });
    mockState.dbMovements = [];
    mockState.dbSession = null;
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  it('Flow: Full Cash Control Cycle', async () => {
    const Wrapper = createWrapper();
    await act(async () => { render(<CashControlPage />, { wrapper: Wrapper }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });

    expect(screen.queryByTestId('cash-balance')).not.toBeInTheDocument();
    expect(screen.getByText('Caixa Fechado')).toBeInTheDocument();

    const openBtn = screen.getByTestId('open-cash');
    await act(async () => { fireEvent.click(openBtn); await vi.advanceTimersByTimeAsync(100); });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const openInput = screen.getByTestId('opening-balance-input');
    await act(async () => { fireEvent.change(openInput, { target: { value: '100,00' } }); await vi.advanceTimersByTimeAsync(50); });

    const confirmBtn = within(dialog).getByRole('button', { name: /Abrir Caixa/i });
    await act(async () => { fireEvent.click(confirmBtn); await vi.advanceTimersByTimeAsync(500); });

    // Wait for mutation to complete and manually refetch
    await act(async () => { 
      await queryClient.refetchQueries({ queryKey: ['cashSession'] }); 
      await vi.advanceTimersByTimeAsync(100); 
    });

    expect(tauriLib.openCashSession).toHaveBeenCalled();
    expect(mockState.dbSession).not.toBeNull();
    expect(mockState.dbSession.status).toBe('OPEN');

    await waitFor(() => { 
      expect(screen.queryByTestId('cash-balance')).toBeInTheDocument(); 
    }, { timeout: 3000, interval: 100 });
    
    expect(screen.getByTestId('cash-balance')).toHaveTextContent('100,00');
  });

  it("UX: Product Form should have autoComplete='off'", async () => {
    const Wrapper = createWrapper();
    await act(async () => { render(<ProductFormPage />, { wrapper: Wrapper }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const nameInput = await screen.findByLabelText(/Nome do Produto/i, {}, { timeout: 3000 });
    expect(nameInput).toHaveAttribute('autocomplete', 'off');
  });
});
