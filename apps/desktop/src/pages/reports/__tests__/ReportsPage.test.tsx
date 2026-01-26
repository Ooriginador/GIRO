/**
 * @file ReportsPage.test.tsx - Testes para hub de relatórios
 */

import { useDashboardStats } from '@/hooks/useDashboard';
import { getMonthlySummary } from '@/lib/tauri';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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

// Mock Recharts
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual<any>('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 800, height: 800 }}>{children}</div>
    ),
  };
});

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
        totalSalesToday: 100,
        averageTicket: 50,
        countSalesToday: 2,
        lowStockProductscts: 5,
      },
      isLoading: false,
    } as any);

    vi.mocked(getMonthlySummary).mockResolvedValue({
      totalAmount: 1500.5,
      totalSales: 30,
    } as any);
  });

  it('should render all status cards including monthly stats', async () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: {
        totalSalesToday: 100,
        averageTicket: 50,
        countSalesToday: 2,
        lowStockProducts: 5,
      },
      isLoading: false,
    } as any);

    render(<ReportsPage />, { wrapper: createWrapper(queryClient) });

    expect(screen.getByText(/Relatórios/i)).toBeInTheDocument();

    // Today Stats
    expect(screen.getByText(/R\$ 100,00/i)).toBeInTheDocument();
    expect(screen.getByText(/2 vendas/i)).toBeInTheDocument();

    // Monthly Stats (Wait for React Query)
    await waitFor(() => {
      expect(screen.getByText(/R\$ 1500,50/i)).toBeInTheDocument();
      expect(screen.getByText(/30 vendas/i)).toBeInTheDocument();
    });

    // Low stock with warning color
    const card = screen.getByLabelText(/Alertas de Estoque/i);
    const lowStockIcon = within(card).getByTestId('icon-AlertTriangle');
    expect(lowStockIcon).toHaveClass('text-amber-500');
  });

  it('should render all report category cards with correct links', () => {
    render(<ReportsPage />, { wrapper: createWrapper(queryClient) });

    const categories = [
      { title: 'Vendas', href: '/reports/sales' },
      { title: 'Financeiro', href: '/reports/financial' },
      { title: 'Estoque', href: '/reports/stock' },
      { title: 'Produtos', href: '/reports/products' },
      { title: 'Equipe', href: '/reports/employees' },
      { title: 'Alertas', href: '/reports/alerts' },
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
      data: {
        totalSalesToday: 0,
        averageTicket: 0,
        countSalesToday: 0,
        lowStockProductsockProducts: 0,
      },
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
