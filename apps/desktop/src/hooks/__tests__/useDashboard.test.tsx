/**
 * @file useDashboard.test.tsx - Testes para hooks do dashboard
 */

import { useDashboardStats } from '@/hooks/useDashboard';
import * as tauriLib from '@/lib/tauri';
import type { Product, Sale } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixtures from '@/test/fixtures';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getDailySalesTotal: vi.fn(),
  getTodaySales: vi.fn(),
  getStockReport: vi.fn(),
  getUnreadAlertsCount: vi.fn(),
  getTopProducts: vi.fn(),
  getSaleById: vi.fn(),
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
  cashSessionId: fixtures.TEST_SESSION_ID,
  employeeId: 'emp-1',
  subtotal: 100,
  discountValue: 0,
  total: 100,
  paymentMethod: 'CASH',
  amountPaid: 100,
  change: 0,
  status: 'COMPLETED',
  items: [
    {
      id: 'item-1',
      saleId: 'sale-1',
      productId: 'prod-1',
      quantity: 2,
      unitPrice: 50,
      discount: 0,
      total: 100,
      createdAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockStockReport = {
  totalProducts: 150,
  totalValue: 25000,
  lowStockCount: 12,
  outOfStockCount: 3,
  expiringCount: 5,
};

const mockTopProducts: { product: Product; quantity: number; revenue: number }[] = [
  {
    product: {
      id: 'prod-1',
      name: 'Arroz 5kg',
      internalCode: 'P0001',
      categoryId: 'cat-1',
      unit: 'UNIT',
      salePrice: 24.9,
      costPrice: 18,
      minStock: 10,
      currentStock: 100,
      isWeighted: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    quantity: 50,
    revenue: 1245.0,
  },
  {
    product: {
      id: 'prod-2',
      name: 'Feijão 1kg',
      internalCode: 'P0002',
      categoryId: 'cat-1',
      unit: 'UNIT',
      salePrice: 8.9,
      costPrice: 6,
      minStock: 10,
      currentStock: 80,
      isWeighted: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    quantity: 40,
    revenue: 356.0,
  },
];

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch dashboard stats successfully', async () => {
    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(1500);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue([mockSale]);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(mockStockReport);
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(3);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue(mockTopProducts);
    vi.mocked(tauriLib.getSaleById).mockResolvedValue(mockSale);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.todaySales).toBe(1);
    expect(result.current.data?.todayRevenue).toBe(1500);
    expect(result.current.data?.averageTicket).toBe(1500);
    expect(result.current.data?.lowStockCount).toBe(12);
    expect(result.current.data?.expiringCount).toBe(5);
    expect(result.current.data?.activeAlerts).toBe(3);
  });

  it('should calculate average ticket correctly', async () => {
    const sales = [
      { ...mockSale, id: 'sale-1', total: 100 },
      { ...mockSale, id: 'sale-2', total: 200 },
      { ...mockSale, id: 'sale-3', total: 300 },
    ];

    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(600);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue(sales);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(mockStockReport);
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(0);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue([]);
    vi.mocked(tauriLib.getSaleById).mockResolvedValue(mockSale);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.todaySales).toBe(3);
    expect(result.current.data?.averageTicket).toBe(200); // 600 / 3
  });

  it('should return zero average ticket when no sales', async () => {
    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(0);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue([]);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(mockStockReport);
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(0);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.todaySales).toBe(0);
    expect(result.current.data?.averageTicket).toBe(0);
  });

  it('should format recent sales correctly', async () => {
    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(100);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue([mockSale]);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(mockStockReport);
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(0);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue([]);
    vi.mocked(tauriLib.getSaleById).mockResolvedValue(mockSale);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.recentSales).toHaveLength(1);
    expect(result.current.data?.recentSales[0]).toHaveProperty('id');
    expect(result.current.data?.recentSales[0]).toHaveProperty('time');
    expect(result.current.data?.recentSales[0]).toHaveProperty('total');
  });

  it('should format top products correctly', async () => {
    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(100);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue([]);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(mockStockReport);
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(0);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue(mockTopProducts);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.topProducts).toHaveLength(2);
    expect(result.current.data?.topProducts[0]).toEqual({
      name: 'Arroz 5kg',
      quantity: 50,
      revenue: 1245.0,
    });
  });

  it('should handle error when fetching stats', async () => {
    vi.mocked(tauriLib.getDailySalesTotal).mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should limit recent sales to 5', async () => {
    const manySales = Array.from({ length: 10 }, (_, i) => ({
      ...mockSale,
      id: `sale-${i}`,
    }));

    vi.mocked(tauriLib.getDailySalesTotal).mockResolvedValue(1000);
    vi.mocked(tauriLib.getTodaySales).mockResolvedValue(manySales);
    vi.mocked(tauriLib.getStockReport).mockResolvedValue(mockStockReport);
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(0);
    vi.mocked(tauriLib.getTopProducts).mockResolvedValue([]);
    vi.mocked(tauriLib.getSaleById).mockResolvedValue(mockSale);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.recentSales).toHaveLength(5);
  });
});
