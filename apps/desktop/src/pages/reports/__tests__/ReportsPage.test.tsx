/**
 * @file ReportsPage.test.tsx - Testes para a página hub de relatórios
 */

import { ReportsPage } from '@/pages/reports/ReportsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useDashboard', () => ({
  useDashboardStats: vi.fn(() => ({
    data: {
      todaySales: 15,
      todayRevenue: 2500,
      averageTicket: 166.67,
      lowStockCount: 3,
    },
    isLoading: false,
  })),
}));

vi.mock('@/lib/tauri', () => ({
  getMonthlySummary: vi.fn(() =>
    Promise.resolve({
      totalAmount: 45000,
      totalSales: 320,
    })
  ),
}));

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

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Relatórios')).toBeInTheDocument();
  });

  it('should display all report card titles', () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Relatório de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Relatório Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Relatório de Estoque')).toBeInTheDocument();
    expect(screen.getByText('Ranking de Produtos')).toBeInTheDocument();
    expect(screen.getByText('Desempenho de Funcionários')).toBeInTheDocument();
    expect(screen.getByText('Relatório de Alertas')).toBeInTheDocument();
  });

  it('should display report descriptions', () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/análise detalhada de vendas/i)).toBeInTheDocument();
    expect(screen.getByText(/fluxo de caixa/i)).toBeInTheDocument();
    expect(screen.getByText(/posição de estoque/i)).toBeInTheDocument();
  });

  it('should show quick stats cards', () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Vendas Hoje')).toBeInTheDocument();
    expect(screen.getByText('Vendas Mês')).toBeInTheDocument();
    expect(screen.getByText('Ticket Médio')).toBeInTheDocument();
    expect(screen.getByText('Produtos Baixos')).toBeInTheDocument();
  });

  it('should render generate report buttons', () => {
    render(<ReportsPage />, { wrapper: createWrapper() });

    const buttons = screen.getAllByRole('link', { name: /gerar relatório/i });
    expect(buttons.length).toBe(6);
  });
});
