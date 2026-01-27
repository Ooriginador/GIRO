/**
 * @file DashboardPage.test.tsx - Testes para o dashboard principal
 */

import { StatCard } from '@/components/dashboard/StatCard';
import { useDashboardStats } from '@/hooks/useDashboard';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShoppingCart } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useDashboard', () => ({
  useDashboardStats: vi.fn(),
}));

vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock MotopartsDashboard to avoid testing it here
vi.mock('@/components/motoparts/MotopartsDashboard', () => ({
  MotopartsDashboard: () => <div data-testid="motoparts-dashboard">Motoparts Dashboard</div>,
}));

const mockStats = {
  countSalesToday: 5,
  totalSalesToday: 500,
  averageTicket: 100,
  lowStockProducts: 2,
  expiringCount: 1,
  activeAlerts: 3,
  recentSales: [
    { id: 's1', items: 2, time: '10:00', total: 150 },
    { id: 's2', items: 1, time: '11:00', total: 50 },
  ],
  topProducts: [
    { name: 'Produto A', quantity: 10, revenue: 300 },
    { name: 'Produto B', quantity: 5, revenue: 200 },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StatCard', () => {
  it('should render trend and variant styles', () => {
    const { rerender } = render(
      <StatCard
        title="Test"
        value="10"
        icon={ShoppingCart}
        trend={{ value: 10, isPositive: true }}
        variant="success"
      />
    );
    expect(screen.getByText(/10%/)).toBeInTheDocument();
    expect(screen.getByText(/vs ontem/)).toBeInTheDocument();

    rerender(
      <StatCard
        title="Test"
        value="10"
        icon={ShoppingCart}
        trend={{ value: 5, isPositive: false }}
        variant="destructive"
      />
    );
    expect(screen.getByText(/5%/)).toBeInTheDocument();
    expect(screen.getByText(/vs ontem/)).toBeInTheDocument();
  });
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'DEFAULT' } as any);
    vi.mocked(useDashboardStats).mockReturnValue({ data: null, isLoading: true } as any);
  });

  it('should redirect to MotopartsDashboard when businessType is MOTOPARTS', () => {
    vi.mocked(useBusinessProfile).mockReturnValue({ businessType: 'MOTOPARTS' } as any);
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('motoparts-dashboard')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useDashboardStats).mockReturnValue({ data: null, isLoading: true } as any);
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/carregando dashboard/i)).toBeInTheDocument();
  });

  it('should render stats and charts when loaded', () => {
    vi.mocked(useDashboardStats).mockReturnValue({ data: mockStats, isLoading: false } as any);
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$ 500,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Produto A')).toBeInTheDocument();
    expect(screen.getByText(/Venda #s1/)).toBeInTheDocument();
  });

  it('should handle navigation to PDV', () => {
    vi.mocked(useDashboardStats).mockReturnValue({ data: mockStats, isLoading: false } as any);
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /ir para o ponto de venda/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/pdv');
  });

  it('should handle quick actions navigation', () => {
    vi.mocked(useDashboardStats).mockReturnValue({ data: mockStats, isLoading: false } as any);
    render(<DashboardPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /novo produto/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/products/new');

    fireEvent.click(screen.getByRole('button', { name: /entrada de estoque/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/stock/entry');

    fireEvent.click(screen.getByRole('button', { name: /ver relatórios/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/reports');

    fireEvent.click(screen.getByRole('button', { name: /ver alertas/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/alerts');
  });

  it('should render fallback when stats are null', () => {
    vi.mocked(useDashboardStats).mockReturnValue({ data: null, isLoading: false } as any);
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
