/**
 * @file useSales.test.tsx - Testes para hooks de vendas
 */

import {
  useCancelSale,
  useCashMovement,
  useCloseCashSession,
  useCreateSale,
  useCurrentCashSession,
  useDailySalesTotal,
  useOpenCashSession,
  usePDV,
  useSale,
  useSales,
  useSalesReport,
  useTodaySales,
} from '@/hooks/useSales';
import * as tauriLib from '@/lib/tauri';
import type { CashSession, Sale } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getSales: vi.fn(),
  getSaleById: vi.fn(),
  getTodaySales: vi.fn(),
  getDailySalesTotal: vi.fn(),
  getSalesReport: vi.fn(),
  getTopProducts: vi.fn(),
  createSale: vi.fn(),
  cancelSale: vi.fn(),
  getCurrentCashSession: vi.fn(),
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
  addCashMovement: vi.fn(),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    toast: vi.fn(),
  }),
}));

// Mock do store
vi.mock('@/stores', () => ({
  usePDVStore: vi.fn((selector) => {
    const state = {
      clearCart: vi.fn(),
      setCashSession: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
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

const mockSale: Sale = {
  id: 'sale-1',
  dailyNumber: 1,
  cashSessionId: 'session-1',
  employeeId: 'emp-1',
  subtotal: 100,
  discountType: undefined,
  discountValue: 0,
  discountReason: undefined,
  total: 100,
  paymentMethod: 'CASH',
  amountPaid: 100,
  change: 0,
  status: 'COMPLETED',
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useSales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch sales list', async () => {
    const mockSales = { data: [mockSale], total: 1, page: 1, limit: 10, totalPages: 1 };
    vi.mocked(tauriLib.getSales).mockResolvedValue(mockSales);

    const { result } = renderHook(() => useSales(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSales);
    expect(tauriLib.getSales).toHaveBeenCalled();
  });

  it('should fetch sales with filter', async () => {
    const mockSales = { data: [mockSale], total: 1, page: 1, limit: 10, totalPages: 1 };
    vi.mocked(tauriLib.getSales).mockResolvedValue(mockSales);

    const filter = { status: 'COMPLETED' as const };
    const { result } = renderHook(() => useSales(filter), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.getSales).toHaveBeenCalledWith(filter);
  });
});

describe('useSale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single sale by id', async () => {
    vi.mocked(tauriLib.getSaleById).mockResolvedValue(mockSale);

    const { result } = renderHook(() => useSale('sale-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSale);
    expect(tauriLib.getSaleById).toHaveBeenCalledWith('sale-1');
  });

  it('should not fetch when id is empty', async () => {
    const { result } = renderHook(() => useSale(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(tauriLib.getSaleById).not.toHaveBeenCalled();
  });
});

describe('useTodaySales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch today sales', async () => {
    const todaySales = [mockSale];
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue(todaySales);

    const { result } = renderHook(() => useTodaySales(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(todaySales);
  });
});

describe('useDailySalesTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch daily total', async () => {
    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(1500.5);

    const { result } = renderHook(() => useDailySalesTotal(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(1500.5);
  });
});

describe('useCreateSale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create sale successfully', async () => {
    vi.mocked(tauriLib.createSale).mockResolvedValue(mockSale);

    const { result } = renderHook(() => useCreateSale(), {
      wrapper: createWrapper(),
    });

    const input = {
      cashSessionId: 'session-1',
      employeeId: 'emp-1',
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          unitPrice: 50,
          discount: 0,
        },
      ],
      paymentMethod: 'CASH' as const,
      amountPaid: 100,
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.createSale).toHaveBeenCalledWith(input);
  });

  it('should handle create sale error', async () => {
    vi.mocked(tauriLib.createSale).mockRejectedValue(new Error('Estoque insuficiente'));

    const { result } = renderHook(() => useCreateSale(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      items: [],
      paymentMethod: 'CASH',
      amountPaid: 0,
      employeeId: 'emp-1',
      cashSessionId: 'session-1',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCancelSale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel sale successfully', async () => {
    const cancelledSale = { ...mockSale, status: 'CANCELED' as const };
    vi.mocked(tauriLib.cancelSale).mockResolvedValue(cancelledSale);

    const { result } = renderHook(() => useCancelSale(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'sale-1', reason: 'Cliente desistiu' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.cancelSale).toHaveBeenCalledWith('sale-1', 'Cliente desistiu');
  });
});

describe('Cash Session Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession: CashSession = {
    id: 'sess-1',
    status: 'OPEN',
    openedAt: new Date().toISOString(),
    employeeId: 'emp-1',
    openingBalance: 100,
    payments: [],
  };

  it('useCurrentCashSession should fetch current session', async () => {
    vi.mocked(tauriLib.getCurrentCashSession).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useCurrentCashSession(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSession);
  });

  it('useOpenCashSession should open a session', async () => {
    vi.mocked(tauriLib.openCashSession).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useOpenCashSession(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ openingBalance: 100, employeeId: 'emp-1' });

    expect(tauriLib.openCashSession).toHaveBeenCalledWith({
      openingBalance: 100,
      employeeId: 'emp-1',
    });
  });

  it('useCloseCashSession should close a session', async () => {
    const closedSession = {
      ...mockSession,
      status: 'CLOSED' as const,
      closedAt: new Date().toISOString(),
      difference: 0,
    };
    vi.mocked(tauriLib.closeCashSession).mockResolvedValue(closedSession);

    const { result } = renderHook(() => useCloseCashSession(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: 'sess-1', closing_balance: 200 });

    expect(tauriLib.closeCashSession).toHaveBeenCalledWith({ id: 'sess-1', closing_balance: 200 });
  });

  it('useCashMovement should add movement', async () => {
    vi.mocked(tauriLib.addCashMovement).mockResolvedValue({ id: 'mov-1' } as any);

    const { result } = renderHook(() => useCashMovement(), {
      wrapper: createWrapper(),
    });

    const input = {
      type: 'SUPPLY' as const,
      amount: 50,
      reason: 'Troco',
      description: 'Troco inicial',
    };
    await result.current.mutateAsync(input);

    expect(tauriLib.addCashMovement).toHaveBeenCalledWith(input);
  });
});

describe('usePDV', () => {
  it('should return PDV state', async () => {
    const mockSession: CashSession = {
      id: 'sess-1',
      status: 'OPEN',
      employeeId: 'emp-1',
      openedAt: new Date().toISOString(),
      openingBalance: 100,
      payments: [],
    };
    vi.mocked(tauriLib.getCurrentCashSession).mockResolvedValue(mockSession);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue([mockSale]);
    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(100);

    const { result } = renderHook(() => usePDV(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
    });

    expect(result.current.isCashOpen).toBe(true);
    expect(result.current.todaySales).toHaveLength(1);
    expect(result.current.dailyTotal).toBe(100);
  });
});

describe('useSalesReport', () => {
  it('should fetch sales report when params are provided', async () => {
    const mockReport = {
      totalSales: 2,
      totalRevenue: 200,
      averageTicket: 100,
      salesByHour: { '10': 200 },
      salesByPaymentMethod: { CASH: 200 },
    };
    const mockTopProducts = [{ product: { name: 'Prod A' }, quantity: 5, revenue: 500 }];

    vi.mocked(tauriLib.getSalesReport).mockResolvedValue(mockReport);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue(mockTopProducts as any);

    const params = { startDate: '2025-01-01', endDate: '2025-01-02' };
    const { result } = renderHook(() => useSalesReport(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.totalAmount).toBe(200);
    expect(result.current.data?.topProducts).toHaveLength(1);
    expect(result.current.data?.periods).toHaveLength(1);
  });
});
