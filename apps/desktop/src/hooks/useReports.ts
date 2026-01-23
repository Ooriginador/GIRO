import { useQuery } from '@tanstack/react-query';
import {
  get_financial_report,
  get_employee_performance,
  get_stock_report as getStockReportTauri,
  get_top_products as getTopProductsTauri,
} from '@/lib/tauri';
import type {
  FinancialReport,
  EmployeeRanking,
  StockReport as StockReportType,
  TopProduct,
} from '@/types';

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
    queryFn: () => get_financial_report(startDate!, endDate!),
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
    queryFn: () => get_employee_performance(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para relatório de estoque
 */
export function useStockReport() {
  return useQuery({
    queryKey: reportKeys.stock(),
    queryFn: getStockReportTauri,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para ranking de produtos
 */
export function useTopProductsRank(limit: number = 20) {
  return useQuery({
    queryKey: reportKeys.topProducts(limit),
    queryFn: () => getTopProductsTauri(limit),
    staleTime: 5 * 60 * 1000,
  });
}
