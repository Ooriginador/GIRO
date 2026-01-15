/**
 * @file ReportsPage.test.tsx - Testes para hub de relatórios
 */

import { useDashboardStats } from '@/hooks/useDashboard';
import { getMonthlySummary } from '@/lib/tauri';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useDashboard', () => ({
  useDashboardStats: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  getMonthlySummary: vi.fn(),
}));

// Mock formatters
vi.mock('@/lib/formatters', () => ({
  formatCurrency: (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`,
}));

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ReportsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(useDashboardStats).mockReturnValue({
      data: {
        todayRevenue: 100,
        averageTicket: 50,
        todaySales: 2,
        lowStockCount: 5,
      },
      isLoading: false,
    } as any);

    vi.mocked(getMonthlySummary).mockResolvedValue({
      totalAmount: 1500.5,
      totalSales: 30,
    } as any);
  });

  it('should render all status cards including monthly stats', async () => {
    render(<ReportsPage />, { wrapper: createWrapper(queryClient) });

    expect(screen.getByText('Relatórios')).toBeInTheDocument();

    // Today Stats
    expect(screen.getByText(/R\$ 100,00/i)).toBeInTheDocument();
    expect(screen.getByText(/2 vendas realizadas/i)).toBeInTheDocument();

    // Monthly Stats (Wait for React Query)
    await waitFor(() => {
      expect(screen.getByText(/R\$ 1500,50/i)).toBeInTheDocument();
      expect(screen.getByText(/30 vendas no mês/i)).toBeInTheDocument();
    });

    // Low stock with warning color
    const lowStockValue = screen.getByText('5');
    expect(lowStockValue).toHaveClass('text-warning');
  });

  it('should render all report category cards with correct links', () => {
    render(<ReportsPage />, { wrapper: createWrapper(queryClient) });

    const categories = [
      { title: 'Relatório de Vendas', href: '/reports/sales' },
      { title: 'Relatório Financeiro', href: '/reports/financial' },
      { title: 'Relatório de Estoque', href: '/reports/stock' },
      { title: 'Ranking de Produtos', href: '/reports/products' },
      { title: 'Desempenho de Funcionários', href: '/reports/employees' },
      { title: 'Relatório de Alertas', href: '/reports/alerts' },
    ];

    categories.forEach((cat) => {
      expect(screen.getByText(cat.title)).toBeInTheDocument();
      const links = screen.getAllByRole('link', {
        name: new RegExp(`Gerar Relatório|${cat.title}`, 'i'),
      });
      expect(links.some((link) => link.getAttribute('href') === cat.href)).toBe(true);
    });
  });

  it('should handle zero states and no low stock styling', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: { todayRevenue: 0, averageTicket: 0, todaySales: 0, lowStockCount: 0 },
      isLoading: false,
    } as any);
    vi.mocked(getMonthlySummary).mockResolvedValue({ totalAmount: 0, totalSales: 0 } as any);

    render(<ReportsPage />, { wrapper: createWrapper(queryClient) });

    const zeros = screen.getAllByText(/R\$ 0,00/i);
    expect(zeros.length).toBeGreaterThanOrEqual(3);

    const lowStockValue = screen.getByText('0');
    expect(lowStockValue).not.toHaveClass('text-warning');
  });
});
