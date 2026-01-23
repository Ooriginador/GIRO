/**
 * 📊 Hook: useMotopartsReports
 *
 * Hook para buscar dados de relatórios e dashboard do módulo Motopeças.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getMotopartsDashboardStats,
  getServiceOrderStats,
  getTopProductsMotoparts,
  type DashboardStats,
  type ServiceOrderStats,
  type TopItem,
} from '@/lib/tauri';

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useMotopartsReports
// ══════════════════════════════════════════════════════════════════════════════

export function useMotopartsReports() {
  const {
    data: dashboardStats,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
  } = useQuery<DashboardStats>({
    queryKey: ['motoparts', 'dashboard'],
    queryFn: getMotopartsDashboardStats,
    refetchInterval: 60000,
  });

  const { data: serviceOrderStats, isLoading: isLoadingSO } = useQuery<ServiceOrderStats>({
    queryKey: ['motoparts', 'so-stats'],
    queryFn: getServiceOrderStats,
    refetchInterval: 60000,
  });

  const { data: topProducts, isLoading: isLoadingTop } = useQuery<TopItem[]>({
    queryKey: ['motoparts', 'top-products'],
    queryFn: () => getTopProductsMotoparts(5),
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
