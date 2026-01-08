/**
 * @file useSales.test.tsx - Testes para hooks de vendas
 */

import {
  useCancelSale,
  useCreateSale,
  useDailySalesTotal,
  useSale,
  useSales,
  useTodaySales,
} from '@/hooks/useSales';
import * as tauriLib from '@/lib/tauri';
import type { Sale } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getSales: vi.fn(),
  getSaleById: vi.fn(),
  getTodaySales: vi.fn(),
  getDailySalesTotal: vi.fn(),
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
  customerId: null,
  subtotal: 100,
  discount: 0,
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
    const mockSales = { data: [mockSale], total: 1, page: 1, pageSize: 10 };
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
    const mockSales = { data: [mockSale], total: 1, page: 1, pageSize: 10 };
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
      cashSessionId: 'session-1',
      employeeId: 'emp-1',
      items: [],
      paymentMethod: 'CASH',
      amountPaid: 0,
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
    const cancelledSale = { ...mockSale, status: 'CANCELLED' as const };
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
