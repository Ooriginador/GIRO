import {
  getDailySalesTotal,
  getSaleById,
  getStockReport,
  getTodaySales,
  getTopProducts,
  getUnreadAlertsCount,
  getMotopartsDashboardStats,
} from '@/lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const [
        todaySalesTotal,
        todaySalesList,
        stockReport,
        unreadAlerts,
        topProductsList,
        motopartsStats,
      ] = await Promise.all([
        getDailySalesTotal(),
        getTodaySales(),
        getStockReport(),
        getUnreadAlertsCount(),
        getTopProducts(5),
        getMotopartsDashboardStats(),
      ]);

      const todaySalesCount = todaySalesList.length;
      const averageTicket = todaySalesCount > 0 ? todaySalesTotal / todaySalesCount : 0;

      const recentSalesBase = todaySalesList.slice(0, 5);
      const recentSalesDetails = await Promise.all(
        recentSalesBase.map(async (sale) => {
          try {
            return await getSaleById(sale.id);
          } catch {
            return null;
          }
        })
      );

      return {
        todaySales: todaySalesCount,
        todayRevenue: todaySalesTotal,
        averageTicket,
        lowStockCount: stockReport.lowStockCount,
        expiringCount: stockReport.expiringCount,
        activeAlerts: unreadAlerts,
        recentSales: recentSalesBase.map((sale, index) => {
          const details = recentSalesDetails[index] as unknown as { items?: unknown[] } | null;
          const itemsCount = Array.isArray(details?.items) ? details!.items.length : 0;

          return {
            id: sale.id,
            time: new Date(sale.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            items: itemsCount,
            total: sale.total,
          };
        }),
        revenueWeekly: motopartsStats.revenueWeekly || [],
        topProducts: topProductsList.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          revenue: item.revenue,
        })),
      };
    },
    // Refresh every minute
    refetchInterval: 60000,
  });
}
