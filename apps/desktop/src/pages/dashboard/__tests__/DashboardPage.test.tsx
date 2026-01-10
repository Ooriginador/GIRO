/**
 * @file DashboardPage.test.tsx - Testes para a página de dashboard
 */

import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useDashboard', () => ({
  useDashboardStats: vi.fn(),
}));

import { useDashboardStats } from '@/hooks/useDashboard';

const mockStats = {
  todaySales: 25,
  todayRevenue: 1500,
  averageTicket: 60,
  topProducts: [
    { id: '1', name: 'Arroz 5kg', quantity: 10, revenue: 249 },
    { id: '2', name: 'Feijão 1kg', quantity: 8, revenue: 79.2 },
  ],
  lowStockCount: 5,
  expiringCount: 2,
  activeAlerts: 3,
  recentSales: [],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardStats>);
  });

  it('should render page title', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useDashboardStats>);

    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should display today sales count', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/vendas hoje/i)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should display faturamento', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/faturamento/i)).toBeInTheDocument();
  });

  it('should display alerts count', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/alertas ativos/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display low stock info in description', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/5 estoque baixo/i)).toBeInTheDocument();
  });

  it('should have go to PDV button', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /ir para pdv/i })).toBeInTheDocument();
  });
});
