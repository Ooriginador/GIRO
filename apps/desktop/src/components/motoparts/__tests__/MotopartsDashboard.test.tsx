/**
 * @file MotopartsDashboard.test.tsx - Testes para o dashboard de motopeças
 */

import { MotopartsDashboard } from '@/components/motoparts/MotopartsDashboard';
import { useMotopartsReports } from '@/hooks/useMotopartsReports';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock recharts to avoid issues and test data mapping
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ data, children }: any) => (
    <div data-testid="bar-chart" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data, children }: any) => (
    <div data-testid="pie-data" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Cell: () => <div />,
}));

vi.mock('@/hooks/useMotopartsReports', () => ({
  useMotopartsReports: vi.fn(),
}));

const mockDashboardStats = {
  total_sales_today: 1000,
  count_sales_today: 10,
  open_service_orders: 5,
  active_warranties: 2,
  low_stock_products: 8,
  revenue_weekly: [
    { date: '2026-01-01', amount: 500 },
    { date: '2026-01-02', amount: 600 },
  ],
};

const mockSOStats = {
  by_status: [
    { status: 'Open', count: 3 },
    { status: 'InProgress', count: 2 },
    { status: 'Unknown', count: 1 }, // Test fallback color
  ],
  total_orders: 6,
  revenue_labor: 200,
  revenue_parts: 300,
  average_ticket: 250,
};

const mockTopProducts = [{ id: 'p1', name: 'Pneu', quantity: 4, total_value: 400 }];

describe('MotopartsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(useMotopartsReports).mockReturnValue({
      isLoadingDashboard: true,
      dashboardStats: undefined,
      serviceOrderStats: undefined,
      topProducts: [],
    });

    render(<MotopartsDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render all dashboard sections when data is available', () => {
    vi.mocked(useMotopartsReports).mockReturnValue({
      isLoadingDashboard: false,
      dashboardStats: mockDashboardStats as any,
      serviceOrderStats: mockSOStats as any,
      topProducts: mockTopProducts as any,
    });

    render(<MotopartsDashboard />);

    // Cards
    expect(screen.getByText('Vendas Hoje')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // OS em Aberto

    // Charts data check
    expect(screen.getByText('Receita Semanal')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // Revenue composition
    expect(screen.getByText('Composição de Receita (OS)')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument(); // Mão de obra
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument(); // Peças

    // Top products
    expect(screen.getByText('Pneu')).toBeInTheDocument();
    expect(screen.getByText('4 unidades')).toBeInTheDocument();
  });

  it('should handle empty top products', () => {
    vi.mocked(useMotopartsReports).mockReturnValue({
      isLoadingDashboard: false,
      dashboardStats: mockDashboardStats as any,
      serviceOrderStats: mockSOStats as any,
      topProducts: [],
    });

    render(<MotopartsDashboard />);
    expect(screen.getByText(/nenhuma venda registrada/i)).toBeInTheDocument();
  });
});
