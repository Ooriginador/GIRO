import { useQuery } from '@tanstack/react-query';
import {
  getFinancialReport,
  getEmployeePerformance,
  getStockReport,
  getTopProducts,
} from '@/lib/tauri';

export const reportKeys = {
  all: ['reports'] as const,
  financial: (start: string, end: string) => [...reportKeys.all, 'financial', start, end] as const,
  employees: (start: string, end: string) => [...reportKeys.all, 'employees', start, end] as const,
  stock: () => [...reportKeys.all, 'stock'] as const,
  topProducts: (limit: number) => [...reportKeys.all, 'top-products', limit] as const,
};

/**
 * Hook para relatório financeiro
 */
export function useFinancialReport(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: reportKeys.financial(startDate || '', endDate || ''),
    queryFn: () => getFinancialReport(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para desempenho de funcionários
 */
export function useEmployeePerformance(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: reportKeys.employees(startDate || '', endDate || ''),
    queryFn: () => getEmployeePerformance(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para relatório de estoque
 */
export function useStockReport(categoryId?: string) {
  return useQuery({
    queryKey: [...reportKeys.stock(), categoryId],
    queryFn: () => getStockReport(categoryId),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para ranking de produtos
 */
export function useTopProductsRank(limit: number = 20) {
  return useQuery({
    queryKey: reportKeys.topProducts(limit),
    queryFn: () => getTopProducts(limit),
    staleTime: 5 * 60 * 1000,
  });
}
