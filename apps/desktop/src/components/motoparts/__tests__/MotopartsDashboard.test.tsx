/**
 * @file MotopartsDashboard.test.tsx - Testes para o dashboard de motopeças
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MotopartsDashboard } from '@/components/motoparts/MotopartsDashboard';
import {
  getMotopartsDashboardStats,
  getServiceOrderStats,
  getTopProductsMotoparts,
} from '@/lib/tauri';

// Mock recharts to avoid issues and test data mapping
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ data, children }: any) => (
    <div data-testid="bar-chart" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  AreaChart: ({ data, children }: any) => (
    <div data-testid="area-chart" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: () => <div />,
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

vi.mock('@/lib/tauri', () => ({
  getMotopartsDashboardStats: vi.fn(),
  getServiceOrderStats: vi.fn(),
  getTopProductsMotoparts: vi.fn(),
}));

const mockDashboardStats = {
  totalSalesToday: 1000,
  countSalesToday: 10,
  openServiceOrders: 5,
  activeWarranties: 2,
  lowStockProducts: 8,
  revenueWeekly: [
    { date: '2026-01-01', amount: 500 },
    { date: '2026-01-02', amount: 600 },
  ],
};

const mockSOStats = {
  byStatus: [
    { status: 'Open', count: 3 },
    { status: 'InProgress', count: 2 },
    { status: 'Unknown', count: 1 },
  ],
  totalOrders: 6,
  revenueLabor: 200,
  revenueParts: 300,
  averageTicket: 250,
};

const mockTopProducts = [{ id: 'p1', name: 'Pneu', quantity: 4, totalValue: 400 }];

describe('MotopartsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', async () => {
    vi.mocked(getMotopartsDashboardStats).mockImplementation(() => new Promise(() => {}));
    vi.mocked(getServiceOrderStats).mockImplementation(() => new Promise(() => {}));
    vi.mocked(getTopProductsMotoparts).mockImplementation(() => new Promise(() => {}));

    render(<MotopartsDashboard />);
    // Checking for skeletons which usually have animate-pulse or specific structure
    // Since we don't have easy class access, we check that data is NOT rendered
    expect(screen.queryByText('Vendas Hoje')).not.toBeInTheDocument();
  });

  it('should render all dashboard sections when data is available', async () => {
    vi.mocked(getMotopartsDashboardStats).mockResolvedValue(mockDashboardStats as any);
    vi.mocked(getServiceOrderStats).mockResolvedValue(mockSOStats as any);
    vi.mocked(getTopProductsMotoparts).mockResolvedValue(mockTopProducts as any);

    render(<MotopartsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vendas Hoje')).toBeInTheDocument();
    });

    // Flexible currency matcher
    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes('R$') && content.includes('1.000,00'))
      ).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument(); // OS em Aberto

    // Charts data check
    expect(screen.getByText('Receita Semanal')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();

    // Revenue composition
    expect(screen.getByText('Receita de Serviços')).toBeInTheDocument();

    // Flexible currency matchers for mocked values 200 and 300
    expect(
      screen.getByText((content) => content.includes('R$') && content.includes('200,00'))
    ).toBeInTheDocument(); // Mão de obra
    expect(
      screen.getByText((content) => content.includes('R$') && content.includes('300,00'))
    ).toBeInTheDocument(); // Peças

    // Top products
    expect(screen.getByText('Pneu')).toBeInTheDocument();
  });

  it('should handle empty top products', async () => {
    vi.mocked(getMotopartsDashboardStats).mockResolvedValue(mockDashboardStats as any);
    vi.mocked(getServiceOrderStats).mockResolvedValue(mockSOStats as any);
    vi.mocked(getTopProductsMotoparts).mockResolvedValue([]);

    render(<MotopartsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vendas Hoje')).toBeInTheDocument();
    });

    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();
  });
});
