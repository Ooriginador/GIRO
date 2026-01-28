/**
 * @file useStock.test.tsx - Testes para hooks de estoque
 */

import {
  useAddStockEntry,
  useAdjustStock,
  useLowStockProducts,
  useStockDashboard,
  useStockMovements,
  useStockReport,
} from '@/hooks/useStock';
import * as tauriLib from '@/lib/tauri';
import type { Product, StockMovement } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getStockMovements: vi.fn(),
  getLowStockProducts: vi.fn(),
  getStockReport: vi.fn(),
  addStockEntry: vi.fn(),
  adjustStock: vi.fn(),
  getExpiringLots: vi.fn(),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    toast: vi.fn(),
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

const mockMovement: StockMovement = {
  id: 'mov-1',
  productId: 'prod-1',
  type: 'ENTRY',
  quantity: 50,
  previousStock: 100,
  newStock: 150,
  reason: 'Recebimento de fornecedor',
  employeeId: 'emp-1',
  createdAt: new Date().toISOString(),
};

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Arroz 5kg',
  barcode: '7891234567890',
  internalCode: 'P001',
  salePrice: 24.9,
  costPrice: 18.0,
  currentStock: 5,
  minStock: 10,
  isActive: true,
  categoryId: 'cat-1',
  unit: 'UNIT',
  isWeighted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useStockMovements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all stock movements', async () => {
    const movements = [mockMovement];
    vi.mocked(tauriLib.getStockMovements).mockResolvedValue(movements);

    const { result } = renderHook(() => useStockMovements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(movements);
  });

  it('should fetch movements for specific product', async () => {
    const movements = [mockMovement];
    vi.mocked(tauriLib.getStockMovements).mockResolvedValue(movements);

    const { result } = renderHook(() => useStockMovements('prod-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.getStockMovements).toHaveBeenCalledWith('prod-1');
  });
});

describe('useLowStockProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch low stock products', async () => {
    const lowStockProducts = [mockProduct];
    vi.mocked(tauriLib.getLowStockProducts).mockResolvedValue(lowStockProducts);

    const { result } = renderHook(() => useLowStockProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(lowStockProducts);
    expect(result.current.data?.[0]?.currentStock).toBeLessThan(
      result.current.data?.[0]?.minStock ?? 0
    );
  });
});

describe('useStockReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch stock report', async () => {
    const report = {
      totalProducts: 150,
      totalValue: 25000,
      lowStockCount: 12,
      outOfStockCount: 3,
      expiringCount: 5,
    };
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(report);

    const { result } = renderHook(() => useStockReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(report);
  });
});

describe('useAddStockEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add stock entry successfully', async () => {
    vi.mocked(tauriLib.addStockEntry).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAddStockEntry(), {
      wrapper: createWrapper(),
    });

    const input = {
      productId: 'prod-1',
      quantity: 50,
      costPrice: 18.0,
      lotNumber: 'LOT-001',
      expirationDate: '2027-01-01',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Ensure addStockEntry was called with the expected leading arguments
    expect(tauriLib.addStockEntry).toHaveBeenCalled();
    const call = (tauriLib.addStockEntry as any).mock.calls[0];
    expect(call[0]).toBe('prod-1');
    expect(call[1]).toBe(50);
    expect(call[2]).toBe(18.0);
    expect(call[3]).toBe('LOT-001');
    expect(call[4]).toBe('2027-01-01');
  });

  it('should handle stock entry error', async () => {
    vi.mocked(tauriLib.addStockEntry).mockRejectedValue(new Error('Produto não encontrado'));

    const { result } = renderHook(() => useAddStockEntry(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      productId: 'invalid-id',
      quantity: 10,
      costPrice: 5.0,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useAdjustStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should adjust stock successfully', async () => {
    vi.mocked(tauriLib.adjustStock).mockResolvedValue({ adjusted: true, delta: 50 });

    const { result } = renderHook(() => useAdjustStock(), {
      wrapper: createWrapper(),
    });

    const input = {
      productId: 'prod-1',
      newQuantity: 100,
      reason: 'Inventário físico',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.adjustStock).toHaveBeenCalledWith('prod-1', 100, 'Inventário físico');
  });
});

describe('useStockDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return combined stock dashboard data', async () => {
    const lowStockProducts = [mockProduct];
    const report = {
      totalProducts: 150,
      totalValue: 25000,
      lowStockCount: 12,
      outOfStockCount: 3,
      expiringCount: 5,
    };

    vi.mocked(tauriLib.getLowStockProducts).mockResolvedValue(lowStockProducts);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(report);

    const { result } = renderHook(() => useStockDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lowStockProducts).toEqual(lowStockProducts);
    expect(result.current.lowStockCount).toBe(1);
    expect(result.current.report.totalProducts).toBe(150);
  });

  it('should return defaults when loading', () => {
    // Use mockResolvedValue with a delayed resolution instead of never-resolving promises
    vi.mocked(tauriLib.getLowStockProducts).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 50))
    );
    vi.mocked(tauriLib.getStockReport).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                totalProducts: 0,
                totalValue: 0,
                lowStockCount: 0,
                outOfStockCount: 0,
                expiringCount: 0,
              }),
            50
          )
        )
    );

    const { result } = renderHook(() => useStockDashboard(), {
      wrapper: createWrapper(),
    });

    // Check initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.lowStockProducts).toEqual([]);
    expect(result.current.report.totalProducts).toBe(0);
  });
});
