/**
 * 📊 Hook: useMotopartsReports
 *
 * Hook para buscar dados de relatórios e dashboard do módulo Motopeças.
 */

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface DashboardStats {
  total_sales_today: number;
  count_sales_today: number;
  open_service_orders: number;
  active_warranties: number;
  low_stock_products: number;
  revenue_weekly: DailyRevenue[];
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ServiceOrderStats {
  total_orders: number;
  by_status: StatusCount[];
  revenue_labor: number;
  revenue_parts: number;
  average_ticket: number;
}

export interface TopItem {
  id: string;
  name: string;
  quantity: number;
  total_value: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useMotopartsReports() {
  const {
    data: dashboardStats,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['motoparts', 'dashboard'],
    queryFn: async () => {
      const result = await invoke<DashboardStats>('get_motoparts_dashboard_stats');
      return result;
    },
    refetchInterval: 60000,
  });

  const { data: serviceOrderStats, isLoading: isLoadingSO } = useQuery({
    queryKey: ['motoparts', 'so-stats'],
    queryFn: async () => {
      const result = await invoke<ServiceOrderStats>('get_service_order_stats');
      return result;
    },
    refetchInterval: 60000,
  });

  const { data: topProducts, isLoading: isLoadingTop } = useQuery({
    queryKey: ['motoparts', 'top-products'],
    queryFn: async () => {
      const result = await invoke<TopItem[]>('get_top_products_motoparts', { limit: 5 });
      return result;
    },
    refetchInterval: 60000,
  });

  return {
    dashboardStats,
    isLoadingDashboard,
    refetchDashboard,
    serviceOrderStats,
    isLoadingSO,
    topProducts,
    isLoadingTop,
  };
}
