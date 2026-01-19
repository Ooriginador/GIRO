/**
 * @file useMotopartsReports.test.tsx - Tests for useMotopartsReports hook
 */

import { useMotopartsReports } from '@/hooks/useMotopartsReports';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockDashboardStats = {
  total_sales_today: 1500.5,
  count_sales_today: 12,
  open_service_orders: 5,
  active_warranties: 8,
  low_stock_products: 3,
  revenue_weekly: [
    { date: '2024-01-15', amount: 1200 },
    { date: '2024-01-16', amount: 1500 },
  ],
};

const mockServiceOrderStats = {
  total_orders: 45,
  by_status: [
    { status: 'OPEN', count: 10 },
    { status: 'IN_PROGRESS', count: 5 },
    { status: 'COMPLETED', count: 30 },
  ],
  revenue_labor: 5000,
  revenue_parts: 8000,
  average_ticket: 350,
};

const mockTopProducts = [
  { id: 'prod-1', name: 'Óleo Motor', quantity: 50, total_value: 2500 },
  { id: 'prod-2', name: 'Filtro de Ar', quantity: 30, total_value: 900 },
];

describe('useMotopartsReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch dashboard stats', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_motoparts_dashboard_stats') return Promise.resolve(mockDashboardStats);
      if (cmd === 'get_service_order_stats') return Promise.resolve(mockServiceOrderStats);
      if (cmd === 'get_top_products_motoparts') return Promise.resolve(mockTopProducts);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingDashboard).toBe(false);
    });

    expect(result.current.dashboardStats).toEqual(mockDashboardStats);
    expect(result.current.dashboardStats?.total_sales_today).toBe(1500.5);
    expect(result.current.dashboardStats?.open_service_orders).toBe(5);
  });

  it('should fetch service order stats', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_motoparts_dashboard_stats') return Promise.resolve(mockDashboardStats);
      if (cmd === 'get_service_order_stats') return Promise.resolve(mockServiceOrderStats);
      if (cmd === 'get_top_products_motoparts') return Promise.resolve(mockTopProducts);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingSO).toBe(false);
    });

    expect(result.current.serviceOrderStats).toEqual(mockServiceOrderStats);
    expect(result.current.serviceOrderStats?.total_orders).toBe(45);
    expect(result.current.serviceOrderStats?.revenue_labor).toBe(5000);
  });

  it('should fetch top products', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_motoparts_dashboard_stats') return Promise.resolve(mockDashboardStats);
      if (cmd === 'get_service_order_stats') return Promise.resolve(mockServiceOrderStats);
      if (cmd === 'get_top_products_motoparts') return Promise.resolve(mockTopProducts);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingTop).toBe(false);
    });

    expect(result.current.topProducts).toEqual(mockTopProducts);
    expect(result.current.topProducts).toHaveLength(2);
  });

  it('should call get_top_products_motoparts with limit', async () => {
    mockInvoke.mockResolvedValue([]);

    renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_top_products_motoparts', { limit: 5 });
    });
  });

  it('should return loading states initially', () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoadingDashboard).toBe(true);
    expect(result.current.isLoadingSO).toBe(true);
    expect(result.current.isLoadingTop).toBe(true);
  });

  it('should provide refetch function', async () => {
    mockInvoke.mockResolvedValue(mockDashboardStats);

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingDashboard).toBe(false);
    });

    expect(result.current.refetchDashboard).toBeInstanceOf(Function);
  });
});
