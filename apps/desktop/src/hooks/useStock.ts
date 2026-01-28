/**
 * @file useStock - Hook para gerenciamento de estoque
 */

import { useToast } from '@/hooks/use-toast';
import {
  addStockEntry,
  adjustStock,
  getExpiringLots,
  getLowStockProducts,
  getProducts,
  getStockMovements,
  getStockReport,
  getSuppliers,
} from '@/lib/tauri';
import type { ProductLot } from '@/types';
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
 * Lotes próximos ao vencimento com dados enriquecidos de produto e fornecedor
 * @param days - Número de dias para considerar como "próximo ao vencimento" (padrão: 30)
 */
export function useExpiringLots(days: number = 30) {
  return useQuery({
    queryKey: stockKeys.expiringLots(days),
    queryFn: async (): Promise<ProductLot[]> => {
      // Buscar lotes, produtos e fornecedores em paralelo
      const [lots, products, suppliers] = await Promise.all([
        getExpiringLots(Math.max(0, days)),
        getProducts({ isActive: true }),
        getSuppliers({ activeOnly: true }),
      ]);

      // Criar mapas para lookup rápido
      const productMap = new Map(products.map((p) => [p.id, p]));
      const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

      // Enriquecer lotes com informações de produto e fornecedor
      return lots.map((lot) => ({
        ...lot,
        product: lot.productId ? productMap.get(lot.productId) : undefined,
        supplier: lot.supplierId ? supplierMap.get(lot.supplierId) : undefined,
      }));
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

/**
 * Relatório de estoque com tratamento de erro robusto
 */
export function useStockReport(categoryId?: string) {
  return useQuery({
    queryKey: stockKeys.report(categoryId),
    queryFn: () => getStockReport(categoryId),
    staleTime: 5 * 60 * 1000,
    retry: 2, // Retry em caso de falha de rede
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
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
  supplierId?: string;
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
        input.manufacturingDate,
        input.supplierId
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
  const { success, error, warning } = useToast();

  return useMutation({
    mutationFn: (input: StockAdjustInput) =>
      adjustStock(input.productId, input.newQuantity, input.reason),
    onSuccess: (result, variables) => {
      if (!result.adjusted) {
        warning('Nenhuma alteração', 'O estoque já está com essa quantidade');
        return;
      }

      // Invalidar queries de estoque
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(variables.productId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: stockKeys.report() });

      // Invalidar queries de produto para atualizar a lista
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
      queryClient.invalidateQueries({
        queryKey: productKeys.all,
        refetchType: 'all', // Forçar refetch de todas as queries de produtos
      });

      const deltaText = result.delta > 0 ? `+${result.delta}` : `${result.delta}`;
      success('Estoque ajustado', `Quantidade: ${variables.newQuantity} (${deltaText})`);
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
