/**
 * @file useSales - Hook para gerenciamento de vendas
 * @description Usa TanStack Query para vendas e sessões de caixa
 */

import { useToast } from '@/hooks/use-toast';
import {
  addCashMovement,
  cancelSale,
  closeCashSession,
  createSale,
  getCurrentCashSession,
  getDailySalesTotal,
  getSaleById,
  getSales,
  getSalesReport,
  getTodaySales,
  getTopProducts,
  openCashSession,
} from '@/lib/tauri';
import { usePDVStore } from '@/stores';
import type {
  CashMovementInput,
  CloseCashSessionInput,
  CreateSaleInput,
  OpenCashSessionInput,
  SaleFilter,
} from '@/types';
import { cashSessionKeys } from './usePDV';
import { productKeys } from './use-products';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, startOfMonth } from 'date-fns';

// ────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ────────────────────────────────────────────────────────────────────────────

export const saleKeys = {
  all: ['sales'] as const,
  lists: () => [...saleKeys.all, 'list'] as const,
  list: (filter?: SaleFilter) => [...saleKeys.lists(), filter] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: string) => [...saleKeys.details(), id] as const,
  today: () => [...saleKeys.all, 'today'] as const,
  dailyTotal: () => [...saleKeys.all, 'dailyTotal'] as const,
};

// ────────────────────────────────────────────────────────────────────────────
// SALES QUERIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lista vendas com filtro
 */
export function useSales(filter?: SaleFilter) {
  return useQuery({
    queryKey: saleKeys.list(filter),
    queryFn: () => getSales(filter),
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Busca venda por ID
 */
export function useSale(id: string) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => getSaleById(id),
    enabled: !!id,
  });
}

/**
 * Vendas de hoje
 */
export function useTodaySales() {
  return useQuery({
    queryKey: saleKeys.today(),
    queryFn: getTodaySales,
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Atualiza a cada minuto
  });
}

/**
 * Total de vendas do dia
 */
export function useDailySalesTotal() {
  return useQuery({
    queryKey: saleKeys.dailyTotal(),
    queryFn: getDailySalesTotal,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// SALES MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Finaliza uma venda
 */
export function useCreateSale() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const clearCart = usePDVStore((state) => state.clearCart);

  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(input),
    onSuccess: (sale) => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleKeys.today() });
      queryClient.invalidateQueries({ queryKey: saleKeys.dailyTotal() });
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.current() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });

      // Limpa o carrinho
      clearCart();

      success('Venda finalizada', `Venda #${sale.dailyNumber} concluída com sucesso`);
    },
    onError: (err) => {
      error('Erro ao finalizar venda', err.message);
    },
  });
}

/**
 * Cancela uma venda
 */
export function useCancelSale() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelSale(id, reason),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleKeys.today() });
      queryClient.invalidateQueries({ queryKey: saleKeys.dailyTotal() });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(sale.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.all });

      success('Venda cancelada', `Venda #${sale.dailyNumber} foi cancelada`);
    },
    onError: (err) => {
      error('Erro ao cancelar venda', err.message);
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// CASH SESSION QUERIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Sessão de caixa atual
 */
export function useCurrentCashSession() {
  const setCashSession = usePDVStore((state) => state.setCashSession);

  return useQuery({
    queryKey: cashSessionKeys.current(),
    queryFn: async () => {
      const session = await getCurrentCashSession();
      setCashSession(session);
      return session;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// CASH SESSION MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Abre o caixa
 */
export function useOpenCashSession() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const setCashSession = usePDVStore((state) => state.setCashSession);

  return useMutation({
    mutationFn: (input: OpenCashSessionInput) => openCashSession(input),
    onSuccess: (session) => {
      setCashSession(session);
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.current() });
      success('Caixa aberto', 'Sessão de caixa iniciada com sucesso');
    },
    onError: (err) => {
      error('Erro ao abrir caixa', err.message);
    },
  });
}

/**
 * Fecha o caixa
 */
export function useCloseCashSession() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const setCashSession = usePDVStore((state) => state.setCashSession);

  return useMutation({
    mutationFn: (input: CloseCashSessionInput) => closeCashSession(input),
    onSuccess: (session) => {
      setCashSession(null);
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.current() });

      const diff = session.difference ?? 0;
      if (Math.abs(diff) < 0.01) {
        success('Caixa fechado', 'Fechamento conferido sem diferença');
      } else {
        success('Caixa fechado', `Diferença de R$ ${diff.toFixed(2)} registrada`);
      }
    },
    onError: (err) => {
      error('Erro ao fechar caixa', err.message);
    },
  });
}

/**
 * Sangria ou suprimento de caixa
 */
export function useCashMovement() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (input: CashMovementInput) => addCashMovement(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.current() });
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.summary(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.movements(variables.sessionId) });

      const action = variables.movementType === 'BLEED' ? 'Sangria' : 'Suprimento';
      success(action, `${action} de R$ ${variables.amount.toFixed(2)} registrado`);
    },
    onError: (err) => {
      error('Erro na movimentação', err.message);
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// COMBINED HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook completo para o PDV
 */
export function usePDV() {
  const { data: session, isLoading: sessionLoading } = useCurrentCashSession();
  const createSale = useCreateSale();
  const { data: todaySales } = useTodaySales();
  const { data: dailyTotal } = useDailySalesTotal();

  return {
    session,
    sessionLoading,
    isCashOpen: !!session && session.status === 'OPEN',
    createSale,
    todaySales: todaySales ?? [],
    dailyTotal: dailyTotal ?? 0,
    todaySalesCount: todaySales?.length ?? 0,
  };
}

/**
 * Hook para relatório de vendas
 */
export function useSalesReport(params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
}) {
  return useQuery({
    queryKey: ['sales', 'report', params],
    queryFn: async () => {
      // Default to today if not provided (though enabled check prevents execution)
      const start = params?.startDate ?? new Date().toISOString();
      const end = params?.endDate ?? new Date().toISOString();
      const groupBy = params?.groupBy ?? 'day';

      const [report, topProductsList] = await Promise.all([
        getSalesReport(start, end),
        // request a larger set for better approximations
        getTopProducts(100),
      ]);

      const totalRevenue = report.totalRevenue ?? 0;
      const salesCountTotal = report.totalSales ?? 0;
      const averageTicket =
        report.averageTicket ?? (salesCountTotal > 0 ? totalRevenue / salesCountTotal : 0);

      // Estimate total items from top products as a fallback (may be partial)
      const totalItems = topProductsList.reduce((s, p) => s + (p.quantity ?? 0), 0);

      // Estimate gross profit using top products (approximation)
      const grossProfit = topProductsList.reduce((s, p) => {
        const cost = p.product?.costPrice ?? 0;
        const profit = (p.revenue ?? 0) - p.quantity * cost;
        return s + profit;
      }, 0);

      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Normalize buckets: backend may return salesByHour keyed by hour or date
      const buckets: Record<string, number> = (report.salesByHour ?? {}) as Record<string, number>;

      const keys = Object.keys(buckets);
      const keysLookLikeDates = keys.some((k) => /^\d{4}-\d{2}-\d{2}/.test(k));

      // Aggregate according to groupBy when possible
      const aggregated: Record<string, number> = {};

      if (keysLookLikeDates && ['day', 'week', 'month'].includes(groupBy)) {
        for (const [key, value] of Object.entries(buckets)) {
          const d = new Date(key);
          let bucketKey = key;
          if (groupBy === 'day') {
            bucketKey = format(d, 'yyyy-MM-dd');
          } else if (groupBy === 'week') {
            const start = startOfWeek(d, { weekStartsOn: 1 });
            bucketKey = format(start, 'yyyy-MM-dd');
          } else if (groupBy === 'month') {
            const start = startOfMonth(d);
            bucketKey = format(start, 'yyyy-MM');
          }

          aggregated[bucketKey] = (aggregated[bucketKey] ?? 0) + (value ?? 0);
        }
      } else {
        // fallback: use raw buckets
        Object.assign(aggregated, buckets);
      }

      const periodEntries = Object.entries(aggregated).sort(([a], [b]) => (a > b ? 1 : -1));

      const totalForPercentage = periodEntries.reduce((s, [, v]) => s + (v ?? 0), 0);

      const periods = periodEntries.map(([k, v]) => {
        const revenue = v ?? 0;
        // estimate salesCount per period by dividing revenue by averageTicket when possible
        const salesCount = averageTicket > 0 ? Math.round(revenue / averageTicket) : 0;
        const percentage = totalForPercentage > 0 ? (revenue / totalForPercentage) * 100 : 0;
        return {
          label: k,
          date: k,
          salesCount,
          revenue,
          count: salesCount,
          amount: revenue,
          averageTicket: averageTicket,
          percentage,
        };
      });

      const topProducts = topProductsList.map((item, index) => ({
        id: item.product?.id ?? `product-${index}`,
        name: item.product?.name ?? '—',
        quantity: item.quantity,
        amount: item.revenue,
      }));

      const paymentArr = Object.entries(report.salesByPaymentMethod ?? {});
      const paymentTotal = paymentArr.reduce((s, [, v]) => s + (v as number), 0);
      const paymentBreakdown = paymentArr.map(([method, value]) => ({
        method,
        label: method,
        amount: value as number,
        count: Math.round((value as number) / (averageTicket || 1)),
        percentage: paymentTotal > 0 ? ((value as number) / paymentTotal) * 100 : 0,
      }));

      return {
        totalAmount: totalRevenue,
        salesCount: salesCountTotal,
        averageTicket,
        totalItems,
        grossProfit,
        profitMargin,
        periods,
        topProducts,
        paymentBreakdown,
      };
    },
    enabled: !!params?.startDate && !!params?.endDate,
  });
}
