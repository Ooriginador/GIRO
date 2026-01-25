/**
 * @file useMotopartsReports.test.tsx - Tests for useMotopartsReports hook
 */

import { useMotopartsReports } from '@/hooks/useMotopartsReports';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock tauri functions
vi.mock('@/lib/tauri', async () => {
  const actual = await vi.importActual<any>('@/lib/tauri');
  return {
    ...actual,
    getMotopartsDashboardStats: vi.fn(),
    getServiceOrderStats: vi.fn(),
    getTopProductsMotoparts: vi.fn(),
  };
});

import * as tauriLib from '@/lib/tauri';

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
    vi.mocked(tauriLib.getMotopartsDashboardStats).mockResolvedValue(mockDashboardStats as any);
    vi.mocked(tauriLib.getServiceOrderStats).mockResolvedValue(mockServiceOrderStats as any);
    vi.mocked(tauriLib.getTopProductsMotoparts).mockResolvedValue(mockTopProducts as any);

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingDashboard).toBe(false);
    });

    expect(result.current.dashboardStats).toEqual(mockDashboardStats);
  });

  it('should fetch service order stats', async () => {
    vi.mocked(tauriLib.getMotopartsDashboardStats).mockResolvedValue(mockDashboardStats as any);
    vi.mocked(tauriLib.getServiceOrderStats).mockResolvedValue(mockServiceOrderStats as any);
    vi.mocked(tauriLib.getTopProductsMotoparts).mockResolvedValue(mockTopProducts as any);

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingSO).toBe(false);
    });

    expect(result.current.serviceOrderStats).toEqual(mockServiceOrderStats);
  });

  it('should fetch top products', async () => {
    vi.mocked(tauriLib.getMotopartsDashboardStats).mockResolvedValue(mockDashboardStats as any);
    vi.mocked(tauriLib.getServiceOrderStats).mockResolvedValue(mockServiceOrderStats as any);
    vi.mocked(tauriLib.getTopProductsMotoparts).mockResolvedValue(mockTopProducts as any);

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingTop).toBe(false);
    });

    expect(result.current.topProducts).toEqual(mockTopProducts);
  });

  it('should call getTopProductsMotoparts with limit', async () => {
    vi.mocked(tauriLib.getTopProductsMotoparts).mockResolvedValue([] as any);

    renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(tauriLib.getTopProductsMotoparts).toHaveBeenCalledWith(5);
    });
  });

  it('should return loading states initially', () => {
    // Use delayed resolution instead of never-resolving promise to avoid test hangs
    vi.mocked(tauriLib.getMotopartsDashboardStats).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockDashboardStats as any), 100))
    );

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    // Check initial loading state synchronously
    expect(result.current.isLoadingDashboard).toBe(true);
    expect(result.current.isLoadingSO).toBe(true);
    expect(result.current.isLoadingTop).toBe(true);
  });

  it('should provide refetch function', async () => {
    vi.mocked(tauriLib.getMotopartsDashboardStats).mockResolvedValue(mockDashboardStats as any);

    const { result } = renderHook(() => useMotopartsReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingDashboard).toBe(false);
    });

    expect(result.current.refetchDashboard).toBeInstanceOf(Function);
  });
});
