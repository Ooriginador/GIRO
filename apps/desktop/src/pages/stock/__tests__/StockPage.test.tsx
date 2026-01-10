/**
 * @file StockPage.test.tsx - Testes para a página de estoque
 */

import { StockPage } from '@/pages/stock/StockPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useStock', () => ({
  useStockReport: vi.fn(),
  useLowStockProducts: vi.fn(),
}));

import { useLowStockProducts, useStockReport } from '@/hooks/useStock';

const mockReport = {
  totalProducts: 150,
  totalValue: 25000,
  lowStockCount: 5,
  outOfStockCount: 2,
  recentMovements: [],
};

const mockLowStockProducts = [
  { id: '1', name: 'Arroz 5kg', currentStock: 3, minStock: 10 },
  { id: '2', name: 'Feijão 1kg', currentStock: 5, minStock: 15 },
];

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

describe('StockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useStockReport).mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useStockReport>);

    vi.mocked(useLowStockProducts).mockReturnValue({
      data: mockLowStockProducts,
      isLoading: false,
    } as unknown as ReturnType<typeof useLowStockProducts>);
  });

  it('should render page title', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Estoque')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useStockReport).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useStockReport>);

    render(<StockPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should display total products', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText(/total de produtos/i)).toBeInTheDocument();
  });

  it('should show action buttons', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/movimentações/i)).toBeInTheDocument();
    expect(screen.getByText(/nova entrada/i)).toBeInTheDocument();
  });

  it('should display low stock alerts', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    // Check for low stock section
    expect(screen.getByText(/produtos com estoque baixo/i)).toBeInTheDocument();
  });

  it('should show navigation links', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    const movementsLink = screen.getByRole('link', { name: /movimentações/i });
    expect(movementsLink).toHaveAttribute('href', '/stock/movements');

    const entryLink = screen.getByRole('link', { name: /nova entrada/i });
    expect(entryLink).toHaveAttribute('href', '/stock/entry');
  });
});
