/**
 * @file useStock - Hook para gerenciamento de estoque
 */

import { useToast } from '@/hooks/use-toast';
import {
  addStockEntry,
  adjustStock,
  getExpiringLots,
  getLowStockProducts,
  getStockMovements,
  getStockReport,
} from '@/lib/tauri';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys } from './use-products';

// ────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ────────────────────────────────────────────────────────────────────────────

export const stockKeys = {
  all: ['stock'] as const,
  movements: (productId?: string) => [...stockKeys.all, 'movements', productId] as const,
  lowStock: (categoryId?: string) => [...stockKeys.all, 'lowStock', categoryId] as const,
  expiringLots: (days: number) => [...stockKeys.all, 'expiringLots', days] as const,
  report: (categoryId?: string) => [...stockKeys.all, 'report', categoryId] as const,
};

// ────────────────────────────────────────────────────────────────────────────
// QUERIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Movimentações de estoque
 */
export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: stockKeys.movements(productId),
    queryFn: () => getStockMovements(productId),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Produtos com estoque baixo
 */
export function useLowStockProducts(categoryId?: string) {
  return useQuery({
    queryKey: stockKeys.lowStock(categoryId),
    queryFn: () => getLowStockProducts(categoryId),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

/**
 * Lotes próximos ao vencimento
 * @param days - Número de dias para considerar como "próximo ao vencimento" (padrão: 30)
 */
export function useExpiringLots(days: number = 30) {
  return useQuery({
    queryKey: stockKeys.expiringLots(days),
    queryFn: () => getExpiringLots(days),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

/**
 * Relatório de estoque
 */
export function useStockReport(categoryId?: string) {
  return useQuery({
    queryKey: stockKeys.report(categoryId),
    queryFn: () => getStockReport(categoryId),
    staleTime: 5 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

interface StockEntryInput {
  productId: string;
  quantity: number;
  costPrice: number;
  lotNumber?: string;
  expirationDate?: string;
  manufacturingDate?: string;
}

/**
 * Adiciona entrada de estoque
 */
export function useAddStockEntry() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (input: StockEntryInput) =>
      addStockEntry(
        input.productId,
        input.quantity,
        input.costPrice,
        input.lotNumber,
        input.expirationDate,
        input.manufacturingDate
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(variables.productId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: stockKeys.report() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });

      success('Entrada registrada', `${variables.quantity} unidades adicionadas ao estoque`);
    },
    onError: (err) => {
      error('Erro na entrada', err.message);
    },
  });
}

interface StockAdjustInput {
  productId: string;
  newQuantity: number;
  reason: string;
}

/**
 * Ajusta estoque manualmente
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (input: StockAdjustInput) =>
      adjustStock(input.productId, input.newQuantity, input.reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(variables.productId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: stockKeys.report() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });

      success('Estoque ajustado', `Quantidade atualizada para ${variables.newQuantity}`);
    },
    onError: (err) => {
      error('Erro no ajuste', err.message);
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HOOKS COMPOSTOS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Dashboard de estoque
 */
export function useStockDashboard(categoryId?: string) {
  const { data: lowStock, isLoading: lowStockLoading } = useLowStockProducts(categoryId);
  const { data: report, isLoading: reportLoading } = useStockReport(categoryId);

  return {
    lowStockProducts: lowStock ?? [],
    lowStockCount: lowStock?.length ?? 0,
    report: report ?? {
      totalProducts: 0,
      totalValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      expiringCount: 0,
      excessStockCount: 0,
    },
    isLoading: lowStockLoading || reportLoading,
  };
}
